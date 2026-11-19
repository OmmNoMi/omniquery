import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// A response's `synced` is stored as db.js SYNCED (1) or NOT_SYNCED (0). IndexedDB cannot index a
// boolean, so a row written with true or false drops out of where("synced"), and the mixed
// encodings that followed hid synced drafts from compaction and showed sent interviews as queued
// (#87). Every write to db.responses names `synced` through those two constants. The in-memory
// rows FilledFormsModal builds for display are not written back, so they are not checked.

const appDir = path.resolve(__dirname, "../..");
const WRITE = /db\.responses(?:\.[\w$]+\([^)]*\))*\.(?:put|add|update|bulkPut|bulkAdd|modify)\(/g;
const ALLOWED = /^(?:SYNCED|NOT_SYNCED)$/;

// the argument text of a call whose "(" ends at `open`, read up to its matching ")"
function callArgs(source, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}

// `synced` values written to db.responses that are not SYNCED or NOT_SYNCED: [{ line, value }]
export function badSyncedWrites(source) {
  const bad = [];
  for (const match of source.matchAll(WRITE)) {
    const open = match.index + match[0].length - 1;
    const args = callArgs(source, open);
    for (const m of args.matchAll(/\bsynced\s*[:=]\s*([^,}\n;]+)/g)) {
      const value = m[1].trim();
      if (!ALLOWED.test(value)) bad.push({ line: source.slice(0, open).split("\n").length, value });
    }
  }
  return bad;
}

describe("a response's synced flag is stored as 0 or 1", () => {
  it("writes synced to db.responses only as SYNCED or NOT_SYNCED", () => {
    const hits = getSourceFiles(path.join(appDir, "src"))
      .flatMap((file) => badSyncedWrites(fs.readFileSync(file, "utf8")).map((h) => `${path.relative(appDir, file)}:${h.line} synced: ${h.value}`));
    expect(hits, `Use SYNCED / NOT_SYNCED from src/services/db.js:\n${hits.join("\n")}`).toEqual([]);
  });

  it("catches a boolean or computed synced in any db.responses write, and lets the constants and other tables through", () => {
    expect(badSyncedWrites(`await db.responses.put({ response_uid: id, synced: false });`)).toEqual([{ line: 1, value: "false" }]);
    expect(badSyncedWrites(`db.responses.update(id, { status: "Draft", synced: true })`)).toEqual([{ line: 1, value: "true" }]);
    expect(badSyncedWrites(`db.responses.where("response_uid").equals(k).modify({ synced: ok ? 1 : 0 })`)).toHaveLength(1);
    expect(badSyncedWrites(`db.responses.where("x").equals(k).modify((r) => { r.synced = true; })`)).toHaveLength(1);
    expect(badSyncedWrites(`db.responses.bulkPut([{ synced: NOT_SYNCED }, { synced: SYNCED }])`)).toEqual([]);
    expect(badSyncedWrites(`db.audio_recordings.put({ synced: true }); row.synced = false;`)).toEqual([]);
  });
});
