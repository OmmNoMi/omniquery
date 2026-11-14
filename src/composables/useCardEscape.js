/**
 * Escape handling for a focusable question card (#42).
 *
 * Escape inside one of the card's fields moves focus back to the card and stops there. Escape on
 * the card itself is left to bubble, so the reka layer around it (the focus-mode Dialog) closes on
 * the next press. Widgets that use Escape themselves (an open combobox, a search box with text)
 * stop it before it reaches the card.
 */
export function useCardEscape(cardRef) {
  return function onCardEscape(event) {
    if (!cardRef.value || event.target === cardRef.value) return;
    event.stopPropagation();
    cardRef.value.focus();
  };
}
