// The frappe-ui Button look for one answer in a set of choices (an option, a year, a range value).
// Colour comes from Button's `variant` and `theme`, never from bg/text classes: Button's own
// subtle/gray defaults win over those (see AGENTS.md). Only theme gray is built from frappe-ui's
// light/dark tokens in every variant; green's text is a fixed text-green-800 that falls to 1.5:1 on
// its own dark-mode background, and solid green is 3.1:1 in light mode. So every choice is an
// outline gray Button, and a selected one adds the `choice-selected` class: a pale green card with
// dark green text and a thick green edge, defined in src/styles/main.css for light and dark mode.
// Solid gray was too heavy on a phone, and a light gray fill too faint to read outdoors.
// Anything drawn inside a choice (a radio dot, a check box) uses currentColor.
export const CHOICE_SELECTED_CLASS = "choice-selected";

export function choiceButtonProps(selected) {
  return selected
    ? { variant: "outline", theme: "gray", class: CHOICE_SELECTED_CLASS }
    : { variant: "outline", theme: "gray" };
}
