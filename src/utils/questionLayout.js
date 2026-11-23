// How a question is laid out in the survey: as a matrix card, or under a group's heading. Both read
// only what the template sets on the question; nothing keys off a question_code or a client's own
// wording, so another client's survey lays out the same way (#14).
const MATRIX_FIELD_TYPES = new Set(["dynamic grid", "table", "matrix"]);

export function isMatrixQuestion(q) {
  if (!q) return false;
  return MATRIX_FIELD_TYPES.has((q.field_type || "").toLowerCase()) || q.control_variant === "Matrix";
}

// A template's sections and questions in their Order (display_order), the template's row order
// breaking ties, as the template editor shows them. The compiled schema keeps the rows in the order
// they were saved, so a question moved by its Order alone came out of place, in the full form and in
// focus mode (#169). A row with no Order keeps its own place, as the compiler gives it its idx.
export function inDisplayOrder(schema) {
  if (!schema) return schema;
  return { ...schema, sections: byDisplayOrder(schema.sections), questions: byDisplayOrder(schema.questions) };
}

function byDisplayOrder(rows) {
  if (!Array.isArray(rows)) return rows;
  const order = (row, index) => (Number(row?.display_order) > 0 ? Number(row.display_order) : index + 1);
  return rows
    .map((row, index) => ({ row, index, at: order(row, index) }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map(({ row }) => row);
}

// A group takes its code and title from its first question's group_code and group_title. Without
// them it is named by what the survey already shows: its number, or the question before it.
export function groupHeading(first, fallbackCode, fallbackTitle) {
  return {
    group_code: first.group_code || fallbackCode,
    title: first.group_title || fallbackTitle,
  };
}

// A section's grids by question_code, so each question finds its own in one lookup (#140)
export function gridsByCode(questions) {
  return new Map((questions || []).filter(isMatrixQuestion).map((grid) => [grid.question_code, grid]));
}

// The grid a question sits under, when the template says so: its group_code names a matrix question
// of the section (grids, from gridsByCode). A question is never put under a grid for the shape of its
// label (#140).
export function parentGrid(question, grids) {
  const code = question?.group_code;
  if (!code || code === question.question_code) return null;
  return grids?.get(code) || null;
}

// The survey's questions as the page shows them: single cards, matrix cards, and runs of lettered
// sub-questions (Q3a, Q3b or a., b.) under one heading. A grid is always a matrix card (#140).
// __ translates the one fallback title.
export function layoutQuestions(questions, __ = (text) => text) {
  const items = [];
  // a group's code is its card's id (qc_<code>), so a group_code that names a question of the
  // section, as one naming its grid does, gives way to the group's own code (#140)
  const questionCodes = new Set(questions.map((q) => q.question_code));
  const heading = (first, fallbackCode, fallbackTitle) => {
    const own = groupHeading(first, fallbackCode, fallbackTitle);
    return questionCodes.has(own.group_code) ? { ...own, group_code: fallbackCode } : own;
  };
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
          ...heading(q, `group_${baseNum}`, baseNum),
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
          ...heading(q, `group_${q.question_code}`, prevLabel || __("Breakdown table")),
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
