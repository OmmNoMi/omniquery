import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import Catalog from "../../views/Catalog.vue";
import { SURVEY_SESSION } from "../../composables/useSurveyApp";
import { useTranslation } from "../../composables/useTranslation";

// The catalog under the dashboard: each draft and each survey offers its action once (#18)
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const templates = ["T1", "T2", "T3"].map((name, i) => ({ name, title: `Survey ${i + 1}`, project: "P1", project_name: "Project One", version: 1 }));

function mountCatalog() {
  const session = reactive({
    showCatalog: true,
    availableTemplates: templates,
    cachedTemplatesMap: {},
    isOnline: true,
    selectedProject: "ALL",
    pendingWALCount: 0,
    // T1's draft is the newest, so the dashboard's draft card resumes it
    activeDrafts: {
      T1: { response_uid: "D1", template_name: "T1", updated_at: minutesAgo(1), responses: {} },
      T2: { response_uid: "D2", template_name: "T2", updated_at: minutesAgo(30), responses: {} },
    },
    allDrafts: [],
    isUnassigned: false,
    searchQuery: "",
    downloadingSurveyId: null,
    loadingSurveyId: null,
    selectSurvey: vi.fn(),
    openProjectPage: vi.fn(),
    handleDownloadProjectSurveys: vi.fn(),
    handleDownloadSurvey: vi.fn(),
    triggerSync: vi.fn(),
    openFilteredFilledForms: vi.fn(),
  });
  const wrapper = mount(Catalog, { global: { provide: { [SURVEY_SESSION]: session } } });
  return { wrapper, session };
}

const buttonsLabelled = (root, label) => root.findAll("button").filter((b) => b.text().replace("→", "").trim() === label);
const card = (wrapper, title) => wrapper.findAll("h2").find((h) => h.text() === title).element.parentElement;

describe("Catalog (#18)", () => {
  let lang;
  beforeEach(() => {
    lang = useTranslation().currentLang.value;
    useTranslation().setLanguage("en");
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: {} }) });
  });
  afterEach(() => useTranslation().setLanguage(lang));

  it("offers each draft's Resume once and each survey's Start New once", async () => {
    const { wrapper } = mountCatalog();
    await flushPromises();
    // the dashboard's draft card resumes T1 and T2's card resumes T2; T1's and T2's cards start anew
    expect(buttonsLabelled(wrapper, "Resume Survey")).toHaveLength(2);
    expect(buttonsLabelled(wrapper, "Start New")).toHaveLength(2);
    expect(buttonsLabelled(wrapper, "Start Survey")).toHaveLength(1);
  });

  it("starts a new survey from the card whose draft the dashboard resumes", async () => {
    const { wrapper, session } = mountCatalog();
    await flushPromises();
    const t1 = card(wrapper, "Survey 1");
    const buttons = wrapper.findAll("button").filter((b) => t1.contains(b.element));
    const labels = buttons.map((b) => b.text().replace("→", "").trim());
    expect(labels.filter((l) => l === "Start New")).toHaveLength(1);
    expect(labels).not.toContain("Resume Survey");
    await buttons.find((b) => b.text().includes("Start New")).trigger("click");
    expect(session.selectSurvey).toHaveBeenCalledWith("T1", { startNew: true });
  });

  it("names both actions in Hindi", async () => {
    useTranslation().setLanguage("hi");
    const { wrapper } = mountCatalog();
    await flushPromises();
    expect(buttonsLabelled(wrapper, "सर्वेक्षण जारी रखें")).toHaveLength(2);
    expect(buttonsLabelled(wrapper, "नया शुरू करें")).toHaveLength(2);
  });

  it("still resumes, or starts anew, a draft the dashboard does not show", async () => {
    const { wrapper, session } = mountCatalog();
    await flushPromises();
    const t2 = card(wrapper, "Survey 2");
    const resume = wrapper.findAll("button").find((b) => t2.contains(b.element) && b.text().includes("Resume Survey"));
    await resume.trigger("click");
    expect(session.selectSurvey).toHaveBeenCalledWith("T2", { startNew: false });
  });
});
