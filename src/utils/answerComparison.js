// One number answer checked against another, such as expenses against income (#159). A template row's
// Validation Rules (JSON) names the other question beside its min/max:
//   {"compare_to": "q_income", "operator": "lte", "message": "Expenses cannot exceed income"}
// omniquery/services/answer_comparisons.py refuses a template whose rule the device could not check,
// when the template is submitted; keep the two in step. The server does not check a Response against
// the rule: it cannot tell which questions the surveyor was shown.

export const COMPARISON_OPERATORS = {
  lte: (a, b) => a <= b,
  gte: (a, b) => a >= b,
  eq: (a, b) => a === b,
};

// shown for a rule with no message; a template submitted before #159 was never checked for one
export const COMPARISON_FALLBACK = "This answer does not fit with an earlier answer";

// a plain number as typed: no thousands separators, units or blanks
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export function comparisonRule(question) {
  const rule = question?.validation_rules;
  return rule && rule.compare_to && rule.operator ? rule : null;
}

// the answer as a number, or null when there is none to compare yet
export function answerNumber(value) {
  const text = String(value ?? "").trim();
  return NUMBER.test(text) ? Number(text) : null;
}

// The rule's message when the question's answer breaks it, else "". A rule waits until both answers
// are numbers, so a blank income never reads as 0 and holds the surveyor on expenses. messageOf picks
// the message in the surveyor's language (useTranslation's getRuleMessage).
export function comparisonError(question, answers, messageOf = (rule) => rule.message) {
  const rule = comparisonRule(question);
  if (!rule || !Object.hasOwn(COMPARISON_OPERATORS, rule.operator)) return "";
  const compare = COMPARISON_OPERATORS[rule.operator];
  const a = answerNumber(answers[question.question_code]);
  const b = answerNumber(answers[rule.compare_to]);
  if (a === null || b === null) return "";
  return compare(a, b) ? "" : messageOf(rule) || COMPARISON_FALLBACK;
}
