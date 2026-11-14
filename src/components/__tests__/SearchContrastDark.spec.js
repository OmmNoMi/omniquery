import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// Catalog search (#43): the field has an accessible name, Clear search is a named icon button that
// empties the query, and the no-match state has dark-mode surfaces. Only the server is faked, as in
// src/__tests__/App.spec.js: the real session, Catalog view and IndexedDB run.
vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method) => {
      if (method !== "omniquery.api.survey.get_bootstrap_data") return {};
      return {
        is_unassigned: false,
        templates: [
          { name: "OQS-WATER", title: "Water Access Survey", project: "P-1", project_name: "Village Water", version: 1, schema: { sections: [] } },
        ],
      };
    }),
  };
});

import App from "../../App.vue";
import { db } from "../../services/db";
import { useTranslation } from "../../composables/useTranslation";

const search = () => document.body.querySelector("input[aria-label='Search surveys']");
const clearButton = () => document.body.querySelector("button[aria-label='Clear search']");

async function type(text) {
  search().value = text;
  search().dispatchEvent(new Event("input"));
  await nextTick();
}

describe("Catalog search (#43)", () => {
  let wrapper;

  beforeEach(async () => {
    useTranslation().setLanguage("en");
    await db.templates.clear();
    await db.responses.clear();
    window.history.replaceState({}, "", "/omniquery");
    window.scrollTo = vi.fn();
    wrapper = mount(App, { attachTo: document.body });
    await flushPromises();
    await vi.waitFor(() => expect(search(), "catalog search rendered").toBeTruthy());
  });
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
  });

  it("names the field and offers a named Clear search button that empties it", async () => {
    expect(search().getAttribute("placeholder")).toBe("Search surveys...");
    expect(clearButton(), "no Clear button while the field is empty").toBeNull();

    await type("water");
    expect(clearButton().querySelector("svg"), "Clear search shows its icon").toBeTruthy();

    clearButton().click();
    await nextTick();
    expect(search().value).toBe("");
    expect(wrapper.vm.s.searchQuery).toBe("");
    expect(clearButton()).toBeNull();
    expect(document.activeElement, "focus returns to the field, not the page").toBe(search());
  });

  it("shows the empty state with dark-mode surfaces when nothing matches", async () => {
    expect(document.body.querySelector("[data-empty-templates]")).toBeNull();
    await type("no_such_survey_xyz");
    const empty = document.body.querySelector("[data-empty-templates]");
    expect(empty, "empty state shown").toBeTruthy();
    expect(empty.className).toContain("dark:bg-slate-900");
    expect(empty.className).toContain("dark:border-slate-800");
    for (const p of empty.querySelectorAll("p")) expect(p.className, p.textContent).toContain("dark:text-");
  });
});
