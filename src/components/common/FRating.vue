<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <button
        v-for="star in maxStars"
        :key="star"
        type="button"
        @click="selectStar(star)"
        class="p-2 text-3xl transition-transform active:scale-125 focus:outline-none"
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
import { computed } from "vue";
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
});

const emit = defineEmits(["update:modelValue"]);
const { __ } = useTranslation();

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
}

function clear() {
  emit("update:modelValue", 0);
}
</script>
