// A respondent's mobile number (#22). A question is a phone number only when its template sets
// field type Phone; nothing is guessed from its code or label, so a question like "owns_smartphone"
// stays a Yes/No. omniquery/services/phone.py holds the same rule for the server, which refuses a
// submitted response that breaks it; keep the two in step.

export const PHONE_FIELD_TYPE = "Phone";
export const PHONE_ERROR = "Enter a 10-digit mobile number";

// the characters Frappe's validate_phone_number allows
const PHONE_CHARACTERS = /^[0-9 +_\-,.*#()]{1,20}$/;

export function isPhoneQuestion(question) {
  return question?.field_type === PHONE_FIELD_TYPE;
}

// ten digits, written with spaces, dashes or brackets, and with +91, 91 or 0 in front if wanted
export function isValidMobile(value) {
  const text = String(value ?? "").trim();
  if (!PHONE_CHARACTERS.test(text)) return false;
  let digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10;
}
