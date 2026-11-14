import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";
import FilledFormsModal from "../dashboard/FilledFormsModal.vue";
import { useSurvey } from "../../composables/useSurvey";
import { useTranslation } from "../../composables/useTranslation.js";
import { db } from "../../services/db";

// #56: the dashboard Drafts tile and the Filled Forms dialog must read the same drafts, and the
// dialog must behave as a dialog: named, focus inside, Escape closing only the topmost layer.

const TEMPLATES = [
  { name: "TMPL-A", template_name: "TMPL-A", title: "Dairy Survey", project: "PROJ-1" },
  { name: "TMPL-B", template_name: "TMPL-B", title: "Goat Survey", project: "PROJ-2" },
];

function draft(uid, template, minute) {
  return {
    response_uid: uid,
    template_name: template,
    template_title: template,
    status: "Draft",
    synced: 0,
    updated_at: `2026-10-01T10:${minute}:00`,
    responses: { q1: uid },
  };
}

let wrappers = [];
function mountAttached(component, props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const wrapper = mount(component, { props, attachTo: host });
  wrappers.push(wrapper);
  return wrapper;
}

// What App does: load the drafts through useSurvey and hand the full list to the dashboard
async function mountDashboard(props = {}) {
  const survey = useSurvey();
  await survey.loadActiveDrafts();
  const wrapper = mountAttached(SurveyorDashboard, {
    pendingWALCount: 0,
    isOnline: false,
    templates: TEMPLATES,
    activeDrafts: survey.activeDrafts.value,
    drafts: survey.allDrafts.value,
    ...props,
  });
  return { wrapper, survey };
}

function tileCount(dashboard) {
  const tile = dashboard.findAll("[role='button']").find((t) => t.text().startsWith("Drafts"));
  return Number(tile.text().match(/^Drafts\s*(\d+)/)[1]);
}

function dialogs() {
  return [...document.querySelectorAll("[role='dialog']")];
}

function pressEscape() {
  const target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
}

describe("Filled Forms drafts and dialog (#56)", () => {
  beforeEach(async () => {
    useTranslation().setLanguage("en");
    await db.responses.clear();
    await db.wal.clear();
    // two drafts of one survey, one of another survey in a different project
    await db.responses.bulkAdd([draft("D-1", "TMPL-A", "01"), draft("D-2", "TMPL-A", "02"), draft("D-3", "TMPL-B", "03")]);
  });

  afterEach(async () => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
  });

  it("counts every draft on the device on the tile, the same as the dialog's Drafts tab, with a project picked", async () => {
    const { wrapper } = await mountDashboard({ selectedProject: "PROJ-1" });
    mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });

    await vi.waitFor(() => expect(document.body.textContent).toContain("Drafts (3)"));
    expect(tileCount(wrapper)).toBe(3);
  });

  it("tells the dashboard when a draft is discarded, and the tile and the tab both drop to 2", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { wrapper, survey } = await mountDashboard();
    const modal = mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });
    await vi.waitFor(() => expect(document.body.textContent).toContain("Drafts (3)"));

    const discard = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Discard");
    discard.click();
    await vi.waitFor(() => expect(modal.emitted("drafts-changed")).toBeTruthy());

    // App reloads on drafts-changed
    await survey.loadActiveDrafts();
    await wrapper.setProps({ drafts: survey.allDrafts.value, activeDrafts: survey.activeDrafts.value });

    expect(tileCount(wrapper)).toBe(2);
    expect(document.body.textContent).toContain("Drafts (2)");
  });

  it("is a modal dialog named by its title and described by its record count, with focus inside", async () => {
    const page = document.createElement("main");
    page.textContent = "dashboard behind the dialog";
    document.body.appendChild(page);
    mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });

    await vi.waitFor(() => expect(document.body.textContent).toContain("3 records"));
    const [dialog] = dialogs();
    // reka makes it modal by hiding the rest of the page from assistive tech
    await vi.waitFor(() => expect(page.getAttribute("aria-hidden")).toBe("true"));
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent.trim()).toBe("On this device");
    expect(document.getElementById(dialog.getAttribute("aria-describedby")).textContent.trim()).toBe("3 records");
    await vi.waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("says 1 record, singular, and puts the count where Hindi wants it", async () => {
    await db.responses.bulkDelete(["D-2", "D-3"]);
    mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });
    await vi.waitFor(() => expect(document.body.textContent).toContain("1 record"));
    expect(document.body.textContent).not.toContain("1 records");

    useTranslation().setLanguage("hi");
    await vi.waitFor(() => expect(document.body.textContent).toContain("1 रिकॉर्ड"));
  });

  it("closes only the inspector on Escape, then the dialog on a second Escape", async () => {
    const modal = mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });
    await vi.waitFor(() => expect(document.body.textContent).toContain("Drafts (3)"));

    const viewAnswers = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "View Answers");
    viewAnswers.click();
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    await vi.waitFor(() => expect(dialogs()[1].contains(document.activeElement)).toBe(true));

    pressEscape();
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    expect(modal.emitted("close")).toBeFalsy();

    pressEscape();
    await vi.waitFor(() => expect(modal.emitted("close")).toBeTruthy());
  });

  it("gives focus back to what opened it when it closes", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.appendChild(opener);
    opener.focus();

    const modal = mountAttached(FilledFormsModal, { isOpen: true, isOnline: false, templates: TEMPLATES });
    await vi.waitFor(() => expect(dialogs()[0]?.contains(document.activeElement)).toBe(true));

    await modal.setProps({ isOpen: false });
    await vi.waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
