import { describe, it, expect, beforeEach, vi } from "vitest";

// How the queue meets a failing batch_push (#33). frappe-ui's call() throws an Error carrying the
// HTTP status and Frappe's exc_type, so the server is faked at call().
let batchPush;
vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method, args) => (method === "omniquery.api.sync.batch_push" ? batchPush(args.submissions) : {})),
  };
});

import { createWAL, failureKind } from "../useWAL";
import { db } from "../../services/db";

const httpError = (status, exc_type) => Object.assign(new Error(`batch_push ${status}`), { status, exc_type });
const success = (subs) => ({ results: subs.map((s) => ({ idempotency_key: s.idempotency_key, status: "SUCCESS" })) });

async function queue(wal, count, prefix = "IDEM") {
  for (let i = 1; i <= count; i++) {
    await wal.queueWAL("OmniQuery Response", { idempotency_key: `${prefix}-${i}`, items: [{ question_code: "q", value: i }] }, false);
  }
}
const walByKey = async () => Object.fromEntries((await db.wal.toArray()).map((e) => [JSON.parse(e.payload_json).idempotency_key, e]));

describe("failureKind", () => {
  it("tells a lost session from a refused submission, a failing server and no answer", () => {
    expect(failureKind(httpError(401))).toBe("auth");
    expect(failureKind(httpError(403))).toBe("auth");
    expect(failureKind(httpError(400, "CSRFTokenError"))).toBe("auth");
    expect(failureKind(httpError(401, "SessionExpired"))).toBe("auth");
    // Frappe's ValidationError: the submission is refused, the session is fine
    expect(failureKind(httpError(417, "ValidationError"))).toBe("client");
    expect(failureKind(httpError(400))).toBe("client");
    expect(failureKind(httpError(500))).toBe("server");
    expect(failureKind(httpError(502))).toBe("server");
    expect(failureKind(new TypeError("Failed to fetch"))).toBe("network");
  });
});

describe("useWAL sync queue (#33)", () => {
  let wal;
  beforeEach(async () => {
    await Promise.all([db.wal.clear(), db.responses.clear(), db.audio_recordings.clear()]);
    batchPush = vi.fn(async (subs) => success(subs));
    // createWAL outside a component: no listeners and no 15s loop, only what the test calls
    wal = createWAL();
  });

  it("sends a batch one by one when one submission is refused, so the others still go", async () => {
    await queue(wal, 5);
    batchPush.mockImplementation(async (subs) => {
      if (subs.some((s) => s.idempotency_key === "IDEM-1")) throw httpError(417, "ValidationError");
      return success(subs);
    });

    await wal.syncWAL();

    const left = await walByKey();
    expect(Object.keys(left)).toEqual(["IDEM-1"]);
    expect(left["IDEM-1"]).toMatchObject({ status: "pending", attempts: 1 });
    expect(wal.pendingWALCount.value).toBe(1);
    expect(wal.needsLogin.value, "a refused submission is not a lost session").toBe(false);
  });

  it("leaves an entry the server did not answer pending and untouched, and stops the pass", async () => {
    await queue(wal, 2);
    batchPush.mockResolvedValue({ results: [] });

    const res = await wal.syncWAL();

    expect(res.syncedCount).toBe(0);
    expect(batchPush, "each entry is tried once per pass").toHaveBeenCalledTimes(1);
    const left = await walByKey();
    expect(left["IDEM-1"]).toMatchObject({ status: "pending", attempts: 0 });
    expect(left["IDEM-2"]).toMatchObject({ status: "pending", attempts: 0 });
  });

  it("asks the surveyor to sign in on 403, keeps the queue, and clears the ask once a push gets through", async () => {
    await queue(wal, 3);
    batchPush.mockRejectedValue(httpError(403, "PermissionError"));

    await wal.syncWAL();

    expect(wal.needsLogin.value).toBe(true);
    expect(wal.pendingWALCount.value).toBe(3);
    expect(Object.values(await walByKey()).every((e) => e.attempts === 0), "no attempt is spent on a lost session").toBe(true);

    batchPush.mockImplementation(async (subs) => success(subs));
    await wal.syncWAL();
    expect(wal.needsLogin.value).toBe(false);
    expect(wal.pendingWALCount.value).toBe(0);
  });

  it("backs off for 30 seconds after a server error", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await queue(wal, 1);
      batchPush.mockRejectedValue(httpError(500));
      await wal.syncWAL();
      expect(batchPush).toHaveBeenCalledTimes(1);

      batchPush.mockImplementation(async (subs) => success(subs));
      await wal.syncWAL();
      expect(batchPush, "still backing off").toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + 30001);
      await wal.syncWAL();
      expect(batchPush).toHaveBeenCalledTimes(2);
      expect(wal.pendingWALCount.value).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a response's audio for the audio upload when its WAL entry is acknowledged", async () => {
    await queue(wal, 1, "RESP");
    await db.audio_recordings.put({ response_uid: "RESP-1", blob: new Blob(["a"]), status: "pending", created_at: new Date().toISOString() });
    // the faked upload_response_audio stores nothing, so the recording must still be on the device

    await wal.syncWAL();

    expect(await db.wal.count()).toBe(0);
    expect(await db.audio_recordings.get("RESP-1")).toMatchObject({ status: "pending" });
  });

  it("throws when the queue cannot be written, so the submit can say so", async () => {
    vi.spyOn(db.wal, "add").mockRejectedValueOnce(new Error("QuotaExceededError"));
    await expect(wal.queueWAL("OmniQuery Response", { idempotency_key: "X" }, false)).rejects.toThrow("QuotaExceededError");
  });
});
