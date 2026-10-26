import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";

describe("CompactHeader Microphone Invariant (Issue #37)", () => {
  it("does not render the mic button on the project page outside any survey", () => {
    // Project page has showBack: true, but isSurveyActive: false
    const wrapper = mount(CompactHeader, {
      props: {
        showBack: true,
        isSurveyActive: false,
        surveyTitle: "SHG Enterprise Study",
      },
    });

    const micBtn = wrapper.find("button[aria-label*='microphone'], button[title*='microphone']");
    expect(micBtn.exists()).toBe(false);
  });

  it("renders the mic button when a survey is active", () => {
    const wrapper = mount(CompactHeader, {
      props: {
        showBack: true,
        isSurveyActive: true,
        surveyTitle: "SHG Enterprise Study",
      },
    });

    const micBtn = wrapper.find("button[aria-label*='microphone'], button[title*='microphone']");
    expect(micBtn.exists()).toBe(true);
  });
});
