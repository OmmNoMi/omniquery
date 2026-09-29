import { ref, computed } from "vue";
import { db } from "../services/db";

export function generateSurveyId(templateName) {
  const cleanId = (templateName || "SURVEY").replace(/^OQS-/, "");
  const rand = Math.random().toString(36).substring(2, 8);
  return `OQS-${cleanId}-${rand}`;
}

export function useSurvey() {
  const activeTemplate = ref(null);
  const activeSectionIndex = ref(0);
  const availableTemplates = ref([]);
  const responses = ref({});
  const validationErrors = ref({});
  const isSubmitting = ref(false);
  const isSubmitted = ref(false);
  const currentDraftId = ref(null);
  const activeDrafts = ref({});

  async function loadActiveDrafts() {
    try {
      const drafts = await db.responses.where("status").equals("Draft").toArray();
      const draftMap = {};
      for (const d of drafts) {
        if (d.template_name) {
          draftMap[d.template_name] = d;
        }
      }
      activeDrafts.value = draftMap;
      return draftMap;
    } catch (e) {
      activeDrafts.value = {};
      return {};
    }
  }

  async function loadAvailableTemplates() {
    try {
      const response = await fetch("/api/method/omniquery.api.survey.list_active_templates");
      if (response.ok) {
        const data = await response.json();
        availableTemplates.value = data.message || [];
        await loadActiveDrafts();
        return availableTemplates.value;
      }
    } catch (e) {
      console.warn("Failed to load active templates:", e);
    }
    await loadActiveDrafts();
    return [];
  }

  async function getCachedTemplate(surveyId) {
    try {
      const cached = await db.templates.get(surveyId);
      return (cached && cached.schema) || null;
    } catch (e) {
      return null;
    }
  }

  async function cacheTemplateLocally(surveyId, schema, payload) {
    try {
      await db.templates.put({
        template_name: surveyId,
        title: schema.title,
        project: schema.project || (payload && payload.project),
        schema: schema,
        modified: new Date().toISOString(),
      });
    } catch (e) {}
  }

  async function fetchRemoteSchema(surveyId) {
    try {
      const res = await fetch(`/api/method/omniquery.api.survey.get_schema?template_name=${encodeURIComponent(surveyId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.message || null;
    } catch (e) {
      return null;
    }
  }

  async function loadTemplate(surveyId, resumeExisting = true) {
    if (!surveyId) return null;
    const cached = await getCachedTemplate(surveyId);
    if (cached) {
      activeTemplate.value = cached;
      activeSectionIndex.value = 0;
    }
    const payload = await fetchRemoteSchema(surveyId);
    if (payload) {
      const schema = payload.schema || payload;
      schema.template_name = schema.template_name || payload.template_name || surveyId;
      schema.title = schema.title || payload.title || surveyId;
      activeTemplate.value = schema;
      activeSectionIndex.value = 0;
      await cacheTemplateLocally(surveyId, schema, payload);
    }

    if (resumeExisting) {
      try {
        const draft = await db.responses
          .where("template_name")
          .equals(surveyId)
          .and((d) => d.status === "Draft")
          .first();

        if (draft && draft.responses && Object.keys(draft.responses).length > 0) {
          currentDraftId.value = draft.response_uid;
          responses.value = { ...draft.responses };
          activeSectionIndex.value = draft.active_section_index || 0;
        } else {
          currentDraftId.value = generateSurveyId(surveyId);
          responses.value = {};
          activeSectionIndex.value = 0;
        }
      } catch (e) {
        currentDraftId.value = generateSurveyId(surveyId);
        responses.value = {};
        activeSectionIndex.value = 0;
      }
    } else {
      currentDraftId.value = generateSurveyId(surveyId);
      responses.value = {};
      activeSectionIndex.value = 0;
    }

    return activeTemplate.value;
  }

  async function saveDraftLocally(progress = 0) {
    if (!activeTemplate.value || isSubmitted.value) return;
    const tmplName = activeTemplate.value.name || activeTemplate.value.template_name;
    if (!tmplName) return;

    if (!currentDraftId.value) {
      currentDraftId.value = generateSurveyId(tmplName);
    }

    try {
      await db.responses.put({
        response_uid: currentDraftId.value,
        template_name: tmplName,
        responses: JSON.parse(JSON.stringify(responses.value)),
        active_section_index: activeSectionIndex.value,
        progress_percent: progress,
        status: "Draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: false,
      });
      await loadActiveDrafts();
    } catch (e) {
      console.warn("Failed to save draft locally:", e);
    }
  }

  async function discardDraft(surveyId) {
    if (!surveyId) return;
    try {
      await db.responses
        .where("template_name")
        .equals(surveyId)
        .and((d) => d.status === "Draft")
        .delete();

      const tmplName = activeTemplate.value?.name || activeTemplate.value?.template_name;
      if (tmplName === surveyId) {
        responses.value = {};
        activeSectionIndex.value = 0;
        currentDraftId.value = generateSurveyId(surveyId);
      }
      await loadActiveDrafts();
    } catch (e) {
      console.warn("Failed to discard draft:", e);
    }
  }

  const sections = computed(() => {
    return (activeTemplate.value && activeTemplate.value.sections) || [];
  });

  const activeSection = computed(() => {
    return sections.value[activeSectionIndex.value] || null;
  });

  function isQuestionVisible(question) {
    if (!question || !question.conditional_logic) return true;
    const logic = question.conditional_logic;
    const parentCode = logic.depends_on || logic.parent_question;
    if (!parentCode) return true;
    const parentValue = responses.value[parentCode];
    if (logic.operator === "equals" || logic.equals !== undefined) {
      const target = logic.equals !== undefined ? logic.equals : logic.value;
      return String(parentValue) === String(target);
    }
    if (logic.operator === "in" || Array.isArray(logic.in)) {
      const targetList = logic.in || logic.values || [];
      return targetList.map(String).includes(String(parentValue));
    }
    return true;
  }

  const activeQuestions = computed(() => {
    if (!activeSection.value || !activeTemplate.value) return [];
    const all = activeTemplate.value.questions || [];
    return all.filter((q) => q.section_code === activeSection.value.section_code && isQuestionVisible(q));
  });

  function isSectionComplete(section) {
    if (!section || !activeTemplate.value) return false;
    const questions = (activeTemplate.value.questions || []).filter(
      (q) => q.section_code === section.section_code && isQuestionVisible(q)
    );
    return questions.every((q) => {
      if (!q.is_mandatory) return true;
      const val = responses.value[q.question_code];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });
  }

  function validateCurrentSection() {
    validationErrors.value = {};
    let isValid = true;
    for (const q of activeQuestions.value) {
      if (q.is_mandatory) {
        const val = responses.value[q.question_code];
        if (val === undefined || val === null || String(val).trim() === "") {
          validationErrors.value[q.question_code] = "This field is required";
          isValid = false;
        }
      }
    }
    return isValid;
  }

  function nextSection() {
    if (!validateCurrentSection()) return false;
    if (activeSectionIndex.value < sections.value.length - 1) {
      activeSectionIndex.value++;
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  }

  function prevSection() {
    if (activeSectionIndex.value > 0) {
      activeSectionIndex.value--;
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  }

  return {
    activeTemplate,
    activeSectionIndex,
    availableTemplates,
    sections,
    activeSection,
    activeQuestions,
    responses,
    validationErrors,
    isSubmitting,
    isSubmitted,
    currentDraftId,
    activeDrafts,
    loadActiveDrafts,
    loadAvailableTemplates,
    loadTemplate,
    saveDraftLocally,
    discardDraft,
    generateSurveyId,
    isQuestionVisible,
    isSectionComplete,
    validateCurrentSection,
    nextSection,
    prevSection,
  };
}
