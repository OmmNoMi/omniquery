<template>
  <!-- frappe-ui Dialog (reka): focus trap, focus return, inert background, scroll lock and an Escape
    that closes only the topmost layer, so the mode menu or Question Settings close before focus mode (#42) -->
  <Dialog
    :modelValue="dialogOpen"
    :options="{ size: '2xl' }"
    @update:modelValue="(open) => !open && emit('close')"
  >
    <template #body>
    <div class="bg-slate-950 text-white max-h-[calc(100dvh-6rem)] flex flex-col overflow-hidden p-2 sm:p-3 gap-2">
      <!-- Top Navigation & Progress Header Card. The panel is dark in either app theme, so its strips
        take frappe-ui's dark tokens (data-theme="dark"); the question card between them stays on the page theme -->
      <div data-theme="dark" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2 shrink-0">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Focus Mode Badge & Counter -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <DialogTitle as="span">{{ __('Focus Mode') }}</DialogTitle>
            </span>
            <span class="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {{ currentIndex + 1 }} / {{ questions.length }}
            </span>
          </div>

          <!-- Right: Close Button -->
          <Button
            :icon="X"
            :label="__('Exit Focus Mode')"
            :title="__('Exit Focus Mode')"
            @click="emit('close')"
          />
        </div>

        <!-- Section Title & Progress Bar -->
        <div class="space-y-1.5 pt-0.5 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-xs font-medium">
            <DialogDescription as="span" class="font-bold text-slate-200 truncate pr-2">{{ sectionTitle }}</DialogDescription>
            <span class="font-mono font-bold text-emerald-400 shrink-0">{{ progressPercent }}%</span>
          </div>
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
            <div
              class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.3)]"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Top-Aligned Question Area: Mobile Keyboard-Friendly (no jumping/squishing) -->
      <div ref="scrollAreaRef" class="w-full flex-1 min-h-0 py-1 overflow-y-auto" @focusout="onQuestionFocusOut">
        <!-- the dialog's leave transition still renders this after its question is gone, as when an
          answer hides the questions after it (#152) -->
        <template v-if="currentQuestion">
          <!-- the grid the question sits under stays at the top as the question scrolls (#140) -->
          <ParentGridCard :grid="parentGrid(currentQuestion, sectionGrids)" class="sticky top-0 z-20 shadow-sm" />
          <MatrixQuestionCard
            v-if="isMatrixQuestion(currentQuestion)"
            ref="questionCardRef"
            :key="'matrix_' + (currentQuestion?.question_code || currentIndex)"
            :question="currentQuestion"
            :modelValue="responses[currentQuestion.question_code]"
            :errorMessage="validationErrors[currentQuestion.question_code]"
            @update:modelValue="onQuestionInput"
            @answered="onQuestionAnswered"
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
        </template>
      </div>

      <!-- Bottom Floating Navigation Bar: Tab sequence is Next (primary) -> Mode -> Previous -->
      <div data-theme="dark" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shrink-0">
        <!-- 1st in DOM (Focus 1): Next Question Button (Visual: Right) -->
        <Button
          variant="solid"
          size="md"
          :label="currentIndex === questions.length - 1 ? __('Finish') : __('Next')"
          :iconRight="ArrowRight"
          class="order-3 shrink-0"
          @click="nextQuestion"
        />

        <!-- 2nd in DOM (Focus 2): Survey Mode menu (Visual: Center); its Focus Form toggle exits -->
        <SurveyModeMenu
          class="order-2"
          size="md"
          :variant="autoAdvance || isFullForm ? 'subtle' : 'outline'"
          :autoAdvance="autoAdvance"
          :isFullForm="isFullForm"
          :isFocusMode="true"
          @toggle-auto-advance="emit('toggle-auto-advance')"
          @toggle-full-form="emit('toggle-full-form')"
          @toggle-focus-mode="emit('close')"
        />

        <!-- 3rd in DOM (Focus 3): Previous Question Button (Visual: Left) -->
        <Button
          size="md"
          :label="__('Previous')"
          :iconLeft="ArrowLeft"
          :disabled="currentIndex === 0"
          class="order-1 shrink-0"
          @click="prevQuestion"
        />
      </div>
    </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import { Button, Dialog } from "frappe-ui";
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

// An answer moves on to the next question 220 ms later, and a move locks Next for 350 ms so a double
// press skips no question. useTimeoutFn stops both timers when focus mode unmounts.
const { start: scheduleAdvance, stop: cancelAdvance } = useTimeoutFn(advanceToNext, 220, { immediate: false });
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
