import fs from "node:fs";
import path from "node:path";
import { namedImports, templateElements } from "./sourceFiles";

// Helpers shared by the guards that check frappe-ui Buttons (button_variants, button_names).
// They live here, not in a .test.js file, so a guard can import them without running another
// guard's tests a second time.

// The frappe-ui Button elements in a .vue file, under whatever name it was imported as, plus any
// `extraTags` (components that pass their attributes on to a Button)
export function buttonElements(source, extraTags = []) {
  const buttonNames = [...namedImports(source, "frappe-ui")].filter(([, exported]) => exported === "Button").map(([local]) => local);
  const tags = [...buttonNames, ...extraTags];
  if (!tags.length) return [];
  return templateElements(source).filter((node) => tags.includes(node.tag));
}

// A component whose template puts v-bind="$attrs" on a frappe-ui Button (SurveyModeMenu): an
// attribute on it lands on that Button.
export const forwardsAttrsToButton = (source) =>
  buttonElements(source).some((node) => node.props.some((p) => p.type === 7 && p.name === "bind" && !p.arg && p.exp?.content === "$attrs"));

// The tags of the components in `files` that forward their attributes to a Button. Named by file,
// which is how the app names its component tags.
export const buttonWrappers = (files) =>
  files.filter((file) => forwardsAttrsToButton(fs.readFileSync(file, "utf8"))).map((file) => path.basename(file, ".vue"));
