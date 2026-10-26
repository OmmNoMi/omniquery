import { ref, computed, watch, onMounted } from "vue";
import { call } from "frappe-ui";
import { db } from "../services/db";
import { useSurvey } from "./useSurvey";
import { useWAL } from "./useWAL";
import { useGPS } from "./useGPS";
import { useTextScale } from "./useTextScale";
import { useTranslation } from "./useTranslation";
import { useAudioRecorder } from "./useAudioRecorder";

export function useSurveyApp() {
  const autoAdvance = ref(true);
  const isFocusMode = ref(false);
  const focusQuestionIndex = ref(0);

  const showExitDialog = ref(false);
  const draftToDiscard = ref(null);
  const liveAnnouncementText = ref("");

  function announce(message) {
    liveAnnouncementText.value = message;
  }

  const { __ } = useTranslation();
  const { textSize, cycleTextSize, setTextSize } = useTextScale();
  const { isOnline, pendingWALCount, queueWAL, syncWAL, forceSyncAll, syncPendingAudio } = useWAL();
  const { gpsCoords, captureGPS } = useGPS();
  const { isRecording, isPaused: isAudioPaused, toggleAudio, stopRecording, discardAudio, saveAudioForResponse } = useAudioRecorder();

  const {
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
    isFullForm,
    toggleFullForm,
    isSectionComplete,
    validateCurrentSection,
    nextSection,
    prevSection,
    cachedTemplatesMap,
    refreshCachedTemplatesMap,
    downloadSurveyForOffline,
    downloadProjectSurveysForOffline,
  } = useSurvey();

  const isLoading = ref(true);
  const loadingSurveyId = ref("");
  const downloadingSurveyId = ref("");

  async function handleDownloadSurvey(surveyId) {
    if (!surveyId) return;
    downloadingSurveyId.value = surveyId;
    try {
      await downloadSurveyForOffline(surveyId);
    } catch (e) {
      console.warn("Failed downloading survey offline:", e);
    } finally {
      downloadingSurveyId.value = "";
    }
  }

  async function handleDownloadProjectSurveys(projectId) {
    if (!projectId) return;
    try {
      await downloadProjectSurveysForOffline(projectId);
    } catch (e) {
      console.warn("Failed downloading project surveys:", e);
    }
  }

  const showWALDrawer = ref(false);
  const searchQuery = ref("");
  const selectedWorkspace = ref("ALL");

  const selectedProject = ref("ALL");
  if (typeof localStorage !== "undefined") {
    const savedProj = localStorage.getItem("omniquery_selected_project");
    if (savedProj) selectedProject.value = savedProj;
  }

  const activeProjectId = ref("");

  const isGuest = computed(() => {
    if (typeof window === "undefined") return true;
    const user = (window.frappe && (window.frappe.user || (window.frappe.session && window.frappe.session.user))) || "Guest";
    return user === "Guest";
  });

  function getRouteProjectId() {
    if (window.frappe && window.frappe.initial_project_id) {
      return window.frappe.initial_project_id;
    }
    const path = (window.location && window.location.pathname) || "";
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[0] === "omniquery" && parts[1] === "project") {
      return decodeURIComponent(parts[2]);
    }
    return "";
  }

  const activeProjectTitle = computed(() => {
    if (!activeProjectId.value) return "";
    const match = availableTemplates.value.find(
      (t) =>
        t.project === activeProjectId.value ||
        t.project_name === activeProjectId.value ||
        t.name === activeProjectId.value
    );
    return match?.project_name || activeProjectId.value;
  });

  function openProjectPage(projectIdOrData) {
    const pId =
      typeof projectIdOrData === "string"
        ? projectIdOrData
        : projectIdOrData?.name || projectIdOrData?.id || projectIdOrData?.project_name || selectedProject.value;
    activeProjectId.value = pId;
    activeTemplate.value = null;
    if (window.history && window.history.pushState) {
      window.history.pushState({ type: "project", projectId: pId }, "", `/omniquery/project/${encodeURIComponent(pId)}`);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function closeProjectPage() {
    activeProjectId.value = "";
    if (window.history && window.history.pushState) {
      window.history.pushState({}, "", "/omniquery");
    }
  }

  const showFilledFormsModal = ref(false);
  const filledFormsInitialFilter = ref("all");

  function openFilteredFilledForms(filter = "all") {
    filledFormsInitialFilter.value = filter;
    showFilledFormsModal.value = true;
  }

  function handleResumeDraftFromModal(templateName, draftId) {
    showFilledFormsModal.value = false;
    selectSurvey(templateName, { draftId });
  }

  const submittedResponseId = ref("");
  const submittedTimestamp = ref("");
  const hasCopiedCode = ref(false);
  const isSubmissionSynced = ref(false);
  const isSyncingSubmission = ref(false);

  async function handleSyncSubmittedNow() {
    if (isSyncingSubmission.value || !isOnline.value) return;
    isSyncingSubmission.value = true;
    try {
      const res = await syncWAL();
      if (res && res.syncedCount > 0) {
        isSubmissionSynced.value = true;
        if (window.frappe && window.frappe.show_alert) {
          window.frappe.show_alert({ message: __("Survey synced to server successfully!"), indicator: "green" });
        }
      }
    } catch (e) {
    } finally {
      isSyncingSubmission.value = false;
    }
  }

  function copyResponseCode() {
    if (!submittedResponseId.value) return;
    try {
      if (window.frappe && window.frappe.utils && window.frappe.utils.copy_to_clipboard) {
        window.frappe.utils.copy_to_clipboard(submittedResponseId.value);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(submittedResponseId.value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = submittedResponseId.value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      hasCopiedCode.value = true;
      if (window.frappe && window.frappe.show_alert) {
        window.frappe.show_alert({ message: __("Response Code copied to clipboard"), indicator: "green" });
      }
      setTimeout(() => {
        hasCopiedCode.value = false;
      }, 2000);
    } catch (e) {}
  }

  async function restoreSubmittedResponseId() {
    if (submittedResponseId.value) return;
    try {
      const tmplName = activeTemplate.value?.name || activeTemplate.value?.template_name;
      if (!tmplName) return;
      const latest = await db.responses
        .where("template_name")
        .equals(tmplName)
        .reverse()
        .sortBy("updated_at");
      if (latest && latest.length > 0) {
        submittedResponseId.value = latest[0].response_uid;
        submittedTimestamp.value = new Date(latest[0].updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
  }

  watch(isSubmitted, (val) => {
    if (val) {
      restoreSubmittedResponseId();
    }
  });

  const progressPercent = computed(() => {
    if (!activeTemplate.value) return 0;
    const questions = activeTemplate.value.questions || [];
    if (!questions.length) return 0;
    let filled = 0;
    for (const q of questions) {
      const val = responses.value[q.question_code];
      if (val !== undefined && val !== null && String(val).trim() !== "") filled++;
    }
    return Math.round((filled / questions.length) * 100);
  });

  const workspacesList = computed(() => {
    const map = new Map();
    for (const t of availableTemplates.value) {
      const id = t.workspace || "default";
      const title = t.workspace_title || t.workspace || "General";
      if (!map.has(id)) map.set(id, { id, title });
    }
    return Array.from(map.values());
  });

  function getRouteSurveyId() {
    if (window.frappe && window.frappe.initial_survey_id) {
      return window.frappe.initial_survey_id;
    }
    const path = (window.location && window.location.pathname) || "";
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "omniquery") {
      if (parts[1] === "project") return "";
      return decodeURIComponent(parts[1]);
    }
    return "";
  }

  async function init() {
    isLoading.value = true;
    await loadAvailableTemplates();
    const initialProjectId = getRouteProjectId();
    const initialSurveyId = getRouteSurveyId();
    if (initialProjectId) {
      activeProjectId.value = initialProjectId;
    } else if (initialSurveyId) {
      await loadTemplate(initialSurveyId);
    }
    isLoading.value = false;
  }

  watch(activeTemplate, (tmpl) => {
    if (!tmpl) return;
    autoAdvance.value = tmpl.auto_advance !== false;
    if (tmpl.presentation_mode === "One-by-One Focus Popup") {
      isFocusMode.value = true;
      focusQuestionIndex.value = 0;
    }
    announce(`${__('Loaded survey')}: ${tmpl.title || tmpl.name}`);
  });

  watch(activeSectionIndex, (idx) => {
    if (activeSection.value && sections.value.length > 0) {
      const title = activeSection.value.section_title || activeSection.value.section_code || "";
      announce(`${__('Section')} ${idx + 1} ${__('of')} ${sections.value.length}: ${title}`);
    }
  });

  function isMatrixQuestion(q) {
    if (!q) return false;
    const type = (q.field_type || "").toLowerCase();
    const code = (q.question_code || "").toLowerCase();
    return (
      type === "dynamic grid" ||
      type === "table" ||
      type === "matrix" ||
      code.includes("turnover") ||
      code.includes("involvement") ||
      code.includes("capital_sources") ||
      Boolean(q.columns_schema_json) ||
      Boolean(q.matrix_schema)
    );
  }

  const displayQuestionItems = computed(() => {
    const questions = activeQuestions.value || [];
    const items = [];
    let i = 0;
    while (i < questions.length) {
      const q = questions[i];
      const label = q.label_en || q.label || "";
      const type = q.field_type || "";

      if (type === "Dynamic Grid" || type === "Table") {
        const groupQuestions = [];
        let j = i + 1;
        while (j < questions.length) {
          const nextQ = questions[j];
          const nextLabel = nextQ.label_en || nextQ.label || "";
          if (/^[a-z][.\s]\s*/i.test(nextLabel)) {
            nextQ._parentTitle = label;
            nextQ._parentDescription = q.description || "";
            nextQ._parentCode = q.question_code;
            groupQuestions.push(nextQ);
            j++;
          } else {
            break;
          }
        }
        if (groupQuestions.length > 0) {
          items.push({
            type: "group",
            group_code: q.question_code,
            number: "GRID",
            title: label,
            description: q.description || "",
            questions: groupQuestions,
          });
          i = j;
          continue;
        }

        items.push({
          type: "matrix",
          question: q,
        });
        i++;
        continue;
      }

      if (isMatrixQuestion(q)) {
        items.push({
          type: "matrix",
          question: q,
        });
        i++;
        continue;
      }

      const qSubMatch = label.match(/^(Q\d+)([a-z])\.\s*(.*)$/i);
      if (qSubMatch) {
        const baseNum = qSubMatch[1];
        const groupQuestions = [q];
        let j = i + 1;
        while (j < questions.length) {
          const nextQ = questions[j];
          const nextLabel = nextQ.label_en || nextQ.label || "";
          const nextMatch = nextLabel.match(/^(Q\d+)([a-z])\.\s*(.*)$/i);
          if (nextMatch && nextMatch[1].toLowerCase() === baseNum.toLowerCase()) {
            groupQuestions.push(nextQ);
            j++;
          } else {
            break;
          }
        }
        if (groupQuestions.length > 1) {
          let groupTitle = `${baseNum}. Household & Member Demographics`;
          if (baseNum.toUpperCase() === "Q6" && q.section_code === "SEC_B") {
            groupTitle = `${baseNum}. Family Demographics & Member Breakdown`;
          }
          items.push({
            type: "group",
            group_code: `group_${baseNum}`,
            number: baseNum,
            title: groupTitle,
            description: "Member count breakdown by demographic category",
            questions: groupQuestions,
          });
          i = j;
          continue;
        }
      }

      if (/^[a-z]\.\s+/i.test(label)) {
        const groupQuestions = [q];
        let j = i + 1;
        while (j < questions.length) {
          const nextQ = questions[j];
          const nextLabel = nextQ.label_en || nextQ.label || "";
          if (/^[a-z]\.\s+/i.test(nextLabel)) {
            groupQuestions.push(nextQ);
            j++;
          } else {
            break;
          }
        }
        if (groupQuestions.length > 1) {
          let groupTitle = "Breakdown Table";
          const prevItem = items[items.length - 1];
          if (prevItem && prevItem.question) {
            const prevLabel = prevItem.question.label_en || prevItem.question.label || "";
            groupTitle = `${prevLabel} (Details & Share)`;
          }
          items.push({
            type: "group",
            group_code: `group_${q.question_code}`,
            number: "TABLE",
            title: groupTitle,
            description: "",
            questions: groupQuestions,
          });
          i = j;
          continue;
        }
      }

      items.push({
        type: "single",
        question: q,
      });
      i++;
    }
    return items;
  });

  function onGroupResponseUpdate(code, value) {
    responses.value[code] = value;
  }

  function toggleFocusMode() {
    if (isFocusMode.value) {
      isFocusMode.value = false;
    } else {
      openFocusMode();
    }
  }

  function openFocusMode() {
    const firstUnanswered = activeQuestions.value.findIndex(
      (q) => !responses.value[q.question_code]
    );
    focusQuestionIndex.value = firstUnanswered >= 0 ? firstUnanswered : 0;
    isFocusMode.value = true;
  }

  function onQuestionAnswered(currentQuestion) {
    if (!autoAdvance.value) return;
    const qCode = currentQuestion ? (currentQuestion.question_code || currentQuestion.code) : null;
    if (!qCode) return;
    const currentIdx = activeQuestions.value.findIndex(
      (q) => q.question_code === qCode
    );
    if (currentIdx >= 0 && currentIdx < activeQuestions.value.length - 1) {
      const nextQ = activeQuestions.value[currentIdx + 1];
      scrollAndHighlightQuestion(nextQ.question_code);
    }
  }

  function scrollAndHighlightQuestion(code) {
    setTimeout(() => {
      const el = document.getElementById("qc_" + code);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const searchInput = el.querySelector("input[data-search-input]");
      const target = searchInput || el.querySelector("input:not([type=hidden]):not([disabled]), select, textarea, button[role='radio'][aria-checked='true'], button[role='checkbox'][aria-checked='true'], button[role='radio'], button[role='checkbox'], [role='combobox'], [tabindex='0']");
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    }, 100);
  }

  function onFocusModeUpdateResponse(code, value) {
    responses.value[code] = value;
  }

  function onFocusModeFinishSection() {
    if (activeSectionIndex.value < sections.value.length - 1) {
      nextSection();
      focusQuestionIndex.value = 0;
    } else {
      isFocusMode.value = false;
    }
  }

  function onExit() {
    if (isGuest.value) {
      showExitDialog.value = true;
    } else if (activeTemplate.value) {
      showExitDialog.value = true;
    } else if (activeProjectId.value) {
      closeProjectPage();
    } else {
      goHome();
    }
  }

  function onHome() {
    if (isGuest.value) {
      showExitDialog.value = true;
    } else if (activeTemplate.value) {
      showExitDialog.value = true;
    } else {
      goHome();
    }
  }

  function confirmExit() {
    showExitDialog.value = false;
    if (isGuest.value) {
      window.location.href = "/login?redirect-to=/omniquery";
      return;
    }
    goHome();
  }

  let draftSyncTimer = null;
  const isSyncingDraft = ref(false);

  async function syncDraftToServer() {
    if (!isOnline.value || !activeTemplate.value || !currentDraftId.value || isSubmitted.value) return;

    const qList = (activeTemplate.value && activeTemplate.value.questions) || [];
    const items = Object.entries(responses.value)
      .filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "")
      .map(([code, val]) => {
        const q = qList.find((item) => item.question_code === code);
        return {
          question_code: code,
          question_label: q ? (q.label_en || q.label || code) : code,
          value: val,
        };
      });

    if (items.length === 0) return;

    const tmplName = activeTemplate.value.name || activeTemplate.value.template_name;
    const draftPayload = {
      idempotency_key: currentDraftId.value,
      survey_template: tmplName,
      template_version: activeTemplate.value.version || 1,
      respondent: responses.value.respondent_name || responses.value.entrepreneur_name || "",
      surveyor: (window.frappe && window.frappe.session && window.frappe.session.user) || "Administrator",
      captured_at_local: new Date().toISOString(),
      gps_latitude: gpsCoords.value?.latitude || null,
      gps_longitude: gpsCoords.value?.longitude || null,
      gps_accuracy: gpsCoords.value?.accuracy || null,
      items: items,
    };

    try {
      isSyncingDraft.value = true;
      const res = await call("omniquery.api.sync.sync_draft", {
        draft: draftPayload,
      });
      if (res) {
        try {
          await db.responses.update(currentDraftId.value, { synced: true });
        } catch (e) {}
      }
    } catch (e) {
      console.warn("In-flight draft sync non-critical warning:", e);
    } finally {
      isSyncingDraft.value = false;
    }
  }

  function scheduleDraftSaveAndSync() {
    if (!activeTemplate.value || isSubmitted.value) return;
    saveDraftLocally(progressPercent.value);
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    draftSyncTimer = setTimeout(() => {
      syncDraftToServer();
    }, 1200);
  }

  watch(
    responses,
    () => {
      scheduleDraftSaveAndSync();
    },
    { deep: true }
  );

  function onDiscardDraft(templateName) {
    draftToDiscard.value = templateName;
  }

  async function confirmDiscardDraft() {
    if (draftToDiscard.value) {
      await discardDraft(draftToDiscard.value);
      draftToDiscard.value = null;
    }
  }

  async function goHome() {
    if (isGuest.value) {
      window.location.href = "/login?redirect-to=/omniquery";
      return;
    }
    if (!isSubmitted.value && activeTemplate.value) {
      scheduleDraftSaveAndSync();
    } else {
      if (draftSyncTimer) clearTimeout(draftSyncTimer);
    }
    activeTemplate.value = null;
    activeProjectId.value = "";
    activeSectionIndex.value = 0;
    isSubmitted.value = false;
    isSubmissionSynced.value = false;
    currentDraftId.value = "";
    responses.value = {};
    if (window.history && window.history.pushState) {
      window.history.pushState({}, "", "/omniquery");
    }
    await loadAvailableTemplates();
  }

  async function selectSurvey(surveyName, options = {}) {
    activeProjectId.value = "";
    loadingSurveyId.value = surveyName;
    const tmpl = await loadTemplate(surveyName, options);
    loadingSurveyId.value = "";
    if (!tmpl) {
      if (window.frappe && window.frappe.show_alert) {
        window.frappe.show_alert({
          message: __("This survey is not yet downloaded on your device. Please connect to the internet once to download it."),
          indicator: "orange",
        });
      } else {
        console.warn(__("This survey is not yet downloaded on your device. Please connect to the internet once to download it."));
      }
      return;
    }
    if (window.history && window.history.pushState) {
      window.history.pushState({ type: "survey", surveyName }, "", `/omniquery/${encodeURIComponent(surveyName)}`);
    }
  }

  async function saveOfflineRecord() {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    const qList = (activeTemplate.value && activeTemplate.value.questions) || [];
    const items = Object.entries(responses.value)
      .filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "")
      .map(([code, val]) => {
        const q = qList.find((item) => item.question_code === code);
        return {
          question_code: code,
          question_label: q ? (q.label_en || q.label || code) : code,
          value: val,
        };
      });

    const tmplName = activeTemplate.value.name || activeTemplate.value.template_name;
    const draftKey = currentDraftId.value || generateSurveyId(tmplName);
    submittedResponseId.value = draftKey;
    submittedTimestamp.value = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const payload = {
      idempotency_key: draftKey,
      survey_template: tmplName,
      template_version: activeTemplate.value.version || 1,
      respondent: responses.value.respondent_name || responses.value.entrepreneur_name || "",
      surveyor: (window.frappe && (window.frappe.user || (window.frappe.session && window.frappe.session.user))) || "Administrator",
      captured_at_local: new Date().toISOString(),
      gps_latitude: gpsCoords.value?.latitude || null,
      gps_longitude: gpsCoords.value?.longitude || null,
      gps_accuracy: gpsCoords.value?.accuracy || null,
      items: items,
    };

    try {
      await db.responses.put({
        response_uid: draftKey,
        template_name: tmplName,
        title: activeTemplate.value.title || tmplName,
        response_title_format: activeTemplate.value.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
        responses: JSON.parse(JSON.stringify(responses.value)),
        active_section_index: activeSectionIndex.value,
        progress_percent: 100,
        status: "Submitted",
        updated_at: new Date().toISOString(),
        synced: false,
      });
      await loadActiveDrafts();
    } catch (e) {}

    await queueWAL("OmniQuery Response", payload, false);
    if (isOnline.value) {
      const res = await syncWAL();
      if (res && res.syncedCount > 0) {
        isSubmissionSynced.value = true;
        try {
          await syncPendingAudio(draftKey);
        } catch (audioSyncErr) {}
        if (window.frappe && window.frappe.show_alert) {
          window.frappe.show_alert({ message: __("Survey synced to server successfully!"), indicator: "green" });
        }
      } else {
        isSubmissionSynced.value = false;
      }
    } else {
      isSubmissionSynced.value = false;
    }
  }

  function scrollToFirstPendingQuestion() {
    const firstPending = activeQuestions.value.find((q) => {
      if (validationErrors.value[q.question_code]) return true;
      if (!q.is_mandatory) return false;
      const val = responses.value[q.question_code];
      return val === undefined || val === null || String(val).trim() === "";
    });
    if (firstPending) {
      const groupItem = displayQuestionItems.value.find(
        (item) => item.type === "group" && item.questions.some((q) => q.question_code === firstPending.question_code)
      );
      const targetCode = groupItem ? groupItem.group_code : firstPending.question_code;
      scrollAndHighlightQuestion(targetCode);
    }
  }

  function handlePrevSection() {
    scheduleDraftSaveAndSync();
    prevSection();
  }

  function handleNextSection() {
    scheduleDraftSaveAndSync();
    const ok = nextSection();
    if (!ok) {
      scrollToFirstPendingQuestion();
    }
  }

  async function submitForm() {
    if (!validateCurrentSection()) {
      scrollToFirstPendingQuestion();
      return;
    }
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    isSubmitting.value = true;

    const tmplName = activeTemplate.value?.name || activeTemplate.value?.template_name || "";
    const draftKey = currentDraftId.value || generateSurveyId(tmplName);

    try {
      const recordedBlob = await stopRecording();
      if (recordedBlob && recordedBlob.size > 0) {
        await saveAudioForResponse(draftKey, recordedBlob);
      }
    } catch (audioErr) {
      console.warn("Failed saving audio recording:", audioErr);
    }

    await saveOfflineRecord();
    isSubmitting.value = false;
    isSubmitted.value = true;
  }

  function resetSurvey() {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    discardAudio();
    responses.value = {};
    activeSectionIndex.value = 0;
    isSubmitted.value = false;
    isSubmissionSynced.value = false;
    submittedResponseId.value = "";
    hasCopiedCode.value = false;
    currentDraftId.value = generateSurveyId(activeTemplate.value?.name || activeTemplate.value?.template_name || "");
  }

  async function triggerSync() {
    await forceSyncAll();
    await loadActiveDrafts();
  }

  onMounted(() => {
    init();
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", async () => {
        const projId = getRouteProjectId();
        const survId = getRouteSurveyId();
        if (projId) {
          activeProjectId.value = projId;
          activeTemplate.value = null;
        } else if (survId) {
          activeProjectId.value = "";
          await loadTemplate(survId);
        } else {
          activeProjectId.value = "";
          activeTemplate.value = null;
          await loadAvailableTemplates();
        }
      });
    }
  });

  const headerTitle = computed(() => {
    return activeTemplate.value
      ? activeTemplate.value.title
      : activeProjectId.value
      ? activeProjectTitle.value || __("Project Details")
      : "";
  });

  const omniqueryContext = {
    isOnline,
    pendingWALCount,
    textSize,
    progressPercent,
    isRecording,
    isAudioPaused,
    triggerSync,
  };

  return {
    autoAdvance,
    isFocusMode,
    focusQuestionIndex,
    showExitDialog,
    draftToDiscard,
    liveAnnouncementText,
    announce,
    textSize,
    cycleTextSize,
    setTextSize,
    isOnline,
    pendingWALCount,
    gpsCoords,
    captureGPS,
    isRecording,
    isAudioPaused,
    toggleAudio,
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
    cachedTemplatesMap,
    isLoading,
    loadingSurveyId,
    downloadingSurveyId,
    showWALDrawer,
    searchQuery,
    selectedWorkspace,
    selectedProject,
    activeProjectId,
    isGuest,
    activeProjectTitle,
    headerTitle,
    showFilledFormsModal,
    filledFormsInitialFilter,
    submittedResponseId,
    submittedTimestamp,
    hasCopiedCode,
    isSubmissionSynced,
    isSyncingSubmission,
    progressPercent,
    workspacesList,
    displayQuestionItems,
    isFullForm,
    toggleFullForm,
    isQuestionVisible,
    isSectionComplete,
    handleDownloadSurvey,
    handleDownloadProjectSurveys,
    openProjectPage,
    closeProjectPage,
    openFilteredFilledForms,
    handleResumeDraftFromModal,
    handleSyncSubmittedNow,
    copyResponseCode,
    toggleFocusMode,
    openFocusMode,
    onQuestionAnswered,
    onGroupResponseUpdate,
    onFocusModeUpdateResponse,
    onFocusModeFinishSection,
    onExit,
    onHome,
    confirmExit,
    onDiscardDraft,
    confirmDiscardDraft,
    goHome,
    selectSurvey,
    handlePrevSection,
    handleNextSection,
    submitForm,
    resetSurvey,
    triggerSync,
    omniqueryContext,
    __,
  };
}
