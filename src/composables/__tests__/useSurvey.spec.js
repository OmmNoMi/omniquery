import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSurvey, generateSurveyId } from "../useSurvey";
import { db, audioRecordingsFor } from "../../services/db";
import { useAudioRecorder } from "../useAudioRecorder";

describe("useSurvey", () => {
  beforeEach(async () => {
    await db.responses.clear();
    await db.templates.clear();
    vi.restoreAllMocks();
  });

  it("generates client-side UUIDv4 survey ID matching regex and 10,000 calls produce no duplicates", () => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const id = generateSurveyId();
    expect(id).toMatch(uuidV4Regex);

    const seen = new Set();
    for (let i = 0; i < 10000; i++) {
      const nextId = generateSurveyId();
      expect(nextId).toMatch(uuidV4Regex);
      expect(seen.has(nextId)).toBe(false);
      seen.add(nextId);
    }
    expect(seen.size).toBe(10000);
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

  // #154: a section whose questions are all hidden has nothing to answer, so Next and Previous pass it
  describe("a section with nothing to show", () => {
    const ifLand = { depends_on: "has_land", equals: "Yes" };
    function surveyWith(sectionCodes) {
      const survey = useSurvey();
      survey.isFullForm.value = false;
      survey.activeTemplate.value = {
        template_name: "TMPL-EMPTY-SECTION",
        sections: sectionCodes.map((section_code) => ({ section_code })),
        questions: [
          { section_code: "s1", question_code: "has_land" },
          { section_code: "s2", question_code: "land_owner", conditional_logic: ifLand },
          { section_code: "s3", question_code: "phone" },
        ].filter((q) => sectionCodes.includes(q.section_code)),
      };
      survey.activeSectionIndex.value = 0;
      survey.responses.value = { has_land: "No" };
      return survey;
    }

    it("is passed by Next and by Previous", () => {
      const survey = surveyWith(["s1", "s2", "s3"]);
      expect(survey.nextSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(2);
      expect(survey.prevSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(0);
    });

    it("is still where Next stops when it is the last, since it holds Submit", () => {
      const survey = surveyWith(["s1", "s2"]);
      expect(survey.nextSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(1);
    });

    it("is not passed with Full Form on, which shows its questions", () => {
      const survey = surveyWith(["s1", "s2", "s3"]);
      survey.isFullForm.value = true;
      expect(survey.nextSection()).toBe(true);
      expect(survey.activeSectionIndex.value).toBe(1);
      expect(survey.activeQuestions.value.map((q) => q.question_code)).toEqual(["land_owner"]);
    });
  });

  // #22: a Phone question holds a 10-digit mobile number, checked when the surveyor moves on
  it("refuses a section whose phone number is not 10 digits, even when the question is optional", () => {
    const survey = useSurvey();
    survey.activeTemplate.value = {
      template_name: "TMPL-PHONE",
      title: "Phone Test",
      sections: [
        { section_code: "sec1", section_title: "Section 1" },
        { section_code: "sec2", section_title: "Section 2" },
      ],
      questions: [
        { section_code: "sec1", question_code: "respondent_phone", field_type: "Phone", is_mandatory: 1 },
        { section_code: "sec1", question_code: "spouse_phone", field_type: "Phone", is_mandatory: 0 },
        { section_code: "sec1", question_code: "owns_smartphone", field_type: "Single Choice (Radio)", is_mandatory: 0 },
        { section_code: "sec2", question_code: "notes", is_mandatory: 0 },
      ],
    };
    survey.activeSectionIndex.value = 0;

    survey.responses.value = { respondent_phone: "98765", owns_smartphone: "Yes" };
    expect(survey.nextSection()).toBe(false);
    expect(survey.validationErrors.value.respondent_phone).toBe("Enter a 10-digit mobile number");
    expect(survey.validationErrors.value.spouse_phone).toBeUndefined();
    expect(survey.validationErrors.value.owns_smartphone).toBeUndefined();

    survey.responses.value = { respondent_phone: "+91 98765 43210", spouse_phone: "12abc", owns_smartphone: "Yes" };
    expect(survey.validateCurrentSection()).toBe(false);
    expect(survey.validationErrors.value.respondent_phone).toBeUndefined();
    expect(survey.validationErrors.value.spouse_phone).toBe("Enter a 10-digit mobile number");

    survey.responses.value = { respondent_phone: "+91 98765 43210", spouse_phone: "", owns_smartphone: "Yes" };
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

  it("takes an unassigned user's empty bootstrap as the answer, not a cue for another endpoint (#57)", async () => {
    await db.templates.put({ template_name: "OQS-STALE", title: "Old Project Survey", schema: {} });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { templates: [], is_unassigned: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const survey = useSurvey();
    const loaded = await survey.loadAvailableTemplates();

    expect(survey.isUnassigned.value).toBe(true);
    expect(loaded).toEqual([]);
    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls.some((url) => url.includes("list_active_templates"))).toBe(false);
    expect(await db.templates.get("OQS-STALE")).toBeDefined(); // drafts may still need the cached schema
  });

  it("is not unassigned when the server does not say so, or cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { templates: [] } }) }));
    const survey = useSurvey();
    await survey.loadAvailableTemplates();
    expect(survey.isUnassigned.value).toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const offline = useSurvey();
    await offline.loadAvailableTemplates();
    expect(offline.isUnassigned.value).toBe(false);
  });

  it("keeps the project's helpline, SOPs and status with the cached template, through a download and offline (#14, #16)", async () => {
    const help = { support_email: "help@example.org", helpline_phone: "+91 1800 000 111", sop_sections: "<p>Introduce yourself.</p>", project_status: "Completed" };
    const template = { name: "OQS-HELP-01", title: "Help Survey", project: "PROJ-HELP", version: 1, schema: { questions: [] }, ...help };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { templates: [template] } }) }));

    const survey = useSurvey();
    const [listed] = await survey.loadAvailableTemplates();
    expect(listed).toMatchObject(help);
    expect(await db.templates.get("OQS-HELP-01")).toMatchObject(help);

    // get_schema sends no project help: downloading the survey again must not wipe what the bootstrap cached
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { template_name: "OQS-HELP-01", schema: { questions: [] } } }) }));
    expect(await survey.downloadSurveyForOffline("OQS-HELP-01")).toBe(true);
    expect(await db.templates.get("OQS-HELP-01")).toMatchObject(help);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch (offline)")));
    const [offline] = await useSurvey().loadAvailableTemplates();
    expect(offline).toMatchObject(help);
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
  it("takes a discarded draft's recordings with it, and leaves a submitted response's alone (#37)", async () => {
    await db.audio_recordings.clear();
    const { saveAudioForResponse } = useAudioRecorder();
    const take = (text) => new Blob([text], { type: "audio/webm" });
    await db.responses.bulkPut([
      { response_uid: "OQS-WATER-aaa111", template_name: "OQS-WATER", status: "Draft", updated_at: "2026-11-01" },
      { response_uid: "OQS-WATER-bbb222", template_name: "OQS-WATER", status: "Draft", updated_at: "2026-11-02" },
      { response_uid: "OQS-WATER-ccc333", template_name: "OQS-WATER", status: "Submitted", updated_at: "2026-11-03" },
    ]);
    await saveAudioForResponse("OQS-WATER-aaa111", take("one"));
    await saveAudioForResponse("OQS-WATER-aaa111", take("one, after resuming"));
    await saveAudioForResponse("OQS-WATER-bbb222", take("two"));
    await saveAudioForResponse("OQS-WATER-ccc333", take("submitted"));

    const { discardDraft } = useSurvey();
    await discardDraft(null, "OQS-WATER-aaa111");
    expect(await audioRecordingsFor("OQS-WATER-aaa111").count(), "both parts of the one draft").toBe(0);
    expect(await audioRecordingsFor("OQS-WATER-bbb222").count(), "the other draft keeps its recording").toBe(1);

    await discardDraft("OQS-WATER");
    expect(await audioRecordingsFor("OQS-WATER-bbb222").count(), "every draft of the survey").toBe(0);
    expect(await audioRecordingsFor("OQS-WATER-ccc333").count(), "a submitted response is not a draft").toBe(1);
  });
});
