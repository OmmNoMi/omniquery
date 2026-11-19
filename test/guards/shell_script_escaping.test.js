import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The portal page's values come from the server, and some (the deep-link IDs, the title they give
// the page) come straight from the URL, so anyone can send a link that tries to break out of them
// (#38, #51). Frappe's Jinja does not autoescape www pages, so the page escapes each value itself:
// |tojson in its inline script, which writes a JS literal and escapes < > & ', and |e in markup.
// Quoting "{{ value }}" by hand does neither: a " or a </script> in the value ends it.
// test_portal_page_boot.py renders the page to prove it end to end.
const shell = fs.readFileSync(path.resolve(__dirname, "../../omniquery/www/omniquery.html"), "utf-8");

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g;

// Every {{ … }} inside an inline <script>, with the character just before and after it
export function inlineScriptValues(html) {
  const values = [];
  for (const [script] of html.matchAll(INLINE_SCRIPT)) {
    const body = script.slice(script.indexOf(">") + 1, -"</script>".length);
    for (const m of body.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      values.push({ expr: m[1].trim(), before: body[m.index - 1], after: body[m.index + m[0].length] });
    }
  }
  return values;
}

// Every {{ … }} outside the inline scripts: in markup, attributes and external script URLs
export function markupValues(html) {
  return [...html.replace(INLINE_SCRIPT, "").matchAll(/\{\{([\s\S]*?)\}\}/g)].map((m) => m[1].trim());
}

const unescaped = (expr) => !/\|\s*e$/.test(expr);
const unsafe = ({ expr, before, after }) => !/\|\s*tojson$/.test(expr) || /["'`]/.test(before ?? "") || /["'`]/.test(after ?? "");

describe("Every server value in the portal page is escaped for where it lands", () => {
  it("finds the boot values", () => {
    expect(inlineScriptValues(shell).length).toBeGreaterThan(0);
  });

  it("ends every {{ }} in an inline script with | tojson, unquoted", () => {
    expect(inlineScriptValues(shell).filter(unsafe).map((v) => v.expr)).toEqual([]);
  });

  it("flags a hand-quoted or unfiltered value, and ignores markup and external scripts", () => {
    const flagged = (html) => inlineScriptValues(html).filter(unsafe).map((v) => v.expr);
    expect(flagged(`<script>a = "{{ id }}";</script>`)).toEqual(["id"]);
    expect(flagged(`<script>a = '{{ id | tojson }}';</script>`)).toEqual(["id | tojson"]);
    expect(flagged(`<script>a = {{ id }};</script>`)).toEqual(["id"]);
    expect(flagged(`<script>a = {{ id|tojson }};</script>`)).toEqual([]);
    expect(flagged(`<title>{{ title }}</title><script src="/x.js?v={{ v }}"></script>`)).toEqual([]);
  });

  it("ends every {{ }} in markup with | e", () => {
    expect(markupValues(shell).length).toBeGreaterThan(0);
    expect(markupValues(shell).filter(unescaped)).toEqual([]);
  });

  it("flags an unescaped markup value, and leaves inline scripts to |tojson", () => {
    const flagged = (html) => markupValues(html).filter(unescaped);
    expect(flagged(`<title>{{ title }}</title><p>{{ _("Hi") | e }}</p>`)).toEqual(["title"]);
    expect(flagged(`<script src="/x.js?v={{ v }}"></script>`)).toEqual(["v"]);
    expect(flagged(`<script>a = {{ id | tojson }};</script>`)).toEqual([]);
  });
});
