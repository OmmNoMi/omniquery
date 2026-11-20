// The one sentence an unanswered required question shows (#23). useSurvey marks the question with
// REQUIRED_ERROR; the card that draws it knows which control it shows, so it turns the marker into
// "Choose District" or "Enter Entrepreneur Name". Other errors (a wrong phone number, a cross-field
// rule) are shown as they are.
import { PHONE_ERROR } from "./phone";

export const REQUIRED_ERROR = "This field is required";

// the label, unless it is itself a question ("Does the SHG keep a cash book?"), which cannot
// follow "Choose" or "Enter"
function nameOf(label) {
  const text = String(label ?? "").trim();
  return text && !/[?？]$/.test(text) ? text : "";
}

// `__` is useTranslation's. `action` is what the control asks for: "choose" (choices, switches,
// ratings, sliders, dates), "phone", "location", or "enter" for anything typed.
export function requiredMessage(__, action, label) {
  if (action === "phone") return __(PHONE_ERROR);
  if (action === "location") return __("Capture the location");
  const name = nameOf(label);
  if (action === "choose") return name ? __("Choose {0}", [name]) : __("Choose an answer");
  return name ? __("Enter {0}", [name]) : __("Enter an answer");
}

// the text to show for a question's section error, translated
export function errorText(__, error, action, label) {
  if (!error) return "";
  return error === REQUIRED_ERROR ? requiredMessage(__, action, label) : __(error);
}
