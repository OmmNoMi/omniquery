<template>
  <div class="space-y-4">
    <!-- Section Introduction Card -->
    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-600">
      <div class="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <span class="text-xs font-bold tracking-wider uppercase text-emerald-700">
          {{ __('Section') }} {{ currentIndex + 1 }} {{ __('of') }} {{ totalSections }}
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="$emit('open-focus-mode')"
            class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 active:scale-95 transition flex items-center gap-1"
            :title="__('Open One-by-One Focus Popup Form')"
          >
            <span>🎯</span>
            <span>{{ __('Auto Form') }}</span>
          </button>
          <button
            type="button"
            @click="$emit('toggle-auto-advance')"
            :class="[
              'px-2 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1',
              autoAdvance
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            ]"
            :title="__('Toggle Auto Advance (AppSheet Style)')"
          >
            <span>⚡</span>
            <span class="hidden sm:inline">{{ __('Auto Advance') }}</span>
          </button>
          <span
            v-if="isComplete"
            class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            ✓ {{ __('Completed') }}
          </span>
        </div>
      </div>
      <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">
        {{ sectionTitle }}
      </h2>
      <p v-if="sectionDescription" class="text-xs sm:text-sm text-slate-600 mt-1">
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

    <!-- Fixed Native Mobile Bottom Action Bar (Soft Grayish Sage Green) -->
    <div class="fixed bottom-0 inset-x-0 z-50 bg-[#e2ebe4] dark:bg-[#18261e] border-t border-[#cbdcd0] dark:border-[#25392e] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 pb-safe">
      <div class="max-w-2xl mx-auto flex items-center justify-between gap-2">
        <!-- Previous Page Button -->
        <button
          v-if="currentIndex > 0"
          type="button"
          @click="$emit('prev')"
          class="px-3.5 py-2.5 rounded-xl border border-[#cbdcd0] dark:border-[#334d3f] bg-[#f0f5f1] dark:bg-[#25392e] font-bold text-slate-900 dark:text-emerald-100 hover:bg-white active:scale-95 transition text-xs sm:text-sm shrink-0 flex items-center gap-1"
        >
          <span>←</span>
          <span>{{ __('Previous') }}</span>
        </button>
        <div v-else class="w-12"></div>

        <!-- Current Page / Total Pages Indicator -->
        <span class="text-xs font-bold text-slate-800 dark:text-emerald-200">
          {{ currentIndex + 1 }} / {{ totalSections }}
        </span>

        <!-- Right: Next / Submit Page Controls -->
        <div>
          <button
            v-if="currentIndex < totalSections - 1"
            type="button"
            @click="$emit('next')"
            class="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 font-black text-white dark:text-slate-950 active:scale-95 shadow-md transition text-xs sm:text-sm shrink-0 flex items-center gap-1.5"
          >
            <span>{{ __('Next') }}</span>
            <span>→</span>
          </button>
          <button
            v-else
            type="button"
            @click="$emit('submit')"
            :disabled="isSubmitting"
            class="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 font-black text-white dark:text-slate-950 active:scale-95 shadow-md transition text-xs sm:text-sm shrink-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{{ isSubmitting ? __('Submitting...') : __('Submit Survey') }}</span>
          </button>
        </div>
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
});

defineEmits(["prev", "next", "submit", "open-focus-mode", "toggle-auto-advance", "toggle-audio"]);
const { __, getSectionTitle } = useTranslation();

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
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener("resize", updateBottomSpacer);
});

watch(() => props.currentIndex, () => {
  nextTick(() => updateBottomSpacer());
});

const sectionTitle = computed(() => getSectionTitle(props.section));

const sectionDescription = computed(() => {
  if (props.section.description_translated) return props.section.description_translated;
  return props.section.description ? __(props.section.description) : "";
});
</script>
