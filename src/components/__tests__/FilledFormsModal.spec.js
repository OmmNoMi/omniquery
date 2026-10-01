import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import JSZip from "jszip";
import FilledFormsModal from "../dashboard/FilledFormsModal.vue";
import { db } from "../../services/db";

describe("FilledFormsModal (Disaster Recovery & Forensic Export Specs)", () => {
  let el;

  beforeEach(async () => {
    el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);

    // Mock clipboard and URL methods
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-blob-id");
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/mock-blob-id");
      vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    }

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });


    // Clear and pre-seed Dexie database
    await db.responses.clear();
    await db.wal.clear();

    await db.responses.bulkAdd([
      {
        response_uid: "RESP-SYNCED-001",
        template_name: "TMPL-DAIRY-001",
        template_title: "Dairy Production Survey",
        status: "Submitted",
        synced: 1,
        created_at: "2026-10-01 10:00:00",
        responses: { q_herd_count: 5, q_farmer_name: "Rajesh Kumar" },
      },
      {
        response_uid: "RESP-DRAFT-002",
        template_name: "TMPL-DAIRY-001",
        template_title: "Dairy Production Survey",
        status: "Draft",
        synced: 0,
        created_at: "2026-10-01 11:30:00",
        responses: { q_herd_count: 12, q_farmer_name: "Sunita Devi" },
      },
    ]);

    await db.wal.bulkAdd([
      {
        wal_id: "WAL-QUEUED-003",
        entity_type: "OmniQuery Response",
        operation: "SUBMIT",
        status: "pending",
        timestamp: "2026-10-01 12:00:00",
        attempts: 1,
        payload: JSON.stringify({
          idempotency_key: "RESP-QUEUED-003",
          survey_template: "TMPL-DAIRY-001",
          items: [{ question_code: "q_herd_count", value: 8 }],
        }),
      },
      {
        wal_id: "WAL-QUARANTINED-004",
        entity_type: "OmniQuery Response",
        operation: "SUBMIT",
        status: "quarantined",
        timestamp: "2026-10-01 12:15:00",
        attempts: 5,
        payload: JSON.stringify({
          idempotency_key: "RESP-QUARANTINED-004",
          survey_template: "TMPL-DAIRY-001",
          items: [{ question_code: "q_herd_count", value: 3 }],
        }),
      },
    ]);
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
  });

  it("renders correctly and populates responses across all statuses", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    // Wait for async loadResponses()
    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    expect(document.body.textContent).toContain("Saved Responses & Drafts");
    expect(document.body.textContent).toContain("records stored on this device");
    expect(document.body.textContent).toContain("All (4)");
    expect(document.body.textContent).toContain("Drafts (1)");
    expect(document.body.textContent).toContain("In Queue (1)");
    expect(document.body.textContent).toContain("Needs Review (1)");

    wrapper.unmount();
  });

  it("filters responses when filter buttons are clicked", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    // Click Drafts filter button
    const buttons = Array.from(document.body.querySelectorAll("button"));
    const draftsBtn = buttons.find((b) => b.textContent?.includes("Drafts"));
    expect(draftsBtn).toBeDefined();

    draftsBtn.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.activeFilter).toBe("drafts");
    expect(wrapper.vm.filteredResponses.length).toBe(1);
    expect(wrapper.vm.filteredResponses[0].response_uid).toBe("RESP-DRAFT-002");

    wrapper.unmount();
  });

  it("emits resume-draft when clicking Resume on an offline draft card", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    // Find and click the Resume button
    const buttons = Array.from(document.body.querySelectorAll("button"));
    const resumeBtn = buttons.find((b) => b.textContent?.includes("Resume"));
    expect(resumeBtn).toBeDefined();

    resumeBtn.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("resume-draft")).toBeTruthy();
    expect(wrapper.emitted("resume-draft")[0]).toEqual(["TMPL-DAIRY-001", "RESP-DRAFT-002"]);

    wrapper.unmount();
  });


  it("generates a consolidated JSON disaster recovery backup payload", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: false,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    // Spy on link download click
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        element.click = clickSpy;
      }
      return element;
    });

    // Open export menu and click JSON Backup
    wrapper.vm.isExportMenuOpen = true;
    await wrapper.vm.$nextTick();

    await wrapper.vm.exportToJson();

    expect(clickSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("formats tabular CSV properly with escaped quotes and values", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: false,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    const csvContent = wrapper.vm.generateCsvString();
    expect(csvContent).toContain("Response UID");
    expect(csvContent).toContain("Template");
    expect(csvContent).toContain("Status");
    expect(csvContent).toContain("RESP-SYNCED-001");
    expect(csvContent).toContain("RESP-DRAFT-002");

    wrapper.unmount();
  });

  it("generates an offline forensic JSZip archive containing manifest, records, and readme", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: false,
        templates: [{ name: "TMPL-DAIRY-001", title: "Dairy Production Survey" }],
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();

    const zipFileSpy = vi.spyOn(JSZip.prototype, "file");
    const zipFolderSpy = vi.spyOn(JSZip.prototype, "folder");

    await wrapper.vm.exportToZip();

    // Invariants: Zip bundle must contain manifest, consolidated records, and CSV
    expect(zipFileSpy).toHaveBeenCalledWith("manifest.json", expect.any(String));
    expect(zipFileSpy).toHaveBeenCalledWith("all_records.json", expect.any(String));
    expect(zipFileSpy).toHaveBeenCalledWith("records_summary.csv", expect.any(String));
    expect(zipFileSpy).toHaveBeenCalledWith("README.txt", expect.any(String));
    expect(zipFolderSpy).toHaveBeenCalledWith("individual_surveys");

    wrapper.unmount();
  });

  it("emits close when back or close button is clicked", async () => {
    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
      },
      attachTo: el,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    await wrapper.vm.$nextTick();

    const buttons = Array.from(document.body.querySelectorAll("button"));
    const backBtn = buttons.find((b) => b.textContent?.includes("Back"));
    expect(backBtn).toBeDefined();

    backBtn.click();
    expect(wrapper.emitted("close")).toBeTruthy();

    wrapper.unmount();
  });
});
