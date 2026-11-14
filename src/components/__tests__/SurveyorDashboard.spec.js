import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";
import { useTranslation } from "../../composables/useTranslation.js";
import { classTargetSize } from "../../test/tapTargets";

describe("SurveyorDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useTranslation().setLanguage("en");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          today_count: 5,
          total_count: 20,
          daily_target: 10,
        },
      }),
    });
  });

  it("renders 4 clickable KPI metric cards with proper counts", async () => {
    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 2,
        isOnline: true,
        userRoles: ["OmniQuery User"],
        activeDrafts: {
          "TMPL-SHG": {
            response_uid: "DRAFT-1",
            template_name: "TMPL-SHG",
            updated_at: new Date().toISOString(),
          },
        },
        templates: [{ template_name: "TMPL-SHG", title: "SHG Study" }],
      },
    });

    // Wait for fetchServerMetrics resolution
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("5 / 10");
    });

    expect(wrapper.text()).toContain("50%");
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("1");
  });

  it("emits open-filtered-forms with appropriate filter tab on KPI click", async () => {
    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 1,
        isOnline: true,
      },
    });

    const kpiCards = wrapper.findAll("[role='button']");
    expect(kpiCards.length).toBeGreaterThanOrEqual(4);

    // Click 'Completed Today' card (first card)
    await kpiCards[0].trigger("click");
    expect(wrapper.emitted("open-filtered-forms")).toBeTruthy();
    expect(wrapper.emitted("open-filtered-forms")[0]).toEqual(["today"]);

    // Click 'In Offline Queue' card (second card)
    await kpiCards[1].trigger("click");
    expect(wrapper.emitted("open-filtered-forms")[1]).toEqual(["queue"]);

    // Click 'Active Drafts' card (third card)
    await kpiCards[2].trigger("click");
    expect(wrapper.emitted("open-filtered-forms")[2]).toEqual(["drafts"]);
  });

  it("opens the filled forms from every KPI tile with Enter or Space, not only a click", async () => {
    const wrapper = mount(SurveyorDashboard, { props: { pendingWALCount: 1, isOnline: true } });
    const tiles = wrapper.findAll("[role='button'][tabindex='0']");
    expect(tiles).toHaveLength(4);
    for (const tile of tiles) {
      await tile.trigger("keydown.enter");
      await tile.trigger("keydown.space");
    }
    const opened = ["today", "queue", "drafts", "all"].flatMap((f) => [[f], [f]]);
    expect(wrapper.emitted("open-filtered-forms")).toEqual(opened);
  });

  it("renders active in-progress draft card and handles resume and start-new events", async () => {
    const draft = {
      response_uid: "DRAFT-001",
      template_name: "TMPL-SHG",
      title: "SHG Enterprise Study",
      progress_percent: 65,
      updated_at: new Date().toISOString(),
      responses: {
        respondent_name: "Sunita Devi",
        village_gp: "Rampur",
      },
    };

    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 0,
        isOnline: true,
        activeDrafts: {
          "TMPL-SHG": draft,
        },
        templates: [
          {
            template_name: "TMPL-SHG",
            title: "SHG Enterprise Study",
            response_title_format: "{respondent_name} - {village_gp}",
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("Sunita Devi - Rampur");
    expect(wrapper.text()).toContain("65%");

    const buttons = wrapper.findAll("button");
    const resumeBtn = buttons.find((b) => b.text().includes("Resume"));
    const startNewBtn = buttons.find((b) => b.text().includes("Start New"));

    expect(resumeBtn).toBeDefined();
    expect(startNewBtn).toBeDefined();

    await resumeBtn.trigger("click");
    expect(wrapper.emitted("resume-draft")).toBeTruthy();
    expect(wrapper.emitted("resume-draft")[0]).toEqual(["TMPL-SHG"]);

    await startNewBtn.trigger("click");
    expect(wrapper.emitted("start-new-survey")).toBeTruthy();
    expect(wrapper.emitted("start-new-survey")[0]).toEqual(["TMPL-SHG"]);
  });

  describe("at 375px (#41)", () => {
    const draft = { response_uid: "DRAFT-1", template_name: "TMPL-SHG", progress_percent: 40, updated_at: new Date().toISOString() };

    async function mountSurveyorWithDraft() {
      mockKpis({ today_count: 2, total_count: 10, daily_target: 6 });
      const wrapper = mount(SurveyorDashboard, {
        props: {
          isOnline: true,
          userRoles: ["OmniQuery User"],
          activeDrafts: { "TMPL-SHG": draft },
          templates: [{ template_name: "TMPL-SHG", title: "SHG Study" }],
        },
      });
      await vi.waitFor(() => expect(wrapper.text()).toContain("Daily Target"));
      return wrapper;
    }

    const elementWithText = (wrapper, text) => wrapper.findAll("span").find((s) => s.text() === text)?.element;
    const isBefore = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    it("puts the draft's Resume above the Daily Target strip and the KPI tiles, so it is above the fold", async () => {
      const wrapper = await mountSurveyorWithDraft();
      const draftCard = elementWithText(wrapper, "In-Progress Draft");
      const target = elementWithText(wrapper, "Daily Target:");
      const firstKpi = wrapper.find("[role='button']").element;
      expect(draftCard && target && firstKpi, "draft card, target strip and KPI tile rendered").toBeTruthy();
      expect(isBefore(draftCard, target), "draft before Daily Target").toBe(true);
      expect(isBefore(draftCard, firstKpi), "draft before the KPI tiles").toBe(true);
    });

    it("sizes Start New and Resume at 32px and shares the row between them", async () => {
      const wrapper = await mountSurveyorWithDraft();
      for (const label of ["Start New", "Resume Survey"]) {
        const button = wrapper.findAll("button").find((b) => b.text() === label);
        expect(button, label).toBeDefined();
        expect(classTargetSize(button.attributes("class")).height, label).toBeGreaterThanOrEqual(32);
        expect(button.classes(), label).toContain("flex-1");
      }
    });
  });

  it("renders Manager Review Queue banner and Desk link when user has OmniQuery Manager role", async () => {
    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 0,
        isOnline: true,
        userRoles: ["OmniQuery Manager"],
      },
    });

    expect(wrapper.text()).toContain("Manager Operations & Review Queue");
    expect(wrapper.text()).toContain("Manager View");
    const deskLink = wrapper.find('a[href="/desk/omniquery"]');
    expect(deskLink.exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Daily Target");
  });

  it("never shows Daily Target or Manager banner to a user without OmniQuery User or Manager role", async () => {
    // Issue #60: Guest or Desk User without OmniQuery User or Manager role
    const wrapper = mount(SurveyorDashboard, {
      props: {
        pendingWALCount: 0,
        isOnline: true,
        userRoles: ["Desk User"],
      },
    });

    expect(wrapper.text()).not.toContain("Daily Target");
    expect(wrapper.text()).not.toContain("Manager Operations & Review Queue");
  });

  it("renders Daily Target strip and remaining count for a surveyor with a configured target", async () => {
    mockKpis({ today_count: 2, total_count: 10, daily_target: 6 });
    const wrapper = mount(SurveyorDashboard, {
      props: { pendingWALCount: 0, isOnline: true, userRoles: ["OmniQuery User"] },
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("2 / 6");
    });
    expect(wrapper.text()).toContain("Daily Target");
    expect(wrapper.text()).toContain("4 left for target");
    expect(wrapper.text()).not.toContain("Manager Operations & Review Queue");
  });

  it("hides the target strip and shows a plain count when no target is configured (#55)", async () => {
    mockKpis({ today_count: 3, total_count: 12, daily_target: null });
    const wrapper = mount(SurveyorDashboard, {
      props: { pendingWALCount: 0, isOnline: true, userRoles: ["OmniQuery User"] },
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("3 surveys today");
    });
    expect(wrapper.text()).not.toContain("Daily Target");
    expect(wrapper.text()).not.toContain("left for target");
  });

  it("says 1 survey today, singular, when no target is configured", async () => {
    mockKpis({ today_count: 1, total_count: 1, daily_target: null });
    const wrapper = mount(SurveyorDashboard, {
      props: { pendingWALCount: 0, isOnline: true, userRoles: ["OmniQuery User"] },
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("1 survey today");
    });
  });

  it("puts the count where Hindi word order wants it, not glued in front", async () => {
    useTranslation().setLanguage("hi");
    mockKpis({ today_count: 2, total_count: 10, daily_target: 6 });
    const wrapper = mount(SurveyorDashboard, {
      props: { pendingWALCount: 0, isOnline: true, userRoles: ["OmniQuery User"] },
    });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("लक्ष्य के लिए 4 शेष");
    });
  });

  it("tells an unassigned user to ask their supervisor, and still shows their unsynced queue (#57)", async () => {
    const wrapper = mount(SurveyorDashboard, {
      props: { isUnassigned: true, pendingWALCount: 3, isOnline: true, userRoles: ["OmniQuery User"] },
    });
    const card = wrapper.find("[role='status']");
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain("You are not assigned to a project yet. Ask your supervisor.");
    expect(card.find("svg").attributes("aria-hidden")).toBe("true");
    await vi.waitFor(() => expect(wrapper.text()).toContain("5"));
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).not.toContain("5 / 10"); // no daily target for someone in no project
  });

  it("does not take an empty survey list for being unassigned (#57)", () => {
    const wrapper = mount(SurveyorDashboard, { props: { templates: [], isOnline: true } });
    expect(wrapper.text()).not.toContain("not assigned to a project");
  });

  it("welcomes the surveyor by full name, not by the start of their email (#51)", () => {
    const original = window.frappe;
    window.frappe = { ...original, user: "oq.surveyor.test@example.com", user_fullname: "OQ Test Surveyor" };
    try {
      const wrapper = mount(SurveyorDashboard, { props: { pendingWALCount: 0, isOnline: true } });
      expect(wrapper.find("h2").text()).toBe("Welcome, OQ Test Surveyor");
    } finally {
      window.frappe = original;
    }
  });
});

function mockKpis(message) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message }) });
}
