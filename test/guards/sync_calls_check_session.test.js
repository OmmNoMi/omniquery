import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// A sync request sent after the session ended runs as Guest: on a public template the server files
// the interview under the Guest Surveyor and refuses the surveyor's own retry (#127, #160). Every
// request to omniquery.api.sync goes through useWAL's syncCall, which sends nothing once the session
// this page was loaded for has ended.

const appDir = path.resolve(__dirname, "../..");
const SYNC_METHOD = /(["'`])omniquery\.api\.sync\.[\w.]+\1/g;

// sync methods named anywhere but as syncCall's first argument: [{ line, text }]
export function uncheckedSyncCalls(source) {
  const bad = [];
  for (const match of source.matchAll(SYNC_METHOD)) {
    if (/\bsyncCall\(\s*$/.test(source.slice(0, match.index))) continue;
    bad.push({ line: source.slice(0, match.index).split("\n").length, text: match[0] });
  }
  return bad;
}

describe("sync requests check the session first (#127)", () => {
  it("finds a sync method sent any other way", () => {
    expect(uncheckedSyncCalls('await syncCall("omniquery.api.sync.batch_push", { submissions })')).toEqual([]);
    expect(uncheckedSyncCalls('await syncCall(\n  "omniquery.api.sync.sync_draft", {})')).toEqual([]);
    expect(uncheckedSyncCalls('await call("omniquery.api.sync.sync_draft", { draft })')).toHaveLength(1);
    expect(uncheckedSyncCalls("createResource({ url: 'omniquery.api.sync.batch_push' })")).toHaveLength(1);
  });

  it("every sync request in the app goes through syncCall", () => {
    const bad = getSourceFiles(path.join(appDir, "src")).flatMap((file) =>
      uncheckedSyncCalls(fs.readFileSync(file, "utf8")).map((b) => `${path.relative(appDir, file)}:${b.line} ${b.text}`),
    );
    expect(bad).toEqual([]);
  });
});
