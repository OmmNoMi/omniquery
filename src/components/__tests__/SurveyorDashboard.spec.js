import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";

describe("SurveyorDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
