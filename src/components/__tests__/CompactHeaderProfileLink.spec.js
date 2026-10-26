import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";

describe("CompactHeader Profile Link (Issue #52)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("links to Frappe /me and labels it My Account instead of ERPNext Profile", async () => {
    window.frappe = {
      user: "oq.surveyor.test@example.com",
      boot: {
        user: {
          full_name: "OQ Test Surveyor",
        },
      },
    };

    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test Survey",
        showBack: false,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Open settings sheet
    const avatarButton = wrapper.find("button[title*='Settings'], button[title*='Configuration']");
    if (avatarButton.exists()) {
      await avatarButton.trigger("click");
    }

    const text = wrapper.text();
    expect(text).not.toContain("ERPNext Profile");
    expect(text).not.toContain("ERPNext");

    const profileLink = wrapper.find("a[href='/me']");
    expect(profileLink.exists()).toBe(true);
    expect(profileLink.text()).toContain("My Account");

    const brokenLink = wrapper.find("a[href='/app/user-profile']");
    expect(brokenLink.exists()).toBe(false);
  });
});
