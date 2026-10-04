<template>
  <div class="space-y-4 pt-1">
    <!-- Selected Value Hero Badge -->
    <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-2xl px-5 py-3.5 shadow-xs">
      <span class="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
        {{ __('Selected Value') }}
      </span>
      <div class="flex items-baseline space-x-1.5">
        <span class="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100">
          {{ displayValue }}
        </span>
        <span v-if="unit" class="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
          {{ __(unit) }}
        </span>
      </div>
    </div>

    <!-- 1. Draggable Slider Bar (Bigger in focus, with values held below) -->
    <div v-if="activeFormat === 'slider'" class="px-2 pt-2 space-y-3">
      <div class="relative flex items-center">
        <input
          :id="id"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :value="numericValue"
          :aria-label="ariaLabel || __('Range value')"
          :aria-valuemin="min"
          :aria-valuemax="max"
          :aria-valuenow="numericValue"
          :aria-valuetext="`${displayValue} ${unit ? __(unit) : ''}`.trim()"
          :aria-describedby="ariaDescribedby"
          @input="onSliderInput"
          class="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-grab active:cursor-grabbing accent-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition shadow-inner"
        />
      </div>

      <!-- Values Held Below Track (Clickable Ticks) -->
      <div class="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 px-1 select-none">
        <button
          v-for="val in steps"
          :key="val"
          type="button"
          @click="selectValue(val)"
          :class="[
            'px-2 py-0.5 rounded-md transition font-mono',
            numericValue === val
              ? 'bg-emerald-600 text-white font-black shadow-xs scale-110'
              : 'hover:text-emerald-700 dark:hover:text-emerald-300'
          ]"
        >
          {{ val }}
        </button>
      </div>
    </div>

    <!-- 2. Button Values (Tap Pills Only - Zero Slider Bar!) -->
    <div
      v-else
      role="radiogroup"
      class="grid grid-flow-col auto-cols-fr gap-1.5 sm:gap-2 pt-1"
    >
      <button
        v-for="val in steps"
        :key="val"
        :ref="(el) => { if (el) btnRefs[val] = el; }"
        type="button"
        role="radio"
        :aria-checked="numericValue === val"
        :tabindex="numericValue === val ? 0 : -1"
        @click="selectValue(val)"
        @keydown="handleKeydown"
        :class="[
          'py-3 text-center rounded-xl border-2 text-sm sm:text-base font-bold transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500',
          numericValue === val
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900 font-black'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
        ]"
      >
        {{ val }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 7,
  },
  step: {
    type: Number,
    default: 1,
  },
  unit: {
    type: String,
    default: "Years",
  },
  format: {
    type: String,
    default: "buttons", // 'buttons' | 'slider'
  },
  id: {
    type: String,
    default: undefined,
  },
  ariaLabel: {
    type: String,
    default: "",
  },
  ariaDescribedby: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(["update:modelValue", "esc"]);
const { __ } = useTranslation();

const btnRefs = ref({});

const activeFormat = computed(() => (props.format === "slider" ? "slider" : "buttons"));

const numericValue = computed(() => {
  const v = Number(props.modelValue);
  return isNaN(v) ? props.min : v;
});

const displayValue = computed(() => {
  if (props.modelValue !== "" && props.modelValue !== null && props.modelValue !== undefined) {
    return props.modelValue;
  }
  return props.min;
});

const steps = computed(() => {
  const list = [];
  for (let i = props.min; i <= props.max; i += props.step) {
    list.push(i);
  }
  return list;
});

function onSliderInput(e) {
  emit("update:modelValue", Number(e.target.value));
}

function selectValue(val) {
  emit("update:modelValue", val);
  nextTick(() => {
    btnRefs.value[val]?.focus();
  });
}

function handleKeydown(e) {
  const s = steps.value;
  const current = Number(numericValue.value);
  const idx = s.indexOf(current);
  if (idx === -1) return;
  if (["ArrowRight", "ArrowDown"].includes(e.key) && idx < s.length - 1) {
    e.preventDefault();
    selectValue(s[idx + 1]);
  } else if (["ArrowLeft", "ArrowUp"].includes(e.key) && idx > 0) {
    e.preventDefault();
    selectValue(s[idx - 1]);
  } else if (e.key === "Home") {
    e.preventDefault();
    selectValue(s[0]);
  } else if (e.key === "End") {
    e.preventDefault();
    selectValue(s[s.length - 1]);
  } else if (e.key === "Escape") {
    emit("esc");
  }
}
</script>
