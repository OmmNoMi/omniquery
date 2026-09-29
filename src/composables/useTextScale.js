import { ref, onMounted } from "vue";

export function useTextScale() {
  const textSize = ref("md");

  function setTextSize(size) {
    textSize.value = size;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("omniquery_text_size", size);
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("text-scale-sm", "text-scale-md", "text-scale-lg", "text-scale-xl");
      document.documentElement.classList.add(`text-scale-${size}`);
    }
  }

  function cycleTextSize() {
    const sequence = ["md", "lg", "xl"];
    const currentIndex = sequence.indexOf(textSize.value);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setTextSize(sequence[nextIndex]);
  }

  onMounted(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("omniquery_text_size") || "md";
      setTextSize(saved);
    }
  });

  return {
    textSize,
    setTextSize,
    cycleTextSize,
  };
}
