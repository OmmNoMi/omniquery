import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// A device whose session has ended sends nothing: the server would take the interview as a Guest's,
// file it under the Guest Surveyor and refuse the surveyor's own retry (#127, #160). The server is
// faked at frappe-ui's call().
let server;
vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, call: vi.fn(async (method, args) => server(method, args)) };
});

import { call } from "frappe-ui";
import { createWAL, syncCall } from "../useWAL";
import { db } from "../../services/db";

const SURVEYOR = "test_surveyor@example.com";
const httpError = (status, exc_type) => Object.assign(new Error(`HTTP ${status}`), { status, exc_type });
const success = (subs) => ({ results: subs.map((s) => ({ idempotency_key: s.idempotency_key, status: "SUCCESS" })) });
const setCookie = (value) => (document.cookie = value === null ? "user_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT" : `user_id=${value}`);
const methods = () => call.mock.calls.map(([method]) => method);

describe("sync requests from a page whose session has ended", () => {
  let wal;
  let loggedUser;
  const booted = window.frappe.user;

  beforeEach(async () => {
    await Promise.all([db.wal.clear(), db.responses.clear(), db.audio_recordings.clear()]);
    call.mockClear();
    loggedUser = vi.fn(async () => SURVEYOR);
    server = vi.fn(async (method, args) => {
      if (method === "frappe.auth.get_logged_user") return loggedUser();
      if (method === "omniquery.api.sync.batch_push") return success(args.submissions);
      return { status: "SUCCESS" };
    });
    wal = createWAL();
    await wal.queueWAL("OmniQuery Response", { idempotency_key: "KEY-1", items: [{ question_code: "q", value: 1 }] }, false);
  });

  afterEach(() => {
    window.frappe.user = booted;
    setCookie(SURVEYOR);
  });

  const entry = async () => (await db.wal.toArray())[0];

  it("sends nothing after a logout or an expired session, keeps the queue and asks for a sign-in", async () => {
    setCookie("Guest");

    await wal.syncWAL();
    await expect(syncCall("omniquery.api.sync.sync_draft", { draft: {} })).rejects.toMatchObject({ exc_type: "SessionExpired" });

    expect(methods()).toEqual([]);
    expect(await entry()).toMatchObject({ status: "pending", attempts: 0 });
    expect(wal.needsLogin.value).toBe(true);
  });

  it("sends at once while the cookie is the page's own user", async () => {
    await wal.syncWAL();

    expect(methods()).toEqual(["omniquery.api.sync.batch_push"]);
    expect(await db.wal.count()).toBe(0);
  });

  it("asks Frappe who is signed in when the cookie is gone, as after reopening the browser offline", async () => {
    setCookie(null);

    await wal.syncWAL();

    expect(methods()).toEqual(["frappe.auth.get_logged_user", "omniquery.api.sync.batch_push"]);
    expect(await db.wal.count()).toBe(0);
  });

  it("sends nothing when Frappe refuses to say who is signed in", async () => {
    setCookie(null);
    loggedUser.mockRejectedValue(httpError(403, "PermissionError"));

    await wal.syncWAL();

    expect(methods()).toEqual(["frappe.auth.get_logged_user"]);
    expect(await entry()).toMatchObject({ status: "pending", attempts: 0 });
    expect(wal.needsLogin.value).toBe(true);
  });

  it("sends nothing while another user is signed in, so the interview is not filed under them", async () => {
    setCookie("other.user@example.com");
    loggedUser.mockResolvedValue("other.user@example.com");

    await wal.syncWAL();

    expect(methods()).toEqual(["frappe.auth.get_logged_user"]);
    expect(wal.needsLogin.value).toBe(true);
  });

  it("lets a citizen on a public link sync as a Guest", async () => {
    window.frappe.user = "Guest";
    setCookie("Guest");

    await wal.syncWAL();

    expect(methods()).toEqual(["omniquery.api.sync.batch_push"]);
    expect(await db.wal.count()).toBe(0);
  });

  it("lets a citizen without a user_id cookie sync, without asking Frappe who is signed in", async () => {
    window.frappe.user = "Guest";
    setCookie(null);

    await wal.syncWAL();

    expect(methods()).toEqual(["omniquery.api.sync.batch_push"]);
    expect(await db.wal.count()).toBe(0);
  });

  it("quarantines a citizen's interview the server keeps refusing at the fifth try, since a citizen has no sign-in", async () => {
    window.frappe.user = "Guest";
    setCookie("Guest");
    server.mockRejectedValue(httpError(403, "PermissionError"));

    await wal.syncWAL();
    expect(await entry()).toMatchObject({ status: "pending", attempts: 1 });
    expect(wal.needsLogin.value).toBe(false);

    for (let i = 0; i < 4; i++) await wal.syncWAL();
    expect(await entry()).toMatchObject({ status: "quarantined", attempts: 5 });
  });
});
