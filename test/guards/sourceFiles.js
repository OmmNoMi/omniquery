import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig";
import { parse as sfcParse, babelParse } from "vue/compiler-sfc";

const appDir = path.resolve(__dirname, "../..");

const SKIP_DIRS = new Set(["__tests__", "test", "tests", "node_modules", "dist", "__pycache__"]);

// The app's own source files under each root, without tests, build output or dependencies.
export function getSourceFiles(roots, extensions = [".vue", ".js"]) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext)) && !/\.(spec|test)\.[jt]s$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  [].concat(roots).forEach(walk);
  return files;
}

// Named imports from `module` in a .vue or .js source: Map of local name -> exported name, so
// `import { TextInput as Field } from "frappe-ui"` gives Field -> TextInput. Parsed with the
// compiler Vue itself uses (vue/compiler-sfc), so every import form and script block counts.
export function namedImports(source, module) {
  const names = new Map();
  for (const node of importDeclarations(source)) {
    if (node.source.value !== module) continue;
    for (const spec of node.specifiers) {
      if (spec.type === "ImportSpecifier") names.set(spec.local.name, spec.imported.name ?? spec.imported.value);
    }
  }
  return names;
}

// The app's own components a .vue file imports: Map of local name -> absolute path, so
// `import SurveyView from "./views/Survey.vue"` in src/App.vue gives SurveyView -> .../src/views/Survey.vue
export function componentImports(source, file) {
  const components = new Map();
  for (const node of importDeclarations(source)) {
    if (!node.source.value.startsWith(".") || !node.source.value.endsWith(".vue")) continue;
    const def = node.specifiers.find((spec) => spec.type === "ImportDefaultSpecifier");
    if (def) components.set(def.local.name, path.resolve(path.dirname(file), node.source.value));
  }
  return components;
}

// The import declarations of a .vue or .js source, every script block of an SFC included
function importDeclarations(source) {
  if (!/\bimport\b/.test(source)) return []; // nothing to parse, e.g. a bare template fragment
  const { descriptor } = sfcParse(source);
  const isSfc = descriptor.script || descriptor.scriptSetup || descriptor.template;
  const blocks = isSfc ? [descriptor.script, descriptor.scriptSetup].filter(Boolean) : [{ content: source }];
  return blocks.flatMap((block) =>
    babelParse(block.content, { sourceType: "module", plugins: block.lang === "ts" ? ["typescript"] : [] })
      .program.body.filter((node) => node.type === "ImportDeclaration"),
  );
}

