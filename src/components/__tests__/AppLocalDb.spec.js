import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../services/db";

describe("App.vue Local DB Invariant: Submitted status and progress (Issue #31)", () => {
  beforeEach(async () => {
    await db.responses.clear();
  });

  it("stores a submitted response with status='Submitted' and progress_percent=100 in Dexie", async () => {
    const draftKey = "OQS-TEST-SUBMIT-001";
    const tmplName = "OQS-001-001-001";

    await db.responses.put({
      response_uid: draftKey,
      template_name: tmplName,
      title: "Test Submitted Survey",
      response_title_format: "{respondent_name}",
      responses: { q1: "test answer" },
      active_section_index: 0,
      progress_percent: 100,
      status: "Submitted",
      updated_at: new Date().toISOString(),
      synced: false,
    });

    const record = await db.responses.get(draftKey);
    expect(record).toBeDefined();
    expect(record.status).toBe("Submitted");
    expect(record.progress_percent).toBe(100);
    expect(record.synced).toBe(false);

    // Verify restoreSubmittedResponseId query works on Dexie
    const latest = await db.responses
      .where("template_name")
      .equals(tmplName)
      .reverse()
      .sortBy("updated_at");

    expect(latest.length).toBe(1);
    expect(latest[0].response_uid).toBe(draftKey);

    // Verify synced update
    await db.responses.update(draftKey, { synced: true });
    const updated = await db.responses.get(draftKey);
    expect(updated.synced).toBe(true);
  });
});
