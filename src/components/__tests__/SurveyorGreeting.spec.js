import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";
import CompactHeader from "../header/CompactHeader.vue";

describe("Surveyor Greeting and Session Identity (Issue #51)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          today_count: 0,
          total_count: 0,
          daily_target: 10,
        },
      }),
    });
  });

  it("SurveyorDashboard greets user by full name from boot data instead of email username", async () => {
    window.frappe = {
      user: "oq.surveyor.test@example.com",
      boot: {
        user: {
          full_name: "OQ Test Surveyor",
        },
      },
      user_info: {
        "oq.surveyor.test@example.com": {
          fullname: "OQ Test Surveyor",
        },
      },
    };

    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 0,
        isOnline: true,
        activeDrafts: {},
        templates: [],
      },
    });

    const greeting = wrapper.find("h2");
    expect(greeting.exists()).toBe(true);
    expect(greeting.text()).toContain("OQ Test Surveyor");
    expect(greeting.text()).not.toContain("oq.surveyor.test");
  });

  it("CompactHeader settings sheet displays full name and shows email exactly once", async () => {
    window.frappe = {
      user: "oq.surveyor.test@example.com",
      boot: {
        user: {
          full_name: "OQ Test Surveyor",
        },
      },
      user_info: {
        "oq.surveyor.test@example.com": {
          fullname: "OQ Test Surveyor",
        },
      },
    };

    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test Survey",
        showBack: false,
        isOnline: true,
        pendingWALCount: 0,
        textSize: "md",
        progressPercent: 0,
        isRecording: false,
        isAudioPaused: false,
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

    // Check display name
    const sheetHeader = wrapper.find("h3");
    expect(sheetHeader.exists()).toBe(true);
    expect(sheetHeader.text()).toBe("OQ Test Surveyor");

    // Email should appear exactly once in the rendered text
    const text = wrapper.text();
    const occurrences = (text.match(/oq\.surveyor\.test@example\.com/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("CompactHeader never uses invented fallback surveyor@ommnomi.in when no user is logged in", () => {
    window.frappe = {
      user: null,
      boot: {},
      user_info: {},
    };

    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "",
        showBack: false,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).not.toContain("surveyor@ommnomi.in");
  });
});
