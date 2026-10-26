import { nextTick } from "vue";

/**
 * Universal Modal Stack & Focus Manager for OmniQuery.
 * Ensures that stacked dialogs, sheets, and focus overlays dismiss exactly one layer per Escape press,
 * and seamlessly restore focus to the opening element upon closure.
 */
const activeModalStack = [];
let isGlobalEscapeAttached = false;

function handleGlobalEscape(e) {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  if (activeModalStack.length === 0) return;

  // The topmost modal on the stack handles Escape
  const top = activeModalStack[activeModalStack.length - 1];
  if (top && typeof top.close === "function") {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    top.close(e);
  }
}

function ensureEscapeListener() {
  if (!isGlobalEscapeAttached && typeof window !== "undefined") {
    // Capture phase ensures we intercept Escape before nested components can unilaterally swallow it
    window.addEventListener("keydown", handleGlobalEscape, true);
    isGlobalEscapeAttached = true;
  }
}

/**
 * Register a modal when it becomes active.
 * @param {Object} modal - { id, close: Function, triggerEl: HTMLElement }
 */
export function registerModal(modal) {
  ensureEscapeListener();
  if (!modal.triggerEl && typeof document !== "undefined" && document.activeElement) {
    modal.triggerEl = document.activeElement;
  }
  // Avoid duplicate entries
  const existingIdx = activeModalStack.findIndex((m) => m.id === modal.id);
  if (existingIdx !== -1) {
    activeModalStack.splice(existingIdx, 1);
  }
  activeModalStack.push(modal);
}

/**
 * Unregister a modal when closed or unmounted.
 * Restores focus to the trigger element that launched the modal.
 * @param {string|Object} idOrModal
 */
export function unregisterModal(idOrModal) {
  const idx = activeModalStack.findIndex((m) =>
    typeof idOrModal === "string" ? m.id === idOrModal : m === idOrModal
  );
  if (idx !== -1) {
    const [removed] = activeModalStack.splice(idx, 1);
    if (removed && removed.triggerEl && typeof removed.triggerEl.focus === "function") {
      nextTick(() => {
        try {
          // Only restore if current activeElement is body or was inside the unmounted modal
          if (
            document.activeElement === document.body ||
            !document.body.contains(document.activeElement)
          ) {
            removed.triggerEl.focus();
          }
        } catch (err) {}
      });
    }
  }
}

export function getTopModal() {
  return activeModalStack[activeModalStack.length - 1] || null;
}

export function getModalStack() {
  return activeModalStack;
}

export function useModalStack() {
  return {
    registerModal,
    unregisterModal,
    getTopModal,
    getModalStack,
  };
}
