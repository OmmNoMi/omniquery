import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWAL } from "../useWAL";
import { db } from "../../services/db";
import { useAudioRecorder } from "../useAudioRecorder";

describe("useWAL", () => {
  beforeEach(async () => {
    await db.wal.clear();
    await db.responses.clear();
    vi.restoreAllMocks();
  });

  it("queues an insert payload into Dexie WAL and increments pending count", async () => {
    const { queueWAL, pendingWALCount } = createWAL();

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
    const { queueWAL, getWalQueueItems } = createWAL();

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

    const { queueWAL, syncWAL, pendingWALCount } = createWAL();

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

    // an acknowledged entry leaves the WAL: the server holds the submission now
    expect(await db.wal.toArray()).toEqual([]);
  });

  it("handles offline status gracefully without network calls", async () => {
    const { isOnline, syncWAL } = createWAL();
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

  it("quarantines a WAL entry when rejected or reaching 5 failed attempts", async () => {
    const mockErrorResponse = {
      message: {
        results: [
          {
            idempotency_key: "TEST-FAIL-001",
            status: "REJECTED",
            error: "Validation failed permanently",
          },
        ],
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockErrorResponse,
    });
    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") {
      window.fetch = mockFetch;
    }

    const { queueWAL, syncWAL, quarantinedWALCount, getQuarantinedWalEntries, retryQuarantinedEntry } = createWAL();

    const entry = await queueWAL("OmniQuery Response", {
      idempotency_key: "TEST-FAIL-001",
      survey_template: "SHG Survey",
      items: [],
    }, false);

    await syncWAL();

    expect(quarantinedWALCount.value).toBe(1);
    const quarantined = await getQuarantinedWalEntries();
    expect(quarantined.length).toBe(1);
    expect(quarantined[0].status).toBe("quarantined");
    expect(quarantined[0].quarantine_reason).toBe("Validation failed permanently");

    // Test retryQuarantinedEntry with subsequent successful sync
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: {
          results: [{ idempotency_key: "TEST-FAIL-001", status: "SUCCESS" }],
        },
      }),
    });
    await retryQuarantinedEntry(entry.wal_id);
    expect(await db.wal.get(entry.wal_id)).toBeUndefined();
  });

  it("syncs pending audio recordings and updates status to synced", async () => {
    await db.audio_recordings.clear();
    const testUid = "OQS-TEST-AUDIO-SYNC";
    const testBlob = new Blob(["mock-audio-data"], { type: "audio/webm" });

    await db.audio_recordings.put({
      response_uid: testUid,
      blob: testBlob,
      mime_type: "audio/webm",
      file_name: `interview_${testUid}.webm`,
      size: testBlob.size,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          status: "SUCCESS",
          doc_name: testUid,
          file_url: `/private/files/interview_${testUid}.webm`,
        },
      }),
    });
    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") {
      window.fetch = mockFetch;
    }

    const { syncPendingAudio } = createWAL();
    const uploaded = await syncPendingAudio(testUid);

    expect(uploaded).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/method/omniquery.api.sync.upload_response_audio",
      expect.objectContaining({ method: "POST" })
    );

    const updated = await db.audio_recordings.get(testUid);
    expect(updated.status).toBe("synced");
    expect(updated.file_url).toBe(`/private/files/interview_${testUid}.webm`);
  });
  it("uploads every part of a response's recording to that response, and only that response's (#37)", async () => {
    await db.audio_recordings.clear();
    const uid = "OQS-WATER-AUDIO";
    const { saveAudioForResponse } = useAudioRecorder();
    await saveAudioForResponse(uid, new Blob(["before leaving"], { type: "audio/webm" }));
    await saveAudioForResponse(uid, new Blob(["after resuming"], { type: "audio/webm" }));
    await saveAudioForResponse(`${uid}2`, new Blob(["another response"], { type: "audio/webm" }));

    const mockFetch = vi.fn().mockImplementation(async (_url, init) => ({
      ok: true,
      json: async () => ({ message: { status: "SUCCESS", file_url: `/private/files/${JSON.parse(init.body).filename}` } }),
    }));
    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") window.fetch = mockFetch;

    const uploaded = await createWAL().syncPendingAudio(uid);

    expect(uploaded).toBe(2);
    const sent = mockFetch.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(sent.map((b) => [b.response_name, b.filename]).sort()).toEqual([
      [uid, `interview_${uid}.webm`],
      [uid, `interview_${uid}_part2.webm`],
    ]);
    expect((await db.audio_recordings.get(`${uid}~2`)).status).toBe("synced");
    expect((await db.audio_recordings.get(`${uid}2`)).status, "another response's recording waits its turn").toBe("pending");
  });
  it("keeps a recording it cannot read pending, and does not upload it empty (#31)", async () => {
    await db.audio_recordings.clear();
    const uid = "OQS-UNREADABLE-AUDIO";
    await db.audio_recordings.put({ response_uid: uid, blob: { size: 3 }, status: "pending", created_at: new Date().toISOString() });
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") window.fetch = mockFetch;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await createWAL().syncPendingAudio(uid)).toBe(0);
    expect(mockFetch, "no upload with an empty file").not.toHaveBeenCalled();
    expect((await db.audio_recordings.get(uid)).status).toBe("pending");
  });
});
