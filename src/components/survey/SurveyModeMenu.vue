<template>
  <!--
    Survey Mode menu, shared by the section footer and focus mode (#42). Built on reka's DropdownMenu,
    the primitive under frappe-ui's Dropdown: each toggle is a menuitemcheckbox with aria-checked, so
    arrow keys reach it and screen readers hear its state. frappe-ui's own `switch: true` option
    renders a row that is not a menu item, which a keyboard cannot reach (see AGENTS.md). Escape
    closes only the menu and focus returns to the trigger. A class on <SurveyModeMenu> lands on the
    trigger button.
  -->
  <DropdownMenuRoot v-slot="{ open }">
    <DropdownMenuTrigger as-child>
      <Button ref="triggerRef" v-bind="$attrs" :label="activeModeLabel" :title="__('Survey mode')">
        <template #prefix>
          <component :is="activeModeIcon" class="w-3.5 h-3.5" aria-hidden="true" />
        </template>
        <template #suffix>
          <ChevronDown
            class="w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0"
            :class="{ 'rotate-180': open }"
            aria-hidden="true"
          />
        </template>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        side="top"
        align="center"
        :side-offset="6"
        @close-auto-focus="onCloseAutoFocus"
        class="dropdown-content z-50 w-64 rounded-lg bg-surface-modal p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
      >
        <DropdownMenuLabel class="flex h-7 items-center px-2 text-sm font-medium text-ink-gray-5">
          {{ __("Survey options") }}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          v-for="toggle in toggles"
          :key="toggle.key"
          :modelValue="toggle.checked"
          class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-base text-ink-gray-8 outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3 data-[highlighted]:bg-surface-gray-3"
          @select="(event) => onSelect(toggle, event)"
        >
          <component :is="toggle.icon" class="size-4 shrink-0 text-ink-gray-6" aria-hidden="true" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-medium">{{ toggle.label }}</span>
            <span class="text-sm text-ink-gray-6">{{ toggle.description }}</span>
          </span>
          <!-- the switch is drawn only; the menu item carries the checked state -->
          <span
            aria-hidden="true"
            class="relative flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition-colors"
            :class="toggle.checked ? 'bg-surface-gray-7' : 'bg-surface-gray-4'"
          >
            <span
              class="size-3 rounded-full bg-white shadow-sm transition-transform"
              :class="toggle.checked ? 'translate-x-3' : 'translate-x-0'"
            />
          </span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup>
import { computed, ref } from "vue";
import { Button } from "frappe-ui";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { ChevronDown, ClipboardList, FileText, Target, Zap } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  autoAdvance: { type: Boolean, default: false },
  isFullForm: { type: Boolean, default: false },
  isFocusMode: { type: Boolean, default: false },
});

const emit = defineEmits(["toggle-auto-advance", "toggle-full-form", "toggle-focus-mode"]);
const { __ } = useTranslation();

// keepOpen: the menu stays open so several settings can be flipped; Focus form opens or closes a
// dialog, so the menu closes with it
const toggles = computed(() => [
  {
    key: "auto-advance",
    label: __("Auto advance"),
    description: __("Next question on answer"),
    icon: Zap,
    checked: props.autoAdvance,
    keepOpen: true,
  },
  {
    key: "full-form",
    label: __("Full form"),
    description: __("Show all fields (incl. N/A)"),
    icon: ClipboardList,
    checked: props.isFullForm,
    keepOpen: true,
  },
  {
    key: "focus-mode",
    label: __("Focus form"),
    description: __("One-by-one popup card"),
    icon: Target,
    checked: props.isFocusMode,
    keepOpen: false,
  },
]);

const triggerRef = ref(null);
let pendingToggle = null;

function onSelect(toggle, event) {
  if (!toggle.keepOpen) {
    pendingToggle = toggle.key;
    return;
  }
  event.preventDefault();
  emit(`toggle-${toggle.key}`);
}

// A toggle that opens or closes a dialog waits until the menu has given focus back to its trigger,
// so the dialog records the trigger, not the vanishing menu item, as the place to return focus to.
// reka would refocus the trigger a tick later; doing it here, before the emit, keeps the order.
function onCloseAutoFocus(event) {
  if (!pendingToggle) return;
  event.preventDefault();
  triggerRef.value?.rootRef?.focus(); // frappe-ui Button exposes its DOM element as rootRef
  emit(`toggle-${pendingToggle}`);
  pendingToggle = null;
}

// The label names the toggles that are on; focus mode itself shows only when nothing else is.
const activeModeLabel = computed(() => {
  if (props.isFullForm && props.autoAdvance) return __("Full (auto)");
  if (props.isFullForm) return __("Full form");
  if (props.autoAdvance) return __("Auto advance");
  return props.isFocusMode ? __("Focus form") : __("Standard");
});

const activeModeIcon = computed(() => {
  if (props.autoAdvance) return Zap;
  if (props.isFullForm) return ClipboardList;
  return props.isFocusMode ? Target : FileText;
});
</script>
