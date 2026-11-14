import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// Only the server is faked: the real session, views and IndexedDB run, so this catches the shell
// wiring (#46) that a file-shape guard cannot, such as a session whose refs never unwrap
// what get_bootstrap_data returns; a test may swap it before mounting
const assigned = {
  is_unassigned: false,
  templates: [
    { name: "OQS-WATER", title: "Water Access Survey", project: "P-1", project_name: "Village Water", version: 1, schema: { sections: [] } },
    { name: "OQS-SHG", title: "SHG Income Survey", project: "P-1", project_name: "Village Water", version: 1, schema: { sections: [] } },
  ],
};
let bootstrap = assigned;

vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method) => {
      if (method === "omniquery.api.survey.get_bootstrap_data") return bootstrap;
      return {};
    }),
  };
});

import App from "../App.vue";
import { db } from "../services/db";
import { useTranslation } from "../composables/useTranslation";

const surveyTitles = () => Array.from(document.body.querySelectorAll("h2")).map((h) => h.textContent.trim());

// the session reads IndexedDB before it asks the server, so wait for the loading screen to go
async function settle() {
  await flushPromises();
  await vi.waitFor(() => {
    if (document.body.textContent.includes("Loading surveys")) throw new Error("still loading");
  });
  await flushPromises();
}

describe("App shell (#46)", () => {
  let wrapper;

  beforeEach(async () => {
    bootstrap = assigned;
    useTranslation().setLanguage("en");
    await db.templates.clear();
    await db.responses.clear();
    window.history.replaceState({}, "", "/omniquery");
    window.scrollTo = vi.fn();
  });
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
  });

  it("leaves the loading screen and lists the surveys", async () => {
    wrapper = mount(App, { attachTo: document.body });
    expect(document.body.textContent).toContain("Loading surveys");
    await settle();
    expect(document.body.textContent).not.toContain("Loading surveys");
    expect(surveyTitles()).toEqual(expect.arrayContaining(["Water Access Survey", "SHG Income Survey"]));
  });

  it("keeps the search when the catalog is left and reopened", async () => {
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    const search = () => document.body.querySelector("input[placeholder='Search surveys...']");
    search().value = "income";
    search().dispatchEvent(new Event("input"));
    await nextTick();
    expect(surveyTitles()).not.toContain("Water Access Survey");

    wrapper.vm.s.openProjectPage("P-1");
    await settle();
    expect(search(), "catalog unmounted on the project page").toBeNull();
    wrapper.vm.s.closeProjectPage();
    await settle();

    expect(search().value).toBe("income");
    expect(surveyTitles()).toContain("SHG Income Survey");
    expect(surveyTitles()).not.toContain("Water Access Survey");
  });

  it("opens the sync queue drawer and hands over to saved responses", async () => {
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    const drawerOpen = () => document.body.textContent.includes("Sync all records now");

    wrapper.vm.s.showWALDrawer = true;
    await nextTick();
    expect(drawerOpen(), "drawer opens").toBe(true);

    const viewSaved = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent.includes("View saved responses"));
    viewSaved.click();
    await settle();
    expect(drawerOpen(), "drawer closes").toBe(false);
    expect(wrapper.vm.s.showFilledFormsModal, "saved responses open").toBe(true);
  });

  it("closes only the topmost dialog on Escape", async () => {
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    wrapper.vm.s.showWALDrawer = true;
    await nextTick();
    wrapper.vm.s.showFilledFormsModal = true;
    await settle();

    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(wrapper.vm.s.showFilledFormsModal, "top dialog closes").toBe(false);
    expect(wrapper.vm.s.showWALDrawer, "the one beneath stays open").toBe(true);
  });

  it("tells the surveyor in a frappe-ui toast when a survey is not on the device", async () => {
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    const offline = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    try {
      await wrapper.vm.s.selectSurvey("OQS-NOT-DOWNLOADED");
      await vi.waitFor(() => {
        const toast = [...document.body.querySelectorAll("li")].find((li) => li.textContent.includes("not yet downloaded on your device"));
        expect(toast, "no toast rendered").toBeTruthy();
      });
    } finally {
      offline.mockRestore();
    }
  });

  it("shows an unassigned surveyor the ask-your-supervisor note, not an empty catalog", async () => {
    bootstrap = { is_unassigned: true, templates: [] };
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    expect(document.body.textContent).toContain("You are not assigned to a project yet");
    expect(document.body.querySelector("input[placeholder='Search surveys...']"), "no search over nothing").toBeNull();
    expect(document.body.textContent).not.toContain("No active surveys available");
  });
});
