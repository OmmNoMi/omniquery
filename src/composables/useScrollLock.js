import { watch, onUnmounted, toRef } from "vue";

let lockCount = 0;
let prevBodyOverflow = "";
let prevHtmlOverflow = "";
let prevBodyPaddingRight = "";

export function useScrollLock(isOpenRef) {
  function lock() {
    if (typeof document === "undefined") return;
    if (lockCount === 0) {
      prevBodyOverflow = document.body.style.overflow;
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.classList.add("modal-open-scroll-locked");
    }
    lockCount++;
  }

  function unlock() {
    if (typeof document === "undefined") return;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = prevBodyOverflow || "";
      document.documentElement.style.overflow = prevHtmlOverflow || "";
      document.body.style.paddingRight = prevBodyPaddingRight || "";
      document.body.classList.remove("modal-open-scroll-locked");
    }
  }

  if (isOpenRef) {
    const refToWatch = typeof isOpenRef.value !== "undefined" ? isOpenRef : toRef(isOpenRef);
    watch(
      refToWatch,
      (open) => {
        if (open) {
          lock();
        } else {
          unlock();
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      if (refToWatch.value) {
        unlock();
      }
    });
  }

  return {
    lock,
    unlock,
  };
}
