<template>
  <div class="flex flex-col gap-2">
    <div
      role="radiogroup"
      :aria-label="ariaLabel || __('Rating')"
      class="flex items-center gap-2"
    >
      <button
        v-for="star in maxStars"
        :key="star"
        :ref="(el) => { if (el) starRefs[star] = el; }"
        type="button"
        role="radio"
        :aria-checked="modelValue === star ? 'true' : 'false'"
        :tabindex="modelValue === star || (modelValue === 0 && star === 1) ? 0 : -1"
        @click="selectStar(star)"
        @keydown="handleKeydown"
        class="p-2 text-3xl transition-transform active:scale-125 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg cursor-pointer"
        :aria-label="`${star} of ${maxStars}`"
      >
        <span v-if="star <= (modelValue || 0)" class="text-amber-400">★</span>
        <span v-else class="text-slate-300">☆</span>
      </button>
      <button
        v-if="modelValue"
        type="button"
        @click="clear"
        class="ml-2 text-xs font-medium text-slate-500 hover:text-slate-700 underline"
      >
        {{ __('Clear') }}
      </button>
    </div>
    <div v-if="modelValue" class="text-sm font-semibold text-amber-700">
      {{ verbalLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  maxStars: {
    type: Number,
    default: 5,
  },
  ariaLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);
const { __ } = useTranslation();

const starRefs = ref({});

const verbalLabels = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const verbalLabel = computed(() => {
  const labelKey = verbalLabels[props.modelValue] || "";
  return labelKey ? __(labelKey) : "";
});

function selectStar(star) {
  emit("update:modelValue", star);
  nextTick(() => {
    starRefs.value[star]?.focus();
  });
}

function clear() {
  emit("update:modelValue", 0);
}

function handleKeydown(e) {
  const current = Number(props.modelValue) || 1;
  if (["ArrowRight", "ArrowUp"].includes(e.key) && current < props.maxStars) {
    e.preventDefault();
    selectStar(current + 1);
  } else if (["ArrowLeft", "ArrowDown"].includes(e.key) && current > 1) {
    e.preventDefault();
    selectStar(current - 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    selectStar(1);
  } else if (e.key === "End") {
    e.preventDefault();
    selectStar(props.maxStars);
  }
}
</script>
