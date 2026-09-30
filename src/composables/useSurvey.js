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

  const allDrafts = ref([]);

  async function loadActiveDrafts() {
    try {
      const drafts = await db.responses.where("status").equals("Draft").toArray();
      // Sort drafts descending by most recently updated
      drafts.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
      allDrafts.value = drafts;
      const draftMap = {};
      for (const d of drafts) {
        if (d.template_name && !draftMap[d.template_name]) {
          draftMap[d.template_name] = d;
        }
      }
      activeDrafts.value = draftMap;
      return draftMap;
    } catch (e) {
      activeDrafts.value = {};
      allDrafts.value = [];
      return {};
    }
  }

  async function loadAvailableTemplates() {
    // 1. Immediately read cached templates from IndexedDB (instant offline render)
    try {
      const cachedList = await db.templates.toArray();
      if (cachedList && cachedList.length > 0) {
        availableTemplates.value = cachedList.map((t) => ({
          name: t.template_name,
          title: t.title,
          project: t.project,
          project_name: t.project_name || t.project,
          grantor_organization: t.grantor_organization || "",
          project_description: t.description || "",
          version: t.version || 1,
          target_category: t.target_category || "Survey",
          workspace: t.workspace,
          workspace_title: t.workspace_title,
          response_title_format: t.response_title_format,
        }));
      }
    } catch (e) {
      console.warn("Could not read cached templates from IndexedDB:", e);
    }

    // 2. Fetch fresh bootstrap data from server if online
    try {
      const response = await fetch("/api/method/omniquery.api.survey.get_bootstrap_data");
      if (response.ok) {
        const data = await response.json();
        const templates = data.message?.templates || [];
        if (templates.length > 0) {
          const formatted = [];
          for (const t of templates) {
            const schema = t.schema || {};
            schema.template_name = t.name;
            schema.title = t.title;
            schema.project = t.project;
            schema.project_name = t.project_name;
            schema.version = t.version;
            schema.target_category = t.target_category;
            schema.workspace = t.workspace;
            schema.workspace_title = t.workspace_title;
            schema.grantor_organization = t.grantor_organization;
            schema.project_description = t.project_description;
            schema.response_title_format = t.response_title_format || schema.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})";

            // Persist full schema to IndexedDB
            await db.templates.put({
              template_name: t.name,
              title: t.title,
              project: t.project,
              project_name: t.project_name || t.project,
              grantor_organization: t.grantor_organization || "",
              description: t.project_description || "",
              version: t.version || 1,
              target_category: t.target_category || "Survey",
              workspace: t.workspace,
              workspace_title: t.workspace_title,
              response_title_format: schema.response_title_format,
              schema: schema,
              modified: new Date().toISOString(),
            });

            formatted.push({
              name: t.name,
              title: t.title,
              project: t.project,
              project_name: t.project_name || t.project,
              grantor_organization: t.grantor_organization || "",
              project_description: t.project_description || "",
              version: t.version || 1,
              target_category: t.target_category || "Survey",
              workspace: t.workspace,
              workspace_title: t.workspace_title,
              response_title_format: schema.response_title_format,
            });
          }
          availableTemplates.value = formatted;
          await loadActiveDrafts();
          return availableTemplates.value;
        }
      }
    } catch (e) {
      console.warn("Could not fetch get_bootstrap_data from server:", e);
    }

    // 3. Fallback to list_active_templates if get_bootstrap_data didn't return templates
    try {
      const response = await fetch("/api/method/omniquery.api.survey.list_active_templates");
      if (response.ok) {
        const data = await response.json();
        const list = data.message || [];
        if (list.length > 0) {
          availableTemplates.value = list;
          // Background prefetch schemas for all templates
          for (const tmpl of list) {
            fetchRemoteSchema(tmpl.name).then((payload) => {
              if (payload) {
                const schema = payload.schema || payload;
                cacheTemplateLocally(tmpl.name, schema, payload);
              }
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch active templates list:", e);
    }

    await loadActiveDrafts();
    return availableTemplates.value;
  }

  async function getCachedTemplate(surveyId) {
    try {
      const cached = await db.templates.get(surveyId);
      if (cached && cached.schema) {
        return cached.schema;
      }
      const byTitle = await db.templates.where("title").equals(surveyId).first();
      return (byTitle && byTitle.schema) || null;
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
        project_name: schema.project_name || (payload && payload.project_name) || schema.project,
        grantor_organization: schema.grantor_organization || (payload && payload.grantor_organization) || "",
        description: schema.description || (payload && payload.description) || "",
        version: schema.version || (payload && payload.version) || 1,
        target_category: schema.target_category || (payload && payload.target_category) || "Survey",
        workspace: schema.workspace || (payload && payload.workspace) || "",
        workspace_title: schema.workspace_title || (payload && payload.workspace_title) || "",
        response_title_format: schema.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
        schema: JSON.parse(JSON.stringify(schema)),
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

  async function loadTemplate(surveyId, options = {}) {
    if (!surveyId) return null;
    const isStartNew = options === false || (typeof options === "object" && options.startNew);
    const targetDraftId = typeof options === "object" ? options.draftId : null;

    // 1. Instant offline retrieval from IndexedDB
    const cached = await getCachedTemplate(surveyId);
    if (cached) {
      activeTemplate.value = cached;
      activeSectionIndex.value = 0;
    }

    // 2. If online, optionally refresh from server
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const payload = await fetchRemoteSchema(surveyId);
        if (payload) {
          const schema = payload.schema || payload;
          schema.template_name = schema.template_name || payload.template_name || surveyId;
          schema.title = schema.title || payload.title || surveyId;
          schema.response_title_format = schema.response_title_format || payload.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})";
          activeTemplate.value = schema;
          activeSectionIndex.value = 0;
          await cacheTemplateLocally(surveyId, schema, payload);
        }
      } catch (e) {
        console.warn("Could not refresh remote schema, using local cache:", e);
      }
    }

    if (!isStartNew) {
      try {
        let draft = null;
        if (targetDraftId) {
          draft = await db.responses.get(targetDraftId);
        } else {
          // Retrieve most recent draft for this template
          const matchingDrafts = await db.responses
            .where("template_name")
            .equals(surveyId)
            .and((d) => d.status === "Draft")
            .toArray();

          if (matchingDrafts && matchingDrafts.length > 0) {
            matchingDrafts.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
            draft = matchingDrafts[0];
          }
        }

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
      // Start a fresh, new survey without affecting existing saved drafts
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
        title: activeTemplate.value.title || tmplName,
        response_title_format: activeTemplate.value.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
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

  async function discardDraft(surveyId, draftId = null) {
    if (!surveyId && !draftId) return;
    try {
      if (draftId) {
        await db.responses.delete(draftId);
      } else {
        await db.responses
          .where("template_name")
          .equals(surveyId)
          .and((d) => d.status === "Draft")
          .delete();
      }

      const tmplName = activeTemplate.value?.name || activeTemplate.value?.template_name;
      if (tmplName === surveyId || currentDraftId.value === draftId) {
        responses.value = {};
        activeSectionIndex.value = 0;
        currentDraftId.value = generateSurveyId(surveyId || "SURVEY");
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

  const isFullForm = ref(false);
  if (typeof localStorage !== "undefined") {
    isFullForm.value = localStorage.getItem("omniquery_full_form") === "true";
  }

  function toggleFullForm() {
    isFullForm.value = !isFullForm.value;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("omniquery_full_form", isFullForm.value ? "true" : "false");
    }
  }

  const activeQuestions = computed(() => {
    if (!activeSection.value || !activeTemplate.value) return [];
    const all = activeTemplate.value.questions || [];
    let sectionQs = all.filter((q) => q.section_code === activeSection.value.section_code);
    if (!isFullForm.value) {
      sectionQs = sectionQs.filter((q) => isQuestionVisible(q));
    }

    // Automatically link sub-questions to their parent Table/Dynamic Grid question
    let currentParentTitle = null;
    let currentParentDesc = null;
    let currentParentCode = null;

    for (let i = 0; i < sectionQs.length; i++) {
      const q = sectionQs[i];
      const type = (q.field_type || "").toLowerCase();
      const label = q.label_en || q.label || "";

      if (type === "dynamic grid" || type === "table") {
        currentParentTitle = label;
        currentParentDesc = q.description || "";
        currentParentCode = q.question_code;
      } else if (/^[a-z][.\s]\s*/i.test(label) && currentParentTitle) {
        q._parentTitle = currentParentTitle;
        q._parentDescription = currentParentDesc;
        q._parentCode = currentParentCode;
      } else {
        currentParentTitle = null;
        currentParentDesc = null;
        currentParentCode = null;
      }
    }

    return sectionQs;
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
      if (q.is_mandatory && isQuestionVisible(q)) {
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
    allDrafts,
    loadActiveDrafts,
    loadAvailableTemplates,
    loadTemplate,
    saveDraftLocally,
    discardDraft,
    generateSurveyId,
    isQuestionVisible,
    isFullForm,
    toggleFullForm,
    isSectionComplete,
    validateCurrentSection,
    nextSection,
    prevSection,
  };
}
