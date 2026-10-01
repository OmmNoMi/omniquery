import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWAL } from "../useWAL";
import { db } from "../../services/db";

describe("useWAL Chaos & Durability Engineering", () => {
  beforeEach(async () => {
    await db.wal.clear();
    await db.responses.clear();
    vi.restoreAllMocks();
  });

  it("survives rapid-fire sequential mutations without race conditions or lost writes", async () => {
    const { queueWAL, pendingWALCount } = useWAL();
    const mutationCount = 50;

    // Simulate rapid field surveyor keystrokes
    const promises = [];
    for (let i = 1; i <= mutationCount; i++) {
      promises.push(
        queueWAL(
          "OmniQuery Response",
          {
            idempotency_key: `IDEM-BURST-${i}`,
            survey_template: "High Altitude Survey",
            items: [{ question_code: `q_${i}`, value: `Answer ${i}` }],
          },
          false
        )
      );
    }

    const results = await Promise.all(promises);

    expect(results.length).toBe(mutationCount);
    expect(pendingWALCount.value).toBe(mutationCount);

    const allRecords = await db.wal.toArray();
    expect(allRecords.length).toBe(mutationCount);

    // Verify all keys are uniquely preserved
    const uniqueKeys = new Set(
      allRecords.map((r) => JSON.parse(r.payload_json).idempotency_key)
    );
    expect(uniqueKeys.size).toBe(mutationCount);
  });

  it("recovers and quarantines corrupt payload JSON without crashing sync engine", async () => {
    const { syncWAL, quarantinedWALCount, pendingWALCount } = useWAL();

    // Directly inject a corrupted entry into Dexie simulating disk corruption
    await db.wal.put({
      wal_id: "WAL-CORRUPT-999",
      doctype: "OmniQuery Response",
      payload_json: "{corrupt_invalid_json: true,", // Corrupt JSON
      status: "pending",
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

    // Also inject a healthy entry
    await db.wal.put({
      wal_id: "WAL-HEALTHY-001",
      doctype: "OmniQuery Response",
      payload_json: JSON.stringify({
        idempotency_key: "HEALTHY-001",
        items: [{ question_code: "q_status", value: "OK" }],
      }),
      status: "pending",
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          results: [{ idempotency_key: "HEALTHY-001", status: "SUCCESS" }],
        },
      }),
    });
    globalThis.fetch = mockFetch;

    // Run sync - should not throw unhandled syntax error
    await syncWAL();

    // Verify healthy entry was synced
    const healthy = await db.wal.get("WAL-HEALTHY-001");
    expect(healthy.status).toBe("synced");

    // Verify corrupt entry was quarantined
    const corrupt = await db.wal.get("WAL-CORRUPT-999");
    expect(corrupt.status).toBe("quarantined");
    expect(corrupt.quarantine_reason).toContain("JSON");
    expect(quarantinedWALCount.value).toBe(1);
    expect(pendingWALCount.value).toBe(0);
  });

  it("handles offline network oscillation without dropping queued submissions", async () => {
    const { queueWAL, syncWAL, isOnline, pendingWALCount } = useWAL();

    // Start offline
    isOnline.value = false;

    await queueWAL(
      "OmniQuery Response",
      {
        idempotency_key: "OFFLINE-OSC-001",
        items: [{ question_code: "q_geo", value: "Shimla Belt" }],
      },
      false
    );

    // Sync attempt while offline should yield null
    const offlineResult = await syncWAL();
    expect(offlineResult).toBeNull();
    expect(pendingWALCount.value).toBe(1);

    // Network returns
    isOnline.value = true;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          results: [{ idempotency_key: "OFFLINE-OSC-001", status: "SUCCESS" }],
        },
      }),
    });
    globalThis.fetch = mockFetch;

    const onlineResult = await syncWAL();
    expect(onlineResult).not.toBeNull();
    expect(onlineResult.syncedCount).toBe(1);
    expect(pendingWALCount.value).toBe(0);
  });
});
