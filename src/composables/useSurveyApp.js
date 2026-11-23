import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, provide, inject, reactive } from "vue";
import { call, toast } from "frappe-ui";
import { useClipboard, usePreferredReducedMotion, watchDebounced } from "@vueuse/core";
import { db, SYNCED, NOT_SYNCED } from "../services/db";
import { useSurvey } from "./useSurvey";
import { useWAL, syncCall } from "./useWAL";
import { useGPS } from "./useGPS";
import { useTextScale } from "./useTextScale";
import { useTranslation } from "./useTranslation";
import { useAudioRecorder } from "./useAudioRecorder";
import { buildResponsePayload, draftStored, isAnswered, responseItems } from "../utils/responsePayload";
import { staleDependentAnswers } from "../utils/cascadingOptions";
import { layoutQuestions } from "../utils/questionLayout";
import { bootRoute, catalogRoute, projectRoute, pushRoute, replaceRoute, routeFromPath, routeFromState, surveyRoute } from "../utils/route";

const LOGIN_URL = "/login?redirect-to=/omniquery";

// exported so component tests can provide a stand-in session or context
export const SURVEY_SESSION = Symbol("surveySession");
export const OMNIQUERY_CONTEXT = Symbol("omniqueryContext");

// App.vue calls this once. Views read the session with useSurveySession(), the header reads the
// shared context with useOmniqueryContext(). reactive() unwraps the refs, so templates read
// s.isLoading as a boolean and s.showWALDrawer = true writes the ref (#46)
export function provideSurveyApp() {
  const app = useSurveyApp();
  provide(OMNIQUERY_CONTEXT, app.omniqueryContext);
  const session = reactive(app);
  provide(SURVEY_SESSION, session);
  return session;
}

function injectOrThrow(key, name) {
  const value = inject(key, null);
  // a missing provider must fail loudly: falling back to "online, 0 pending" would lie offline
  if (!value) throw new Error(`${name} used outside App.vue; call provideSurveyApp() first`);
  return value;
}

export function useSurveySession() {
  return injectOrThrow(SURVEY_SESSION, "useSurveySession");
}

// isOnline, pendingWALCount, textSize, progressPercent, isRecording, isAudioPaused and canRecord, as refs
export function useOmniqueryContext() {
  return injectOrThrow(OMNIQUERY_CONTEXT, "useOmniqueryContext");
}

