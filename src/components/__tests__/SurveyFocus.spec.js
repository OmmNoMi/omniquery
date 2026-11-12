import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SectionCard from "../survey/SectionCard.vue";
import QuestionCard from "../survey/QuestionCard.vue";

describe("Issue #20: Opening or resuming survey focus & scroll invariants", () => {
  it("section heading has tabindex -1 and focusHeading focuses the section heading", async () => {
    const section = {
      section_code: "sec_1",
      section_title: "General Information",
      section_description: "Basic details of entrepreneur",
    };

    const wrapper = mount(SectionCard, {
      props: {
        section,
        currentIndex: 0,
        totalSections: 3,
        isComplete: false,
      },
      attachTo: document.body,
    });

    const heading = wrapper.find("h2");
    expect(heading.exists()).toBe(true);
    expect(heading.attributes("tabindex")).toBe("-1");

    expect(typeof wrapper.vm.focusHeading).toBe("function");
    wrapper.vm.focusHeading();
    await new Promise((r) => setTimeout(r, 10));

    expect(document.activeElement).toBe(heading.element);
    wrapper.unmount();
  });

  it("QuestionCard focus({ preventScroll: false }) scrolls into view and focuses primary input", async () => {
    const question = {
      question_code: "q_revenue",
      label_en: "Monthly Revenue",
      field_type: "Int",
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
      },
      attachTo: document.body,
    });

    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);

    const scrollSpy = vi.fn();
    wrapper.element.scrollIntoView = scrollSpy;

    expect(typeof wrapper.vm.focus).toBe("function");
    wrapper.vm.focus({ preventScroll: false });
    await new Promise((r) => setTimeout(r, 10));

    expect(document.activeElement).toBe(input.element);
    expect(scrollSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("resuming a draft with Q1 answered resolves to Q2 first control", async () => {
    const q1 = {
      question_code: "q_name",
      label_en: "Name",
      field_type: "Data",
      is_mandatory: 1,
    };
    const q2 = {
      question_code: "q_phone",
      label_en: "Phone Number",
      field_type: "Phone",
      is_mandatory: 1,
    };

    const responses = { q_name: "Anita Sharma" };
    const questions = [q1, q2];

    // Find the first unanswered required question
    const target = questions.find((q) => {
      if (!q.is_mandatory) return false;
      const val = responses[q.question_code];
      return val === undefined || val === null || String(val).trim() === "";
    });

    expect(target).toBe(q2);

    const wrapperQ2 = mount(QuestionCard, {
      props: {
        question: q2,
        modelValue: "",
      },
      attachTo: document.body,
    });

    const scrollSpy = vi.fn();
    wrapperQ2.element.scrollIntoView = scrollSpy;

    wrapperQ2.vm.focus({ preventScroll: false });
    await new Promise((r) => setTimeout(r, 10));

    const input = wrapperQ2.find("input");
    expect(document.activeElement).toBe(input.element);
    expect(scrollSpy).toHaveBeenCalled();
    wrapperQ2.unmount();
  });
});
