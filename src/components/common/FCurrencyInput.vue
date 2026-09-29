<template>
  <div class="flex flex-col gap-2">
    <!-- 1. Auto Suggestion Chips First (Single Roving Tab Group) -->
    <div
      role="group"
      :aria-label="__('Quick Amount Increments')"
      class="flex flex-wrap items-center gap-1.5 pb-0.5"
    >
      <button
        v-for="(increment, idx) in increments"
        :key="increment"
        type="button"
        :tabindex="idx === activeChipIndex ? 0 : -1"
        @keydown="handleChipKeydown($event, idx, increment)"
        @click="addAmount(increment, idx)"
        class="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        +₹{{ increment.toLocaleString() }}
      </button>

      <button
        v-if="modelValue > 0"
        type="button"
        tabindex="-1"
        @click="reset"
        class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 active:scale-95 transition"
      >
        {{ __('Clear') }}
      </button>
    </div>

    <!-- 2. Main Input Field Below Suggestion Chips -->
    <div class="relative rounded-2xl shadow-xs">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <span class="text-slate-400 dark:text-slate-500 font-extrabold text-xl">₹</span>
      </div>
      <input
        type="number"
        :value="modelValue"
        @input="onInput"
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
  increments: {
    type: Array,
    default: () => [100, 500, 1000, 5000],
  },
});

const emit = defineEmits(["update:modelValue", "enter", "esc"]);
const { __ } = useTranslation();

const activeChipIndex = ref(0);

function onInput(event) {
  emit("update:modelValue", event.target.value);
}

function handleChipKeydown(e, idx, increment) {
  if (e.key === "ArrowRight") {
    activeChipIndex.value = (idx + 1) % props.increments.length;
  } else if (e.key === "ArrowLeft") {
    activeChipIndex.value = (idx - 1 + props.increments.length) % props.increments.length;
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    addAmount(increment, idx);
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
</script>
