import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../../App.vue";
import { db } from "../../services/db";

describe("App submit failure handling (#32)", () => {
  beforeEach(async () => {
    await db.wal.clear();
    await db.responses.clear();
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: [] }),
    });
  });

  it("handles db.wal.add rejection without showing success screen and keeps isSubmitting false with actionable error", async () => {
    const walSpy = vi.spyOn(db.wal, "add").mockRejectedValue(new Error("Disk storage full"));

    const wrapper = mount(App);

    // Provide a minimal template and section to simulate active survey
    wrapper.vm.activeTemplate = {
      name: "TMPL-TEST",
      template_name: "TMPL-TEST",
      title: "Test Survey",
      version: 1,
      sections: [
        {
          section_code: "sec_1",
          section_label: "Section 1",
          section_order: 1,
          questions: [],
        },
      ],
    };
    wrapper.vm.activeSectionIndex = 0;
    wrapper.vm.responses = {};

    expect(wrapper.vm.isSubmitting).toBe(false);
    expect(wrapper.vm.isSubmitted).toBe(false);

    // Call submitForm
    await wrapper.vm.submitForm();

    // Invariant 1: No success screen appears
    expect(wrapper.vm.isSubmitted).toBe(false);
    expect(wrapper.text()).not.toContain("Survey Submitted");
    expect(wrapper.text()).not.toContain("Response recorded successfully in offline queue");

    // Invariant 2: isSubmitting is reset to false (never stuck disabled)
    expect(wrapper.vm.isSubmitting).toBe(false);

    // Invariant 3: Actionable error message is displayed
    expect(wrapper.vm.submissionError).toBe("Disk storage full");
    expect(wrapper.text()).toContain("Try again");

    // Invariant 4: Retry succeeds when storage error clears
    walSpy.mockRestore();
    await wrapper.vm.submitForm();
    expect(wrapper.vm.isSubmitted).toBe(true);
    expect(wrapper.vm.submissionError).toBeNull();
    expect(wrapper.vm.isSubmitting).toBe(false);
  });
});
