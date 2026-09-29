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
      <div class="max-w-2xl w-full mx-auto bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Focus Mode Badge & Counter -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{{ __('Auto Form') }}</span>
            </span>
            <span class="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {{ currentIndex + 1 }} / {{ questions.length }}
            </span>
          </div>

          <!-- Right: Auto-Advance Pill Toggle & Close -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="$emit('toggle-auto-advance')"
              :class="[
                'px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer',
                autoAdvance
                  ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              ]"
              :title="__('Toggle Auto Advance on Answer')"
            >
              <span>⚡</span>
              <span class="hidden sm:inline">{{ __('Auto-Advance') }}</span>
              <span class="text-[10px] uppercase font-black tracking-wider">
                {{ autoAdvance ? __('ON') : __('OFF') }}
              </span>
              <span
                :class="[
                  'w-2 h-2 rounded-full transition-colors',
                  autoAdvance ? 'bg-emerald-400' : 'bg-slate-600'
                ]"
              ></span>
            </button>

            <button
              type="button"
              @click="onClose"
              class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs transition border border-slate-700 active:scale-95 cursor-pointer"
              :aria-label="__('Exit Focus Mode')"
            >
              ✕
            </button>
          </div>
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

      <!-- Center: Active Question Hero Card -->
      <div class="max-w-2xl w-full mx-auto my-auto py-3">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-2xl transition-all duration-200 min-h-[360px] sm:min-h-[400px] flex flex-col justify-start">
          <QuestionCard
            :question="currentQuestion"
            :modelValue="responses[currentQuestion.question_code]"
            :errorMessage="validationErrors[currentQuestion.question_code]"
            @update:modelValue="onQuestionInput"
            @answered="onQuestionAnswered"
            @capture-gps="$emit('capture-gps')"
          />
        </div>
      </div>

      <!-- Bottom Floating Navigation Bar -->
      <div class="max-w-2xl w-full mx-auto bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
        <button
          type="button"
          @click="prevQuestion"
          :disabled="currentIndex === 0"
          class="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>{{ __('Previous') }}</span>
        </button>

        <span class="text-xs text-slate-400 hidden sm:inline">
          {{ __('Use 1..9 or Enter to advance') }}
        </span>

        <button
          type="button"
          @click="nextQuestion"
          class="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>{{ currentIndex === questions.length - 1 ? __('Next Section') : __('Next') }}</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, onUnmounted } from "vue";
import { useTranslation } from "../../composables/useTranslation";
import QuestionCard from "./QuestionCard.vue";

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
  "capture-gps",
  "finish-section",
]);

const { __ } = useTranslation();

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

function onQuestionAnswered() {
  if (!props.autoAdvance) return;
  setTimeout(() => advanceToNext(), 220);
}

function advanceToNext() {
  if (props.currentIndex < props.questions.length - 1) {
    emit("next-question");
  } else {
    emit("finish-section");
  }
}

function prevQuestion() {
  if (props.currentIndex > 0) {
    emit("prev-question");
  }
}

function nextQuestion() {
  advanceToNext();
}

function onClose() {
  emit("close");
}

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = open ? "hidden" : "";
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
});
</script>
