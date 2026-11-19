import { describe, it, expect } from "vitest";
import path from "node:path";
import { ESLint } from "eslint";

// The lint gate from #31, run inside `yarn test`. App.vue called db.responses.put without importing
// db, and the ReferenceError went into `catch (e) {}`, so a submitted interview stayed a Draft with
// no error shown. ESLint's no-undef finds a name used without being declared, and no-empty an empty
// block, in every .js and .vue file under src/. The rules live in eslint.config.js.

const appDir = path.resolve(__dirname, "../..");
const eslint = new ESLint({ cwd: appDir });

const errorsIn = (results) =>
  results.flatMap((r) =>
    r.messages.filter((m) => m.severity === 2).map((m) => `${path.relative(appDir, r.filePath)}:${m.line} ${m.ruleId}: ${m.message}`)
  );
const rulesHit = async (code, filePath = "src/composables/sample.js") =>
  (await eslint.lintText(code, { filePath: path.join(appDir, filePath) })).flatMap((r) => r.messages.map((m) => m.ruleId));

describe("ESLint gate (#31)", () => {
  it("finds no undeclared name and no empty block in src/", async () => {
    const errors = errorsIn(await eslint.lintFiles(["src"]));
    expect(errors, `Declare or import the name; a catch that ignores says why in a comment:\n${errors.join("\n")}`).toEqual([]);
  }, 60000);

  it("reports a name used without an import, and an empty catch in either form", async () => {
    expect(await rulesHit(`export async function save(r) { await db.responses.put(r); }`)).toEqual(["no-undef"]);
    expect(await rulesHit(`try { JSON.parse("x"); } catch (e) {}`)).toEqual(["no-empty"]);
    expect(await rulesHit(`try { JSON.parse("x"); } catch {}`)).toEqual(["no-empty"]);
  });

  it("checks the script of a .vue file, and lets a catch with a reason through", async () => {
    const sfc = `<template><p>{{ n }}</p></template>\n<script setup>\nconst n = missingName;\ntry { n(); } catch (e) {}\n</script>\n`;
    expect((await rulesHit(sfc, "src/components/Sample.vue")).sort()).toEqual(["no-empty", "no-undef"]);
    expect(await rulesHit(`try { JSON.parse("x"); } catch (e) {\n  // a corrupt row is shown with no answers\n}`)).toEqual([]);
  });
});
