import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";

describe("CompactHeader Settings Sheet Invariants (#40)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.frappe = {
      user: "Administrator",
      boot: {
        user: {
          roles: ["Administrator", "System Manager"],
        },
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("closes settings sheet on Escape key and returns focus to avatar button", async () => {
    const wrapper = mount(CompactHeader, {
      attachTo: document.body,
      props: {
        surveyTitle: "Test Survey",
      },
    });

    // Find avatar trigger button and open sheet
    const avatarButton = wrapper.find('[aria-label="Settings & Configuration"], [title="Settings & Configuration"]');
    expect(avatarButton.exists()).toBe(true);
    await avatarButton.trigger("click");
    expect(wrapper.vm.showConfigModal).toBe(true);

    // Press Escape on window
    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    window.dispatchEvent(escapeEvent);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.showConfigModal).toBe(false);
  });

  it("contains no WAL or ERPNext jargon in user-facing settings copy", async () => {
    const wrapper = mount(CompactHeader, {
      attachTo: document.body,
      props: {
        surveyTitle: "Test Survey",
        pendingWALCount: 3,
      },
    });

    wrapper.vm.showConfigModal = true;
    await wrapper.vm.$nextTick();

    const text = document.body.textContent || "";
    expect(text).not.toContain("WAL");
    expect(text).not.toContain("ERPNext");
    expect(text).toContain("Waiting to upload");
  });

  it("derives role label from frappe.boot roles instead of hardcoding Field Surveyor", async () => {
    window.frappe = {
      user: "Administrator",
      boot: {
        user: {
          roles: ["Administrator", "System Manager"],
        },
      },
    };

    const wrapper = mount(CompactHeader, {
      attachTo: document.body,
      props: {
        surveyTitle: "Test Survey",
      },
    });

    wrapper.vm.showConfigModal = true;
    await wrapper.vm.$nextTick();

    const text = document.body.textContent || "";
    expect(text).toContain("Administrator");
    expect(text).not.toContain("Field Surveyor");
  });
});
