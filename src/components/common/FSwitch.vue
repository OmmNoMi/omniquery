<template>
  <div class="flex items-center gap-3">
    <button
      type="button"
      @click="toggle"
      :class="[
        'relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
        modelValue ? 'bg-emerald-600' : 'bg-slate-300'
      ]"
      role="switch"
      :aria-checked="Boolean(modelValue)"
    >
      <span
        aria-hidden="true"
        :class="[
          'pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          modelValue ? 'translate-x-7' : 'translate-x-0'
        ]"
      />
    </button>
    <span class="text-base font-semibold text-slate-800">
      {{ modelValue ? __('Yes') : __('No') }}
    </span>
  </div>
</template>

<script setup>
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: [Boolean, String, Number],
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);
const { __ } = useTranslation();

function toggle() {
  emit("update:modelValue", !props.modelValue);
}
</script>
