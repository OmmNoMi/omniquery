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
          class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1"
        >
          <Check class="w-3 h-3" />
          <span>{{ __('Completed') }}</span>
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
          <Button
            v-if="currentIndex < totalSections - 1"
            variant="solid"
            size="md"
            :label="__('Next')"
            :iconRight="ArrowRight"
            class="shrink-0"
            @click="$emit('next')"
          />
          <Button
            v-else
            variant="solid"
            size="md"
            :label="__('Submit Survey')"
            :loading="isSubmitting"
            :loadingText="__('Submitting...')"
            class="shrink-0"
            @click="$emit('submit')"
          />
        </div>

        <!-- 2nd in DOM (Focus 2): Center: Survey Mode menu (Visual: Center) -->
        <SurveyModeMenu
          v-if="!isGuest"
          class="order-2"
          size="md"
          :variant="autoAdvance || isFullForm ? 'subtle' : 'outline'"
          :autoAdvance="autoAdvance"
          :isFullForm="isFullForm"
          :isFocusMode="isFocusMode"
          @toggle-auto-advance="$emit('toggle-auto-advance')"
          @toggle-full-form="$emit('toggle-full-form')"
          @toggle-focus-mode="$emit('toggle-focus-mode')"
        />
        <div v-else class="order-2 text-xs font-bold text-slate-700 dark:text-slate-300 select-none px-3.5 py-1.5 rounded-xl bg-[#e6efe8] dark:bg-[#1c2c22] border border-[#b8cdbf] dark:border-[#2a4033] shadow-2xs">
          <span>{{ currentIndex + 1 }} / {{ totalSections }}</span>
        </div>

        <!-- 3rd in DOM (Focus 3): Previous Page Button (Visual: Left) -->
        <Button
          v-if="currentIndex > 0"
          variant="outline"
          size="md"
          :label="__('Previous')"
          :iconLeft="ArrowLeft"
          class="order-1 shrink-0"
          @click="$emit('prev')"
        />
        <div v-else class="order-1 w-12 sm:w-16"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { Button } from "frappe-ui";
import { ArrowLeft, ArrowRight, Check } from "lucide-vue-next";
import SurveyModeMenu from "./SurveyModeMenu.vue";
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
  "toggle-focus-mode",
  "toggle-auto-advance",
  "toggle-full-form",
  "toggle-audio",
]);
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
