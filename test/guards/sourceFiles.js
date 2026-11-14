import fs from "node:fs";
import path from "node:path";
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

// The static class plus every bound :class of one template element, as one string.
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

export const elementClasses = (node) => elementProp(node, "class");

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
