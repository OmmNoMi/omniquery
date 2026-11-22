// How a question is laid out in the survey: as a matrix card, or under a group's heading. Both read
// only what the template sets on the question; nothing keys off a question_code or a client's own
// wording, so another client's survey lays out the same way (#14).
const MATRIX_FIELD_TYPES = new Set(["dynamic grid", "table", "matrix"]);

export function isMatrixQuestion(q) {
  if (!q) return false;
  return MATRIX_FIELD_TYPES.has((q.field_type || "").toLowerCase()) || q.control_variant === "Matrix";
}

// A group takes its code and title from its first question's group_code and group_title. Without
// them it is named by what the survey already shows: its number, or the question before it.
export function groupHeading(first, fallbackCode, fallbackTitle) {
  return {
    group_code: first.group_code || fallbackCode,
    title: first.group_title || fallbackTitle,
  };
}

// The grid a question sits under, when the template says so: its group_code names a matrix question
// of the section. A question is never put under a grid for the shape of its label (#140).
export function parentGrid(question, sectionQuestions) {
  const code = question?.group_code;
  if (!code || code === question.question_code) return null;
  const grid = sectionQuestions.find((other) => other.question_code === code);
  return isMatrixQuestion(grid) ? grid : null;
}

// The survey's questions as the page shows them: single cards, matrix cards, and runs of lettered
// sub-questions (Q3a, Q3b or a., b.) under one heading. A grid is always a matrix card (#140).
// __ translates the one fallback title.
export function layoutQuestions(questions, __ = (text) => text) {
  const items = [];
  let i = 0;
  while (i < questions.length) {
    const q = questions[i];
    const label = q.label_en || q.label || "";

    if (isMatrixQuestion(q)) {
      items.push({
        type: "matrix",
        question: q,
      });
      i++;
      continue;
    }

    const qSubMatch = label.match(/^(Q\d+)([a-z])\.\s*(.*)$/i);
    if (qSubMatch) {
      const baseNum = qSubMatch[1];
      const groupQuestions = [q];
      let j = i + 1;
      while (j < questions.length) {
        const nextQ = questions[j];
        const nextLabel = nextQ.label_en || nextQ.label || "";
        const nextMatch = nextLabel.match(/^(Q\d+)([a-z])\.\s*(.*)$/i);
        if (nextMatch && nextMatch[1].toLowerCase() === baseNum.toLowerCase()) {
          groupQuestions.push(nextQ);
          j++;
        } else {
          break;
        }
      }
      if (groupQuestions.length > 1) {
        items.push({
          type: "group",
          ...groupHeading(q, `group_${baseNum}`, baseNum),
          number: baseNum,
          description: "",
          questions: groupQuestions,
        });
        i = j;
        continue;
      }
    }

    if (/^[a-z]\.\s+/i.test(label)) {
      const groupQuestions = [q];
      let j = i + 1;
      while (j < questions.length) {
        const nextQ = questions[j];
        const nextLabel = nextQ.label_en || nextQ.label || "";
        if (/^[a-z]\.\s+/i.test(nextLabel)) {
          groupQuestions.push(nextQ);
          j++;
        } else {
          break;
        }
      }
      if (groupQuestions.length > 1) {
        // a grid before the run is its own card, not the run's lead question (#140)
        const prev = items[items.length - 1];
        const prevQuestion = prev?.type === "single" ? prev.question : null;
        const prevLabel = prevQuestion ? prevQuestion.label_en || prevQuestion.label || "" : "";
        items.push({
          type: "group",
          ...groupHeading(q, `group_${q.question_code}`, prevLabel || __("Breakdown table")),
          number: "TABLE",
          description: "",
          questions: groupQuestions,
        });
        i = j;
        continue;
      }
    }

    items.push({
      type: "single",
      question: q,
    });
    i++;
  }
  return items;
}
