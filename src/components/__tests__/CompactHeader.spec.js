import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";
import { useTranslation } from "../../composables/useTranslation";
import { OMNIQUERY_CONTEXT } from "../../composables/useSurveyApp";
import { smallTapTargets } from "../../test/tapTargets";

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

  describe("at 375px (#41)", () => {
    beforeEach(() => {
      useTranslation().setLanguage("en");
    });

    // a cancelable click, so the spec can see whether the header kept the browser from following the link
    function clickLogo(wrapper, init = {}) {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
      wrapper.find("a[href='/omniquery']").element.dispatchEvent(event);
      return event;
    }

    it("makes the logo a link home, named by its wordmark", () => {
      const wrapper = mountHeader({ roles: ["OmniQuery User"] });
      const logo = wrapper.find("a[href='/omniquery']");
      expect(logo.exists(), "logo link").toBe(true);
      expect(logo.text()).toBe("OmniQuery");
      expect(logo.find("img").attributes("alt"), "the icon is decorative next to the wordmark").toBe("");
      wrapper.unmount();
    });

    it("stays in the app on a plain click, and leaves cmd, ctrl or shift-click to the browser", () => {
      const wrapper = mountHeader({ roles: ["OmniQuery User"] });
      expect(clickLogo(wrapper).defaultPrevented, "plain click").toBe(true);
      expect(wrapper.emitted("home")).toHaveLength(1);
      for (const key of ["metaKey", "ctrlKey", "shiftKey"]) {
        expect(clickLogo(wrapper, { [key]: true }).defaultPrevented, key).toBe(false);
      }
      expect(wrapper.emitted("home"), "a modifier click opens a tab instead").toHaveLength(1);
      wrapper.unmount();
    });

    it("gives every button and link in the header and settings sheet a 24px target", async () => {
      const wrapper = mountHeader({ roles: ["OmniQuery User"], pendingWALCount: 2, attachTo: document.body });
      await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
      expect(document.body.querySelector("a[href='/me']"), "settings sheet open").not.toBeNull();
      expect(smallTapTargets(document.body)).toEqual([]);
      wrapper.unmount();
    });

    it("finds a target under 24px, or one with no height at all", () => {
      document.body.innerHTML = `<button class="h-5 sm:h-10">a</button><a href="/x" class="flex">b</a>
        <a href="/y"><img class="w-7 h-7"></a><button class="!h-9 !w-4">c</button><button class="h-7 !h-4 w-11">e</button><span role="button" class="min-h-[44px]">d</span>`;
      expect(smallTapTargets(document.body)).toEqual(["a: ?x20px", "b: ?x?px", "c: 16x36px", "e: 44x16px"]);
      document.body.innerHTML = "";
    });
  });

  describe("settings dialog (#40)", () => {
    beforeEach(() => {
      useTranslation().setLanguage("en");
    });

    const avatarOf = (wrapper) => wrapper.find("button[aria-label='Settings & Configuration']").element;
    const settingsOpen = () => Boolean(document.body.querySelector("[role='dialog']"));

    async function openSettings(options = {}) {
      const wrapper = mountHeader({ roles: ["OmniQuery User"], attachTo: document.body, ...options });
      const avatar = avatarOf(wrapper);
      avatar.focus();
      await wrapper.find("button[aria-label='Settings & Configuration']").trigger("click");
      await vi.waitFor(() => expect(settingsOpen(), "settings open").toBe(true));
      return { wrapper, avatar };
    }

    it("closes on Escape and gives focus back to the avatar", async () => {
      const { wrapper, avatar } = await openSettings();
      expect(document.body.querySelector("[role='dialog']").contains(document.activeElement), "focus moved into the dialog").toBe(true);
      document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await vi.waitFor(() => expect(settingsOpen()).toBe(false));
      await vi.waitFor(() => expect(document.activeElement).toBe(avatar));
      wrapper.unmount();
    });

    it("hides the page behind it from screen readers while open", async () => {
      const { wrapper } = await openSettings();
      expect(wrapper.element.closest("[aria-hidden='true']"), "header is aria-hidden behind the dialog").not.toBeNull();
      expect(document.body.querySelector("[role='dialog']").getAttribute("aria-labelledby"), "named by its title").toBeTruthy();
      wrapper.unmount();
    });

    it("makes each preference a radio group named by its row label", async () => {
      const { wrapper } = await openSettings();
      const groups = [...document.body.querySelectorAll("[role='radiogroup']")];
      const names = groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby"))?.textContent);
      expect(names).toEqual(["Language", "Text size", "Theme", "Choice layout"]);
      const checked = groups[0].querySelector("[aria-checked='true']");
      expect(checked?.textContent.trim(), "the language on screen is the checked one").toBe("English");
      wrapper.unmount();
    });

    it("offers System, Light and Dark, starts on Light and saves the pick (#39)", async () => {
      localStorage.removeItem("omniquery_theme");
      const { wrapper } = await openSettings();
      const group = [...document.body.querySelectorAll("[role='radiogroup']")][2];
      const radios = [...group.querySelectorAll("[role='radio']")];
      expect(radios.map((r) => r.textContent.trim())).toEqual(["System", "Light", "Dark"]);
      expect(group.querySelector("[aria-checked='true']")?.textContent.trim(), "never picked: light").toBe("Light");
      radios[0].click();
      await vi.waitFor(() => expect(localStorage.getItem("omniquery_theme")).toBe("auto"));
      await vi.waitFor(() => expect(group.querySelector("[aria-checked='true']")?.textContent.trim()).toBe("System"));
      localStorage.removeItem("omniquery_theme");
      wrapper.unmount();
    });

    it("opens the queue with focus on the avatar, so the queue gives focus back there", async () => {
      let focusedWhenQueueOpened = null;
      const { wrapper, avatar } = await openSettings({
        pendingWALCount: 2,
        attrs: { onOpenWal: () => (focusedWhenQueueOpened = document.activeElement) },
      });
      const sync = [...document.body.querySelectorAll("[role='dialog'] button")].find((b) => b.textContent.includes("Sync Now"));
      sync.click();
      await vi.waitFor(() => expect(wrapper.emitted("open-wal")).toHaveLength(1));
      expect(focusedWhenQueueOpened).toBe(avatar);
      await vi.waitFor(() => expect(settingsOpen()).toBe(false));
      wrapper.unmount();
    });

    it("uses plain words: no queue jargon, no 'Credentials'", async () => {
      const { wrapper } = await openSettings({ pendingWALCount: 3 });
      const text = document.body.querySelector("[role='dialog']").textContent;
      for (const jargon of ["WAL", "ERPNext", "Credentials"]) expect(text, jargon).not.toContain(jargon);
      expect(text).toContain("Waiting to upload");
      expect(text).toContain("Your account");
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
