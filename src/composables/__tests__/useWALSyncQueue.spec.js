import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { db } from "../../services/db";
import { useWAL, _resetWALInstance } from "../useWAL";
import App from "../../App.vue";

describe("useWAL Sync Queue & Invariants (#33)", () => {
  beforeEach(async () => {
    _resetWALInstance();
    await db.wal.clear();
    await db.responses.clear();
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: [] }),
    });
  });

  afterEach(() => {
    _resetWALInstance();
    vi.useRealTimers();
  });

  it("starts exactly one sync interval when mounting App and FilledFormsModal", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    const wrapper = mount(App);

    // Filter setInterval calls for the 15-second WAL sync interval
    const walIntervalCalls = setIntervalSpy.mock.calls.filter(
      (call) => call[1] === 15000
    );

    expect(walIntervalCalls.length).toBe(1);
    wrapper.unmount();
  });

  it("syncs entries 2-5 and increments entry 1 attempts to 1 when entry 1 returns 4xx", async () => {
    const { queueWAL, syncWAL, pendingWALCount } = useWAL();

    // Enqueue 5 entries
    for (let i = 1; i <= 5; i++) {
      await queueWAL(
        "OmniQuery Response",
        {
          idempotency_key: `IDEM-4XX-${i}`,
          survey_template: "Test Template",
          items: [{ question_code: `q_${i}`, value: `Val ${i}` }],
        },
        false
      );
    }

    expect(pendingWALCount.value).toBe(5);

    // Mock fetch so batch of 5 fails with 400, or entry 1 fails with 400 while 2-5 succeed
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      const body = JSON.parse(opts.body || "{}");
      const subs = body.submissions || [];
      if (subs.length > 1) {
        // Batch fails because entry 1 has client error (400)
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ message: "Invalid payload in batch", _error_message: "Bad request" }),
        };
      } else if (subs.length === 1) {
        if (subs[0].idempotency_key === "IDEM-4XX-1") {
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ message: "Invalid field q_1", _error_message: "Invalid field" }),
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              message: {
                results: [
                  {
                    idempotency_key: subs[0].idempotency_key,
                    status: "SUCCESS",
                  },
                ],
              },
            }),
          };
        }
      }
      return { ok: true, status: 200, json: async () => ({ message: [] }) };
    });

    await syncWAL();

    // Verify entry 1 attempts incremented to 1 and status is still pending (not quarantined yet)
    const allWal = await db.wal.toArray();
    const entry1 = allWal.find((e) => JSON.parse(e.payload_json).idempotency_key === "IDEM-4XX-1");
    expect(entry1).toBeDefined();
    expect(entry1.attempts).toBe(1);
    expect(entry1.status).toBe("pending");

    // Verify entries 2 through 5 are marked synced
    for (let i = 2; i <= 5; i++) {
      const entry = allWal.find((e) => JSON.parse(e.payload_json).idempotency_key === `IDEM-4XX-${i}`);
      expect(entry).toBeDefined();
      expect(entry.status).toBe("synced");
    }

    // Pending count should now be 1 (only entry 1 remains pending)
    expect(pendingWALCount.value).toBe(1);
  });

  it("sets needsLogin and shows 'Sign in again to upload 3 interviews' on 403 response", async () => {
    const { queueWAL, needsLogin, pendingWALCount, syncWAL } = useWAL();

    // Enqueue 3 entries
    for (let i = 1; i <= 3; i++) {
      await queueWAL(
        "OmniQuery Response",
        {
          idempotency_key: `IDEM-403-${i}`,
          survey_template: "Test Template",
          items: [{ question_code: `q_${i}`, value: `Val ${i}` }],
        },
        false
      );
    }

    expect(pendingWALCount.value).toBe(3);

    // Mock fetch to return 403 Forbidden for batch_push, but 200 for bootstrap queries
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes("batch_push")) {
        return {
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ message: "Session expired", _error_message: "Forbidden" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: [] }),
      };
    });

    const wrapper = mount(App);

    await syncWAL();

    expect(needsLogin.value).toBe(true);

    await wrapper.vm.$nextTick();

    // Verify UI banner displays exact actionable sentence
    expect(wrapper.text()).toContain("Sign in again to upload 3 interviews");
    wrapper.unmount();
  });
});
