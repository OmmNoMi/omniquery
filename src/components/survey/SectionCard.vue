<template>
  <div class="space-y-4">
    <!-- Section Introduction Card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-600">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
          {{ __('Section') }} {{ currentIndex + 1 }} {{ __('of') }} {{ totalSections }}
        </span>
        <span
          v-if="isComplete"
          class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          ✓ {{ __('Completed') }}
        </span>
      </div>
      <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {{ sectionTitle }}
      </h2>
      <p v-if="sectionDescription" class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
        {{ sectionDescription }}
      </p>
    </div>


    <!-- Questions Container with dynamic bottom spacer -->
    <div ref="questionsContainerRef" class="space-y-3">
      <slot />
      <div
        :style="{ height: bottomSpacerHeight + 'px' }"
        class="w-full pointer-events-none"
        aria-hidden="true"
      />
    </div>

    <!-- Fixed Native Mobile Bottom Action Bar (Soft Grayish Sage Green): Tab sequence is Next (primary) -> Mode -> Previous -->
    <div class="fixed bottom-0 inset-x-0 z-50 bg-[#d0ded3] dark:bg-[#142019] border-t border-[#b8cdbf] dark:border-[#1f3026] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 sm:px-4 py-2.5 pb-safe">
      <div class="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <!-- 1st in DOM (Focus 1): Next / Submit Page Controls (Visual: Right) -->
        <div class="order-3">
          <button
            v-if="currentIndex < totalSections - 1"
            type="button"
            @click="$emit('next')"
            class="px-4 sm:px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 font-black text-white dark:text-slate-950 active:scale-95 shadow-md transition text-xs sm:text-sm shrink-0 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span>{{ __('Next') }}</span>
            <span>→</span>
          </button>
          <button
            v-else
            type="button"
            @click="$emit('submit')"
            :disabled="isSubmitting"
            class="px-4 sm:px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 font-black text-white dark:text-slate-950 active:scale-95 shadow-md transition text-xs sm:text-sm shrink-0 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span>{{ isSubmitting ? __('Submitting...') : __('Submit Survey') }}</span>
          </button>
        </div>

        <!-- 2nd in DOM (Focus 2): Center: Mode Dropdown Menu (Visual: Center) -->
        <div v-if="!isGuest" class="order-2 relative" ref="modeMenuRef">
          <button
            type="button"
            @click.stop="isModeMenuOpen = !isModeMenuOpen"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-600"
            :class="[
              (autoAdvance || isFullForm)
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-500/60 dark:border-emerald-500/50 ring-1 ring-emerald-500/20'
                : 'bg-[#e6efe8] dark:bg-[#1c2c22] text-slate-800 dark:text-emerald-100 border-[#b8cdbf] dark:border-[#2a4033] hover:bg-white dark:hover:bg-[#253a2d]'
            ]"
            :title="__('Survey Mode')"
          >
            <span>{{ activeModeIcon }}</span>
            <span class="font-extrabold tracking-tight">{{ activeModeLabel }}</span>
            <svg
              class="w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0"
              :class="{ 'rotate-180': isModeMenuOpen }"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Dropdown Popover Menu (Upward) -->
          <div
            v-if="isModeMenuOpen"
            @click.stop
            class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 z-50 animate-fade-in"
          >
            <div class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase px-2.5 py-1 tracking-wider">
              {{ __('Survey Options') }}
            </div>

            <!-- 1. Auto Advance Toggle -->
            <button
              type="button"
              @click="$emit('toggle-auto-advance')"
              class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">⚡</span>
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ __('Auto Advance') }}</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ __('Next question on answer') }}</div>
                </div>
              </div>
              <span
                :class="[
                  'w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                  autoAdvance ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
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
              class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">📋</span>
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ __('Full Form') }}</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ __('Show all fields (incl. N/A)') }}</div>
                </div>
              </div>
              <span
                :class="[
                  'w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                  isFullForm ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
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

            <!-- 3. Focus Form Toggle -->
            <button
              type="button"
              @click="onToggleFocusMode"
              class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1 pt-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm">🎯</span>
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ __('Focus Form') }}</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ __('One-by-one popup card') }}</div>
                </div>
              </div>
              <span
                :class="[
                  'w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                  isFocusMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                ]"
              >
                <span
                  :class="[
                    'w-4 h-4 rounded-full bg-white transition-transform transform shadow-xs',
                    isFocusMode ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </span>
            </button>
          </div>
        </div>
        <div v-else class="order-2 text-xs font-bold text-slate-700 dark:text-slate-300 select-none px-3.5 py-1.5 rounded-xl bg-[#e6efe8] dark:bg-[#1c2c22] border border-[#b8cdbf] dark:border-[#2a4033] shadow-2xs">
          <span>{{ currentIndex + 1 }} / {{ totalSections }}</span>
        </div>

        <!-- 3rd in DOM (Focus 3): Previous Page Button (Visual: Left) -->
        <button
          v-if="currentIndex > 0"
          type="button"
          @click="$emit('prev')"
          class="order-1 px-3 py-2 rounded-xl border border-[#b8cdbf] dark:border-[#2a4033] bg-[#e6efe8] dark:bg-[#1c2c22] font-bold text-slate-900 dark:text-emerald-100 hover:bg-white dark:hover:bg-[#253a2d] active:scale-95 transition text-xs sm:text-sm shrink-0 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <span>←</span>
          <span>{{ __('Previous') }}</span>
        </button>
        <div v-else class="order-1 w-12 sm:w-16"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  currentIndex: {
    type: Number,
    required: true,
  },
  totalSections: {
    type: Number,
    required: true,
  },
  isComplete: {
    type: Boolean,
    default: false,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  autoAdvance: {
    type: Boolean,
    default: true,
  },
  isRecording: {
    type: Boolean,
    default: false,
  },
  isAudioPaused: {
    type: Boolean,
    default: false,
  },
  isFullForm: {
    type: Boolean,
    default: false,
  },
  isFocusMode: {
    type: Boolean,
    default: false,
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "prev",
  "next",
  "submit",
  "open-focus-mode",
  "toggle-focus-mode",
  "toggle-auto-advance",
  "toggle-full-form",
  "toggle-audio",
]);
const { __, getSectionTitle } = useTranslation();

