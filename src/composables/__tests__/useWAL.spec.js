import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWAL } from "../useWAL";
import { db } from "../../services/db";

describe("useWAL", () => {
  beforeEach(async () => {
    await db.wal.clear();
    await db.responses.clear();
    vi.restoreAllMocks();
  });

  it("queues an insert payload into Dexie WAL and increments pending count", async () => {
    const { queueWAL, pendingWALCount } = useWAL();

    const payload = {
      idempotency_key: "SURVEY-TEST-001",
      survey_template: "SHG Enterprise Study",
      template_version: 1,
      items: [{ question_code: "q_name", value: "Sunita" }],
    };

    const entry = await queueWAL("OmniQuery Response", payload, false);

    expect(entry).toBeDefined();
    expect(entry.wal_id).toMatch(/^WAL-/);
    expect(entry.status).toBe("pending");
    expect(pendingWALCount.value).toBe(1);

    const stored = await db.wal.get(entry.wal_id);
    expect(stored).toBeDefined();
    expect(JSON.parse(stored.payload_json).idempotency_key).toBe("SURVEY-TEST-001");
  });

  it("retrieves WAL queue items and extracts response values dictionary", async () => {
    const { queueWAL, getWalQueueItems } = useWAL();

    await queueWAL("OmniQuery Response", {
      idempotency_key: "SUB-101",
      survey_template: "Dairy Survey",
      respondent: "Radha",
      items: [
        { question_code: "respondent_name", value: "Radha Devi" },
        { question_code: "village_gp", value: "Kalyanpur" },
      ],
    }, false);

    const items = await getWalQueueItems();
    expect(items.length).toBe(1);
    expect(items[0].idempotency_key).toBe("SUB-101");
    expect(items[0].responses.respondent_name).toBe("Radha Devi");
    expect(items[0].responses.village_gp).toBe("Kalyanpur");
  });

  it("syncs WAL entries via API and transitions pending status to synced", async () => {
    const mockResponse = {
      message: {
        results: [
          {
            idempotency_key: "TEST-IDEM-001",
            status: "SUCCESS",
            name: "OQR-2026-00001",
          },
        ],
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") {
      window.fetch = mockFetch;
    }

    const { queueWAL, syncWAL, pendingWALCount } = useWAL();

    await queueWAL("OmniQuery Response", {
      idempotency_key: "TEST-IDEM-001",
      survey_template: "SHG Survey",
      items: [],
    }, false);

    expect(pendingWALCount.value).toBe(1);

    const res = await syncWAL();
    expect(res).not.toBeNull();
    expect(res.syncedCount).toBe(1);
    expect(pendingWALCount.value).toBe(0);

    const walRecords = await db.wal.toArray();
    expect(walRecords[0].status).toBe("synced");
  });

  it("handles offline status gracefully without network calls", async () => {
    const { isOnline, syncWAL } = useWAL();
    isOnline.value = false;

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    if (typeof window !== "undefined") {
      window.fetch = fetchSpy;
    }

    const result = await syncWAL();
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
