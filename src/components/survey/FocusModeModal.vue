<template>
  <!-- frappe-ui Dialog (reka): focus trap, focus return, inert background, scroll lock and an Escape
    that closes only the topmost layer, so the mode menu or Question Settings close before focus mode (#42) -->
  <Dialog
    :modelValue="dialogOpen"
    :options="{ size: '2xl' }"
    @update:modelValue="(open) => !open && emit('close')"
  >
    <template #body>
    <!-- One surface on the app's theme. On a phone it fills the screen (main.css, [data-focus-mode]),
      so the form behind it is out of sight and Previous and Next sit at the bottom edge, where a thumb
      reaches them -->
    <div data-focus-mode class="flex h-[100dvh] flex-col bg-surface-modal sm:h-auto sm:max-h-[calc(100dvh-6rem)]">
      <header class="shrink-0 space-y-2.5 border-b border-outline-gray-1 px-4 pb-3 pt-3">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <DialogDescription as="p" class="truncate text-base font-semibold text-ink-gray-9">{{ sectionTitle }}</DialogDescription>
            <p class="flex flex-wrap gap-x-1.5 text-sm text-ink-gray-6">
              <DialogTitle as="span">{{ __("Focus mode") }}</DialogTitle>
              <span aria-hidden="true">/</span>
              <span>{{ __("Question {0} of {1}", [currentIndex + 1, questions.length]) }}</span>
            </p>
          </div>
          <SurveyModeMenu
            size="lg"
            :variant="autoAdvance || isFullForm ? 'subtle' : 'outline'"
            :autoAdvance="autoAdvance"
            :isFullForm="isFullForm"
            :isFocusMode="true"
            @toggle-auto-advance="emit('toggle-auto-advance')"
            @toggle-full-form="emit('toggle-full-form')"
            @toggle-focus-mode="emit('close')"
          />
          <Button
            size="lg"
            variant="ghost"
            :icon="X"
            :label="__('Exit focus mode')"
            :title="__('Exit focus mode')"
            @click="emit('close')"
          />
        </div>
        <!-- the counter above says where the surveyor is in words, so the bar is only drawn -->
        <Progress :value="progressPercent" size="md" aria-hidden="true" />
      </header>

      <!-- only the question scrolls; the header and the buttons stay put -->
      <div ref="scrollAreaRef" class="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4" @focusout="onQuestionFocusOut">
        <!-- the dialog's leave transition still renders this after its question is gone, as when an
          answer hides the questions after it (#152). Just after a move, a tap lands on nothing: a
          second tap of the same finger would otherwise answer the new question unseen -->
        <div v-if="currentQuestion" :class="{ 'pointer-events-none': isAdvancing }">
          <!-- the grid the question sits under stays at the top as the question scrolls (#140) -->
          <ParentGridCard :grid="parentGrid(currentQuestion, sectionGrids)" class="sticky top-0 z-20 shadow-sm" />
          <!-- a matrix moves on only from Next or Enter in its last cell, never as its cells are typed (#170) -->
          <MatrixQuestionCard
            v-if="isMatrixQuestion(currentQuestion)"
            ref="questionCardRef"
            :key="'matrix_' + (currentQuestion?.question_code || currentIndex)"
            :question="currentQuestion"
            :modelValue="responses[currentQuestion.question_code]"
            :errorMessage="validationErrors[currentQuestion.question_code]"
            @update:modelValue="onQuestionInput"
            @next="nextQuestion"
          />
          <QuestionCard
            v-else
            ref="questionCardRef"
            :key="currentQuestion?.question_code || currentIndex"
            :question="currentQuestion"
            :modelValue="responses[currentQuestion.question_code]"
            :parentValue="parentAnswer(currentQuestion, responses)"
            :errorMessage="validationErrors[currentQuestion.question_code]"
            @update:modelValue="onQuestionInput"
            @answered="onQuestionAnswered"
            @next="nextQuestion"
            :gpsAlert="gpsAlert"
            @capture-gps="$emit('capture-gps')"
          />
        </div>
      </div>

      <!-- Next comes first in the tab order, after the question; Previous sits on its left -->
      <footer class="grid shrink-0 grid-cols-2 gap-2 border-t border-outline-gray-1 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          variant="solid"
          size="xl"
          :label="currentIndex === questions.length - 1 ? __('Finish') : __('Next')"
          :iconRight="ArrowRight"
          class="order-2 w-full"
          @click="nextQuestion"
        />
        <Button
          size="xl"
          :label="__('Previous')"
          :iconLeft="ArrowLeft"
          :disabled="currentIndex === 0"
          class="order-1 w-full"
          @click="prevQuestion"
        />
      </footer>
    </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import { Button, Dialog, Progress } from "frappe-ui";
import { DialogDescription, DialogTitle } from "reka-ui";
import { ArrowLeft, ArrowRight, X } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";
import QuestionCard from "./QuestionCard.vue";
import ParentGridCard from "./ParentGridCard.vue";
import { parentAnswer } from "../../utils/cascadingOptions";
import { parentGrid } from "../../utils/questionLayout";
import MatrixQuestionCard from "./MatrixQuestionCard.vue";
import { isMatrixQuestion } from "../../utils/questionLayout";
import SurveyModeMenu from "./SurveyModeMenu.vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  questions: {
    type: Array,
    required: true,
  },
  // the section's grids, from gridsByCode, so a question shows the grid it sits under (#140)
  sectionGrids: {
    type: Map,
    default: () => new Map(),
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
  responses: {
    type: Object,
    required: true,
  },
  validationErrors: {
    type: Object,
    default: () => ({}),
  },
  autoAdvance: {
    type: Boolean,
    default: true,
  },
  isFullForm: {
    type: Boolean,
    default: false,
  },
  sectionTitle: {
    type: String,
    default: "",
  },
  // why the last location request failed, shown on a Geolocation question (#27)
  gpsAlert: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  "close",
  "prev-question",
  "next-question",
  "update-response",
  "toggle-auto-advance",
  "toggle-full-form",
  "capture-gps",
  "finish-section",
]);

const { __ } = useTranslation();

const ADVANCE_DELAY = 450;

const questionCardRef = ref(null);
const scrollAreaRef = ref(null);

// Focus goes to the question once, when its card is mounted: on opening, once the dialog's content is,
// and on each move to another question, since each question gets a card of its own (:key). Vue sets the
// ref only after the card has mounted. No timer focuses it again, so whatever the user moves focus to
// after that keeps it (#120).
watch(questionCardRef, (card) => card?.focus?.());

const currentQuestion = computed(() => {
  return props.questions[props.currentIndex] || null;
});

// Focus mode shows only while it has a question to show, so it can close with isOpen still true
const dialogOpen = computed(() => props.isOpen && Boolean(currentQuestion.value));

const progressPercent = computed(() => {
  if (!props.questions.length) return 0;
  return Math.round(((props.currentIndex + 1) / props.questions.length) * 100);
});

function onQuestionInput(val) {
  if (!currentQuestion.value) return;
  emit("update-response", { code: currentQuestion.value.question_code, value: val });
}

// An answer moves on to the next question ADVANCE_DELAY later, long enough to see the choice the
// finger landed on (and tap another) on a phone. A move locks Next, and taps on the new question, for
// 350 ms so a double tap skips no question. useTimeoutFn stops both timers when focus mode unmounts.
const { start: scheduleAdvance, stop: cancelAdvance } = useTimeoutFn(advanceToNext, ADVANCE_DELAY, { immediate: false });
const { isPending: isAdvancing, start: lockAdvance, stop: unlockAdvance } = useTimeoutFn(() => {}, 350, {
  immediate: false,
});

// Survey.vue keeps focus mode mounted, so it closes without unmounting: a pending auto-advance would
// still move the section on behind the user's back, and the lock would swallow the first Next after
// it reopens (#152).
watch(dialogOpen, (open) => {
  if (open) return;
  cancelAdvance();
  unlockAdvance();
});

function onQuestionAnswered() {
  if (props.autoAdvance) scheduleAdvance();
}

function advanceToNext() {
  if (isAdvancing.value) return;
  lockAdvance();
  cancelAdvance();
  if (props.currentIndex < props.questions.length - 1) {
    emit("next-question");
  } else {
    emit("finish-section");
  }
}

function prevQuestion() {
  cancelAdvance();
  if (props.currentIndex > 0) {
    emit("prev-question");
  }
}

// A user who moves focus out of the question after answering it (to the mode menu, Previous, Exit) has
// moved on, so the answer's pending auto-advance is dropped; it would take focus from there to the next
// question (#120). A focusout with no relatedTarget (a click on nothing, or the browser blurring an
// element that was removed) keeps it.
function onQuestionFocusOut(event) {
  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) cancelAdvance();
}

function nextQuestion() {
  advanceToNext();
}

watch(
  () => props.currentIndex,
  () => {
    if (scrollAreaRef.value) {
      scrollAreaRef.value.scrollTop = 0;
    }
  }
);
</script>
