<template>
  <div class="space-y-4 pt-1">
    <!-- Selected Value Hero Badge -->
    <!-- unanswered (#21): grey, and no value until the surveyor picks one; 0 is an answer -->
    <div
      class="flex items-center justify-between border-2 rounded-2xl px-5 py-3.5 shadow-xs"
      :class="answered
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'"
    >
      <span
        class="text-xs font-black uppercase tracking-wider"
        :class="answered ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'"
      >
        {{ __('Selected Value') }}
      </span>
      <div class="flex items-baseline space-x-1.5">
        <span v-if="answered" class="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100">
          {{ modelValue }}
        </span>
        <span v-else class="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-300">
          {{ __('Not answered') }}
        </span>
        <span v-if="unit && answered" class="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
          {{ __(unit) }}
        </span>
      </div>
    </div>

    <!-- 1. Draggable Slider Bar (Bigger in focus, with values held below) -->
    <div v-if="activeFormat === 'slider'" class="px-2 pt-2 space-y-3">
      <!-- unanswered: no thumb, so the bar does not read as the minimum chosen -->
      <div
        class="relative flex items-center"
        :class="answered ? '' : '[&_input::-webkit-slider-thumb]:opacity-0 [&_input::-moz-range-thumb]:opacity-0'"
      >
        <TextInput
          :id="id"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :modelValue="numericValue ?? min"
          :aria-label="ariaLabel || __('Range value')"
          :aria-valuemin="min"
          :aria-valuemax="max"
          :aria-valuenow="numericValue ?? undefined"
          :aria-valuetext="answered ? `${modelValue} ${unit ? __(unit) : ''}`.trim() : __('Not answered')"
          :aria-describedby="ariaDescribedby"
          @update:modelValue="(val) => emit('update:modelValue', Number(val))"
          @click="onSliderClick"
          @keydown="onSliderKeydown"
          class="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-grab active:cursor-grabbing accent-emerald-600 transition shadow-inner"
        />
      </div>

      <!-- Values Held Below Track (Clickable Ticks) -->
      <div class="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 px-1 select-none">
        <Button
          v-for="val in steps"
          :key="val"
          :variant="numericValue === val ? 'subtle' : 'ghost'"
          :label="String(val)"
          class="font-mono"
          @click="selectValue(val)"
        />
      </div>
    </div>

    <!-- 2. Button Values (Tap Pills Only - Zero Slider Bar!) -->
    <div
      v-else
      role="radiogroup"
      :aria-label="ariaLabel || __('Range value')"
      :aria-describedby="ariaDescribedby"
      :aria-required="ariaRequired"
      class="grid grid-flow-col auto-cols-fr gap-1.5 sm:gap-2 pt-1"
    >
      <Button
        v-for="val in steps"
        :key="val"
        :ref="(el) => setBtnRef(val, el)"
        role="radio"
        :aria-checked="numericValue === val"
        :tabindex="numericValue === val || (!answered && val === min) ? 0 : -1"
        @click="selectValue(val)"
        @keydown="handleKeydown"
        v-bind="choiceButtonProps(numericValue === val)"
        size="xl"
        :label="String(val)"
        class="w-full rounded-xl active:scale-95"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { Button, TextInput } from "frappe-ui";
import { useTranslation } from "../../composables/useTranslation";
import { choiceButtonProps } from "../../utils/choiceButton";
import { isAnswered } from "../../utils/responsePayload";

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: null,
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
    default: "",
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
  // on the tap pills' radiogroup; a slider (range input) does not take aria-required
  ariaRequired: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "esc"]);
const { __ } = useTranslation();

// frappe-ui Buttons; each sets its rootRef, the button element, only after the ref callback runs, so read it at use
const btnRefs = ref({});

function setBtnRef(val, el) {
  if (el) {
    btnRefs.value[val] = el;
  }
}

const activeFormat = computed(() => (props.format === "slider" ? "slider" : "buttons"));

// the chosen number, or null while the question is unanswered (#21)
const numericValue = computed(() => {
  if (!isAnswered(props.modelValue)) return null;
  const v = Number(props.modelValue);
  return Number.isFinite(v) ? v : null;
});
const answered = computed(() => numericValue.value !== null);

const steps = computed(() => {
  const list = [];
  for (let i = props.min; i <= props.max; i += props.step) {
    list.push(i);
  }
  return list;
});

// An unanswered bar shows its thumb hidden at min, where a click or Home moves nothing and the
// browser sends no input. Take the click's value, and the same keys the tap pills take.
function onSliderClick(e) {
  if (!answered.value) emit("update:modelValue", Number(e.target.value));
}
function onSliderKeydown(e) {
  if (!answered.value) handleKeydown(e);
}

function selectValue(val) {
  emit("update:modelValue", val);
  nextTick(() => {
    btnRefs.value[val]?.rootRef?.focus();
  });
}

function handleKeydown(e) {
  const s = steps.value;
  // unanswered is one step before the first value: the next value is the first
  const idx = s.indexOf(numericValue.value);
  if (idx === -1 && answered.value) return; // a saved value off the steps
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
