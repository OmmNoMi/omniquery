<template>
  <Teleport to="body">
    <div
      v-if="isOpen && currentQuestion"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      :aria-label="__('Focus Mode Survey Form')"
      @keydown.esc="onClose"
    >
      <!-- Top Navigation & Progress Header Card -->
      <div class="max-w-2xl w-full mx-auto bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md space-y-2 shrink-0">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Focus Mode Badge & Counter -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{{ __('Focus Mode') }}</span>
            </span>
            <span class="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {{ currentIndex + 1 }} / {{ questions.length }}
            </span>
          </div>

          <!-- Right: Close Button -->
          <button
            type="button"
            @click="onClose"
            class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition border border-slate-700 active:scale-95 cursor-pointer"
            :aria-label="__('Exit Focus Mode')"
            :title="__('Exit Focus Mode')"
          >
            ✕
          </button>
        </div>

        <!-- Section Title & Progress Bar -->
        <div class="space-y-1.5 pt-0.5 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-xs font-medium">
            <span class="font-bold text-slate-200 truncate pr-2">{{ sectionTitle }}</span>
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
      <div ref="scrollAreaRef" class="max-w-2xl w-full mx-auto flex-1 pt-3 pb-3 overflow-y-auto">
        <!-- Pinned Parent Question Card (Sticky inside Focus Mode scroll area) -->
        <div
          v-if="currentQuestion?._parentTitle || currentQuestion?.parent_title"
          class="sticky top-0 z-20 mb-3 p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md text-left"
        >
          <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
            <span>📋</span>
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
      <div class="max-w-2xl w-full mx-auto bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <!-- 1st in DOM (Focus 1): Next Question Button (Visual: Right) -->
        <button
          type="button"
          @click="nextQuestion"
          class="order-3 px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition flex items-center gap-1 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <span>{{ currentIndex === questions.length - 1 ? __('Finish') : __('Next') }}</span>
          <span>→</span>
        </button>

        <!-- 2nd in DOM (Focus 2): Mode Dropdown Menu (Visual: Center) -->
        <div class="order-2 relative" ref="modeMenuRef">
          <button
            type="button"
            @click.stop="isModeMenuOpen = !isModeMenuOpen"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
            :class="[
              (autoAdvance || isFullForm)
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            ]"
            :title="__('Survey Mode')"
          >
            <span>{{ activeModeIcon }}</span>
            <span class="font-extrabold tracking-tight">{{ activeModeTitle }}</span>
            <svg
              class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180': isModeMenuOpen }"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Dropdown Popover Menu (Upward) matching SectionCard.vue exactly -->
          <div
            v-if="isModeMenuOpen"
            @click.stop
            class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1.5 z-50 animate-fade-in text-white"
          >
            <div class="text-[10px] font-extrabold text-slate-400 uppercase px-2.5 py-1 tracking-wider">
              {{ __('Survey Options') }}
            </div>

            <!-- 1. Auto Advance Toggle -->
            <button
              type="button"
              @click="$emit('toggle-auto-advance')"
              class="w-full flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 hover:bg-slate-800 text-slate-200"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">⚡</span>
                <div>
                  <div class="text-xs font-bold text-slate-100">{{ __('Auto Advance') }}</div>
                  <div class="text-[10px] text-slate-400">{{ __('Next question on answer') }}</div>
                </div>
              </div>
              <span
                :class="[
                  'w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                  autoAdvance ? 'bg-emerald-600' : 'bg-slate-700'
                ]"
              >
                <span
                  :class="[
                    'w-4 h-4 rounded-full bg-white transition-transform transform shadow-xs',
                    autoAdvance ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </span>
            </button>

            <!-- 2. Full Form Toggle -->
            <button
              type="button"
              @click="$emit('toggle-full-form')"
              class="w-full flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 hover:bg-slate-800 text-slate-200"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">📋</span>
                <div>
                  <div class="text-xs font-bold text-slate-100">{{ __('Full Form') }}</div>
                  <div class="text-[10px] text-slate-400">{{ __('Show all fields (incl. N/A)') }}</div>
                </div>
              </div>
              <span
                :class="[
                  'w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                  isFullForm ? 'bg-emerald-600' : 'bg-slate-700'
                ]"
              >
                <span
                  :class="[
                    'w-4 h-4 rounded-full bg-white transition-transform transform shadow-xs',
                    isFullForm ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </span>
            </button>

            <!-- 3. Focus Form Toggle (Active - toggling exits Focus Mode) -->
            <button
              type="button"
              @click="onClose"
              class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 transition text-left cursor-pointer border-t border-slate-800 mt-1 pt-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">🎯</span>
                <div>
                  <div class="text-xs font-bold text-slate-100">{{ __('Focus Form') }}</div>
                  <div class="text-[10px] text-slate-400">{{ __('One-by-one popup card') }}</div>
                </div>
              </div>
              <span class="w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 bg-emerald-600">
                <span class="w-4 h-4 rounded-full bg-white transition-transform transform shadow-xs translate-x-4" />
              </span>
            </button>
          </div>
        </div>

        <!-- 3rd in DOM (Focus 3): Previous Question Button (Visual: Left) -->
        <button
          type="button"
          @click="prevQuestion"
          :disabled="currentIndex === 0"
          class="order-1 px-3 sm:px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <span>←</span>
          <span>{{ __('Previous') }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useTranslation } from "../../composables/useTranslation";
import QuestionCard from "./QuestionCard.vue";
import MatrixQuestionCard from "./MatrixQuestionCard.vue";

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

const isModeMenuOpen = ref(false);
const modeMenuRef = ref(null);
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

function handleOutsideClick(event) {
  if (isModeMenuOpen.value && modeMenuRef.value && !modeMenuRef.value.contains(event.target)) {
    isModeMenuOpen.value = false;
  }
}

const currentQuestion = computed(() => {
  return props.questions[props.currentIndex] || null;
});

const activeModeTitle = computed(() => {
  if (props.autoAdvance && props.isFullForm) {
    return __('Full (Auto)');
  }
  if (props.autoAdvance) {
    return __('Auto Advance');
  }
  if (props.isFullForm) {
    return __('Full Form');
  }
  return __('Focus Form');
});

const activeModeIcon = computed(() => {
  if (props.autoAdvance) return '⚡';
  if (props.isFullForm) return '📋';
  return '🎯';
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

function onClose() {
  isModeMenuOpen.value = false;
  emit("close");
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
    if (typeof document !== "undefined") {
      document.body.style.overflow = open ? "hidden" : "";
    }
    if (open) {
      focusCurrentQuestion();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("click", handleOutsideClick);
  }
});

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.removeEventListener("click", handleOutsideClick);
  }
});
</script>
