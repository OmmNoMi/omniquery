import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import FRangeSlider from "../common/FRangeSlider.vue";
import { useTranslation } from "../../composables/useTranslation";

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

  describe("an unanswered range question shows no answer (#21)", () => {
    const mountSlider = (props) => mount(FRangeSlider, { props: { min: 0, max: 7, step: 1, ...props } });
    const radios = (w) => w.findAll('[role="radio"]');
    const emitted = (w) => w.emitted("update:modelValue")?.map(([v]) => v) || [];
    beforeEach(() => useTranslation().setLanguage("en"));

    it("says Not answered in Hindi too", () => {
      useTranslation().setLanguage("hi");
      expect(mountSlider({ modelValue: null }).text()).toContain("उत्तर नहीं दिया गया");
    });

    it.each([undefined, null, "", "  "])("shows %j as Not answered, with no option checked", (modelValue) => {
      const w = mountSlider({ modelValue, unit: "Years" });
      expect(w.text()).toContain("Not answered");
      expect(w.text(), "no unit without a value").not.toContain("Years");
      expect(w.findAll('[aria-checked="true"]')).toHaveLength(0);
      // tab reaches the group on its first option, as a radio group with nothing checked does
      expect(radios(w).map((r) => r.attributes("tabindex"))).toEqual(["0", "-1", "-1", "-1", "-1", "-1", "-1", "-1"]);
    });

    it("shows a saved 0 as the answer, not as Not answered", () => {
      const w = mountSlider({ modelValue: 0, unit: "Years" });
      expect(w.text()).not.toContain("Not answered");
      expect(w.text()).toContain("Years");
      expect(radios(w)[0].attributes("aria-checked")).toBe("true");
    });

    it("adds no unit of its own", () => {
      expect(mountSlider({ modelValue: 4 }).text()).not.toContain("Years");
    });

    it.each([
      ["ArrowRight", 0],
      ["ArrowDown", 0],
      ["Home", 0],
      ["End", 7],
    ])("%s on an unanswered group picks %i", async (key, value) => {
      const w = mountSlider({ modelValue: null });
      await radios(w)[0].trigger("keydown", { key });
      expect(emitted(w)).toEqual([value]);
    });

    it("ArrowLeft on an unanswered group picks nothing", async () => {
      const w = mountSlider({ modelValue: null });
      await radios(w)[0].trigger("keydown", { key: "ArrowLeft" });
      expect(emitted(w)).toEqual([]);
    });

    describe("as a slider", () => {
      const bar = (w) => w.find('input[type="range"]');

      it("hides the thumb and says Not answered until a value is picked", async () => {
        const w = mountSlider({ modelValue: null, format: "slider" });
        expect(bar(w).attributes("aria-valuetext")).toBe("Not answered");
        expect(bar(w).attributes("aria-valuenow")).toBeUndefined();
        const hiddenThumb = () => w.element.querySelector('[class~="[&_input::-webkit-slider-thumb]:opacity-0"][class~="[&_input::-moz-range-thumb]:opacity-0"]');
        expect(hiddenThumb()?.contains(bar(w).element), "Chrome's and Firefox's thumbs hidden").toBe(true);
        await w.setProps({ modelValue: 0 });
        expect(bar(w).attributes("aria-valuenow")).toBe("0");
        expect(hiddenThumb()).toBeNull();
      });

      it("takes the minimum from a click where the hidden thumb sits", async () => {
        const w = mountSlider({ modelValue: null, format: "slider" });
        await bar(w).trigger("click"); // the bar's value is min, and the browser sends no input
        expect(emitted(w)).toEqual([0]);
      });

      it("takes the minimum from ArrowRight or Home, which move a bar already at min nowhere", async () => {
        const w = mountSlider({ modelValue: null, format: "slider" });
        await bar(w).trigger("keydown", { key: "Home" });
        await bar(w).trigger("keydown", { key: "ArrowRight" });
        expect(emitted(w)).toEqual([0, 0]);
      });

      it("leaves an answered bar's clicks and keys to the browser", async () => {
        const w = mountSlider({ modelValue: 3, format: "slider" });
        await bar(w).trigger("click");
        await bar(w).trigger("keydown", { key: "ArrowRight" });
        expect(emitted(w)).toEqual([]);
      });
    });
  });
});
