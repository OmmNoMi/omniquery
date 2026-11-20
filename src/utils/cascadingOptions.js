// Choices that depend on an earlier answer, such as Block under District (#24). A question with
// depends_on_field names its parent's question_code, and its options are an object of parent
// option -> that parent's choices. omniquery/services/cascading_options.py holds the same rules
// for the server, which checks every submitted answer against them.

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

export function parentAnswer(question, responses) {
  const parent = question && question.depends_on_field;
  return parent && responses ? responses[parent] : undefined;
}

function optionValue(option) {
  return typeof option === "object" && option !== null ? (option.value ?? option.label) : option;
}

// [{ value, label }]. The value is the option as authored, so a stored answer (and the parent
// answer a dependent question is keyed by) is the same in every language; only the label is
// the compiled translation.
export function choiceOptions(question, parentValue) {
  const raw = optionsForParent(question.options, parentValue);
  const translated = optionsForParent(question.options_translated, parentValue);
  return raw.map((option, index) => {
    const value = optionValue(option);
    if (typeof option === "object" && option !== null) {
      return { value, label: String(option.label || value) };
    }
    const label = translated[index];
    return { value, label: typeof label === "string" && label ? label : String(value) };
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
