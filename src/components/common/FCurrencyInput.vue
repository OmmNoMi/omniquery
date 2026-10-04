<template>
  <div class="flex flex-col gap-2">
    <!-- 1. Auto Suggestion Chips (tabindex="-1", navigated via Left/Right Arrows) -->
    <div
      role="toolbar"
      :aria-label="__('Quick Amount Increments')"
      class="flex flex-wrap items-center gap-1.5 pb-0.5"
    >
      <button
        v-for="(increment, idx) in increments"
        :key="increment"
        :ref="(el) => { if (el) chipRefs[idx] = el; }"
        type="button"
        tabindex="-1"
        :aria-label="__('Add') + ' ₹' + increment.toLocaleString()"
        @keydown="handleChipKeydown($event, idx)"
        @click="addAmount(increment, idx)"
        class="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer select-none"
      >
        +₹{{ increment.toLocaleString() }}
      </button>

      <button
        v-if="Number(modelValue) > 0"
        :ref="(el) => { if (el) clearChipRef = el; }"
        type="button"
        tabindex="-1"
        @keydown="handleClearKeydown"
        @click="reset"
        class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer select-none"
      >
        {{ __('Clear') }}
      </button>
    </div>

    <!-- 2. Main Input Field Below Suggestion Chips (Primary Tab Stop) -->
    <div class="relative rounded-2xl shadow-xs">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <span class="text-slate-400 dark:text-slate-500 font-extrabold text-xl">₹</span>
      </div>
      <input
        ref="inputRef"
        :id="id"
        type="number"
        :value="modelValue"
        :aria-label="ariaLabel || __('Amount in Indian Rupees')"
        :aria-describedby="ariaDescribedby"
        @input="onInput"
        @keydown="onInputKeydown"
        @keydown.enter="$emit('enter')"
        @keydown.esc.stop="$emit('esc')"
        :placeholder="__('Enter amount...')"
        class="block w-full min-h-[56px] rounded-2xl border-2 border-slate-300 dark:border-slate-700 py-3.5 pl-9 pr-4 text-xl sm:text-2xl font-black text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 bg-slate-50 dark:bg-slate-800 transition"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: "",
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
  increments: {
    type: Array,
    default: () => [100, 500, 1000, 5000],
  },
});

const emit = defineEmits(["update:modelValue", "enter", "esc"]);
const { __ } = useTranslation();

const chipRefs = ref([]);
const clearChipRef = ref(null);
const inputRef = ref(null);
const activeChipIndex = ref(0);

function getAllChipButtons() {
  const list = [];
  for (let i = 0; i < props.increments.length; i++) {
    if (chipRefs.value[i]) list.push(chipRefs.value[i]);
  }
  if (clearChipRef.value && Number(props.modelValue) > 0) {
    list.push(clearChipRef.value);
  }
  return list;
}

function onInput(event) {
  emit("update:modelValue", event.target.value);
}

function handleChipKeydown(e, idx) {
  const all = getAllChipButtons();
  if (all.length === 0) return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    e.stopPropagation();
    const nextIdx = (idx + 1) % all.length;
    activeChipIndex.value = Math.min(nextIdx, props.increments.length - 1);
    all[nextIdx]?.focus({ preventScroll: true });
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    const prevIdx = (idx - 1 + all.length) % all.length;
    activeChipIndex.value = Math.min(prevIdx, props.increments.length - 1);
    all[prevIdx]?.focus({ preventScroll: true });
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    inputRef.value?.focus({ preventScroll: true });
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.stopPropagation();
    addAmount(props.increments[idx], idx);
  }
}

function handleClearKeydown(e) {
  const all = getAllChipButtons();
  const clearIdx = all.length - 1;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    e.stopPropagation();
    all[0]?.focus({ preventScroll: true });
    activeChipIndex.value = 0;
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    const prevIdx = (clearIdx - 1 + all.length) % all.length;
    all[prevIdx]?.focus({ preventScroll: true });
    activeChipIndex.value = Math.min(prevIdx, props.increments.length - 1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    inputRef.value?.focus({ preventScroll: true });
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.stopPropagation();
    reset();
    inputRef.value?.focus({ preventScroll: true });
  }
}

function onInputKeydown(e) {
  const all = getAllChipButtons();
  if (all.length === 0) return;

  if (e.key === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = Math.min(activeChipIndex.value, all.length - 1);
    all[targetIdx]?.focus({ preventScroll: true });
  } else if (!props.modelValue && e.key === "ArrowRight") {
    e.preventDefault();
    e.stopPropagation();
    activeChipIndex.value = 0;
    all[0]?.focus({ preventScroll: true });
  } else if (!props.modelValue && e.key === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    const lastIdx = all.length - 1;
    activeChipIndex.value = Math.min(lastIdx, props.increments.length - 1);
    all[lastIdx]?.focus({ preventScroll: true });
  } else if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = e.key === "ArrowRight" ? 0 : (all.length - 1);
    all[targetIdx]?.focus({ preventScroll: true });
  }
}

function addAmount(amount, idx) {
  if (idx !== undefined) activeChipIndex.value = idx;
  const current = Number(props.modelValue) || 0;
  emit("update:modelValue", current + amount);
}

function reset() {
  emit("update:modelValue", "");
}

defineExpose({
  focus: () => inputRef.value?.focus({ preventScroll: true }),
});
</script>
