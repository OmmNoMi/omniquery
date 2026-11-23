// Choices that depend on an earlier answer, such as Block under District (#24). A question with
// depends_on_field names its parent's question_code, and its options are an object of parent
// option -> that parent's choices. omniquery/services/cascading_options.py holds the same rules
// for the server, which checks every submitted answer against them.
import { splitQuestionNumber } from "./questionLayout";

export function isGroupedOptions(options) {
  return Boolean(options) && typeof options === "object" && !Array.isArray(options);
}

export function hasOptions(options) {
  if (Array.isArray(options)) return options.length > 0;
  return isGroupedOptions(options) && Object.keys(options).length > 0;
}

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

// a question's choices for one parent answer; none until the parent is answered
export function optionsForParent(options, parentValue) {
  if (!isGroupedOptions(options)) return Array.isArray(options) ? options : [];
  if (isBlank(parentValue)) return [];
  return options[String(parentValue)] || [];
}

// the template's questions by question_code, for dependsOnQuestion
export function byQuestionCode(questions) {
  return new Map((questions || []).map((question) => [question.question_code, question]));
}

// the question a dependent question's choices come from (District for Block), wherever it sits
export function dependsOnQuestion(question, questionsByCode) {
  const code = question && question.depends_on_field;
  return (code && questionsByCode && questionsByCode.get(code)) || null;
}

// why a dependent question has no choices to offer: "parent" until its parent is answered,
// "none" when the parent's answer has no choices of its own, null when it has choices
export function choicesWaitOn(question, parentValue) {
  if (!question || !question.depends_on_field || !isGroupedOptions(question.options)) return null;
  if (isBlank(parentValue)) return "parent";
  return optionsForParent(question.options, parentValue).length ? null : "none";
}

// what a dependent question with nothing to offer says, in place of its choices: which question to
// answer first ("Answer “District” (Q1) first"), or that the parent's answer has no choices. Never
// "No matching options", which reads as a search that found nothing. `__` and getQuestionLabel are
// useTranslation's, and parent is dependsOnQuestion's; "" when there are choices to show.
export function choicesWaitMessage({ __, getQuestionLabel }, question, parentValue, parent) {
  const waitsOn = choicesWaitOn(question, parentValue);
  if (waitsOn === "none") return __("There are no choices for {0}.", [parentValue]);
  if (waitsOn !== "parent") return "";
  if (!parent) return __("Answer the question these choices depend on first.");
  const { number, text } = splitQuestionNumber(getQuestionLabel(parent));
  const name = number ? `“${text}” (${number})` : `“${text}”`;
  return __("Answer {0} first. These choices depend on it.", [name]);
}

export function parentAnswer(question, responses) {
  const parent = question && question.depends_on_field;
  return parent && responses ? responses[parent] : undefined;
}

function optionValue(option) {
  return typeof option === "object" && option !== null ? (option.value ?? option.label) : option;
}

// [{ value, label, compiled }]. The value is the option as authored, so a stored answer (and the
// parent answer a dependent question is keyed by) is the same in every language. label is the
// authored text and compiled its options_translated entry, which is in the language of whoever
// submitted the template; show a choice with getOptionLabel from useTranslation, which picks
// between them for the surveyor's language (#165).
export function choiceOptions(question, parentValue) {
  const raw = optionsForParent(question.options, parentValue);
  const translated = optionsForParent(question.options_translated, parentValue);
  return raw.map((option, index) => {
    const value = optionValue(option);
    if (typeof option === "object" && option !== null) {
      return { value, label: String(option.label || value), compiled: "" };
    }
    const compiled = translated[index];
    return { value, label: String(value), compiled: typeof compiled === "string" ? compiled : "" };
  });
}

// the answer left once the parent's answer changes: a single choice that is no longer offered is
// cleared, and a multiple choice keeps only the choices still offered
function prunedAnswer(question, answer, parentValue) {
  const allowed = new Set(optionsForParent(question.options, parentValue).map((o) => String(optionValue(o))));
  if (Array.isArray(answer)) {
    const kept = answer.filter((value) => allowed.has(String(value)));
    if (kept.length === answer.length) return answer;
    return kept.length ? kept : undefined;
  }
  return allowed.has(String(answer)) ? answer : undefined;
}

// { question_code: new answer } for every question below `code` whose answer the change made
// invalid, Block under District and anything under Block in turn. undefined means clear it.
export function staleDependentAnswers(questions, responses, code) {
  const answers = { ...responses };
  const updates = {};
  const changed = [code];
  while (changed.length) {
    const parent = changed.shift();
    for (const question of questions || []) {
      const child = question.question_code;
      if (question.depends_on_field !== parent || isBlank(answers[child])) continue;
      const next = prunedAnswer(question, answers[child], answers[parent]);
      if (next === answers[child]) continue;
      updates[child] = next;
      answers[child] = next;
      changed.push(child);
    }
  }
  return updates;
}
