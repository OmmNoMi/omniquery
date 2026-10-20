<template>
  <div class="flex flex-col gap-2">
    <div
      role="radiogroup"
      :aria-label="ariaLabel || __('Rating')"
      class="flex items-center gap-2"
    >
      <Button
        v-for="star in maxStars"
        :key="star"
        :ref="(el) => setStarRef(star, el)"
        role="radio"
        :aria-checked="modelValue === star ? 'true' : 'false'"
        :tabindex="modelValue === star || (modelValue === 0 && star === 1) ? 0 : -1"
        @click="selectStar(star)"
        @keydown="handleKeydown"
        class="p-2 text-3xl transition-transform active:scale-125 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg cursor-pointer"
        :aria-label="`${star} of ${maxStars}`"
      >
        <Star
          v-if="star <= (modelValue || 0)"
          class="w-6 h-6 text-amber-400 fill-amber-400"
          aria-hidden="true"
        />
        <Star
          v-else
          class="w-6 h-6 text-slate-300"
          aria-hidden="true"
        />
      </Button>
      <Button
        v-if="modelValue"
        @click="clear"
        class="ml-2 text-xs font-medium text-slate-500 hover:text-slate-700 underline"
      >
        {{ __('Clear') }}
      </Button>
    </div>
    <div v-if="modelValue" class="text-sm font-semibold text-amber-700">
      {{ verbalLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";
import { Button } from "frappe-ui";
import { Star } from "lucide-vue-next";
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

function setStarRef(star, el) {
  if (el) {
    starRefs.value[star] = el.$el || el.el || el;
  }
}

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
    const el = starRefs.value[star];
    if (el?.focus) el.focus();
    else if (el?.$el?.focus) el.$el.focus();
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
