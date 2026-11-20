// Comparing labels the way a reader does: case, extra spaces and line breaks don't make two labels
// different (#18).

// the text as a comparison key: whitespace collapsed, trimmed, lower-cased
export function textKey(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

// whether `text` tells the reader something the labels already on screen don't: it is not empty,
// and no shown label already contains it
export function addsFact(text, ...shown) {
  const key = textKey(text);
  if (!key) return false;
  return !shown.map(textKey).some((label) => label && label.includes(key));
}
