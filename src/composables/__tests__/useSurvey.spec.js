import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSurvey, generateSurveyId } from "../useSurvey";
import { db } from "../../services/db";

describe("useSurvey", () => {
  beforeEach(async () => {
    await db.responses.clear();
    await db.templates.clear();
    vi.restoreAllMocks();
  });

  it("generates deterministic format survey ID with prefix and random entropy", () => {
    const id = generateSurveyId("OQS-SHG-SURVEY");
    expect(id).toMatch(/^OQS-SHG-SURVEY-[a-z0-9]{6}$/);

    const defaultId = generateSurveyId(null);
    expect(defaultId).toMatch(/^OQS-SURVEY-[a-z0-9]{6}$/);
  });

  it("saves drafts into IndexedDB and maintains multi-draft ordering by updated_at", async () => {
    const { activeTemplate, responses, saveDraftLocally, loadActiveDrafts, allDrafts, currentDraftId } = useSurvey();

    activeTemplate.value = {
      template_name: "TMPL-WOMEN-STUDY",
      title: "Women Study 2026",
      response_title_format: "{respondent_name} - {village_gp}",
    };

    // First draft
    responses.value = { respondent_name: "Radha", village_gp: "Rampur" };
    await saveDraftLocally(25);
    const draftId1 = currentDraftId.value;

    expect(allDrafts.value.length).toBe(1);
    expect(allDrafts.value[0].response_uid).toBe(draftId1);

    // Second draft (new instance)
    const survey2 = useSurvey();
    survey2.activeTemplate.value = activeTemplate.value;
    survey2.responses.value = { respondent_name: "Geeta", village_gp: "Kalyanpur" };
    await survey2.saveDraftLocally(50);
    const draftId2 = survey2.currentDraftId.value;

    expect(draftId1).not.toBe(draftId2);

    await loadActiveDrafts();
    expect(allDrafts.value.length).toBe(2);
    // Most recent draft first
    expect(allDrafts.value[0].response_uid).toBe(draftId2);
  });

  it("loads a specific draft by draftId and restores responses", async () => {
    const { activeTemplate, responses, saveDraftLocally, loadTemplate, currentDraftId } = useSurvey();

    activeTemplate.value = {
      template_name: "TMPL-TEST",
      title: "Test Template",
      sections: [{ section_code: "sec1", section_title: "General" }],
      questions: [],
    };

    responses.value = { respondent_name: "Sunita" };
    await saveDraftLocally(40);
    const savedDraftId = currentDraftId.value;

    // Load with a new survey composable instance
    const freshSurvey = useSurvey();
    // Cache template so loadTemplate finds it locally without network
    await db.templates.put({
      template_name: "TMPL-TEST",
      title: "Test Template",
      schema: JSON.parse(JSON.stringify(activeTemplate.value)),
    });

    await freshSurvey.loadTemplate("TMPL-TEST", { draftId: savedDraftId });
    expect(freshSurvey.currentDraftId.value).toBe(savedDraftId);
    expect(freshSurvey.responses.value.respondent_name).toBe("Sunita");
  });

  it("starts a fresh new survey when startNew: true is passed without overwriting existing drafts", async () => {
    const { activeTemplate, responses, saveDraftLocally } = useSurvey();
    activeTemplate.value = {
      template_name: "TMPL-TEST",
      title: "Test Template",
      sections: [{ section_code: "sec1", section_title: "General" }],
      questions: [],
    };

    responses.value = { respondent_name: "Sunita" };
    await saveDraftLocally(40);

    await db.templates.put({
      template_name: "TMPL-TEST",
      title: "Test Template",
      schema: JSON.parse(JSON.stringify(activeTemplate.value)),
    });

    const newSurvey = useSurvey();
    await newSurvey.loadTemplate("TMPL-TEST", { startNew: true });
    expect(Object.keys(newSurvey.responses.value).length).toBe(0);

    const allDraftsInDb = await db.responses.toArray();
    expect(allDraftsInDb.length).toBe(1);
  });

  it("evaluates question visibility conditionally using equals and in operators", () => {
    const { responses, isQuestionVisible } = useSurvey();

    const normalQuestion = { question_code: "q1", conditional_logic: null };
    expect(isQuestionVisible(normalQuestion)).toBe(true);

    const conditionalQuestion = {
      question_code: "q2",
      conditional_logic: {
        depends_on: "has_business",
        operator: "equals",
        value: "Yes",
      },
    };

    responses.value.has_business = "No";
    expect(isQuestionVisible(conditionalQuestion)).toBe(false);

    responses.value.has_business = "Yes";
    expect(isQuestionVisible(conditionalQuestion)).toBe(true);

    const multiInQuestion = {
      question_code: "q3",
      conditional_logic: {
        depends_on: "category",
        operator: "in",
        values: ["Dairy", "Poultry"],
      },
    };

    responses.value.category = "Agriculture";
    expect(isQuestionVisible(multiInQuestion)).toBe(false);

    responses.value.category = "Dairy";
    expect(isQuestionVisible(multiInQuestion)).toBe(true);
  });

  it("validates mandatory questions and blocks navigation to next section if incomplete", () => {
    const survey = useSurvey();
    survey.activeTemplate.value = {
      template_name: "TMPL-VALIDATE",
      title: "Validation Test",
      sections: [
        { section_code: "sec1", section_title: "Section 1" },
        { section_code: "sec2", section_title: "Section 2" },
      ],
      questions: [
        { section_code: "sec1", question_code: "name", is_mandatory: 1 },
        { section_code: "sec2", question_code: "notes", is_mandatory: 0 },
      ],
    };

    survey.activeSectionIndex.value = 0;
    expect(survey.validateCurrentSection()).toBe(false);
    expect(survey.validationErrors.value.name).toBe("This field is required");

    // Cannot advance while invalid
    expect(survey.nextSection()).toBe(false);
    expect(survey.activeSectionIndex.value).toBe(0);

    // Provide mandatory answer
    survey.responses.value.name = "Anjali";
    expect(survey.validateCurrentSection()).toBe(true);
    expect(survey.nextSection()).toBe(true);
    expect(survey.activeSectionIndex.value).toBe(1);
  });
});
