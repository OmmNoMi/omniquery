<template>
  <!-- frappe-ui Dialog (reka): focus trap, focus return, inert background, scroll lock and an Escape
    that closes only the topmost layer, so the mode menu or Question Settings close before focus mode (#42) -->
  <Dialog
    :modelValue="isOpen && Boolean(currentQuestion)"
    :options="{ size: '2xl' }"
    @update:modelValue="(open) => !open && emit('close')"
  >
    <template #body>
    <div class="bg-slate-950 text-white max-h-[calc(100dvh-6rem)] flex flex-col overflow-hidden p-2 sm:p-3 gap-2">
      <!-- Top Navigation & Progress Header Card -->
      <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2 shrink-0">
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
            @click="emit('close')"
            class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition border border-slate-700 active:scale-95 cursor-pointer"
            :aria-label="__('Exit Focus Mode')"
            :title="__('Exit Focus Mode')"
            :label="__('Exit Focus Mode')"
          >
            <X class="w-3.5 h-3.5" />
          </Button>
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
      <div ref="scrollAreaRef" class="w-full flex-1 min-h-0 py-1 overflow-y-auto">
        <!-- Pinned Parent Question Card (Sticky inside Focus Mode scroll area) -->
        <div
          v-if="currentQuestion?._parentTitle || currentQuestion?.parent_title"
          class="sticky top-0 z-20 mb-3 p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md text-left"
        >
          <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
            <ClipboardList class="w-3.5 h-3.5" />
            <span>{{ __('Main Table Question') }}</span>
          </div>
          <div class="text-sm sm:text-base font-extrabold text-white mt-1 leading-snug">
            {{ currentQuestion._parentTitle || currentQuestion.parent_title }}
          </div>
          <div v-if="currentQuestion._parentDescription" class="text-xs text-slate-300 mt-1">
            {{ currentQuestion._parentDescription }}
          </div>
        </div>

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
          :errorMessage="validationErrors[currentQuestion.question_code]"
          @update:modelValue="onQuestionInput"
          @answered="onQuestionAnswered"
          @next="nextQuestion"
          @capture-gps="$emit('capture-gps')"
        />
      </div>

      <!-- Bottom Floating Navigation Bar: Tab sequence is Next (primary) -> Mode -> Previous -->
      <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shrink-0">
        <!-- 1st in DOM (Focus 1): Next Question Button (Visual: Right) -->
        <Button
          @click="nextQuestion"
          class="order-3 px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{{ currentIndex === questions.length - 1 ? __('Finish') : __('Next') }}</span>
          <span>→</span>
        </Button>

        <!-- 2nd in DOM (Focus 2): Survey Mode menu (Visual: Center); its Focus Form toggle exits -->
        <SurveyModeMenu
          class="order-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-tight border transition active:scale-95 shadow-2xs cursor-pointer select-none"
          :class="[
            (autoAdvance || isFullForm)
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          ]"
          :autoAdvance="autoAdvance"
          :isFullForm="isFullForm"
          :isFocusMode="true"
          @toggle-auto-advance="emit('toggle-auto-advance')"
          @toggle-full-form="emit('toggle-full-form')"
          @toggle-focus-mode="emit('close')"
        />

        <!-- 3rd in DOM (Focus 3): Previous Question Button (Visual: Left) -->
        <Button
          @click="prevQuestion"
          :disabled="currentIndex === 0"
          class="order-1 px-3 sm:px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>←</span>
          <span>{{ __('Previous') }}</span>
        </Button>
      </div>
    </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { Button, Dialog } from "frappe-ui";
import { DialogDescription, DialogTitle } from "reka-ui";
import { X, ClipboardList } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";
import QuestionCard from "./QuestionCard.vue";
import MatrixQuestionCard from "./MatrixQuestionCard.vue";
import SurveyModeMenu from "./SurveyModeMenu.vue";

function isMatrixQuestion(q) {
  if (!q) return false;
  const type = (q.field_type || "").toLowerCase();
  const code = (q.question_code || "").toLowerCase();
  return (
    type === "dynamic grid" ||
    type === "table" ||
    type === "matrix" ||
    code.includes("turnover") ||
    code.includes("involvement") ||
    code.includes("capital_sources") ||
    Boolean(q.columns_schema_json) ||
    Boolean(q.matrix_schema)
  );
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  questions: {
    type: Array,
    required: true,
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

function focusCurrentQuestion() {
  if (!props.isOpen) return;
  nextTick(() => {
    questionCardRef.value?.focus?.();
    setTimeout(() => {
      questionCardRef.value?.focus?.();
    }, 60);
  });
}

const currentQuestion = computed(() => {
  return props.questions[props.currentIndex] || null;
});

const progressPercent = computed(() => {
  if (!props.questions.length) return 0;
  return Math.round(((props.currentIndex + 1) / props.questions.length) * 100);
});

function onQuestionInput(val) {
  if (!currentQuestion.value) return;
  emit("update-response", { code: currentQuestion.value.question_code, value: val });
}

let advanceTimer = null;
let isAdvancing = false;

function onQuestionAnswered() {
  if (!props.autoAdvance) return;
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => {
    advanceToNext();
    advanceTimer = null;
  }, 220);
}

function advanceToNext() {
  if (isAdvancing) return;
  isAdvancing = true;
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  if (props.currentIndex < props.questions.length - 1) {
    emit("next-question");
  } else {
    emit("finish-section");
  }
  setTimeout(() => {
    isAdvancing = false;
  }, 350);
}

function prevQuestion() {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  if (props.currentIndex > 0) {
    emit("prev-question");
  }
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
    focusCurrentQuestion();
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      focusCurrentQuestion();
    }
  },
  { immediate: true }
);
</script>
