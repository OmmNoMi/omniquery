<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overscroll-contain select-none"
        @click.self="handleBackdropClick"
        @wheel.stop
        @touchmove.self.prevent
        role="dialog"
        aria-modal="true"
      >
        <div
          class="bg-white dark:bg-slate-900 w-full rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-up overscroll-contain"
          :class="[sizeClass, maxHeightClass, customClass]"
        >
          <!-- Modal Header -->
          <div
            v-if="!hideHeader"
            class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0"
          >
            <slot name="header">
              <div class="flex items-center gap-2.5 min-w-0">
                <span v-if="icon" class="text-2xl shrink-0">{{ icon }}</span>
                <div class="min-w-0">
                  <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {{ title }}
                  </h3>
                  <p v-if="subtitle" class="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {{ subtitle }}
                  </p>
                </div>
              </div>
            </slot>

            <button
              v-if="showCloseButton"
              type="button"
              @click="$emit('close')"
              class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition shrink-0 cursor-pointer"
              :title="__('Close')"
            >
              ✕
            </button>
          </div>

          <!-- Modal Scrollable Content Body -->
          <div
            class="flex-1 overflow-y-auto overscroll-contain"
            :class="bodyClass"
          >
            <slot />
          </div>

          <!-- Modal Footer -->
          <div
            v-if="$slots.footer || showFooter"
            class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end shrink-0"
          >
            <slot name="footer">
              <button
                type="button"
                @click="$emit('close')"
                class="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
              >
                {{ __('Close') }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, toRef, onMounted, onUnmounted } from "vue";
import { useScrollLock } from "../../composables/useScrollLock";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "xl", // sm, md, lg, xl, 2xl, 3xl, full
  },
  maxHeightClass: {
    type: String,
    default: "max-h-[88vh]",
  },
  hideHeader: {
    type: Boolean,
    default: false,
  },
  showFooter: {
    type: Boolean,
    default: false,
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
  bodyClass: {
    type: String,
    default: "",
  },
  customClass: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close"]);
const { __ } = useTranslation();

// Automatic body scroll locking: strictly prevents background scrolling while open
useScrollLock(toRef(props, "isOpen"));

const sizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "max-w-sm";
    case "md":
      return "max-w-md";
    case "lg":
      return "max-w-lg";
    case "xl":
      return "max-w-xl";
    case "2xl":
      return "max-w-2xl";
    case "3xl":
      return "max-w-3xl";
    case "full":
      return "max-w-full h-full max-h-none rounded-none";
    default:
      return "max-w-xl";
  }
});

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    emit("close");
  }
}

function handleKeyDown(e) {
  if (props.isOpen && props.closeOnEsc && e.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeyDown);
  }
});
</script>
