import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { parse as sfcParse, babelParse } from "vue/compiler-sfc";

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
  if (!/\bimport\b/.test(source)) return names; // nothing to parse, e.g. a bare template fragment
  const { descriptor } = sfcParse(source);
  const isSfc = descriptor.script || descriptor.scriptSetup || descriptor.template;
  const blocks = isSfc ? [descriptor.script, descriptor.scriptSetup].filter(Boolean) : [{ content: source }];
  for (const block of blocks) {
    const ast = babelParse(block.content, {
      sourceType: "module",
      plugins: block.lang === "ts" ? ["typescript"] : [],
    });
    for (const node of ast.program.body) {
      if (node.type !== "ImportDeclaration" || node.source.value !== module) continue;
      for (const spec of node.specifiers) {
        if (spec.type === "ImportSpecifier") names.set(spec.local.name, spec.imported.name ?? spec.imported.value);
      }
    }
  }
  return names;
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
export function templateElements(source) {
  const { descriptor } = sfcParse(source);
  if (!descriptor.template) return [];
  const elements = [];
  const walk = (node) => {
    if (node.type === 1) elements.push(node);
    (node.children || []).forEach(walk);
    (node.branches || []).forEach(walk);
  };
  walk(descriptor.template.ast);
  return elements;
}

// The value of `prop` in the rule whose selector is exactly `selector`
export function ruleValue(css, selector, prop) {
  let value = null;
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.map((s) => s.trim()).includes(selector)) return;
    rule.walkDecls(prop, (decl) => (value = decl.value.trim()));
  });
  return value;
}

// The class tokens of the first element inside App.vue's <FrappeUIProvider>
export function appLayerClasses(source) {
  const provider = templateElements(source).find((el) => el.tag === "FrappeUIProvider");
  const layer = provider?.children.find((child) => child.type === 1);
  return layer ? classTokens(elementClasses(layer)) : [];
}
