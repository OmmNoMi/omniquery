<template>
  <div class="relative w-full text-left" ref="rootContainer" data-f-combobox>
    <div class="relative flex items-center w-full">
      <!-- Trigger Button -->
      <button
        ref="triggerBtn"
        type="button"
        role="combobox"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-haspopup="multiple ? 'listbox' : 'listbox'"
        :aria-label="ariaLabel || __('Select options')"
        :disabled="disabled"
        @click="toggleCombobox"
        @keydown="onTriggerKeydown"
        class="w-full min-h-[50px] flex items-center justify-between gap-2 rounded-xl border text-left transition-all outline-none focus:ring-2 focus:ring-[#4285F4]/20 focus:border-[#4285F4] py-2.5 px-3.5"
        :class="[
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
            : 'cursor-pointer bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600',
          'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs'
        ]"
      >
        <!-- Multi-select Summary Display (Compact single-line, zero wrapping explosion) -->
        <div v-if="multiple" class="flex items-center gap-2 flex-1 min-w-0 pr-8 truncate">
          <template v-if="selectedOptions.length === 1">
            <span class="font-bold text-slate-900 dark:text-white truncate">
              {{ selectedOptions[0].label }}
            </span>
          </template>
          <template v-else-if="selectedOptions.length > 1">
            <span class="font-bold text-slate-900 dark:text-white truncate">
              {{ selectedOptions[0].label }}
            </span>
            <span class="px-2 py-0.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
              +{{ selectedOptions.length - 1 }} {{ __('more') }}
            </span>
          </template>
          <span v-else class="text-slate-400 dark:text-slate-500 text-sm font-medium">
            {{ placeholder || __('Select options...') }}
          </span>
        </div>

        <!-- Single-select Display Label -->
        <span v-else class="flex items-center gap-2 min-w-0 flex-1 truncate pr-8">
          <span v-if="displayLabel" class="truncate font-semibold text-slate-900 dark:text-white">
            {{ displayLabel }}
          </span>
          <span v-else class="truncate text-slate-400 dark:text-slate-500 text-sm font-medium">
            {{ placeholder || __('Select an option...') }}
          </span>
        </span>

        <!-- Caret Indicator -->
        <span class="flex items-center shrink-0 text-slate-400 dark:text-slate-500">
          <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-180 text-[#4285F4]': isOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      <!-- Absolute Clear Button (sibling over trigger to keep HTML5 tree spec valid) -->
      <button
        v-if="clearable && hasSelection && !disabled"
        type="button"
        @click.stop="clearAll"
        :aria-label="__('Clear selection')"
        class="absolute right-9 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Dropdown Popover Panel -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 z-50 mt-1.5 rounded-2xl shadow-2xl border p-2 transition-all outline-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
      role="listbox"
      :aria-multiselectable="multiple ? 'true' : 'false'"
    >
      <!-- Search Input -->
      <div class="relative px-1 pt-1 pb-2">
        <div class="relative flex items-center">
          <svg class="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder || __('Search options...')"
            @keydown="onSearchKeydown"
            class="w-full text-xs pl-8 pr-7 py-2.5 rounded-xl border outline-none transition bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#4285F4]/20 focus:border-[#4285F4]"
            aria-autocomplete="list"
          />
          <button
            v-if="searchQuery"
            type="button"
            @mousedown.prevent
            @click="onClearSearch"
            class="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            aria-label="Clear search"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Count Header -->
      <div class="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
        <span>{{ filteredOptions.length }} {{ __('choices') }}</span>
        <span v-if="multiple" class="text-blue-600 dark:text-blue-400">
          {{ selectedList.length }} {{ __('selected') }}
        </span>
      </div>

      <!-- Scrollable Options List: Chip / Button Cards Grid -->
      <div class="max-h-72 overflow-y-auto p-1" ref="optionsList">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" role="listbox">
          <button
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            :ref="(el) => { if (el) optionRefs[index] = el; }"
            type="button"
            role="option"
            :aria-selected="isOptionSelected(option.value) ? 'true' : 'false'"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = index"
            class="w-full text-left p-2.5 sm:p-3 rounded-xl border-2 transition-all flex items-center gap-2.5 cursor-pointer select-none active:scale-[0.98] outline-none"
            :class="[
              isOptionSelected(option.value)
                ? (multiple
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-[#4285F4] text-blue-950 dark:text-blue-100 font-bold shadow-xs'
                    : 'bg-[#4285F4] text-white border-[#4285F4] shadow-xs font-bold')
                : index === highlightedIndex
                  ? 'bg-slate-100 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium'
                  : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
            ]"
          >
            <!-- Left: Sharp Square Checkbox for Multi-Select -->
            <span
              v-if="multiple"
              :class="[
                'w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition shrink-0',
                isOptionSelected(option.value)
                  ? 'bg-[#4285F4] border-[#4285F4] text-white shadow-2xs'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              ]"
            >
              <svg v-if="isOptionSelected(option.value)" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>

            <!-- Left: Radio Circle for Single-Select -->
            <span
              v-else
              :class="[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0',
                isOptionSelected(option.value)
                  ? 'border-white bg-white/20 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              ]"
            >
              <span v-if="isOptionSelected(option.value)" class="w-2 h-2 rounded-full bg-white"></span>
            </span>

            <span class="truncate text-xs sm:text-sm font-semibold leading-snug flex-1">{{ option.label }}</span>
          </button>
        </div>

        <div v-if="filteredOptions.length === 0" class="py-6 text-center text-xs text-slate-400">
          <div>{{ __('No options found') }}</div>
        </div>
      </div>

      <!-- Multiselect Bottom Action Footer (Clean Done Button on Right, No Duplicate Selected Count) -->
      <div v-if="multiple" class="pt-2 mt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end px-1">
        <button
          type="button"
          @click="closeCombobox"
          class="px-4 py-1.5 rounded-lg bg-[#4285F4] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
        >
          {{ __('Done') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: "",
  },
  searchPlaceholder: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  ariaLabel: {
    type: String,
    default: "Select options",
  },
});

