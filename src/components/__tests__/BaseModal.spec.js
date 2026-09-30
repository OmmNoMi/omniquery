import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import BaseModal from "../common/BaseModal.vue";

describe("BaseModal", () => {
  let el;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders title, subtitle, and slots when isOpen is true", () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        title: "Test Modal Title",
        subtitle: "Test Subtitle Info",
        icon: "ℹ️",
      },
      slots: {
        default: "<p id='modal-body'>Modal body content</p>",
      },
      attachTo: el,
    });

    expect(document.body.textContent).toContain("Test Modal Title");
    expect(document.body.textContent).toContain("Test Subtitle Info");
    expect(document.body.textContent).toContain("ℹ️");
    expect(document.body.querySelector("#modal-body")?.textContent).toBe("Modal body content");
    wrapper.unmount();
  });

  it("emits close event when close button is clicked", async () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: true,
        title: "Dismissible Modal",
      },
      attachTo: el,
    });

    // Close button has text '✕'
    const buttons = Array.from(document.body.querySelectorAll("button"));
    const closeBtn = buttons.find((b) => b.textContent?.trim() === "✕");
    expect(closeBtn).toBeDefined();

    closeBtn?.click();
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("does not render dialog in DOM when isOpen is false", () => {
    const wrapper = mount(BaseModal, {
      props: {
        isOpen: false,
        title: "Hidden Modal",
      },
      attachTo: el,
    });

    expect(document.body.querySelector("[role='dialog']")).toBeNull();
    wrapper.unmount();
  });
});
