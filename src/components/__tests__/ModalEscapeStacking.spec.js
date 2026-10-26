import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import BaseModal from "../common/BaseModal.vue";
import FilledFormsModal from "../dashboard/FilledFormsModal.vue";
import FocusModeModal from "../survey/FocusModeModal.vue";
import { db } from "../../services/db";

describe("Modal Dialog Escape Stacking and Focus Governance (Issue #42)", () => {
  let container;

  beforeEach(async () => {
    container = document.createElement("div");
    container.id = "test-modal-container";
    document.body.appendChild(container);

    await db.responses.clear();
    await db.wal.clear();
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
  });

  it("BaseModal places role='dialog' on the modal card, labels it by title, and gives close button accessible name", async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        title: "Beneficiary Verification",
      },
      attachTo: container,
    });

    await wrapper.vm.$nextTick();

    const overlay = document.body.querySelector(".backdrop-blur-xs");
    expect(overlay).toBeTruthy();
    // Invariant: Overlay should NOT have role="dialog" or aria-modal
    expect(overlay.getAttribute("role")).not.toBe("dialog");
    expect(overlay.getAttribute("aria-modal")).toBeNull();

    // Invariant: The inner card holds role="dialog" and aria-modal="true"
    const dialogCard = document.body.querySelector("[role='dialog']");
    expect(dialogCard).toBeTruthy();
    expect(dialogCard.getAttribute("aria-modal")).toBe("true");

    // Invariant: Labeled by title element
    const titleAttr = dialogCard.getAttribute("aria-labelledby");
    expect(titleAttr).toBeTruthy();
    const titleEl = document.getElementById(titleAttr);
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent.trim()).toBe("Beneficiary Verification");

    // Invariant: Close button accessible name is "Close dialog"
    const closeBtn = document.body.querySelector("button[aria-label='Close dialog']");
    expect(closeBtn).toBeTruthy();

    wrapper.unmount();
  });

  it("Stacked modals: with two BaseModals open, pressing Escape closes ONLY the topmost dialog", async () => {
    const bottomWrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        title: "Bottom Dialog",
      },
      attachTo: container,
    });

    const topWrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        title: "Topmost Dialog",
      },
      attachTo: container,
    });

    await bottomWrapper.vm.$nextTick();
    await topWrapper.vm.$nextTick();

    // Trigger window Escape
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    // Top dialog should emit close, bottom dialog should NOT emit close yet
    expect(topWrapper.emitted("close")).toBeTruthy();
    expect(topWrapper.emitted("close").length).toBe(1);
    expect(bottomWrapper.emitted("close")).toBeFalsy();

    // Close top dialog
    await topWrapper.setProps({ isOpen: false });
    await topWrapper.vm.$nextTick();

    // Second Escape closes bottom dialog
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(bottomWrapper.emitted("close")).toBeTruthy();
    expect(bottomWrapper.emitted("close").length).toBe(1);

    bottomWrapper.unmount();
    topWrapper.unmount();
  });

  it("Focus restoration: closing BaseModal returns focus to the opener element", async () => {
    const opener = document.createElement("button");
    opener.id = "opener-btn";
    opener.textContent = "Open Modal";
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const wrapper = mount(BaseModal, {
      props: {
        isOpen: false,
        title: "Focus Return Dialog",
      },
      attachTo: container,
    });

    // Open modal
    await wrapper.setProps({ isOpen: true });
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 20));

    // Close modal
    await wrapper.setProps({ isOpen: false });
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 20));

    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
    opener.remove();
  });

  it("FilledFormsModal closes on Escape, and closes inspector dialog before closing the full modal", async () => {
    await db.responses.bulkAdd([
      {
        response_uid: "RESP-001",
        template_name: "TMPL-01",
        status: "Submitted",
        responses: { q1: "test" },
      },
    ]);

    const wrapper = mount(FilledFormsModal, {
      props: {
        isOpen: true,
        isOnline: true,
        templates: [],
      },
      attachTo: container,
    });

    await new Promise((r) => setTimeout(r, 60));
    await wrapper.vm.$nextTick();

    // When inspector dialog is opened
    wrapper.vm.inspectResponse({
      response_uid: "RESP-001",
      template_name: "TMPL-01",
      responses: { q1: "test" },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedInspectResponse).toBeTruthy();

    // First Escape closes inspector dialog, does NOT emit close for FilledFormsModal
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.selectedInspectResponse).toBeNull();
    expect(wrapper.emitted("close")).toBeFalsy();

    // Second Escape closes FilledFormsModal itself
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("FocusModeModal: Escape closes mode menu first if open, or closes focus mode if mode menu is closed", async () => {
    const wrapper = mount(FocusModeModal, {
      props: {
        isOpen: true,
        questions: [
          { question_code: "q1", question_title: "Are you employed?", field_type: "Data" },
        ],
        currentIndex: 0,
        responses: {},
      },
      attachTo: container,
    });

    await wrapper.vm.$nextTick();

    // Case A: Mode menu is open
    wrapper.vm.isModeMenuOpen = true;
    await wrapper.vm.$nextTick();

    // Escape should close mode menu ONLY, not FocusModeModal
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isModeMenuOpen).toBe(false);
    expect(wrapper.emitted("close")).toBeFalsy();

    // Case B: Mode menu is closed -> Escape should exit Focus Mode
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });
});
