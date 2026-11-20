import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";
import { useTranslation } from "../../composables/useTranslation";
import { REQUIRED_ERROR } from "../../utils/requiredMessage";
import { PHONE_ERROR } from "../../utils/phone";

// #23: a card shows one state at a time, and an empty required question says what to do. The
// field app starts in Hindi, so each check names the string through __() and the Hindi table.
const { __, setLanguage } = useTranslation();

const district = { question_code: "q_district", label_en: "District", field_type: "Select", options: ["Jaipur", "Jodhpur", "Kota"], is_mandatory: 1 };
const entrepreneur = { question_code: "q_entrepreneur", label_en: "Q2. Entrepreneur Name", field_type: "Data", is_mandatory: 1 };
const cashBook = { question_code: "q_cash_book", label_en: "Does the SHG keep a cash book?", field_type: "Select", options: ["Yes", "No"], is_mandatory: 1 };
const phone = { question_code: "respondent_phone", label_en: "Respondent Phone Number", field_type: "Phone", is_mandatory: 1 };
const surveyDate = { question_code: "q_date", label_en: "Date of visit", field_type: "Date", is_mandatory: 1 };

const card = (question, modelValue, errorMessage) => mount(QuestionCard, { props: { question, modelValue, errorMessage } });
const alertOf = (wrapper) => wrapper.find('[role="alert"]');

describe("Question card status and error copy (#23)", () => {
  afterEach(() => setLanguage("hi"));

  it("an answered question shows Answered and no alert", () => {
    const wrapper = card(entrepreneur, "Shree Ganesh Textiles", "");
    expect(alertOf(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain(__("Answered"));
  });

  it("a filled question with an error shows the error and not Answered", () => {
    const wrapper = card(phone, "98765", PHONE_ERROR);
    expect(alertOf(wrapper).text()).toBe("10 अंकों का मोबाइल नंबर दर्ज करें");
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).not.toContain(__("Answered"));
  });

  it("an empty required question says what to do, in the surveyor's language", () => {
    expect(alertOf(card(district, "", REQUIRED_ERROR)).text()).toBe("District चुनें");
    expect(alertOf(card(entrepreneur, "", REQUIRED_ERROR)).text()).toBe("Entrepreneur Name दर्ज करें");
    setLanguage("en");
    expect(alertOf(card(district, "", REQUIRED_ERROR)).text()).toBe("Choose District");
    expect(alertOf(card(entrepreneur, "", REQUIRED_ERROR)).text()).toBe("Enter Entrepreneur Name");
    expect(alertOf(card(surveyDate, "", REQUIRED_ERROR)).text()).toBe("Choose Date of visit");
    expect(alertOf(card(phone, "", REQUIRED_ERROR)).text()).toBe("Enter a 10-digit mobile number");
  });

  it("a label that is a question gets a plain sentence, not the question glued on", () => {
    setLanguage("en");
    expect(alertOf(card(cashBook, "", REQUIRED_ERROR)).text()).toBe("Choose an answer");
    expect(alertOf(card({ ...entrepreneur, label_en: "What is the entrepreneur's name?" }, "", REQUIRED_ERROR)).text()).toBe("Enter an answer");
  });

  it("a phone number is asked for by its field type, not by its label", () => {
    setLanguage("en");
    const banking = { question_code: "q_banking", label_en: "Mobile banking app", field_type: "Data", is_mandatory: 1 };
    expect(alertOf(card(banking, "", REQUIRED_ERROR)).text()).toBe("Enter Mobile banking app");
  });

  it("any other error is shown as it is, translated", () => {
    setLanguage("en");
    expect(alertOf(card(entrepreneur, "Shree", "Expenses cannot exceed income")).text()).toBe("Expenses cannot exceed income");
  });

  it("a grouped sub-question says what to do too", () => {
    setLanguage("en");
    const group = { group_code: "g", title: "Contact", questions: [{ ...district, label_en: "a. District" }, entrepreneur, phone] };
    const errors = { q_district: REQUIRED_ERROR, q_entrepreneur: REQUIRED_ERROR, respondent_phone: PHONE_ERROR };
    const wrapper = mount(GroupedQuestionCard, { props: { group, responses: {}, validationErrors: errors } });
    expect(wrapper.find("#sub_err_q_district").text()).toBe("Choose District");
    expect(wrapper.find("#sub_err_q_entrepreneur").text()).toBe("Enter Entrepreneur Name");
    expect(wrapper.find("#sub_err_respondent_phone").text()).toBe("Enter a 10-digit mobile number");
  });
});