const emit = defineEmits(["update:modelValue"]);
const { __ } = useTranslation();

const isOpen = ref(false);
const searchQuery = ref("");
const searchInput = ref(null);
const triggerBtn = ref(null);
const rootContainer = ref(null);
const highlightedIndex = ref(0);
const optionRefs = ref([]);

const normalizedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return { value: opt.value || opt.label, label: __(opt.label || opt.value) };
    }
    return { value: opt, label: __(String(opt)) };
  });
});

const selectedList = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : (props.modelValue ? [props.modelValue] : []);
  }
  return props.modelValue !== "" && props.modelValue !== null && props.modelValue !== undefined ? [props.modelValue] : [];
});

const selectedOptions = computed(() => {
  return selectedList.value.map((val) => {
    const found = normalizedOptions.value.find((o) => String(o.value) === String(val));
    return found || { value: val, label: String(val) };
  });
});

const hasSelection = computed(() => selectedList.value.length > 0);

const displayLabel = computed(() => {
  if (selectedOptions.value.length === 0) return "";
  return selectedOptions.value[0].label;
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) return normalizedOptions.value;
  const q = searchQuery.value.toLowerCase();
  return normalizedOptions.value.filter((o) => o.label.toLowerCase().includes(q));
});

function isOptionSelected(val) {
  return selectedList.value.some((item) => String(item) === String(val));
}

function toggleCombobox() {
  isOpen.value ? closeCombobox() : openCombobox();
}

function openCombobox() {
  isOpen.value = true;
  highlightedIndex.value = 0;
}

function closeCombobox() {
  isOpen.value = false;
  searchQuery.value = "";
  if (triggerBtn.value) triggerBtn.value.focus();
}

function onTriggerKeydown(e) {
  if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Enter", " "].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    openCombobox();
  } else if (e.key === "Escape" && isOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    closeCombobox();
  }
}

function onSearchKeydown(e) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    moveHighlight(e.key === "ArrowDown" ? 1 : -1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    selectHighlighted();
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    closeCombobox();
  } else if (e.key === "Backspace" && !searchQuery.value && props.multiple && selectedList.value.length > 0) {
    removeOption(selectedList.value[selectedList.value.length - 1]);
  }
}

function moveHighlight(direction) {
  const len = filteredOptions.value.length;
  if (len === 0) return;
  highlightedIndex.value = (highlightedIndex.value + direction + len) % len;
  scrollToHighlighted();
}

function selectHighlighted() {
  const opt = filteredOptions.value[highlightedIndex.value];
  if (opt) selectOption(opt);
}

function scrollToHighlighted() {
  nextTick(() => {
    const el = optionRefs.value[highlightedIndex.value];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  });
}

function selectOption(opt) {
  if (props.multiple) {
    const list = [...selectedList.value];
    const idx = list.findIndex((item) => String(item) === String(opt.value));
    if (idx > -1) list.splice(idx, 1);
    else list.push(opt.value);
    emit("update:modelValue", list);
  } else {
    emit("update:modelValue", opt.value);
    closeCombobox();
  }
}

function removeOption(val) {
  const list = selectedList.value.filter((item) => String(item) !== String(val));
  emit("update:modelValue", list);
}

function clearAll() {
  emit("update:modelValue", props.multiple ? [] : "");
  if (isOpen.value && searchInput.value) searchInput.value.focus();
}

function handleClickOutside(e) {
  if (rootContainer.value && !rootContainer.value.contains(e.target)) {
    isOpen.value = false;
  }
}

function onClearSearch() {
  searchQuery.value = "";
  nextTick(() => {
    searchInput.value?.focus({ preventScroll: true });
  });
}

watch(searchQuery, () => {
  highlightedIndex.value = 0;
  optionRefs.value = [];
});

watch(isOpen, async (open) => {
  if (open) {
    highlightedIndex.value = 0;
    optionRefs.value = [];
    await nextTick();
    if (searchInput.value) searchInput.value.focus({ preventScroll: true });
  } else {
    searchQuery.value = "";
  }
});

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

defineExpose({
  focus: () => triggerBtn.value?.focus(),
});
</script>
