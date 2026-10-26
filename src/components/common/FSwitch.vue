<template>
  <div class="flex items-center gap-3">
    <Button
      @click="toggle"
      @keydown="onKeydown"
      :class="[
        'relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        modelValue ? 'bg-emerald-600' : 'bg-slate-300'
      ]"
      :id="id"
      role="switch"
      :aria-checked="Boolean(modelValue)"
      :label="ariaLabel || __('Toggle yes or no')"
      :aria-label="ariaLabel || __('Toggle yes or no')"
      :aria-describedby="ariaDescribedby"
    >
      <span
        aria-hidden="true"
        :class="[
          'pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          modelValue ? 'translate-x-7' : 'translate-x-0'
        ]"
      />
    </Button>
    <span class="text-base font-semibold text-slate-800">
      {{ modelValue ? __('Yes') : __('No') }}
    </span>
  </div>
</template>

<script setup>
import { Button } from "frappe-ui";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: [Boolean, String, Number],
    default: false,
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

const emit = defineEmits(["update:modelValue", "next"]);
const { __ } = useTranslation();

function toggle() {
  emit("update:modelValue", !props.modelValue);
}

function onKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    emit("next");
  } else if (e.key === " ") {
    e.preventDefault();
    toggle();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    emit("update:modelValue", false);
  } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    emit("update:modelValue", true);
  }
}
</script>
