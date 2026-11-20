// The required and invalid state of a group of answer choices, for v-bind on the element that
// carries role="radiogroup" or role="group" (#19). The element names itself with
// aria-labelledby, which test/guards/choice_group_names.test.js checks in the template.
//
// ARIA 1.2 allows aria-required, aria-invalid and aria-errormessage on a radiogroup but not on a
// group (a multi-select), so a group says both through aria-describedby instead: requiredId is a
// visually hidden "Required" and errorId the validation message.
export function choiceGroupState({ multi = false, required = false, requiredId, descriptionId, errorId } = {}) {
  const describedBy = (...ids) => ids.filter(Boolean).join(" ") || undefined;
  if (multi) {
    return { "aria-describedby": describedBy(descriptionId, required && requiredId, errorId) };
  }
  return {
    "aria-describedby": describedBy(descriptionId),
    "aria-required": Boolean(required),
    "aria-invalid": Boolean(errorId),
    "aria-errormessage": errorId || undefined,
  };
}
