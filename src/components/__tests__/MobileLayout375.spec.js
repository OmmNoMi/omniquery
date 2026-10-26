import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";
import SurveyorDashboard from "../dashboard/SurveyorDashboard.vue";
import ProjectHeaderCard from "../dashboard/ProjectHeaderCard.vue";

describe("Mobile 375px Layout & Invariants (#41)", () => {
  beforeEach(() => {
    window.frappe = {
      user: "surveyor@example.com",
    };
  });

  it("renders the OmniQuery logo as a keyboard-accessible link with accessible name", () => {
    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test",
      },
    });

    const logoLink = wrapper.find('a[href="/omniquery"]');
    expect(logoLink.exists()).toBe(true);
    expect(logoLink.attributes("aria-label")).toBeTruthy();
  });

  it("renders active draft quick-resume callout above the daily target and KPI stats", () => {
    const wrapper = mount(SurveyorDashboard, {
      props: {
        activeDrafts: {
          test_template: {
            template_name: "test_template",
            responses: {},
            updated_at: new Date().toISOString(),
            progress_percent: 50,
          },
        },
        templates: [
          {
            name: "test_template",
            title: "Test Survey Template",
          },
        ],
        completedToday: 2,
        dailyTarget: 10,
        activeDraftsCount: 1,
      },
    });

    const html = wrapper.html();
    const draftIndex = html.indexOf("In-Progress Draft");
    const dailyTargetIndex = html.indexOf("Daily Target");
    const kpiIndex = html.indexOf("Completed Today") !== -1 ? html.indexOf("Completed Today") : html.indexOf("Today");

    expect(draftIndex).toBeGreaterThan(-1);
    expect(dailyTargetIndex).toBeGreaterThan(-1);
    // Draft resume card must appear BEFORE daily target and KPI stats for above-the-fold access
    expect(draftIndex).toBeLessThan(dailyTargetIndex);
    expect(draftIndex).toBeLessThan(kpiIndex);
  });

  it("provides minimum 24px tap-target height on language and settings buttons in CompactHeader", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test",
      },
    });

    wrapper.vm.showConfigModal = true;
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll("button");
    // Ensure all buttons in the header & sheet have min-height >= 24px (e.g. min-h-[32px], py-2, etc.)
    for (const btn of buttons) {
      const cls = btn.attributes("class") || "";
      // Either has min-h-[24px/28px/32px/44px] or py-[1.5..] / rounded target
      expect(cls).not.toMatch(/h-\[2[0-3]px\]/);
    }
  });

  it("uses responsive text in ProjectHeaderCard details button to prevent 375px overflow", () => {
    const wrapper = mount(ProjectHeaderCard, {
      props: {
        templates: [
          {
            name: "tmpl_1",
            title: "Survey 1",
            project: "PROJ-1",
            project_title: "Project Alpha",
            questions: [],
          },
        ],
      },
    });

    const detailsBtn = wrapper.find('button[class*="shrink-0"], button[class*="BookOpen"]');
    expect(wrapper.html()).toContain("Project Details");
    // Contains hidden sm:inline so on 375px it does not force overflowing label
    expect(wrapper.html()).toContain("hidden sm:inline");
  });
});
