import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FCombobox from "../common/FCombobox.vue";

describe("FCombobox Accessibility & Interaction (WCAG 2.2 AA)", () => {
  const sampleOptions = [
    { label: "Jaipur", value: "JPR" },
    { label: "Jodhpur", value: "JDH" },
    { label: "Udaipur", value: "UDP" },
  ];

  it("renders with correct ARIA combobox attributes", () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: "",
        options: sampleOptions,
        placeholder: "Select district...",
      },
    });

    const trigger = wrapper.find('button[role="combobox"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-haspopup")).toBe("listbox");
    expect(wrapper.text()).toContain("Select district...");
  });

  it("opens dropdown and updates aria-expanded to true upon click", async () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: "",
        options: sampleOptions,
      },
    });

    const trigger = wrapper.find('button[role="combobox"]');
    await trigger.trigger("click");

    expect(trigger.attributes("aria-expanded")).toBe("true");
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);

    const options = wrapper.findAll('button[role="option"]');
    expect(options.length).toBe(3);
    expect(options[0].text()).toContain("Jaipur");
  });

  it("selects an option in single-select mode and emits update:modelValue", async () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: "",
        options: sampleOptions,
      },
    });

    await wrapper.find('button[role="combobox"]').trigger("click");
    const optionButtons = wrapper.findAll('button[role="option"]');
    await optionButtons[1].trigger("click"); // Click Jodhpur

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual(["JDH"]);
  });

  it("supports multi-select mode and emits updated array", async () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: ["JPR"],
        options: sampleOptions,
        multiple: true,
      },
    });

    await wrapper.find('button[role="combobox"]').trigger("click");
    const optionButtons = wrapper.findAll('button[role="option"]');
    await optionButtons[1].trigger("click"); // Toggle JDH

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0][0]).toContain("JPR");
    expect(wrapper.emitted("update:modelValue")[0][0]).toContain("JDH");
  });

  it("closes the dropdown when Escape key is pressed", async () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: "",
        options: sampleOptions,
      },
    });

    const trigger = wrapper.find('button[role="combobox"]');
    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");

    await trigger.trigger("keydown", { key: "Escape" });
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("filters options dynamically through the search input", async () => {
    const wrapper = mount(FCombobox, {
      props: {
        modelValue: "",
        options: sampleOptions,
      },
    });

    await wrapper.find('button[role="combobox"]').trigger("click");
    const searchInput = wrapper.find('input[type="text"]');
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue("Udai");
    const visibleOptions = wrapper.findAll('button[role="option"]');
    expect(visibleOptions.length).toBe(1);
    expect(visibleOptions[0].text()).toContain("Udaipur");
  });
});
