<template>
  <!-- the grid a question sits under, when its group_code names one (#140) -->
  <div v-if="grid" data-parent-grid class="mb-3 p-3 rounded-xl bg-surface-blue-1 border border-outline-blue-1 text-xs">
    <div class="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
      <ClipboardList class="w-3.5 h-3.5" aria-hidden="true" />
      <span>{{ __('Main table question') }}</span>
    </div>
    <div class="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
      {{ label }}
    </div>
    <div v-if="description" class="text-xs text-slate-500 dark:text-slate-400 mt-1">
      {{ description }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ClipboardList } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  // the grid, from parentGrid; nothing is drawn without one
  grid: {
    type: Object,
    default: null,
  },
});

const { __, getQuestionLabel, getDescription } = useTranslation();
const label = computed(() => getQuestionLabel(props.grid));
const description = computed(() => getDescription(props.grid));
</script>
