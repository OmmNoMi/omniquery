<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
    <!-- 1. Sleek Native Mobile Header with Official OmniQuery Cloud Brand -->
    <CompactHeader
      :surveyTitle="activeTemplate ? activeTemplate.title : ''"
      :showBack="Boolean(activeTemplate)"
      :isOnline="isOnline"
      :pendingWALCount="pendingWALCount"
      :textSize="textSize"
      :progressPercent="progressPercent"
      :isRecording="isRecording"
      :isAudioPaused="isAudioPaused"
      @exit="onExit"
      @home="onHome"
      @open-wal="showWALDrawer = true"
      @cycle-text-size="cycleTextSize"
      @set-text-size="setTextSize"
      @toggle-audio="toggleAudio"
    />

    <!-- 2. Main View Container -->
    <main :class="['flex-1 max-w-2xl w-full mx-auto p-4', activeSection ? 'pb-0' : 'pb-24']">
      <!-- Loading State Spinner -->
      <div v-if="isLoading" class="p-16 text-center text-slate-500">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
        <p class="text-sm font-bold text-slate-700">{{ __('Loading...') || 'Loading...' }}</p>
      </div>

      <!-- Submitted Success Card -->
      <div v-else-if="isSubmitted" class="p-8 text-center bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-4">
        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
          ✓
        </div>
        <h2 class="text-xl font-extrabold text-slate-900">{{ __('Survey Submitted') }}</h2>
        <p class="text-sm text-slate-600 max-w-md mx-auto">{{ __('Response recorded successfully in offline queue.') }}</p>
        <div class="flex justify-center gap-3 pt-2">
          <button
            type="button"
            @click="resetSurvey"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-95 transition shadow-xs"
          >
            {{ __('New Response') || 'New Response' }}
          </button>
          <button
            type="button"
            @click="goHome"
            class="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-sm hover:bg-slate-50 active:scale-95 transition"
          >
            {{ __('All Surveys') || 'All Surveys' }}
          </button>
        </div>
      </div>

      <!-- Active Section View inside Survey -->
      <div v-else-if="activeSection">
        <SectionCard
          :section="activeSection"
          :currentIndex="activeSectionIndex"
          :totalSections="sections.length"
          :isComplete="isSectionComplete(activeSection)"
          :isSubmitting="isSubmitting"
          :autoAdvance="autoAdvance"
          :isFullForm="isFullForm"
          :isFocusMode="isFocusMode"
          :isRecording="isRecording"
          :isAudioPaused="isAudioPaused"
          @open-focus-mode="openFocusMode"
          @toggle-focus-mode="toggleFocusMode"
          @toggle-auto-advance="autoAdvance = !autoAdvance"
          @toggle-full-form="toggleFullForm"
          @toggle-audio="toggleAudio"
          @prev="handlePrevSection"
          @next="handleNextSection"
          @submit="submitForm"
        >
          <template v-for="item in displayQuestionItems" :key="item.type === 'group' ? item.group_code : (item.type === 'matrix' ? 'matrix_' + item.question.question_code : item.question.question_code)">
            <GroupedQuestionCard
              v-if="item.type === 'group'"
              :group="item"
              :responses="responses"
              :validationErrors="validationErrors"
              :notApplicable="item.questions && item.questions.every(q => !isQuestionVisible(q))"
              @update-response="onGroupResponseUpdate"
              @answered="onQuestionAnswered"
            />
            <MatrixQuestionCard
              v-else-if="item.type === 'matrix'"
              :id="'qc_' + item.question.question_code"
              :question="item.question"
              v-model="responses[item.question.question_code]"
              :errorMessage="validationErrors[item.question.question_code]"
              :notApplicable="!isQuestionVisible(item.question)"
              @answered="onQuestionAnswered(item.question)"
              @next="onQuestionAnswered(item.question)"
            />
            <QuestionCard
              v-else
              :id="'qc_' + item.question.question_code"
              :question="item.question"
              v-model="responses[item.question.question_code]"
              :errorMessage="validationErrors[item.question.question_code]"
              :notApplicable="!isQuestionVisible(item.question)"
              @answered="onQuestionAnswered(item.question)"
              @next="onQuestionAnswered(item.question)"
              @capture-gps="captureGPS"
            />
          </template>
        </SectionCard>

        <!-- Focus Mode / Auto Form Popup Modal -->
        <FocusModeModal
          :isOpen="isFocusMode"
          :questions="activeQuestions"
          :currentIndex="focusQuestionIndex"
          :responses="responses"
          :validationErrors="validationErrors"
          :autoAdvance="autoAdvance"
          :isFullForm="isFullForm"
          :sectionTitle="activeSection ? activeSection.section_title || activeSection.section_code : ''"
          @close="isFocusMode = false"
          @prev-question="focusQuestionIndex = Math.max(0, focusQuestionIndex - 1)"
          @next-question="focusQuestionIndex = Math.min(activeQuestions.length - 1, focusQuestionIndex + 1)"
          @finish-section="onFocusModeFinishSection"
          @update-response="onFocusModeUpdateResponse"
          @toggle-auto-advance="autoAdvance = !autoAdvance"
          @toggle-full-form="toggleFullForm"
          @capture-gps="captureGPS"
        />
      </div>

      <!-- Modern, High-Clarity Survey Catalog Hub -->
      <div v-else class="space-y-4">
        <!-- Search & Filter Controls -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              type="text"
              v-model="searchQuery"
              :placeholder="__('Search surveys...')"
              class="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium shadow-xs focus:border-emerald-500 focus:outline-none transition"
            />
            <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              type="button"
              class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <!-- Pending WAL Queue Shortcut Button if offline items exist -->
          <button
            v-if="pendingWALCount > 0"
            type="button"
            @click="showWALDrawer = true"
            class="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shrink-0 flex items-center gap-1 active:scale-95 transition"
          >
            <span>⚡</span>
            <span>{{ pendingWALCount }}</span>
          </button>
        </div>

        <!-- Filter Chips for Workspaces (if multiple) -->
        <div v-if="workspacesList.length > 1" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            @click="selectedWorkspace = 'ALL'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95',
              selectedWorkspace === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            ]"
          >
            {{ __('All Workspaces') }}
          </button>
          <button
            v-for="ws in workspacesList"
            :key="ws.id"
            type="button"
            @click="selectedWorkspace = ws.id"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 flex items-center gap-1',
              selectedWorkspace === ws.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            ]"
          >
            <span>🏛️</span>
            <span>{{ ws.title }}</span>
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="filteredTemplates.length === 0" class="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <p class="text-sm font-bold text-slate-700">{{ __('No active surveys available.') }}</p>
          <p class="text-xs text-slate-500">{{ __('Check your network connection or permissions.') }}</p>
        </div>

        <!-- Sleek, Native-Grade Survey Cards -->
        <div
          v-for="tmpl in filteredTemplates"
          :key="tmpl.name"
          class="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 shadow-xs hover:shadow-md transition space-y-3"
        >
          <!-- Category Pill, Version & Draft Badge -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {{ tmpl.target_category || 'Survey' }}
            </span>
            <div class="flex items-center gap-2">
              <span
                v-if="activeDrafts[tmpl.name]"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs"
              >
                <span>📝</span>
                <span>{{ __('Draft') }}: {{ activeDrafts[tmpl.name].progress_percent || 0 }}%</span>
              </span>
              <span class="text-xs font-medium text-slate-400">
                v{{ tmpl.version }}.0
              </span>
            </div>
          </div>

          <!-- Clean Survey Title -->
          <h2 class="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {{ tmpl.title }}
          </h2>

          <!-- Workspace & Project Context Line -->
          <div class="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
            <span v-if="tmpl.workspace_title">🏛️ {{ tmpl.workspace_title }}</span>
            <span v-if="tmpl.workspace_title && tmpl.project_name">·</span>
            <span v-if="tmpl.project_name">📁 {{ tmpl.project_name }}</span>
          </div>

          <!-- Bottom Action Row -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              {{ __('Offline Ready') }}
            </span>
            <div class="flex items-center gap-2">
              <button
                v-if="activeDrafts[tmpl.name]"
                type="button"
                @click.stop="onDiscardDraft(tmpl.name)"
                class="px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition active:scale-95"
              >
                {{ __('Discard Draft') }}
              </button>
              <button
                type="button"
                @click="selectSurvey(tmpl.name)"
                :disabled="loadingSurveyId === tmpl.name"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span v-if="loadingSurveyId === tmpl.name" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                <span>{{ loadingSurveyId === tmpl.name ? __('Loading...') : (activeDrafts[tmpl.name] ? __('Resume Draft') : __('Start Survey')) }}</span>
                <span v-if="loadingSurveyId !== tmpl.name">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- WAL Drawer / Offline Queue Modal -->
    <div
      v-if="showWALDrawer"
      class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">{{ __('WAL Queue') }}</h3>
          <button @click="showWALDrawer = false" class="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>
        <p class="text-sm text-slate-600">
          {{ pendingWALCount }} {{ __('Pending') }} {{ __('Survey Responses') }}
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="triggerSync"
            class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-95 transition"
          >
            {{ __('Sync Now') }}
          </button>
          <button
            type="button"
            @click="showWALDrawer = false"
            class="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 text-sm hover:bg-slate-50 active:scale-95 transition"
          >
            {{ __('Close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Native In-App Exit Confirmation Dialog (Teleported to body) -->
    <Teleport to="body">
      <div
        v-if="showExitDialog"
        class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showExitDialog = false"
      >
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
          <div class="w-13 h-13 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center text-2xl shadow-xs">
            ⚠️
          </div>

          <div class="space-y-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
              {{ __('Exit Survey?') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {{ __('Your responses are saved in offline drafts. Return to the survey list?') }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              @click="showExitDialog = false"
              class="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
            >
              {{ __('Stay') }}
            </button>
            <button
              type="button"
              @click="confirmExit"
              class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm active:scale-95 transition shadow-xs"
            >
              {{ __('Exit') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useSurvey } from "./composables/useSurvey";
import { useWAL } from "./composables/useWAL";
import { useGPS } from "./composables/useGPS";
import { useTextScale } from "./composables/useTextScale";
import { useTranslation } from "./composables/useTranslation";
import { useAudioRecorder } from "./composables/useAudioRecorder";
import CompactHeader from "./components/header/CompactHeader.vue";
import SectionCard from "./components/survey/SectionCard.vue";
import QuestionCard from "./components/survey/QuestionCard.vue";
import GroupedQuestionCard from "./components/survey/GroupedQuestionCard.vue";
import MatrixQuestionCard from "./components/survey/MatrixQuestionCard.vue";
import FocusModeModal from "./components/survey/FocusModeModal.vue";

const autoAdvance = ref(true);
const isFocusMode = ref(false);
const focusQuestionIndex = ref(0);

const showExitDialog = ref(false);

watch(showExitDialog, (isOpen) => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
});

const { __ } = useTranslation();
const { textSize, cycleTextSize, setTextSize } = useTextScale();
const { isOnline, pendingWALCount, queueWAL, syncWAL } = useWAL();
const { gpsCoords, captureGPS } = useGPS();
const { isRecording, isPaused: isAudioPaused, toggleAudio, stopRecording } = useAudioRecorder();

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
} = useSurvey();

const isLoading = ref(true);
const loadingSurveyId = ref("");
const showWALDrawer = ref(false);
const searchQuery = ref("");
const selectedWorkspace = ref("ALL");

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

const filteredTemplates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return availableTemplates.value.filter((t) => {
    if (selectedWorkspace.value !== "ALL" && t.workspace !== selectedWorkspace.value) return false;
    if (!q) return true;
    const title = (t.title || "").toLowerCase();
    const name = (t.name || "").toLowerCase();
    const pName = (t.project_name || t.project || "").toLowerCase();
    const cat = (t.target_category || "").toLowerCase();
    return title.includes(q) || name.includes(q) || pName.includes(q) || cat.includes(q);
  });
});

function getRouteSurveyId() {
  if (window.frappe && window.frappe.initial_survey_id) {
    return window.frappe.initial_survey_id;
  }
  const path = (window.location && window.location.pathname) || "";
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "omniquery") {
    return decodeURIComponent(parts[1]);
  }
  return "";
}

async function init() {
  isLoading.value = true;
  const initialSurveyId = getRouteSurveyId();
  if (initialSurveyId) {
    await loadTemplate(initialSurveyId);
  }
  if (!activeTemplate.value) {
    await loadAvailableTemplates();
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

      // Standalone Dynamic Grid / Table -> Render as 3D / 4D Matrix Table
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

function onGroupResponseUpdate({ code, value }) {
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

function onFocusModeUpdateResponse({ code, value }) {
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
  if (activeTemplate.value) {
    showExitDialog.value = true;
  } else {
    goHome();
  }
}

function onHome() {
  if (activeTemplate.value) {
    showExitDialog.value = true;
  } else {
    goHome();
  }
}

function confirmExit() {
  showExitDialog.value = false;
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
    const res = await fetch("/api/method/omniquery.api.sync.sync_draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": (window.frappe && window.frappe.csrf_token) || "",
      },
      body: JSON.stringify({ draft: draftPayload }),
    });
    if (res.ok) {
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

async function onDiscardDraft(templateName) {
  if (confirm(__("Discard saved draft for this survey?"))) {
    await discardDraft(templateName);
  }
}

async function goHome() {
  scheduleDraftSaveAndSync();
  activeTemplate.value = null;
  activeSectionIndex.value = 0;
  isSubmitted.value = false;
  if (window.history && window.history.pushState) {
    window.history.pushState({}, "", "/omniquery");
  }
  await loadAvailableTemplates();
}

async function selectSurvey(surveyName) {
  loadingSurveyId.value = surveyName;
  if (window.history && window.history.pushState) {
    window.history.pushState({}, "", `/omniquery/${surveyName}`);
  }
  await loadTemplate(surveyName);
  loadingSurveyId.value = "";
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

  const payload = {
    idempotency_key: draftKey,
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
    await db.responses.put({
      response_uid: draftKey,
      template_name: tmplName,
      responses: JSON.parse(JSON.stringify(responses.value)),
      active_section_index: activeSectionIndex.value,
      progress_percent: 100,
      status: "Submitted",
      updated_at: new Date().toISOString(),
      synced: false,
    });
    await loadActiveDrafts();
  } catch (e) {}

  await queueWAL("OmniQuery Response", payload);
  if (isOnline.value) {
    await syncWAL();
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
  isSubmitting.value = true;
  stopRecording();
  await saveOfflineRecord();
  isSubmitting.value = false;
  isSubmitted.value = true;
}

function resetSurvey() {
  responses.value = {};
  activeSectionIndex.value = 0;
  isSubmitted.value = false;
  currentDraftId.value = generateSurveyId(activeTemplate.value?.name || activeTemplate.value?.template_name || "");
}

function triggerSync() {
  syncWAL();
}

onMounted(() => {
  init();
});
</script>
