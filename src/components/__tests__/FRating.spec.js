import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FRating from "../common/FRating.vue";

describe("FRating Roving Tabindex & Accessibility (WCAG 2.2 AA)", () => {
  it("renders with role=radiogroup and stars with role=radio", () => {
    const wrapper = mount(FRating, {
      props: {
        modelValue: 3,
        maxStars: 5,
      },
    });

    const radiogroup = wrapper.find('[role="radiogroup"]');
    expect(radiogroup.exists()).toBe(true);

    const stars = wrapper.findAll('[role="radio"]');
    expect(stars.length).toBe(5);

    // Selected star (3) must have aria-checked=true and tabindex=0
    expect(stars[2].attributes("aria-checked")).toBe("true");
    expect(stars[2].attributes("tabindex")).toBe("0");

    // Other stars must have aria-checked=false and tabindex=-1
    expect(stars[0].attributes("aria-checked")).toBe("false");
    expect(stars[0].attributes("tabindex")).toBe("-1");
  });

  it("assigns tabindex=0 to the first star when no rating is selected", () => {
    const wrapper = mount(FRating, {
      props: {
        modelValue: 0,
        maxStars: 5,
      },
    });

    const stars = wrapper.findAll('[role="radio"]');
    expect(stars[0].attributes("tabindex")).toBe("0");
    expect(stars[1].attributes("tabindex")).toBe("-1");
  });

  it("steps forward with ArrowRight and ArrowUp keys", async () => {
    const wrapper = mount(FRating, {
      props: {
        modelValue: 2,
        maxStars: 5,
      },
    });

    const stars = wrapper.findAll('[role="radio"]');
    await stars[1].trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([3]);

    await stars[1].trigger("keydown", { key: "ArrowUp" });
    expect(wrapper.emitted("update:modelValue")[1]).toEqual([3]);
  });

  it("steps backward with ArrowLeft and ArrowDown keys", async () => {
    const wrapper = mount(FRating, {
      props: {
        modelValue: 4,
        maxStars: 5,
      },
    });

    const stars = wrapper.findAll('[role="radio"]');
    await stars[3].trigger("keydown", { key: "ArrowLeft" });

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([3]);
  });

  it("jumps to 1 with Home key and to maxStars with End key", async () => {
    const wrapper = mount(FRating, {
      props: {
        modelValue: 3,
        maxStars: 5,
      },
    });

    const stars = wrapper.findAll('[role="radio"]');
    await stars[2].trigger("keydown", { key: "Home" });
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([1]);

    await stars[2].trigger("keydown", { key: "End" });
    expect(wrapper.emitted("update:modelValue")[1]).toEqual([5]);
  });
});
