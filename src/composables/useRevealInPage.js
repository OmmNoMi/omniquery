import { createSharedComposable, usePreferredReducedMotion } from "@vueuse/core";

// One prefers-reduced-motion listener for every card on the page, not one per card
const useReducedMotion = createSharedComposable(usePreferredReducedMotion);

// Scrolls the page just enough to show an element, such as the option a card's arrow keys moved to.
// The browser keeps it clear of the sticky header and the section footer (html's scroll padding in
// main.css) and of a grouped or matrix card's own header (the card's scroll margin), so the card
// doesn't measure any of them.
export function useRevealInPage() {
  const motion = useReducedMotion();
  return (el) => el?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: motion.value === "reduce" ? "auto" : "smooth" });
}
