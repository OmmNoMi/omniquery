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

  it("loads available templates directly from IndexedDB when network fetch fails (offline mode)", async () => {
    // Pre-populate IndexedDB with cached templates
    await db.templates.put({
      template_name: "OQS-OFFLINE-01",
      title: "Offline Test Survey",
      project: "PROJ-OFFLINE",
      project_name: "Offline Project",
      version: 1,
      target_category: "Field",
      schema: {
        template_name: "OQS-OFFLINE-01",
        title: "Offline Test Survey",
        sections: [{ section_code: "s1", section_title: "Start" }],
        questions: [{ question_code: "q1", label: "Offline Question" }],
      },
    });

    // Mock global fetch to reject (simulate completely disconnected network)
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch (offline)")));

    const survey = useSurvey();
    const loaded = await survey.loadAvailableTemplates();

    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe("OQS-OFFLINE-01");
    expect(loaded[0].title).toBe("Offline Test Survey");
    expect(loaded[0].project_name).toBe("Offline Project");

    // Also verify loadTemplate works 100% offline using the cached schema
    const schema = await survey.loadTemplate("OQS-OFFLINE-01");
    expect(schema).toBeDefined();
    expect(schema.template_name).toBe("OQS-OFFLINE-01");
    expect(schema.questions.length).toBe(1);
    expect(survey.activeTemplate.value).toBeDefined();
    expect(survey.activeTemplate.value.title).toBe("Offline Test Survey");
  });

  it("refreshes cachedTemplatesMap and downloads surveys for offline", async () => {
    const survey = useSurvey();
    await db.templates.clear();

    // Map should be empty initially
    await survey.refreshCachedTemplatesMap();
    expect(Object.keys(survey.cachedTemplatesMap.value).length).toBe(0);

    // Mock fetch for get_schema
    const mockSchema = {
      template_name: "OQS-DL-001",
      title: "Download Test Survey",
      sections: [{ section_code: "sec1" }],
      questions: [{ question_code: "q1" }, { question_code: "q2" }],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { schema: mockSchema } }),
      })
    );

    const ok = await survey.downloadSurveyForOffline("OQS-DL-001");
    expect(ok).toBe(true);
    expect(survey.cachedTemplatesMap.value["OQS-DL-001"]).toBeDefined();
    expect(survey.cachedTemplatesMap.value["OQS-DL-001"].questionCount).toBe(2);
  });

  it("evaluates reactive arithmetic formulas across dependent questions safely", () => {
    const survey = useSurvey();
    const responses = {
      q_income: "50000",
      q_expenses: "32000",
      q_multiplier: "2",
    };

    // Subtraction formula
    const netProfit = survey.evaluateFormula("{q_income} - {q_expenses}", responses);
    expect(netProfit).toBe(18000);

    // Multi-operator with parentheses
    const projected = survey.evaluateFormula("({q_income} - {q_expenses}) * {q_multiplier}", responses);
    expect(projected).toBe(36000);

    // Handles missing / invalid codes gracefully
    const fallback = survey.evaluateFormula("{q_missing} + 100", responses);
    expect(fallback).toBe(100);

    // Rejects unsafe javascript execution attempts
    const unsafe = survey.evaluateFormula("alert(1)", responses);
    expect(unsafe).toBeNull();
  });

  it("enforces cross-question consistency validation rules and reports specific errors", () => {
    const survey = useSurvey();
    survey.activeTemplate.value = {
      template_name: "TMPL-CROSS-VALIDATION",
      sections: [{ section_code: "sec1" }],
      questions: [
        {
          question_code: "q_income",
          section_code: "sec1",
          is_mandatory: true,
        },
        {
          question_code: "q_expenses",
          section_code: "sec1",
          is_mandatory: true,
          validation_rule: {
            operator: "lte",
            compare_to: "q_income",
            message: "Total expenses cannot exceed total revenue",
          },
        },
      ],
    };

    // Failing case: expenses > income
    survey.responses.value = {
      q_income: "20000",
      q_expenses: "25000",
    };
    const validFail = survey.validateCurrentSection();
    expect(validFail).toBe(false);
    expect(survey.validationErrors.value.q_expenses).toBe("Total expenses cannot exceed total revenue");

    // Passing case: expenses <= income
    survey.responses.value = {
      q_income: "30000",
      q_expenses: "25000",
    };
    const validPass = survey.validateCurrentSection();
    expect(validPass).toBe(true);
    expect(survey.validationErrors.value.q_expenses).toBeUndefined();
  });
});