const isModeMenuOpen = ref(false);
const modeMenuRef = ref(null);

function onOpenFocusMode() {
  isModeMenuOpen.value = false;
  emit("open-focus-mode");
}

function onToggleFocusMode() {
  isModeMenuOpen.value = false;
  emit("toggle-focus-mode");
}

function handleOutsideClick(event) {
  if (isModeMenuOpen.value && modeMenuRef.value && !modeMenuRef.value.contains(event.target)) {
    isModeMenuOpen.value = false;
  }
}

const questionsContainerRef = ref(null);
const bottomSpacerHeight = ref(80);
let resizeObserver = null;

function computeSpacer(cardH, vh, hh) {
  const target = vh - (hh + 16 + cardH);
  return Math.max(80, Math.round(target));
}

function updateBottomSpacer() {
  if (!questionsContainerRef.value || typeof window === "undefined") return;
  const cards = questionsContainerRef.value.querySelectorAll("[data-question-card]");
  if (!cards || !cards.length) return;
  const lastH = cards[cards.length - 1].offsetHeight || 150;
  const header = document.querySelector("header");
  const hh = header ? header.offsetHeight : 56;
  bottomSpacerHeight.value = computeSpacer(lastH, window.innerHeight, hh);
}

function setupResizeObserver() {
  if (typeof ResizeObserver === "undefined" || !questionsContainerRef.value) return;
  resizeObserver = new ResizeObserver(() => updateBottomSpacer());
  resizeObserver.observe(questionsContainerRef.value);
}

onMounted(() => {
  nextTick(() => {
    updateBottomSpacer();
    setupResizeObserver();
  });
  window.addEventListener("resize", updateBottomSpacer);
  if (typeof document !== "undefined") {
    document.addEventListener("click", handleOutsideClick);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener("resize", updateBottomSpacer);
  if (typeof document !== "undefined") {
    document.removeEventListener("click", handleOutsideClick);
  }
});

watch(() => props.currentIndex, () => {
  nextTick(() => updateBottomSpacer());
});

const sectionTitle = computed(() => getSectionTitle(props.section));

const sectionDescription = computed(() => {
  if (props.section.description_translated) return props.section.description_translated;
  return props.section.description ? __(props.section.description) : "";
});

const activeModeLabel = computed(() => {
  if (props.isFocusMode) {
    return __('Focus Form');
  }
  if (props.isFullForm && props.autoAdvance) {
    return __('Full (Auto)');
  }
  if (props.isFullForm) {
    return __('Full Form');
  }
  if (props.autoAdvance) {
    return __('Auto Advance');
  }
  return __('Standard');
});

const activeModeIcon = computed(() => {
  if (props.isFocusMode) return '🎯';
  if (props.autoAdvance) return '⚡';
  if (props.isFullForm) return '📋';
  return '📝';
});
</script>
