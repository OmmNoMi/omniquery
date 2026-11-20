import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";

// #22: a Phone question brings up the phone keypad and saves what the surveyor types; whether it
// is a 10-digit number is checked when they move on (useSurvey.spec.js), not on each keystroke.
const phone = { question_code: "respondent_phone", label_en: "Q5. Respondent Phone Number", field_type: "Phone", is_mandatory: 1 };

describe("a Phone question (#22)", () => {
  it("opens the phone keypad", () => {
    const input = mount(QuestionCard, { props: { question: phone, modelValue: "" } }).find("input");
    expect(input.attributes("type")).toBe("tel");
    expect(input.attributes("inputmode")).toBe("tel");
    // the field app starts in Hindi
    expect(input.attributes("placeholder")).toBe("10 अंकों का मोबाइल नंबर दर्ज करें");
  });

  it("is never guessed from a question's code or label", () => {
    for (const question of [
      { question_code: "respondent_phone", label_en: "Q5. Respondent Phone Number", field_type: "Text" },
      { question_code: "smartphone_brand", label_en: "Which smartphone do you use?", field_type: "Text" },
    ]) {
      const input = mount(QuestionCard, { props: { question, modelValue: "" } }).find("input");
      expect(input.attributes("type"), question.question_code).toBe("text");
      expect(input.attributes("inputmode"), question.question_code).toBeUndefined();
    }
  });

  it("saves every keystroke, a partial number included, and does not move on by itself", async () => {
    const wrapper = mount(QuestionCard, { props: { question: phone, modelValue: "" } });
    const input = wrapper.find("input[type='tel']");
    await input.setValue("98765");
    await input.setValue("9876543210");
    // frappe-ui's TextInput sends each value on input and again on change
    const saved = wrapper.emitted("update:modelValue").map(([value]) => value);
    expect([...new Set(saved)]).toEqual(["98765", "9876543210"]);
    expect(wrapper.emitted("answered")).toBeUndefined();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("shows the section check's error", () => {
    const wrapper = mount(QuestionCard, { props: { question: phone, modelValue: "98765", errorMessage: "Enter a 10-digit mobile number" } });
    expect(wrapper.find('[role="alert"]').text()).toBe("10 अंकों का मोबाइल नंबर दर्ज करें");
  });

  it("opens the phone keypad inside a question group too", () => {
    const wrapper = mount(GroupedQuestionCard, {
      props: {
        group: {
          group_code: "contact",
          title: "Contact",
          questions: [phone, { question_code: "respondent_name", label_en: "Q4. Name", field_type: "Text" }],
        },
        responses: {},
        validationErrors: {},
      },
    });
    const inputs = wrapper.findAll("input");
    expect(inputs.map((i) => i.attributes("type"))).toEqual(["tel", "text"]);
    expect(inputs[0].attributes("inputmode")).toBe("tel");
    expect(inputs[0].attributes("aria-labelledby")).toBe("sub_label_respondent_phone");
  });
});
