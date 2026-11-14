// The frappe-ui Button look for one answer in a set of choices (an option, a year, a range value).
// Colour comes from Button's `variant` and `theme`, never from bg/text classes: Button's own
// subtle/gray defaults win over those (see AGENTS.md). Only theme gray is built from frappe-ui's
// light/dark tokens in every variant; green's text is a fixed text-green-800 that falls to 1.5:1 on
// its own dark-mode background, and solid green is 3.1:1 in light mode. So a selected choice is
// solid gray (dark in light mode, light in dark mode) and anything drawn inside it uses currentColor.
export function choiceButtonProps(selected) {
  return selected ? { variant: "solid", theme: "gray" } : { variant: "outline", theme: "gray" };
}
