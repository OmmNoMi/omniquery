import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";
import { useTranslation } from "../../composables/useTranslation";
import { OMNIQUERY_CONTEXT } from "../../composables/useSurveyApp";

// The header reads roles from the boot data and online/queue state from App's provided context (#46)
function mountHeader({ roles = [], isOnline = true, pendingWALCount = 0, ...options } = {}) {
  window.frappe = { ...window.frappe, user_roles: roles };
  const context = {
    isOnline: ref(isOnline),
    pendingWALCount: ref(pendingWALCount),
    textSize: ref("md"),
    progressPercent: ref(0),
    isRecording: ref(false),
    isAudioPaused: ref(false),
  };
  return mount(CompactHeader, { ...options, global: { provide: { [OMNIQUERY_CONTEXT]: context } } });
}

describe("CompactHeader", () => {
  const bootFrappe = window.frappe;

  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    window.frappe = bootFrappe;
  });

  it("computes 'OmniQuery Manager' role label for manager users", async () => {
    const wrapper = mountHeader({
      roles: ["OmniQuery Manager"],
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("OmniQuery Manager");
    expect(wrapper.vm.isManager).toBe(true);

    // Open settings modal to verify rendered label inside bottom sheet
    await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
    expect(document.body.textContent).toContain("OmniQuery Manager");
    wrapper.unmount();
  });

  it("computes 'OmniQuery Admin' role label for System Manager / OmniQuery Admin", async () => {
    const wrapper = mountHeader({
      roles: ["OmniQuery Admin", "System Manager"],
    });

    expect(wrapper.vm.roleLabel).toBe("OmniQuery Admin");
    expect(wrapper.vm.isManager).toBe(true);
    wrapper.unmount();
  });

  it("computes 'Field Surveyor' role label only when user has OmniQuery User role", async () => {
    const wrapper = mountHeader({
      roles: ["OmniQuery User"],
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("Field Surveyor");
    expect(wrapper.vm.isManager).toBe(false);

    await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
    expect(document.body.textContent).toContain("Field Surveyor");
    wrapper.unmount();
  });

  it("computes 'Public Respondent' for desk users or users without surveyor or manager roles", async () => {
    const wrapper = mountHeader({
      roles: ["Desk User"],
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("Public Respondent");
    expect(wrapper.vm.isManager).toBe(false);

    await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
    expect(document.body.textContent).toContain("Public Respondent");
    expect(document.body.textContent).not.toContain("Field Surveyor");
    wrapper.unmount();
  });

  it("renders Guest login button and identifies as guest when no roles or Guest role is passed", () => {
    const wrapper = mountHeader({
      roles: ["Guest"],
    });

    expect(wrapper.vm.isGuest).toBe(true);
    expect(wrapper.vm.roleLabel).toBe("Public Respondent");
    expect(wrapper.find("a[href*='/login']").exists()).toBe(true);
    expect(wrapper.find("button[aria-label='Settings & Configuration']").exists()).toBe(false);
    wrapper.unmount();
  });

  describe("account link in the settings sheet (#52)", () => {
    beforeEach(() => {
      useTranslation().setLanguage("en");
    });

    async function openSettings(context) {
      const wrapper = mountHeader({
        roles: ["OmniQuery User"],
        ...context,
        attachTo: document.body,
      });
      const settings = wrapper.find("button[aria-label='Settings & Configuration']");
      expect(settings.exists(), "settings button").toBe(true);
      await settings.trigger("click");
      return wrapper;
    }

    it("links to Frappe's /me page as My Account", async () => {
      const wrapper = await openSettings({ isOnline: true });
      const link = document.body.querySelector("a[href='/me']");
      expect(link?.textContent).toContain("My Account");
      expect(document.body.textContent).not.toContain("ERPNext Profile");
      wrapper.unmount();
    });

    it("shows no link while offline, since /me is not cached for offline use", async () => {
      const wrapper = await openSettings({ isOnline: false });
      expect(document.body.querySelector("a[href='/me']")).toBeNull();
      expect(document.body.textContent).toContain("My Account needs internet");
      wrapper.unmount();
    });
  });

  describe("who is signed in, in the settings sheet (#51)", () => {
    const original = window.frappe;
    const EMAIL = "oq.surveyor.test@example.com";

    beforeEach(() => {
      useTranslation().setLanguage("en");
    });
    afterEach(() => {
      window.frappe = original;
    });

    async function openSettingsAs(user, user_fullname) {
      window.frappe = { ...original, user, user_fullname };
      const wrapper = mountHeader({ roles: ["OmniQuery User"], attachTo: document.body });
      await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
      return wrapper;
    }

    const timesShown = (needle) => document.body.textContent.split(needle).length - 1;

    it("names the surveyor by full name and shows the email once", async () => {
      const wrapper = await openSettingsAs(EMAIL, "OQ Test Surveyor");
      expect(document.body.querySelector("h3")?.textContent).toBe("OQ Test Surveyor");
      expect(timesShown(EMAIL)).toBe(1);
      wrapper.unmount();
    });

    it("shows the email once, not twice, when it is all there is", async () => {
      const wrapper = await openSettingsAs(EMAIL, "");
      expect(document.body.querySelector("h3")?.textContent).toBe(EMAIL);
      expect(timesShown(EMAIL)).toBe(1);
      wrapper.unmount();
    });
  });

  describe("state from App's provided context (#46)", () => {
    beforeEach(() => {
      useTranslation().setLanguage("en");
    });

    it("shows offline and the queued count from the injected context", () => {
      const wrapper = mountHeader({ roles: ["OmniQuery User"], isOnline: false, pendingWALCount: 3 });
      expect(wrapper.find("[title='Offline']").exists(), "offline dot").toBe(true);
      expect(wrapper.find("[title^='3 Pending Offline Responses']").exists(), "queue badge").toBe(true);
      wrapper.unmount();
    });

    it("refuses to render without App's provider instead of claiming to be online", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => mount(CompactHeader)).toThrow(/provideSurveyApp/);
    });
  });
});
