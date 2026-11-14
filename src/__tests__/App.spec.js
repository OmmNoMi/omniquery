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
// get_schema by template name, as the server answers it; a slug is resolved only by the page (omniquery.py)
const schemas = {
  "OQS-WATER": { template_name: "OQS-WATER", title: "Water Access Survey", project: "P-1", sections: [{ section_title: "Water source", questions: [] }] },
};

vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method, args) => {
      if (method === "omniquery.api.survey.get_bootstrap_data") return bootstrap;
      if (method === "omniquery.api.survey.get_schema") return schemas[args.template_name] ?? null;
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
    delete window.frappe;
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

// What the app shows, read from the page as a surveyor sees it
function shownView() {
  if (document.body.querySelector("input[placeholder='Search surveys...']")) return "catalog";
  const heading = document.body.querySelector("main h1, main h2, main h3");
  return heading ? heading.textContent.trim() : "";
}

// The session history as a browser keeps it. happy-dom's test window has no browser frame, so its
// history.back() does nothing: record each entry the app pushes or replaces, and go Back as a
// browser does, to the entry before, with the URL and state the app gave it
let entries = [];
const { pushState, replaceState } = window.history;
function recordHistory() {
  vi.spyOn(window.history, "pushState").mockImplementation((state, _title, url) => {
    pushState.call(window.history, state, "", url);
    entries.push({ state: structuredClone(state), url: window.location.pathname });
  });
  vi.spyOn(window.history, "replaceState").mockImplementation((state, _title, url) => {
    replaceState.call(window.history, state, "", url);
    entries[entries.length - 1] = { state: structuredClone(state), url: window.location.pathname };
  });
}
async function goBack() {
  entries.pop();
  const { state, url } = entries[entries.length - 1];
  replaceState.call(window.history, state, "", url);
  // happy-dom's PopStateEvent is a plain Event that drops `state`; a browser's carries the entry's
  window.dispatchEvent(Object.defineProperty(new Event("popstate"), "state", { value: state }));
  await settle();
}

// A deep link as the portal page boots it: the path, plus the IDs omniquery.py resolved from it
function openLink(path, boot = {}) {
  replaceState.call(window.history, null, "", path);
  entries = [{ state: null, url: path }];
  window.frappe = { user: "surveyor@ommnomi.test", initial_project_id: "", initial_survey_id: "", ...boot };
}

describe("Back and Forward show the page each entry was (#38)", () => {
  let wrapper;

  beforeEach(async () => {
    bootstrap = assigned;
    useTranslation().setLanguage("en");
    await db.templates.clear();
    await db.responses.clear();
    window.scrollTo = vi.fn();
    recordHistory();
  });
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
    delete window.frappe;
    vi.restoreAllMocks();
  });

  it("opens a project link, and Back from a survey opened there returns to the project, then the catalog", async () => {
    openLink("/omniquery/project/P-1", { initial_project_id: "P-1" });
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    expect(shownView()).toBe("Village Water");

    await wrapper.vm.s.selectSurvey("OQS-WATER");
    await settle();
    expect(document.body.textContent).toContain("Water source");

    await goBack();
    expect(shownView(), "Back from the survey").toBe("Village Water");

    wrapper.vm.s.closeProjectPage();
    await settle();
    expect(shownView()).toBe("catalog");
    await goBack();
    expect(shownView(), "Back from the catalog the project page led to").toBe("Village Water");
  });

  it("comes back to a survey opened by its slug under the name the server resolved", async () => {
    openLink("/omniquery/water-access", { initial_survey_id: "OQS-WATER" });
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    expect(document.body.textContent).toContain("Water source");
    expect(window.history.state, "the first entry records the resolved name").toEqual({ type: "survey", surveyName: "OQS-WATER" });

    await wrapper.vm.s.goHome();
    await settle();
    expect(shownView()).toBe("catalog");

    window.frappe.initial_survey_id = ""; // Back reads the entry, not what the page booted
    await goBack();
    expect(document.body.textContent, "Back to the slug link").toContain("Water source");
    expect(wrapper.vm.s.activeTemplate?.template_name).toBe("OQS-WATER");
  });

  it("reads an entry with no state from its path: the offline shell boots no IDs", async () => {
    openLink("/omniquery/project/P-1");
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    expect(shownView()).toBe("Village Water");
    expect(window.history.state).toEqual({ type: "project", projectId: "P-1" });
  });
});

