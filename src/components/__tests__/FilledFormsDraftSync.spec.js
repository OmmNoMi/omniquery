import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";
import FilledFormsModal from "../dashboard/FilledFormsModal.vue";
import { useDrafts } from "../../composables/useDrafts";
import { db } from "../../services/db";

describe("Filled Forms & Dashboard Draft Count Sync + Dialog A11y (Issue #56)", () => {
  let el;

  beforeEach(async () => {
    el = document.createElement("div");
    el.id = "test-root";
    document.body.appendChild(el);

    await db.responses.clear();
    await db.wal.clear();

    // Seed 2 local drafts for the SAME template
    await db.responses.bulkAdd([
      {
        response_uid: "RESP-DRAFT-001",
        template_name: "TMPL-DAIRY-001",
        template_title: "Dairy Production Survey",
        status: "Draft",
        synced: 0,
        updated_at: "2026-10-01 10:00:00",
        responses: { q1: "A" },
      },
      {
        response_uid: "RESP-DRAFT-002",
        template_name: "TMPL-DAIRY-001",
        template_title: "Dairy Production Survey",
        status: "Draft",
        synced: 0,
        updated_at: "2026-10-01 11:00:00",
        responses: { q1: "B" },
      },
    ]);
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
  });

  it("reads the exact same draft count from useDrafts shared store in both dashboard and modal", async () => {
    const { loadDrafts, draftsCount } = useDrafts();
    await loadDrafts();
    expect(draftsCount.value).toBe(2);

    const dashboardWrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 0,
        isOnline: true,
      },
      attachTo: el,
    });

    const modalWrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
      },
      attachTo: el,
    });

    await vi.waitFor(() => {
      // Dashboard Drafts card must display '2', not '1'
      expect(dashboardWrapper.text()).toContain("Drafts");
      expect(dashboardWrapper.find(".text-blue-900, .text-blue-100").text()).toBe("2");

      // Modal must also display 'Drafts (2)'
      expect(document.body.textContent).toContain("Drafts (2)");
    });

    dashboardWrapper.unmount();
    modalWrapper.unmount();
  });

  it("renders with role=dialog, aria-modal=true, and heading 'On this device'", async () => {
    const modalWrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
      },
      attachTo: el,
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("On this device");
    });

    const dialog = document.querySelector("[role='dialog']");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    modalWrapper.unmount();
  });

  it("closes when Escape key is pressed and restores focus to opener", async () => {
    const opener = document.createElement("button");
    opener.id = "open-modal-btn";
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const modalWrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
      },
      attachTo: el,
    });

    await vi.waitFor(() => {
      expect(document.querySelector("[role='dialog']")).not.toBeNull();
    });

    // Press Escape
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await modalWrapper.vm.$nextTick();

    expect(modalWrapper.emitted("close")).toBeTruthy();

    // Simulate parent closing modal
    await modalWrapper.setProps({ isOpen: false });
    await modalWrapper.vm.$nextTick();

    // Focus restored to opener
    expect(document.activeElement).toBe(opener);

    modalWrapper.unmount();
  });
});
