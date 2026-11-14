import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";
import { useTranslation } from "../../composables/useTranslation";

describe("CompactHeader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("computes 'OmniQuery Manager' role label for manager users", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        userRoles: ["OmniQuery Manager"],
      },
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("OmniQuery Manager");
    expect(wrapper.vm.isManager).toBe(true);

    // Open settings modal to verify rendered label inside bottom sheet
    await wrapper.find("button[title*='Settings']").trigger("click");
    expect(document.body.textContent).toContain("OmniQuery Manager");
    wrapper.unmount();
  });

  it("computes 'OmniQuery Admin' role label for System Manager / OmniQuery Admin", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        userRoles: ["OmniQuery Admin", "System Manager"],
      },
    });

    expect(wrapper.vm.roleLabel).toBe("OmniQuery Admin");
    expect(wrapper.vm.isManager).toBe(true);
    wrapper.unmount();
  });

  it("computes 'Field Surveyor' role label only when user has OmniQuery User role", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        userRoles: ["OmniQuery User"],
      },
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("Field Surveyor");
    expect(wrapper.vm.isManager).toBe(false);

    await wrapper.find("button[title*='Settings']").trigger("click");
    expect(document.body.textContent).toContain("Field Surveyor");
    wrapper.unmount();
  });

  it("computes 'Public Respondent' for desk users or users without surveyor or manager roles", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        userRoles: ["Desk User"],
      },
      attachTo: document.body,
    });

    expect(wrapper.vm.roleLabel).toBe("Public Respondent");
    expect(wrapper.vm.isManager).toBe(false);

    await wrapper.find("button[title*='Settings']").trigger("click");
    expect(document.body.textContent).toContain("Public Respondent");
    expect(document.body.textContent).not.toContain("Field Surveyor");
    wrapper.unmount();
  });

  it("renders Guest login button and identifies as guest when no roles or Guest role is passed", () => {
    const wrapper = mount(CompactHeader, {
      props: {
        userRoles: ["Guest"],
      },
    });

    expect(wrapper.vm.isGuest).toBe(true);
    expect(wrapper.vm.roleLabel).toBe("Public Respondent");
    expect(wrapper.find("a[href*='/login']").exists()).toBe(true);
    expect(wrapper.find("button[title*='Settings']").exists()).toBe(false);
    wrapper.unmount();
  });

  describe("account link in the settings sheet (#52)", () => {
    beforeEach(() => {
      useTranslation().setLanguage("en");
    });

    async function openSettings(props) {
      const wrapper = mount(CompactHeader, {
        props: { userRoles: ["OmniQuery User"], ...props },
        attachTo: document.body,
      });
      const settings = wrapper.find("button[title='Settings & Configuration']");
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
      const wrapper = mount(CompactHeader, { props: { userRoles: ["OmniQuery User"] }, attachTo: document.body });
      await wrapper.find("button[title='Settings & Configuration']").trigger("click");
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
});
