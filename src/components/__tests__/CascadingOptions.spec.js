import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";
import QuestionCard from "../survey/QuestionCard.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";
import FocusModeModal from "../survey/FocusModeModal.vue";
import FCombobox from "../common/FCombobox.vue";
import Survey from "../../views/Survey.vue";
import { SURVEY_SESSION, useSurveyApp } from "../../composables/useSurveyApp";

// #24: Block offers only the chosen District's blocks, wherever it is shown, and a District
// change clears a Block it no longer offers through the session's one write path.

const BLOCKS = { Baran: ["Baran", "Chhipabarod"], Churu: ["Ratangarh", "Sujangarh"] };
const district = { question_code: "district", label_en: "District", field_type: "Single Choice (Dropdown)", options: ["Baran", "Churu"] };
const block = {
  question_code: "block",
  label_en: "Q2. Block",
  field_type: "Single Choice (Dropdown)",
  control_variant: "Combobox",
  depends_on_field: "district",
  options: BLOCKS,
  is_mandatory: true,
};

const wrappers = [];
function track(wrapper) {
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  while (wrappers.length) wrappers.pop().unmount();
  document.body.innerHTML = "";
});

const card = (props) => track(mount(QuestionCard, { props: { question: block, modelValue: "", ...props } }));

describe("a dependent question's choices (#24)", () => {
  it("offers only Baran's blocks in the combobox", async () => {
    const wrapper = card({ parentValue: "Baran" });
    expect(wrapper.findComponent(FCombobox).props("options")).toEqual([
      { value: "Baran", label: "Baran" },
      { value: "Chhipabarod", label: "Chhipabarod" },
    ]);
    await wrapper.find('button[role="combobox"]').trigger("click");
    const listbox = wrapper.find('[role="listbox"]').text();
    expect(listbox).toContain("Chhipabarod");
    expect(listbox).not.toContain("Ratangarh");
  });

  it("offers only Baran's blocks as buttons", () => {
    const text = card({ question: { ...block, control_variant: "Radio" }, parentValue: "Baran" }).text();
    expect(text).toContain("Chhipabarod");
    expect(text).not.toContain("Ratangarh");
  });

  it("offers no blocks before a district is chosen", () => {
    expect(card({}).findComponent(FCombobox).props("options")).toEqual([]);
  });

  it("shows a Hindi label but keeps the authored value", () => {
    const hindi = { ...block, options_translated: { Baran: ["बारां", "छीपाबड़ौद"], Churu: ["रतनगढ़", "सुजानगढ़"] } };
    expect(card({ question: hindi, parentValue: "Baran" }).findComponent(FCombobox).props("options")).toEqual([
      { value: "Baran", label: "बारां" },
      { value: "Chhipabarod", label: "छीपाबड़ौद" },
    ]);
  });

  it("leaves the answer alone when the district changes, so a restored draft keeps its block", async () => {
    const wrapper = card({ modelValue: "Chhipabarod", parentValue: undefined });
    await wrapper.setProps({ parentValue: "Baran" });
    await wrapper.setProps({ parentValue: "Churu" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("offers only Baran's blocks in a grouped card, answering with the authored value", async () => {
    const hindi = { ...block, options_translated: { Baran: ["बारां", "छीपाबड़ौद"], Churu: [] } };
    const wrapper = track(mount(GroupedQuestionCard, {
      props: { group: { group_code: "g", title: "Place", questions: [hindi] }, responses: { district: "Baran" } },
    }));
    const choices = wrapper.findAll('[role="radio"]');
    expect(choices.map((c) => c.text())).toEqual(["बारां", "छीपाबड़ौद"]);
    await choices[1].trigger("click");
    expect(wrapper.emitted("update-response")[0]).toEqual([{ code: "block", value: "Chhipabarod" }]);
  });

  it("offers only Baran's blocks in focus mode", async () => {
    track(mount(FocusModeModal, {
      attachTo: document.body,
      props: { isOpen: true, questions: [{ ...block, control_variant: "Radio" }], currentIndex: 0,
        responses: { district: "Baran" }, autoAdvance: false, sectionTitle: "Place" },
    }));
    await vi.waitFor(() => expect(document.querySelector("[role='dialog']")).not.toBeNull());
    const text = document.querySelector("[role='dialog']").textContent;
    expect(text).toContain("Chhipabarod");
    expect(text).not.toContain("Ratangarh");
  });
});

describe("the survey view's answers (#24, #46)", () => {
  function mountSurvey(items) {
    const session = reactive({
      activeSection: { section_code: "S1", section_title: "Place" }, activeSectionIndex: 0, sections: [{}],
      isSectionComplete: () => false, displayQuestionItems: items, responses: { district: "Baran" },
      validationErrors: {}, isQuestionVisible: () => true, setResponse: vi.fn(), onQuestionAnswered: vi.fn(),
      activeQuestions: [], focusQuestionIndex: 0, isFocusMode: false, gpsAlert: null,
    });
    const wrapper = track(mount(Survey, { global: { provide: { [SURVEY_SESSION]: session } } }));
    return { wrapper, session };
  }

  it("stores a grouped card's and focus mode's answer under its question", () => {
    const { wrapper, session } = mountSurvey([{ type: "group", group_code: "g", title: "Place", questions: [block] }]);
    wrapper.findComponent(GroupedQuestionCard).vm.$emit("update-response", { code: "block", value: "Baran" });
    wrapper.findComponent(FocusModeModal).vm.$emit("update-response", { code: "district", value: "Churu" });
    expect(session.setResponse.mock.calls).toEqual([["block", "Baran"], ["district", "Churu"]]);
  });

  it("gives a question card its parent's answer", () => {
    const { wrapper } = mountSurvey([{ type: "question", question: block }]);
    expect(wrapper.findComponent(QuestionCard).props("parentValue")).toBe("Baran");
  });
});

describe("setResponse (#24)", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function session(responses) {
    // the session loads the template catalog on mount; no server answers in a unit test
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ message: {} }) })));
    let app;
    track(mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) })));
    await vi.waitFor(() => expect(app.isLoading.value).toBe(false)); // let the catalog load finish first
    app.activeTemplate.value = { name: "T", questions: [district, block, { ...block, question_code: "blocks", field_type: "Multiple Choice" }] };
    app.responses.value = responses;
    return app;
  }

  it("clears a block the new district does not offer", async () => {
    const app = await session({ district: "Baran", block: "Chhipabarod", blocks: ["Baran", "Chhipabarod"] });
    app.setResponse("district", "Baran");
    expect(app.responses.value).toEqual({ district: "Baran", block: "Chhipabarod", blocks: ["Baran", "Chhipabarod"] });
    app.setResponse("district", "Churu");
    expect(app.responses.value).toEqual({ district: "Churu" });
  });

  it("keeps the blocks of a multiple answer still offered", async () => {
    const app = await session({ district: "Baran", blocks: ["Baran"] });
    app.activeTemplate.value.questions[1].options = { ...BLOCKS, Churu: ["Baran", "Ratangarh"] };
    app.activeTemplate.value.questions[2].options = { ...BLOCKS, Churu: ["Baran", "Ratangarh"] };
    app.responses.value.blocks = ["Baran", "Chhipabarod"];
    app.setResponse("district", "Churu");
    expect(app.responses.value).toEqual({ district: "Churu", blocks: ["Baran"] });
  });
});
