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

  describe("Phone validation and connected conditional fields", () => {
    it("correctly identifies phone number questions vs choice questions", () => {
      const { isPhoneQuestion } = useSurvey();

      expect(isPhoneQuestion({ question_code: "respondent_phone", label_en: "Q5. Respondent Phone Number", field_type: "Text" })).toBe(true);
      expect(isPhoneQuestion({ question_code: "contact_mobile", label_en: "Mobile Number", field_type: "Data" })).toBe(true);
      expect(isPhoneQuestion({ question_code: "emergency_contact", label_en: "Primary Contact Number", field_type: "Text" })).toBe(true);
      // Radio question asking about owning a smart phone is NOT a phone input field
      expect(isPhoneQuestion({ question_code: "owns_smartphone", label_en: "Q1. Do you own a smart phone?", field_type: "Single Choice (Radio)", options: ["Yes", "No"] })).toBe(false);
      // Generic text input is NOT a phone input field
      expect(isPhoneQuestion({ question_code: "respondent_name", label_en: "Respondent Name", field_type: "Text" })).toBe(false);
    });

    it("validates 10-digit numeric phone numbers correctly using Frappe native phone validation", () => {
      const { isValidPhoneNumber, validate_phone, FRAPPE_PHONE_NUMBER_PATTERN } = useSurvey();

      // Frappe regex pattern matching
      expect(FRAPPE_PHONE_NUMBER_PATTERN.test("9876543210")).toBe(true);
      expect(FRAPPE_PHONE_NUMBER_PATTERN.test("+91 98765 43210")).toBe(true);
      expect(FRAPPE_PHONE_NUMBER_PATTERN.test("abc")).toBe(false);

      // validate_phone helper
      expect(validate_phone("9876543210")).toBe(true);
      expect(validate_phone("98765")).toBe(true); // matches phone chars pattern
      expect(validate_phone("invalid_phone_text")).toBe(false);

      // isValidPhoneNumber (strict 10-digit field validator)
      expect(isValidPhoneNumber("9876543210")).toBe(true);
      expect(isValidPhoneNumber("1234567890")).toBe(true);
      expect(isValidPhoneNumber("98765")).toBe(false); // too short
      expect(isValidPhoneNumber("987654321000")).toBe(false); // too long
      expect(isValidPhoneNumber("abcdefghij")).toBe(false); // non-digits
      expect(isValidPhoneNumber("")).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
    });

    it("evaluates Frappe native depends_on syntax ('eval:doc.field == value') correctly", () => {
      const { evaluate_depends_on_value } = useSurvey();

      const doc = { attended_training: "Yes", has_vehicle: "No", count: 3 };

      // 1. Frappe eval: string expression
      expect(evaluate_depends_on_value("eval:doc.attended_training == 'Yes'", doc)).toBe(true);
      expect(evaluate_depends_on_value("eval:doc.attended_training == 'No'", doc)).toBe(false);
      expect(evaluate_depends_on_value("eval:doc.count > 2", doc)).toBe(true);

      // 2. Frappe simple fieldname truthiness
      expect(evaluate_depends_on_value("attended_training", doc)).toBe(true);
      expect(evaluate_depends_on_value("nonexistent_field", doc)).toBe(false);

      // 3. Structured dependency object
      expect(evaluate_depends_on_value({ depends_on: "attended_training", operator: "equals", value: "Yes" }, doc)).toBe(true);
      expect(evaluate_depends_on_value({ depends_on: "attended_training", operator: "equals", value: "No" }, doc)).toBe(false);
    });

    it("auto-infers conditional dependency when question label starts with 'If Yes'", () => {
      const survey = useSurvey();
      survey.activeTemplate.value = {
        template_name: "TMPL-COND-TEST",
        title: "Conditional Inference Test",
        sections: [{ section_code: "sec_g", section_title: "Training" }],
        questions: [
          {
            section_code: "sec_g",
            question_code: "attended_training",
            label_en: "Q1. Have you attended any training under SVEP/OSF?",
            field_type: "Single Choice (Radio)",
            options: ["No", "Yes"],
            conditional_logic: null,
          },
          {
            section_code: "sec_g",
            question_code: "attended_training_specify",
            label_en: "Q2. If Yes, specify training attended",
            field_type: "Text",
            is_mandatory: true,
            conditional_logic: null,
          },
        ],
      };

      const q1 = survey.activeTemplate.value.questions[0];
      const q2 = survey.activeTemplate.value.questions[1];

      // Initially neither is answered -> Q2 should be hidden
      expect(survey.isQuestionVisible(q2)).toBe(false);

      // Parent answered "No" -> Q2 remains hidden
      survey.responses.value.attended_training = "No";
      expect(survey.isQuestionVisible(q2)).toBe(false);

      // Parent answered "Yes" -> Q2 becomes visible!
      survey.responses.value.attended_training = "Yes";
      expect(survey.isQuestionVisible(q2)).toBe(true);

      // Case-insensitive "yes" / boolean 1
      survey.responses.value.attended_training = "yes";
      expect(survey.isQuestionVisible(q2)).toBe(true);
    });

    it("enforces strict phone number validation during section validation and navigation", () => {
      const survey = useSurvey();
      survey.activeTemplate.value = {
        template_name: "TMPL-PHONE-VAL",
        title: "Phone Validation Test",
        sections: [
          { section_code: "sec1", section_title: "Contact Info" },
          { section_code: "sec2", section_title: "Next Step" },
        ],
        questions: [
          {
            section_code: "sec1",
            question_code: "respondent_phone",
            label_en: "Q5. Respondent Phone Number",
            field_type: "Text",
            is_mandatory: true,
          },
        ],
      };

      survey.activeSectionIndex.value = 0;

      // 1. Empty mandatory phone
      expect(survey.validateCurrentSection()).toBe(false);
      expect(survey.validationErrors.value.respondent_phone).toBe("This field is required");
      expect(survey.nextSection()).toBe(false);

      // 2. Incomplete phone (5 digits)
      survey.responses.value.respondent_phone = "98765";
      expect(survey.validateCurrentSection()).toBe(false);
      expect(survey.validationErrors.value.respondent_phone).toBe("Please enter a valid 10-digit phone number");
      expect(survey.nextSection()).toBe(false);

      // 3. Valid 10 digits
      survey.responses.value.respondent_phone = "9876543210";
      expect(survey.validateCurrentSection()).toBe(true);
      expect(survey.validationErrors.value.respondent_phone).toBeUndefined();
      expect(survey.nextSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(1);
    });

    it("does not block section validation on hidden conditional fields when parent is No", () => {
      const survey = useSurvey();
      survey.activeTemplate.value = {
        template_name: "TMPL-COND-VALIDATE",
        title: "Conditional Validation Test",
        sections: [
          { section_code: "sec1", section_title: "Enterprise Details" },
          { section_code: "sec2", section_title: "Conclusion" },
        ],
        questions: [
          {
            section_code: "sec1",
            question_code: "attended_training",
            label_en: "Q1. Have you attended any training?",
            field_type: "Single Choice (Radio)",
            options: ["No", "Yes"],
            is_mandatory: true,
          },
          {
            section_code: "sec1",
            question_code: "attended_training_specify",
            label_en: "Q2. If Yes, specify training attended",
            field_type: "Text",
            is_mandatory: true, // Mandatory when visible!
          },
        ],
      };

      survey.activeSectionIndex.value = 0;

      // Case A: User answers "No" to Q1. Q2 is hidden and should NOT block validation.
      survey.responses.value.attended_training = "No";
      expect(survey.validateCurrentSection()).toBe(true);
      expect(survey.isSectionComplete(survey.activeTemplate.value.sections[0])).toBe(true);
      expect(survey.nextSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(1);

      // Case B: User answers "Yes" to Q1. Q2 is now visible and mandatory!
      survey.activeSectionIndex.value = 0;
      survey.responses.value.attended_training = "Yes";
      delete survey.responses.value.attended_training_specify;

      expect(survey.validateCurrentSection()).toBe(false);
      expect(survey.validationErrors.value.attended_training_specify).toBe("This field is required");
      expect(survey.nextSection()).toBe(false);

      // Fill Q2 -> Now valid
      survey.responses.value.attended_training_specify = "SVEP Financial Literacy";
      expect(survey.validateCurrentSection()).toBe(true);
      expect(survey.nextSection()).toBe(true);
    });
  });
});