// Class tokens in a class string or a bound :class expression: every word, with quotes and
// object punctuation dropped. Variant prefixes stay on (`dark:bg-x`, `focus-visible:ring-2`).
export const classTokens = (text) => text.split(/[\s'"`,{}()?]+/).filter(Boolean);

// Whether a template element sets the attribute `name` at all, statically or bound:
// `label="Save"`, `:label="x"` and `label=""` all count.
export const hasProp = (node, name) =>
  node.props.some((p) => (p.type === 6 && p.name === name) || (p.type === 7 && p.name === "bind" && p.arg?.content === name));

// An attribute's static value and its bound (:name) expression, joined: `theme="gray"` and
// `:theme="on ? 'green' : 'gray'"` both come back as text to search.
export function elementProp(node, name) {
  return node.props
    .map((p) => {
      if (p.type === 6 && p.name === name) return p.value?.content || "";
      if (p.type === 7 && p.name === "bind" && p.arg?.content === name) return p.exp?.content || "";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

// The static class plus every bound :class of one template element, as one string.
export const elementClasses = (node) => elementProp(node, "class");

// The class names one template element sets for sure: its static class, plus the class strings in
// its bound :class, read with Vue's own expression parser. Only the places a :class takes a class
// from count: strings, array items, object keys, both arms of `?:` and both sides of `&&`/`||`, so
// the 'success' in `tone === 'success' ? 'x' : 'y'` is not a class. Names built at runtime, such as
// `bg-${tone}-50`, can't be read and are left out. A prop that hands a child a class
// (`panel-class`, `:inputClass`) counts too.
const CLASS_PROP = /^(?:class|[\w-]+-class|\w+Class)$/;
export function elementClassNames(node) {
  const names = [];
  const words = (text) => text.split(/\s+/).filter(Boolean);
  const read = (n) => {
    if (!n) return;
    if (n.type === "StringLiteral") names.push(...words(n.value));
    else if (n.type === "TemplateLiteral") {
      n.quasis.forEach((q, i) => {
        const text = q.value.cooked;
        const parts = words(text);
        if (i > 0 && !/^\s/.test(text)) parts.shift(); // glued to the ${} before it
        if (i < n.expressions.length && !/\s$/.test(text)) parts.pop(); // glued to the ${} after it
        names.push(...parts);
      });
      // a ${} with space (or the literal's own edge) on both sides holds whole class names
      const last = n.expressions.length - 1;
      n.expressions.forEach((e, i) => {
        const before = n.quasis[i].value.cooked, after = n.quasis[i + 1].value.cooked;
        const spaceBefore = (i === 0 && before === "") || /\s$/.test(before);
        const spaceAfter = (i === last && after === "") || /^\s/.test(after);
        if (spaceBefore && spaceAfter) read(e);
      });
    } else if (n.type === "ArrayExpression") n.elements.forEach(read);
    else if (n.type === "ObjectExpression") {
      for (const prop of n.properties) {
        if (prop.computed) continue;
        if (prop.key?.type === "StringLiteral") names.push(...words(prop.key.value));
        else if (prop.key?.type === "Identifier") names.push(prop.key.name);
      }
    } else if (n.type === "ConditionalExpression") [n.consequent, n.alternate].forEach(read);
    else if (n.type === "LogicalExpression") [n.left, n.right].forEach(read);
  };
  for (const p of node.props) {
    if (p.type === 6 && CLASS_PROP.test(p.name)) names.push(...words(p.value?.content || ""));
    if (p.type === 7 && p.name === "bind" && CLASS_PROP.test(p.arg?.content || "") && p.exp) read(babelParse(`(${p.exp.content})`).program.body[0].expression);
  }
  return names;
}

// Every element in a .vue file's template, v-if branches included, read with Vue's own compiler.
export const templateElements = (source) => templateTree(source).map(({ node }) => node);

// Every element in a .vue file's template with the elements it sits in, outermost first:
// [{ node, ancestors }]. v-if branches and v-for bodies count; they add no element of their own.
export function templateTree(source) {
  const { descriptor } = sfcParse(source);
  if (!descriptor.template) return [];
  const elements = [];
  const walk = (node, ancestors) => {
    const inside = node.type === 1 ? (elements.push({ node, ancestors }), [...ancestors, node]) : ancestors;
    (node.children || []).forEach((child) => walk(child, inside));
    (node.branches || []).forEach((branch) => walk(branch, inside));
  };
  walk(descriptor.template.ast, []);
  return elements;
}

// Every declaration of `prop` (a name or a RegExp) in the rules whose selector list holds exactly
// `selector`, in source order, with the at-rules it sits in: [{ prop, value, atRules }], where
// atRules is like ["@supports not (overflow-x: clip)"]. Rules inside @media and @supports count.
export function ruleDeclarations(css, selector, prop) {
  const found = [];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.map((s) => s.trim()).includes(selector)) return;
    const atRules = [];
    for (let parent = rule.parent; parent?.type === "atrule"; parent = parent.parent) atRules.unshift(`@${parent.name} ${parent.params}`);
    rule.walkDecls(prop, (decl) => found.push({ prop: decl.prop, value: decl.value.trim(), atRules }));
  });
  return found;
}

// The value of `prop` that wins in the rules for `selector`: the last one written, or null
export const ruleValue = (css, selector, prop) => ruleDeclarations(css, selector, prop).at(-1)?.value ?? null;

// Every class name a stylesheet selects, unescaped: `.hover\:bg-x:hover` gives "hover:bg-x", and
// Tailwind's `\2c ` (a comma in an arbitrary value) gives ",".
const CLASS_SELECTOR = /\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g;
const ESCAPE = /\\(?:([0-9a-fA-F]{1,6}) ?|(.))/g;
const unescapeClass = (name) => name.replace(ESCAPE, (_, hex, char) => (hex ? String.fromCodePoint(parseInt(hex, 16)) : char));
export function selectedClasses(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (const m of rule.selector.matchAll(CLASS_SELECTOR)) names.add(unescapeClass(m[1]));
  });
  return names;
}

// The app's CSS as the app builds it: Tailwind with tailwind.config.cjs over src/styles/main.css
export async function buildAppCss() {
  const mainCss = path.join(appDir, "src/styles/main.css");
  const built = await postcss([tailwind(path.join(appDir, "tailwind.config.cjs"))]).process(fs.readFileSync(mainCss, "utf8"), { from: mainCss });
  return built.css;
}

// What each of `classNames` does, as Tailwind builds it with the app's config: Map of class name ->
// [{ prop, value, important, child }]. Tailwind reads every form a class can take (variants, `!`,
// arbitrary values and properties), so a guard doesn't have to. `child` is true when a variant
// such as `[&>[role=tablist]]:sticky` styles an element inside the one that has the class.
// A selector can name other classes too (`.group:hover .group-hover\:x`, `.dark\:x:where(.dark, .dark *)`):
// the utility's own is the longest of the names asked about, since a variant's name holds its marker's.
export async function utilityDeclarations(classNames) {
  const names = new Set(classNames);
  const config = loadConfig(path.join(appDir, "tailwind.config.cjs"));
  const built = await postcss([tailwind({ ...config, content: [{ raw: [...names].join(" ") }] })]).process("@tailwind utilities;", { from: undefined });
  const declarations = new Map();
  postcss.parse(built.css).walkRules((rule) => {
    for (const selector of rule.selectors) {
      const own = [...selector.matchAll(CLASS_SELECTOR)]
        .map((m) => ({ name: unescapeClass(m[1]), end: m.index + m[0].length }))
        .filter((m) => names.has(m.name))
        .sort((a, b) => b.name.length - a.name.length)[0];
      if (!own) continue;
      const { name } = own;
      const child = /[\s>+~]/.test(selector.slice(own.end).replace(/\([^)]*\)/g, ""));
      const list = declarations.get(name) || [];
      rule.walkDecls((decl) => list.push({ prop: decl.prop, value: decl.value.trim(), important: decl.important, child }));
      declarations.set(name, list);
    }
  });
  return declarations;
}

// The class tokens of the first element inside App.vue's <FrappeUIProvider>
export function appLayerClasses(source) {
  const provider = templateElements(source).find((el) => el.tag === "FrappeUIProvider");
  const layer = provider?.children.find((child) => child.type === 1);
  return layer ? classTokens(elementClasses(layer)) : [];
}
