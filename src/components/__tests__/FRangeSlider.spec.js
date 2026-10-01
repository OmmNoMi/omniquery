import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FRangeSlider from "../common/FRangeSlider.vue";

describe("FRangeSlider Roving Tabindex & Accessibility (WCAG 2.2 AA)", () => {
  it("renders with role=radiogroup and buttons with role=radio in buttons format", () => {
    const wrapper = mount(FRangeSlider, {
      props: {
        modelValue: 3,
        min: 1,
        max: 5,
        step: 1,
        format: "buttons",
      },
    });

    const radiogroup = wrapper.find('[role="radiogroup"]');
    expect(radiogroup.exists()).toBe(true);

    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.length).toBe(5);

    // Selected radio has tabindex 0, all others have -1
    const selected = radios[2]; // value 3 (1-indexed: 1, 2, 3)
    expect(selected.attributes("tabindex")).toBe("0");
    expect(selected.attributes("aria-checked")).toBe("true");

    const unselected = radios[0]; // value 1
    expect(unselected.attributes("tabindex")).toBe("-1");
    expect(unselected.attributes("aria-checked")).toBe("false");
  });

  it("navigates forward using ArrowRight and steps value by 1", async () => {
    const wrapper = mount(FRangeSlider, {
      props: {
        modelValue: 2,
        min: 1,
        max: 5,
        step: 1,
        format: "buttons",
      },
    });

    const radios = wrapper.findAll('[role="radio"]');
    await radios[1].trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([3]);
  });

  it("navigates backward using ArrowLeft and steps value by 1", async () => {
    const wrapper = mount(FRangeSlider, {
      props: {
        modelValue: 4,
        min: 1,
        max: 5,
        step: 1,
        format: "buttons",
      },
    });

    const radios = wrapper.findAll('[role="radio"]');
    await radios[3].trigger("keydown", { key: "ArrowLeft" });

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([3]);
  });

  it("jumps to min with Home and to max with End key", async () => {
    const wrapper = mount(FRangeSlider, {
      props: {
        modelValue: 3,
        min: 1,
        max: 5,
        step: 1,
        format: "buttons",
      },
    });

    const radios = wrapper.findAll('[role="radio"]');

    await radios[2].trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([1]);

    await radios[2].trigger("keydown", { key: "End" });
    expect(wrapper.emitted("update:modelValue")[1]).toEqual([5]);
  });
});