export function useSurveyApp() {
  const autoAdvance = ref(true);
  const isFocusMode = ref(false);
  const focusQuestionIndex = ref(0);

  const showExitDialog = ref(false);
  const liveAnnouncementText = ref("");

  function announce(message) {
    liveAnnouncementText.value = message;
  }

  const { __, getQuestionLabel, getSectionTitle } = useTranslation();
  const { textSize, cycleTextSize, setTextSize } = useTextScale();
  const { isOnline, pendingWALCount, needsLogin, queueWAL, syncWAL, forceSyncAll, syncPendingAudio } = useWAL();
  const { gpsStatus, gpsReport, captureGPS } = useGPS();
  const { state: audioState, isRecording, isPaused: isAudioPaused, toggleAudio, stopRecording, discardAudio, saveAudioForResponse } = useAudioRecorder();

  const {
    activeTemplate,
    activeSectionIndex,
    availableTemplates,
    isUnassigned,
    sections,
    activeSection,
    activeQuestions,
    sectionGrids,
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
    generateSurveyId,
    isQuestionVisible,
    isFullForm,
    toggleFullForm,
    isSectionComplete,
    validateCurrentSection,
    isRequiredAndMissing,
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
  // lives here, not in Catalog, so the search survives opening a survey and coming back
  const searchQuery = ref("");

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
    pushRoute(projectRoute(pId));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function closeProjectPage() {
    activeProjectId.value = "";
    pushRoute(catalogRoute());
  }

  const showFilledFormsModal = ref(false);
  const filledFormsInitialFilter = ref("all");

  function openFilteredFilledForms(filter = "all") {
    filledFormsInitialFilter.value = filter;
    showFilledFormsModal.value = true;
  }

  // The drawer's button goes away with the drawer, so hand focus back to whatever opened the
  // drawer first: the dialog then returns focus there when it closes (#56)
  let walDrawerOpener = null;
  watch(showWALDrawer, (open) => {
    if (open) walDrawerOpener = document.activeElement;
  });

  function openRecoveryFromWALDrawer() {
    showWALDrawer.value = false;
    walDrawerOpener?.focus?.();
    openFilteredFilledForms("all");
  }

  function handleResumeDraftFromModal(templateName, draftId) {
    showFilledFormsModal.value = false;
    selectSurvey(templateName, { draftId });
  }

  const submittedResponseId = ref("");
  // why the last submit failed, shown over the survey with a Try again
  const submissionError = ref("");
  const submittedTimestamp = ref("");
  // VueUse falls back to execCommand where the Clipboard API is missing or refused
  const { copy: copyText, copied: hasCopiedCode } = useClipboard({ legacy: true, copiedDuring: 2000 });
  const isSubmissionSynced = ref(false);
  const isSyncingSubmission = ref(false);

  async function handleSyncSubmittedNow() {
    if (isSyncingSubmission.value || !isOnline.value) return;
    isSyncingSubmission.value = true;
    try {
      const res = await syncWAL();
      // a pass that finds the interview already sent counts 0, so the response's own row decides
      const row = await db.responses.get(submittedResponseId.value);
      if (res?.syncedCount > 0 || row?.synced === SYNCED) {
        isSubmissionSynced.value = true;
        toast.success(__("Survey synced to server successfully!"));
      } else {
        toast.warning(__("Not uploaded yet. The interview is kept on this device and will be sent later."));
      }
    } catch (e) {
      toast.error(__("Sync failed: {0}", [e.message || e]));
    } finally {
      isSyncingSubmission.value = false;
    }
  }

  async function copyResponseCode() {
    if (!submittedResponseId.value) return;
    try {
      await copyText(submittedResponseId.value);
      toast.success(__("Response code copied"));
    } catch (e) {
      toast.error(__("Could not copy: {0}", [e.message || e]));
    }
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
    } catch (e) {
      console.warn("Could not read the last submitted response:", e);
    }
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
      if (isAnswered(responses.value[q.question_code])) filled++;
    }
    return Math.round((filled / questions.length) * 100);
  });

  // someone in no project with no public survey to fill has no catalog to show (#57)
  const showCatalog = computed(() => !isUnassigned.value || availableTemplates.value.length > 0);

  // Shows a route without adding a history entry: the first page, and Back or Forward (#38)
  async function showRoute(route) {
    if (route.type === "project") {
      activeProjectId.value = route.projectId;
      activeTemplate.value = null;
    } else if (route.type === "survey") {
      activeProjectId.value = "";
      await loadTemplate(route.surveyName);
    } else {
      activeProjectId.value = "";
      activeTemplate.value = null;
      await loadAvailableTemplates();
    }
  }

  async function init() {
    isLoading.value = true;
    await loadAvailableTemplates();
    const route = bootRoute();
    replaceRoute(route); // so Back to this first entry shows it, with the survey name the server resolved
    if (route.type !== "catalog") await showRoute(route);
    isLoading.value = false;
    // after the spinner goes: the survey is not on the page while it shows
    if (route.type === "survey") showSurveyStart();
  }

  watch(activeTemplate, (tmpl, before) => {
    if (!tmpl) return;
    // loadTemplate shows the cached copy and then the server's: that refresh of the open survey keeps
    // the surveyor's place and settings, and is not announced a second time
    if (before && (before.name || before.template_name) === (tmpl.name || tmpl.template_name)) return;
    autoAdvance.value = tmpl.auto_advance !== false;
    if (tmpl.presentation_mode === "One-by-One Focus Popup") {
      isFocusMode.value = true;
      focusQuestionIndex.value = 0;
    }
    announce(`${__('Loaded survey')}: ${tmpl.title || tmpl.name}`);
  });

  // the open section's title as its card shows it, in the surveyor's language (#165)
  const activeSectionTitle = computed(() => getSectionTitle(activeSection.value) || activeSection.value?.section_code || "");

  watch(activeSectionIndex, (idx) => {
    if (activeSection.value && sections.value.length > 0) {
      announce(`${__('Section')} ${idx + 1} ${__('of')} ${sections.value.length}: ${activeSectionTitle.value}`);
    }
  });

  const displayQuestionItems = computed(() => layoutQuestions(activeQuestions.value || [], { __, getQuestionLabel }));

  // the one write path for answers, from plain, grouped, matrix and focus-mode questions alike. It
  // also clears an answer the change made invalid, such as a Block that is not in the new District,
  // whether or not that question is on screen (#24); restoring a draft does not come through here.
  // A changed answer drops its own section error, so a card never shows an error beside a new
  // answer; Next checks the section again (#23).
  function setResponse(code, value) {
    responses.value[code] = value;
    delete validationErrors.value[code];
    const questions = (activeTemplate.value && activeTemplate.value.questions) || [];
    for (const [child, answer] of Object.entries(staleDependentAnswers(questions, responses.value, code))) {
      if (answer === undefined) delete responses.value[child];
      else responses.value[child] = answer;
    }
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
      (q) => !isAnswered(responses.value[q.question_code])
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

  const reducedMotion = usePreferredReducedMotion();

  function scrollAndHighlightQuestion(code) {
    setTimeout(() => {
      const el = document.getElementById("qc_" + code);
      if (!el) return;
      el.scrollIntoView({ behavior: reducedMotion.value === "reduce" ? "auto" : "smooth", block: "start" });
      const searchInput = el.querySelector("input[data-search-input]");
      const target = searchInput || el.querySelector("input:not([type=hidden]):not([disabled]), select, textarea, button[role='radio'][aria-checked='true'], button[role='checkbox'][aria-checked='true'], button[role='radio'], button[role='checkbox'], [role='combobox'], [tabindex='0']");
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    }, 100);
  }

  // Finish on a section's last question passes only a section that passes validation, as Next and
  // Submit on the page do. The watcher below starts a new section at its first question, and the last
  // section returns to the page, where Submit is. When it does not pass, focus mode goes to the first
  // question that still needs the surveyor, where its error shows (#155).
  function onFocusModeFinishSection() {
    const isLast = activeSectionIndex.value >= sections.value.length - 1;
    const passed = isLast ? validateCurrentSection() : nextSection();
    scheduleDraftSaveAndSync();
    if (passed) {
      if (isLast) isFocusMode.value = false;
      return;
    }
    const at = firstPendingIndex();
    if (at >= 0) focusQuestionIndex.value = at;
  }

  // Focus mode shows activeQuestions[focusQuestionIndex]. When that list changes within a section
  // (Full Form toggled, an answer showing or hiding questions) it stays on its question, or else the
  // next one still shown, or the last. A new section or survey starts at its first question, and a
  // move made in the same change stands. A section with nothing to show closes focus mode, so
  // isFocusMode never claims a dialog that shows nothing (#154); with no survey open the mode stays
  // on for the next one. The index is watched with the list so `was` pairs the old list with the old
  // index. Pre-flush, so focus mode never renders a stale index.
  watch([activeQuestions, focusQuestionIndex], ([questions, index], [before, indexBefore]) => {
    if (!isFocusMode.value || !activeTemplate.value) return;
    if (!questions.length) {
      isFocusMode.value = false;
      return;
    }
    const was = before[indexBefore];
    if (index !== indexBefore || (was && questions[index] === was)) return;
    const position = new Map(activeTemplate.value.questions.map((q, i) => [q.question_code, i]));
    const at = was && was.section_code === questions[0].section_code ? position.get(was.question_code) : undefined;
    if (at === undefined) {
      focusQuestionIndex.value = 0;
      return;
    }
    const next = questions.findIndex((q) => position.get(q.question_code) >= at);
    focusQuestionIndex.value = next >= 0 ? next : questions.length - 1;
  });

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

  function signIn() {
    window.location.href = LOGIN_URL;
  }

  function confirmExit() {
    showExitDialog.value = false;
    if (isGuest.value) {
      signIn();
      return;
    }
    goHome();
  }

  let draftSyncTimer = null;
  const isSyncingDraft = ref(false);

  // the survey on screen, or nothing once it is submitted
  function openDraft() {
    if (isSubmitted.value) return {};
    return { template: activeTemplate.value, responses: responses.value, responseId: currentDraftId.value };
  }

  // Sends a draft to the server and marks it synced only when the server stored it. A draft that
  // is not marked stays for syncAllDrafts to send when the device is next online.
  async function syncDraftToServer(draft = openDraft()) {
    const { template, responses: answers, responseId } = draft;
    if (!isOnline.value || !template || !responseId) return false;
    const payload = buildResponsePayload({ template, responses: answers, responseId, gps: gpsReport.value });
    if (payload.items.length === 0) return false;

    try {
      isSyncingDraft.value = true;
      const res = await syncCall("omniquery.api.sync.sync_draft", { draft: payload });
      if (!draftStored(res)) {
        console.warn("Draft not stored on the server:", res);
        return false;
      }
      await db.responses.update(responseId, { synced: SYNCED });
      return true;
    } catch (e) {
      console.warn("In-flight draft sync non-critical warning:", e);
      return false;
    } finally {
      isSyncingDraft.value = false;
    }
  }

  function scheduleDraftSaveAndSync() {
    // a debounced save landing mid-submit would write the submitted interview back as a draft
    if (!activeTemplate.value || isSubmitted.value || isSubmitting.value) return;
    saveDraftLocally(progressPercent.value);
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    draftSyncTimer = setTimeout(() => {
      syncDraftToServer();
    }, 1200);
  }

  // Typing saves once the surveyor pauses, not on every key (#34). Leaving, changing section and
  // submitting save straight away, so the pause never loses an answer.
  watchDebounced(responses, scheduleDraftSaveAndSync, { debounce: 300, deep: true });

  async function goHome() {
    if (isGuest.value) {
      signIn();
      return;
    }
    if (draftSyncTimer) {
      clearTimeout(draftSyncTimer);
      draftSyncTimer = null;
    }
    // Take the survey being left before the reset below empties it; a debounced sync would read
    // the emptied state, so the last answers never reached the server (#35).
    const leaving = openDraft();
    let leavingSync = null;
    if (leaving.template) {
      await saveDraftLocally(progressPercent.value);
      // saving gives a draft that had no id its id
      leavingSync = syncDraftToServer({ ...leaving, responseId: currentDraftId.value });
    }
    activeTemplate.value = null;
    activeProjectId.value = "";
    activeSectionIndex.value = 0;
    isSubmitted.value = false;
    submissionError.value = "";
    isSubmissionSynced.value = false;
    currentDraftId.value = "";
    responses.value = {};
    pushRoute(catalogRoute());
    await Promise.all([loadAvailableTemplates(), leavingSync]);
  }

  async function selectSurvey(surveyName, options = {}) {
    activeProjectId.value = "";
    loadingSurveyId.value = surveyName;
    const tmpl = await loadTemplate(surveyName, options);
    loadingSurveyId.value = "";
    if (!tmpl) {
      toast.warning(__("This survey is not yet downloaded on your device. Please connect to the internet once to download it."));
      return;
    }
    pushRoute(surveyRoute(surveyName));
    showSurveyStart();
  }

  // Where a surveyor lands on a survey they open, by Start, Resume, a link or Back/Forward (#20):
  // at the top of the page, not the catalog's scroll position. A resumed draft puts focus on its
  // first required question still unanswered; a new survey, or a draft with nothing left to
  // answer here, on the section heading. A one-by-one survey's focus-mode dialog keeps focus in
  // itself. Call it straight after the survey loads: the answers are then only the draft's,
  // before any question card fills in its own.
  async function showSurveyStart() {
    const resumed = responseItems(responses.value).length > 0;
    await nextTick();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const pendingCode = resumed && firstPendingCardCode();
    if (pendingCode) scrollAndHighlightQuestion(pendingCode);
    else document.getElementById("section_heading")?.focus({ preventScroll: true });
  }

  async function saveOfflineRecord() {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    const tmplName = activeTemplate.value.name || activeTemplate.value.template_name;
    const draftKey = currentDraftId.value || generateSurveyId();
    submittedResponseId.value = draftKey;
    submittedTimestamp.value = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const payload = buildResponsePayload({
      template: activeTemplate.value,
      responses: responses.value,
      responseId: draftKey,
      gps: gpsReport.value,
    });

    try {
      // created_at is the draft's own when there was one: db.js keeps it
      await db.responses.put({
        response_uid: draftKey,
        template_name: tmplName,
        title: activeTemplate.value.title || tmplName,
        response_title_format: activeTemplate.value.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
        responses: JSON.parse(JSON.stringify(responses.value)),
        active_section_index: activeSectionIndex.value,
        progress_percent: 100,
        status: "Submitted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: NOT_SYNCED,
      });
      await loadActiveDrafts();
    } catch (e) {
      // the queue entry below still carries the interview
      console.warn("Failed to save the submitted response locally:", e);
    }

    // throws when the queue cannot be written: submitForm then keeps the survey open (#32)
    await queueWAL("OmniQuery Response", payload, false);
    if (isOnline.value) {
      const res = await syncWAL();
      if (res && res.syncedCount > 0) {
        isSubmissionSynced.value = true;
        // syncPendingAudio logs its own failures and leaves the audio queued
        await syncPendingAudio(draftKey);
        toast.success(__("Survey synced to server successfully!"));
      } else {
        isSubmissionSynced.value = false;
      }
    } else {
      isSubmissionSynced.value = false;
    }
  }

  // Where in the section the first question that still needs the surveyor is: one with a validation
  // error, or one isRequiredAndMissing, which also finds it on a resumed draft before any validation.
  function firstPendingIndex() {
    return activeQuestions.value.findIndex(
      (q) => Boolean(validationErrors.value[q.question_code]) || isRequiredAndMissing(q)
    );
  }

  // The card of that question on the page. A grouped question's card is its group's.
  function firstPendingCardCode() {
    const firstPending = activeQuestions.value[firstPendingIndex()];
    if (!firstPending) return null;
    const groupItem = displayQuestionItems.value.find(
      (item) => item.type === "group" && item.questions.some((q) => q.question_code === firstPending.question_code)
    );
    return groupItem ? groupItem.group_code : firstPending.question_code;
  }

  function scrollToFirstPendingQuestion() {
    const code = firstPendingCardCode();
    if (code) scrollAndHighlightQuestion(code);
  }

  // The draft is saved after the move: the save reads the section index as it starts, and a draft
  // saved before it would reopen on the section the surveyor has left (#155).
  function handlePrevSection() {
    prevSection();
    scheduleDraftSaveAndSync();
  }

  function handleNextSection() {
    const ok = nextSection();
    scheduleDraftSaveAndSync();
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
    submissionError.value = "";

    const draftKey = currentDraftId.value || generateSurveyId();

    try {
      const recordedBlob = await stopRecording();
      if (recordedBlob && recordedBlob.size > 0) {
        await saveAudioForResponse(draftKey, recordedBlob);
      }
    } catch (audioErr) {
      console.warn("Failed saving audio recording:", audioErr);
    }

    // A submit the device could not store stays on screen with its answers and a Try again, instead
    // of a success screen for an interview that was never queued, or a spinner that never stops (#32)
    try {
      await saveOfflineRecord();
      isSubmitted.value = true;
    } catch (err) {
      console.error("Failed to submit survey:", err);
      submissionError.value = __("The interview could not be saved on this device. Storage may be full. Please try again.");
    } finally {
      isSubmitting.value = false;
    }
  }

  function resetSurvey() {
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    discardAudio();
    responses.value = {};
    activeSectionIndex.value = 0;
    isSubmitted.value = false;
    submissionError.value = "";
    isSubmissionSynced.value = false;
    submittedResponseId.value = "";
    hasCopiedCode.value = false;
    currentDraftId.value = generateSurveyId();
  }

  // The microphone records for the draft being filled, and only while one is: not on the project
  // page or the success screen (#37)
  const canRecord = computed(() => Boolean(activeTemplate.value) && !isSubmitted.value);
  const recordingDraftId = computed(() => (canRecord.value ? currentDraftId.value || "" : ""));

  // Leaving the draft by any route (Home, Back, another survey, a resumed draft, submitting) releases
  // the microphone, and what was recorded stays with the draft it was recorded for. Submitting has
  // already saved its recording by then, so stopRecording() finds nothing to keep.
  watch(recordingDraftId, async (_, leftDraftId) => {
    const blob = await stopRecording();
    if (blob && leftDraftId) await saveAudioForResponse(leftDraftId, blob);
  });

  // What the microphone alert says for each failure; null when there is nothing to say
  const MICROPHONE_ALERTS = {
    denied: ["Microphone access is blocked", "Allow microphone access for this site in your browser settings, then tap the microphone again."],
    unsupported: ["Recording is not available", "This browser cannot record audio. The survey still saves without a recording."],
    "no-device": ["No microphone found", "Connect a microphone, then tap the microphone again."],
    error: ["Could not start the microphone", "Another app may be using it. Close that app, then tap the microphone again."],
  };
  const microphoneAlert = computed(() => {
    const alert = canRecord.value && MICROPHONE_ALERTS[audioState.value];
    return alert ? { title: __(alert[0]), description: __(alert[1]) } : null;
  });

  // Why the location was not recorded; the interview still saves without one (#27)
  const GPS_ALERTS = {
    denied: ["Location access is blocked", "Allow location access for this site in your browser settings, then tap Retry GPS."],
    unavailable: ["Location unavailable", "Turn on location on this device, then tap Retry GPS."],
    timeout: ["Location timed out", "Move to an open spot or near a window, then tap Retry GPS."],
    unsupported: ["Location is not supported", "This browser cannot share a location. The interview still saves without one."],
  };
  const gpsAlert = computed(() => {
    const alert = GPS_ALERTS[gpsStatus.value];
    return alert ? { title: __(alert[0]), description: __(alert[1]) } : null;
  });

  // Queued interviews wait while the session is gone; a guest's queue is not theirs to sign in for (#33)
  const sessionAlert = computed(() => {
    if (!needsLogin.value || isGuest.value) return null;
    const count = pendingWALCount.value;
    return {
      title: __("Session expired"),
      description: count === 1 ? __("Sign in again to upload 1 interview") : __("Sign in again to upload {0} interviews", [count]),
    };
  });

  async function triggerSync() {
    await forceSyncAll();
    await loadActiveDrafts();
  }

  // The entry's own route; one with none (a link from outside the app) is read from its path
  const onPopState = async (event) => {
    const route = routeFromState(event.state) || routeFromPath(window.location.pathname);
    await showRoute(route);
    if (route.type === "survey") showSurveyStart();
  };

  onMounted(() => {
    init();
    window.addEventListener("popstate", onPopState);
  });
  onBeforeUnmount(() => window.removeEventListener("popstate", onPopState));

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
    canRecord,
    triggerSync,
  };

  return {
    autoAdvance,
    isFocusMode,
    focusQuestionIndex,
    showExitDialog,
    liveAnnouncementText,
    textSize,
    cycleTextSize,
    setTextSize,
    isOnline,
    pendingWALCount,
    captureGPS,
    gpsAlert,
    isRecording,
    isAudioPaused,
    toggleAudio,
    microphoneAlert,
    dismissMicrophoneAlert: discardAudio,
    sessionAlert,
    signIn,
    submissionError,
    activeTemplate,
    activeSectionIndex,
    availableTemplates,
    isUnassigned,
    showCatalog,
    sections,
    activeSection,
    activeSectionTitle,
    activeQuestions,
    sectionGrids,
    responses,
    validationErrors,
    isSubmitting,
    isSubmitted,
    currentDraftId,
    activeDrafts,
    allDrafts,
    loadActiveDrafts,
    cachedTemplatesMap,
    isLoading,
    loadingSurveyId,
    downloadingSurveyId,
    showWALDrawer,
    searchQuery,
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
    openRecoveryFromWALDrawer,
    handleResumeDraftFromModal,
    handleSyncSubmittedNow,
    copyResponseCode,
    toggleFocusMode,
    openFocusMode,
    onQuestionAnswered,
    setResponse,
    onFocusModeFinishSection,
    onExit,
    onHome,
    confirmExit,
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
