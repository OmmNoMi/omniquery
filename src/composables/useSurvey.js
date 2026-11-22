import { ref, computed } from "vue";
import { call } from "frappe-ui";
import { db, audioRecordingsFor, NOT_SYNCED } from "../services/db";
import { isAnswered, responseItems } from "../utils/responsePayload";
import { PHONE_ERROR, isPhoneQuestion, isValidMobile } from "../utils/phone";
import { comparisonError } from "../utils/answerComparison";
import { parentGrid } from "../utils/questionLayout";
import { useTranslation } from "./useTranslation";
import { REQUIRED_ERROR } from "../utils/requiredMessage";
import { uuidv4 } from "../utils/uuid";
import { projectHelp } from "../utils/projectHelp";
import { templatesOfProject } from "../utils/projectTemplates";

// a new interview is filed under a UUIDv4 the server also checks (#25)
export const generateSurveyId = uuidv4;

export function useSurvey() {
  const { getRuleMessage } = useTranslation();
  const activeTemplate = ref(null);
  const activeSectionIndex = ref(0);
  const availableTemplates = ref([]);
  // the server says the user is in no project and holds no site-wide role (#57); unknown offline
  const isUnassigned = ref(false);
  const responses = ref({});
  const validationErrors = ref({});
  const isSubmitting = ref(false);
  const isSubmitted = ref(false);
  const currentDraftId = ref(null);
  const activeDrafts = ref({});

  const allDrafts = ref([]);
  const cachedTemplatesMap = ref({});

  async function refreshCachedTemplatesMap() {
    try {
      const records = await db.templates.toArray();
      const map = {};
      for (const r of records) {
        if (r.template_name && r.schema) {
          const qCount = (r.schema.questions || []).length;
          map[r.template_name] = {
            version: r.version || r.schema.version || 1,
            questionCount: qCount,
            modified: r.modified || null,
          };
        }
      }
      cachedTemplatesMap.value = map;
      return map;
    } catch (e) {
      cachedTemplatesMap.value = {};
      return {};
    }
  }

  async function downloadSurveyForOffline(surveyId) {
    if (!surveyId) return false;
    try {
      const payload = await fetchRemoteSchema(surveyId);
      if (payload) {
        const schema = payload.schema || payload;
        schema.template_name = schema.template_name || payload.template_name || surveyId;
        schema.title = schema.title || payload.title || surveyId;
        schema.response_title_format = schema.response_title_format || payload.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})";
        await cacheTemplateLocally(surveyId, schema, payload);
        await refreshCachedTemplatesMap();
        return true;
      }
    } catch (e) {
      console.warn("Failed to download survey for offline:", e);
    }
    return false;
  }

  async function downloadProjectSurveysForOffline(projectId) {
    const list = templatesOfProject(availableTemplates.value, projectId);
    if (!list.length) return 0;
    let count = 0;
    for (const t of list) {
      const ok = await downloadSurveyForOffline(t.name);
      if (ok) count++;
    }
    await refreshCachedTemplatesMap();
    return count;
  }

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
          project_status: t.project_status || "",
          version: t.version || 1,
          target_category: t.target_category || "Survey",
          workspace: t.workspace,
          workspace_title: t.workspace_title,
          response_title_format: t.response_title_format,
          ...projectHelp(t),
        }));
      }
    } catch (e) {
      console.warn("Could not read cached templates from IndexedDB:", e);
    }

    // 2. Fetch fresh bootstrap data from server if online
    try {
      const data = await call("omniquery.api.survey.get_bootstrap_data");
      const payload = (data && data.message) || data || {};
      const templates = payload.templates || [];
      isUnassigned.value = Boolean(payload.is_unassigned);
      // an unassigned user's empty list is the server's answer, not a reason to try another endpoint
      if (templates.length > 0 || isUnassigned.value) {
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
          schema.project_status = t.project_status;
          schema.response_title_format = t.response_title_format || schema.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})";

          // Persist full schema to IndexedDB
          await db.templates.put({
            template_name: t.name,
            title: t.title,
            project: t.project,
            project_name: t.project_name || t.project,
            grantor_organization: t.grantor_organization || "",
            description: t.project_description || "",
            project_status: t.project_status || "",
            version: t.version || 1,
            target_category: t.target_category || "Survey",
            workspace: t.workspace,
            workspace_title: t.workspace_title,
            response_title_format: schema.response_title_format,
            // the project's helpline and SOPs, so the project page has them offline (#14)
            ...projectHelp(t),
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
            project_status: t.project_status || "",
            version: t.version || 1,
            target_category: t.target_category || "Survey",
            workspace: t.workspace,
            workspace_title: t.workspace_title,
            response_title_format: schema.response_title_format,
            ...projectHelp(t),
          });
        }
        availableTemplates.value = formatted;
        await loadActiveDrafts();
        return availableTemplates.value;
      }
    } catch (e) {
      console.warn("Could not fetch get_bootstrap_data from server:", e);
    }

    // 3. Fallback to list_active_templates if get_bootstrap_data didn't return templates
    try {
      const data = await call("omniquery.api.survey.list_active_templates");
      const list = Array.isArray(data) ? data : ((data && data.message) || []);
      if (list.length > 0) {
        availableTemplates.value = list;
        // Background prefetch schemas for all templates
        for (const tmpl of list) {
          fetchRemoteSchema(tmpl.name).then((payload) => {
            if (payload) {
              const schema = payload.schema || payload;
              cacheTemplateLocally(tmpl.name, schema, payload);
            }
          }).catch((e) => console.warn(`Could not prefetch the survey ${tmpl.name}:`, e));
        }
      }
    } catch (e) {
      console.warn("Could not fetch active templates list:", e);
    }

    await loadActiveDrafts();
    await refreshCachedTemplatesMap();
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
      // get_schema sends no project help, so keep what the bootstrap cached unless the payload has its own
      const cached = await db.templates.get(surveyId);
      await db.templates.put({
        ...projectHelp({ ...cached, ...payload }),
        template_name: surveyId,
        title: schema.title,
        project: schema.project || (payload && payload.project),
        project_name: schema.project_name || (payload && payload.project_name) || schema.project,
        grantor_organization: schema.grantor_organization || (payload && payload.grantor_organization) || "",
        description: schema.description || (payload && payload.description) || "",
        // get_schema sends no project status either; the header shows the cached one offline (#16)
        project_status: schema.project_status || (payload && payload.project_status) || (cached && cached.project_status) || "",
        version: schema.version || (payload && payload.version) || 1,
        target_category: schema.target_category || (payload && payload.target_category) || "Survey",
        workspace: schema.workspace || (payload && payload.workspace) || "",
        workspace_title: schema.workspace_title || (payload && payload.workspace_title) || "",
        response_title_format: schema.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
        schema: JSON.parse(JSON.stringify(schema)),
        modified: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`Could not cache the survey ${surveyId} on this device:`, e);
    }
  }

  async function fetchRemoteSchema(surveyId) {
    try {
      const data = await call("omniquery.api.survey.get_schema", { template_name: surveyId });
      return data || null;
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
          currentDraftId.value = generateSurveyId();
          responses.value = {};
          activeSectionIndex.value = 0;
        }
      } catch (e) {
        currentDraftId.value = generateSurveyId();
        responses.value = {};
        activeSectionIndex.value = 0;
      }
    } else {
      // Start a fresh, new survey without affecting existing saved drafts
      currentDraftId.value = generateSurveyId();
      responses.value = {};
      activeSectionIndex.value = 0;
    }

    return activeTemplate.value;
  }

  async function saveDraftLocally(progress = 0) {
    if (!activeTemplate.value || isSubmitted.value) return;
    const tmplName = activeTemplate.value.name || activeTemplate.value.template_name;
    if (!tmplName) return;

    try {
      // An untouched survey is not saved, so opening one and leaving adds no empty draft. A saved
      // draft whose answers were all cleared is still written, or the old answers would come back (#34)
      const hasAnswers = responseItems(responses.value).length > 0;
      if (!hasAnswers && !(currentDraftId.value && (await db.responses.get(currentDraftId.value)))) return;

      if (!currentDraftId.value) {
        currentDraftId.value = generateSurveyId();
      }

      // the created_at here applies to a new draft only: db.js keeps an existing draft's own
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
        synced: NOT_SYNCED,
      });
      await loadActiveDrafts();
    } catch (e) {
      console.warn("Failed to save draft locally:", e);
    }
  }

  async function discardDraft(surveyId, draftId = null) {
    if (!surveyId && !draftId) return;
    try {
      const draftIds = draftId
        ? [draftId]
        : await db.responses
            .where("template_name")
            .equals(surveyId)
            .and((d) => d.status === "Draft")
            .primaryKeys();
      await db.responses.bulkDelete(draftIds);
      // a draft's recordings go with it, or they would wait to upload for a response that never comes
      for (const id of draftIds) await audioRecordingsFor(id).delete();

      const tmplName = activeTemplate.value?.name || activeTemplate.value?.template_name;
      if (tmplName === surveyId || currentDraftId.value === draftId) {
        responses.value = {};
        activeSectionIndex.value = 0;
        currentDraftId.value = generateSurveyId();
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

  // the questions a section shows, in template order: the hidden ones only with Full Form on
  function shownQuestions(section) {
    if (!section || !activeTemplate.value) return [];
    const inSection = (activeTemplate.value.questions || []).filter((q) => q.section_code === section.section_code);
    return isFullForm.value ? inSection : inSection.filter((q) => isQuestionVisible(q));
  }

  const activeQuestions = computed(() => {
    const sectionQs = shownQuestions(activeSection.value);

    // the grid each question sits under, by its group_code; set on every question every time, so a
    // question that leaves a grid's group never keeps the old card (#140)
    for (const q of sectionQs) {
      q._parentQuestion = parentGrid(q, sectionQs);
    }

    return sectionQs;
  });

  function isSectionComplete(section) {
    if (!section || !activeTemplate.value) return false;
    const questions = (activeTemplate.value.questions || []).filter(
      (q) => q.section_code === section.section_code && isQuestionVisible(q)
    );
    return questions.every((q) => {
      return !q.is_mandatory || isAnswered(responses.value[q.question_code]);
    });
  }

  function evaluateFormula(expr, currentResponses) {
    if (!expr || typeof expr !== "string") return null;
    try {
      // Replaces {question_code} with response numeric value (defaulting to 0)
      const replaced = expr.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, code) => {
        const val = currentResponses[code];
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      });
      // Safe math evaluation with restricted characters (digits, math operators, parens, dots, spaces)
      if (/^[\d\s+\-*/().%]+$/.test(replaced)) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${replaced});`)();
        return typeof res === "number" && !isNaN(res) ? res : null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  // Checks the answer comparisons of the questions given (#159). Next and Submit check the section's
  // own; a rule only compares with the same or an earlier section, so its other answer is in by then
  // (#155). An answer the surveyor can no longer see counts as none, and a rule waits for it.
  function validateCrossFieldRules(questions) {
    const shownAnswers = Object.fromEntries(
      (activeTemplate.value?.questions || []).filter(isQuestionVisible).map((q) => [q.question_code, responses.value[q.question_code]]),
    );
    let isValid = true;
    for (const q of questions) {
      const error = comparisonError(q, shownAnswers, getRuleMessage);
      if (error) {
        validationErrors.value[q.question_code] = error;
        isValid = false;
      }
    }
    return isValid;
  }

  // A question the surveyor still has to answer: required, shown by the answers so far, and with no
  // answer yet. Next and Submit refuse to pass one, and the app sends the surveyor to the first (#155).
  function isRequiredAndMissing(q) {
    return Boolean(q.is_mandatory) && isQuestionVisible(q) && !isAnswered(responses.value[q.question_code]);
  }

  function validateCurrentSection() {
    validationErrors.value = {};
    let isValid = true;
    for (const q of activeQuestions.value) {
      const val = responses.value[q.question_code];
      if (isRequiredAndMissing(q)) {
        validationErrors.value[q.question_code] = REQUIRED_ERROR;
        isValid = false;
      } else if (isQuestionVisible(q) && isAnswered(val) && isPhoneQuestion(q) && !isValidMobile(val)) {
        // an optional phone number may be left out, but not left wrong (#22)
        validationErrors.value[q.question_code] = PHONE_ERROR;
        isValid = false;
      }
    }

    if (!validateCrossFieldRules(activeQuestions.value)) {
      isValid = false;
    }

    return isValid;
  }

  // Next and Previous pass over a section with nothing to show (every question in it hidden), as the
  // surveyor would only press again there. The last section holds Submit, so Next still stops on it,
  // and Previous stops on the first, there being nowhere before it (#154).
  function nextSection() {
    if (!validateCurrentSection()) return false;
    const last = sections.value.length - 1;
    if (activeSectionIndex.value >= last) return false;
    let next = activeSectionIndex.value + 1;
    while (next < last && !shownQuestions(sections.value[next]).length) next++;
    activeSectionIndex.value = next;
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function prevSection() {
    if (activeSectionIndex.value <= 0) return false;
    let prev = activeSectionIndex.value - 1;
    while (prev > 0 && !shownQuestions(sections.value[prev]).length) prev--;
    activeSectionIndex.value = prev;
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  return {
    activeTemplate,
    activeSectionIndex,
    availableTemplates,
    isUnassigned,
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
    evaluateFormula,
    validateCrossFieldRules,
    isRequiredAndMissing,
    nextSection,
    prevSection,
    cachedTemplatesMap,
    refreshCachedTemplatesMap,
    downloadSurveyForOffline,
    downloadProjectSurveysForOffline,
  };
}
