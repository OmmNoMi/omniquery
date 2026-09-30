<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      @click.self="$emit('close')"
    >
      <div class="bg-white dark:bg-slate-900 w-full sm:max-w-3xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        <!-- iOS Grabber Bar on mobile -->
        <div class="sm:hidden pt-3 pb-1 flex justify-center">
          <div class="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        <!-- Modal Header -->
        <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">📋</span>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {{ __('Field Data Recovery & Submissions') }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ responsesList.length }} {{ __('total records stored on device (Queue, Drafts & Synced)') }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="$emit('close')"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Sync Feedback Toast / Banner -->
        <div
          v-if="syncFeedbackMessage"
          class="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 shrink-0 animate-fade-in"
        >
          <div class="flex items-center gap-2">
            <span>⚡</span>
            <span>{{ syncFeedbackMessage }}</span>
          </div>
          <button
            type="button"
            @click="syncFeedbackMessage = ''"
            class="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Emergency Data Recovery & Sync Action Bar -->
        <div class="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <!-- Counter Pills -->
          <div class="flex items-center gap-1.5 text-xs font-bold flex-wrap">
            <span
              v-if="queuedCount > 0"
              class="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs"
            >
              <span>⚡</span>
              <span>{{ queuedCount }} {{ __('In Queue') }}</span>
            </span>
            <span
              v-if="draftsCount > 0"
              class="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800 flex items-center gap-1 shadow-2xs"
            >
              <span>📝</span>
              <span>{{ draftsCount }} {{ __('Drafts') }}</span>
            </span>
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {{ syncedCount }} {{ __('Synced') }}
            </span>
          </div>

          <!-- Recovery & Force Sync Buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <!-- Force Sync All Button -->
            <button
              type="button"
              @click="handleForceSync"
              :disabled="isSyncingLocal || !isOnline"
              class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :title="__('Push all queued submissions and in-progress drafts to the server immediately')"
            >
              <span v-if="isSyncingLocal" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              <span v-else>⚡</span>
              <span>{{ isSyncingLocal ? __('Syncing...') : __('Force Sync All') }}</span>
            </button>

            <!-- Export to JSON (Full Offline Backup) -->
            <button
              type="button"
              @click="exportToJson"
              :disabled="responsesList.length === 0"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Download complete local JSON database backup')"
            >
              <span>📥</span>
              <span>{{ __('JSON Backup') }}</span>
            </button>

            <!-- Export to CSV -->
            <button
              type="button"
              @click="exportToCsv"
              :disabled="responsesList.length === 0"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Download CSV spreadsheet format')"
            >
              <span>📊</span>
              <span>{{ __('CSV Export') }}</span>
            </button>

            <!-- Copy Full Backup to Clipboard -->
            <button
              type="button"
              @click="copyFullBackupJson"
              :disabled="responsesList.length === 0"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Copy complete backup JSON to clipboard for emergency supervisor messaging')"
            >
              <span>📋</span>
              <span>{{ hasCopiedAll ? '✓ ' + __('Copied All') : __('Copy All') }}</span>
            </button>
          </div>
        </div>

        <!-- Filter Tabs Row -->
        <div class="flex border-b border-slate-100 dark:border-slate-800 px-4 gap-2 overflow-x-auto no-scrollbar shrink-0 bg-white dark:bg-slate-900 py-1.5 text-xs font-bold">
          <button
            type="button"
            @click="activeFilter = 'all'"
            class="px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer"
            :class="activeFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
          >
            {{ __('All Records') }} ({{ responsesList.length }})
          </button>
          <button
            type="button"
            @click="activeFilter = 'queue'"
            class="px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'queue' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100'"
          >
            <span>⚡</span>
            <span>{{ __('In Queue') }} ({{ queuedCount }})</span>
          </button>
          <button
            type="button"
            @click="activeFilter = 'drafts'"
            class="px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'drafts' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100'"
          >
            <span>📝</span>
            <span>{{ __('Drafts') }} ({{ draftsCount }})</span>
          </button>
          <button
            type="button"
            @click="activeFilter = 'synced'"
            class="px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'synced' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'"
          >
            <span>🟢</span>
            <span>{{ __('Synced') }} ({{ syncedCount }})</span>
          </button>
        </div>

        <!-- Scrollable Filled Forms List Grouped by Date -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          <!-- Empty State -->
          <div v-if="filteredResponses.length === 0" class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <div class="text-4xl">📝</div>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
              {{ activeFilter === 'all' ? __('No records found in device memory.') : __('No records match the selected filter.') }}
            </h3>
            <p class="text-xs">
              {{ __('Offline queue submissions, saved drafts, and completed surveys will appear here.') }}
            </p>
          </div>

          <!-- Grouped by Date Sections -->
          <div v-for="group in groupedResponses" :key="group.dateLabel" class="space-y-2.5">
            <!-- Date Section Header -->
            <div class="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              <span>📅</span>
              <span>{{ group.dateLabel }}</span>
              <span class="text-[10px] font-normal lowercase">({{ group.items.length }} {{ __('records') }})</span>
            </div>

            <!-- Response Cards in Date Group -->
            <div class="space-y-2">
              <div
                v-for="resp in group.items"
                :key="resp.response_uid"
                class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs space-y-2.5 transition"
              >
                <!-- Top Row: Survey Code, Status Pill & Time -->
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2">
                    <code class="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {{ resp.response_uid }}
                    </code>
                    <button
                      type="button"
                      @click="copyCode(resp.response_uid)"
                      class="text-xs text-slate-400 hover:text-emerald-600 active:scale-95 transition"
                      :title="__('Copy Response Code')"
                    >
                      {{ copiedCode === resp.response_uid ? '✓' : '📋' }}
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <!-- Status Badge -->
                    <span
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs"
                      :class="[
                        resp.status === 'Draft'
                          ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          : resp.is_in_queue || !resp.synced
                            ? 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      ]"
                    >
                      <span v-if="resp.status === 'Draft'">📝 {{ __('Draft') }} ({{ resp.progress_percent || 0 }}%)</span>
                      <span v-else-if="resp.is_in_queue || !resp.synced">⚡ {{ __('In Queue') }}</span>
                      <span v-else>🟢 {{ __('Synced') }}</span>
                    </span>
                    <span class="text-xs font-mono text-slate-400">
                      {{ formatTime(resp.updated_at || resp.created_at) }}
                    </span>
                  </div>
                </div>

                <!-- Middle Row: Template Name & Respondent Name -->
                <div class="space-y-0.5">
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {{ resp.template_title || resp.template_name }}
                  </h4>
                  <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span v-if="resp.respondentName">
                      👤 <strong class="text-slate-700 dark:text-slate-300">{{ resp.respondentName }}</strong>
                    </span>
                    <span>·</span>
                    <span>{{ resp.answerCount }} {{ __('answers recorded') }}</span>
                    <span v-if="resp.wal_attempts && resp.wal_attempts > 0" class="text-amber-600 font-medium">
                      · ({{ resp.wal_attempts }} sync {{ __('attempts') }})
                    </span>
                  </div>
                </div>

                <!-- Bottom Row: Verification & Recovery Actions -->
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      @click="inspectResponse(resp)"
                      class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span>🔍</span>
                      <span>{{ __('Cross-Verify Answers') }}</span>
                    </button>

                    <!-- Resume Draft Button if item is in draft -->
                    <button
                      v-if="resp.status === 'Draft'"
                      type="button"
                      @click="resumeDraft(resp.template_name)"
                      class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span>▶</span>
                      <span>{{ __('Resume Draft') }}</span>
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click="copyResponseJson(resp)"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition cursor-pointer"
                      :title="__('Copy raw response JSON to clipboard for supervisor handover')"
                    >
                      {{ copiedJsonId === resp.response_uid ? '✓ ' + __('Copied JSON') : '📋 ' + __('Copy JSON') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center gap-2 shrink-0">
          <div class="text-xs text-slate-500 font-medium">
            <span>{{ isOnline ? '🟢 ' + __('Online (Auto-Sync Active)') : '🟠 ' + __('Offline Mode') }}</span>
          </div>
          <button
            type="button"
            @click="$emit('close')"
            class="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            {{ __('Close') }}
          </button>
        </div>
      </div>

      <!-- Nested Cross-Verification Inspector Dialog -->
      <div
        v-if="selectedInspectResponse"
        class="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        @click.self="selectedInspectResponse = null"
      >
        <div class="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
          <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {{ __('Cross-Verification') }}: {{ selectedInspectResponse.response_uid }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ selectedInspectResponse.template_title || selectedInspectResponse.template_name }}
              </p>
            </div>
            <button
              type="button"
              @click="selectedInspectResponse = null"
              class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
            <div
              v-for="(val, code) in (selectedInspectResponse.responses || {})"
              :key="code"
              class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-1"
            >
              <div class="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {{ code }}
              </div>
              <div class="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 break-words">
                {{ formatValue(val) }}
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2 items-center">
            <button
              type="button"
              @click="copyResponseJson(selectedInspectResponse)"
              class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {{ copiedJsonId === selectedInspectResponse.response_uid ? '✓ ' + __('Copied') : '📋 ' + __('Copy JSON') }}
            </button>
            <button
              type="button"
              @click="selectedInspectResponse = null"
              class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
            >
              {{ __('Verified Good') }} ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useTranslation } from "../../composables/useTranslation";
import { useWAL } from "../../composables/useWAL";
import { db } from "../../services/db";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  templates: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "sync-all", "resume-draft"]);

const { __ } = useTranslation();
const { forceSyncAll } = useWAL();

const responsesList = ref([]);
const activeFilter = ref("all");
const copiedCode = ref("");
const copiedJsonId = ref("");
const hasCopiedAll = ref(false);
const isSyncingLocal = ref(false);
const syncFeedbackMessage = ref("");
const selectedInspectResponse = ref(null);

async function loadResponses() {
  try {
    // 1. Fetch all records from db.responses
    const localResponses = await db.responses.toArray();

    // 2. Fetch all records from db.wal
    const walEntries = await db.wal.toArray();

    // Map existing response_uids to prevent duplicates and enrich details
    const responseMap = new Map();

    for (const r of localResponses) {
      const tmpl = props.templates.find((t) => (t.name || t.template_name) === r.template_name);
      const responses = r.responses || {};
      const respondentName =
        responses.respondent_name ||
        responses.entrepreneur_name ||
        responses.respondent ||
        responses.beneficiary_name ||
        "";

      const isQueued = r.status === "Queued" || (r.status === "Submitted" && !r.synced);

      responseMap.set(r.response_uid, {
        ...r,
        template_title: tmpl?.title || r.template_name,
        respondentName,
        answerCount: Object.keys(responses).length,
        is_in_queue: isQueued,
        source: "response",
      });
    }

    // Process WAL entries and merge or enrich
    for (const entry of walEntries) {
      let payload = {};
      try {
        payload = JSON.parse(entry.payload_json || "{}");
      } catch (e) {}

      const key = payload.idempotency_key || entry.wal_id;
      const tmpl = props.templates.find((t) => (t.name || t.template_name) === payload.survey_template);

      const walResponses = (payload.items || []).reduce((acc, it) => {
        if (it.question_code) {
          acc[it.question_code] = it.value !== undefined ? it.value : it.value_text || it.value_numeric || it.value_json;
        }
        return acc;
      }, {});

      const respondentName =
        payload.respondent ||
        walResponses.respondent_name ||
        walResponses.entrepreneur_name ||
        walResponses.respondent ||
        "";

      const isQueued = entry.status === "pending";

      if (responseMap.has(key)) {
        const existing = responseMap.get(key);
        existing.in_wal_queue = true;
        existing.wal_id = entry.wal_id;
        existing.wal_status = entry.status;
        existing.wal_attempts = entry.attempts || 0;
        if (entry.status === "synced") {
          existing.synced = true;
          existing.is_in_queue = false;
        } else if (entry.status === "pending") {
          existing.synced = false;
          existing.is_in_queue = true;
        }
      } else {
        responseMap.set(key, {
          response_uid: key,
          wal_id: entry.wal_id,
          template_name: payload.survey_template || "Survey",
          template_title: tmpl?.title || payload.survey_template || "Survey",
          responses: walResponses,
          respondentName,
          status: entry.status === "synced" ? "Submitted" : "Queued",
          synced: entry.status === "synced",
          is_in_queue: isQueued,
          wal_status: entry.status,
          wal_attempts: entry.attempts || 0,
          created_at: payload.captured_at_local || entry.timestamp,
          updated_at: entry.timestamp,
          answerCount: (payload.items || []).length || Object.keys(walResponses).length,
          source: "wal",
        });
      }
    }

    // Merge and sort in memory by updated_at descending
    const merged = Array.from(responseMap.values());
    merged.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

    responsesList.value = merged;
  } catch (e) {
    console.warn("Failed to load responses in modal:", e);
    responsesList.value = [];
  }
}

async function handleForceSync() {
  if (isSyncingLocal.value) return;
  isSyncingLocal.value = true;
  syncFeedbackMessage.value = __("Syncing queued submissions and drafts to server...");
  try {
    const summary = await forceSyncAll();
    await loadResponses();
    syncFeedbackMessage.value = summary.message || __("Sync completed!");
    emit("sync-all");
    setTimeout(() => {
      syncFeedbackMessage.value = "";
    }, 5000);
  } catch (e) {
    syncFeedbackMessage.value = `Sync error: ${e.message || e}`;
  } finally {
    isSyncingLocal.value = false;
  }
}

function resumeDraft(templateName) {
  emit("resume-draft", templateName);
  emit("close");
}

const queuedCount = computed(() => {
  return responsesList.value.filter((r) => r.is_in_queue || (!r.synced && r.status !== "Draft")).length;
});

const draftsCount = computed(() => {
  return responsesList.value.filter((r) => r.status === "Draft").length;
});

const syncedCount = computed(() => {
  return responsesList.value.filter((r) => r.synced && r.status !== "Draft").length;
});

const filteredResponses = computed(() => {
  if (activeFilter.value === "queue") {
    return responsesList.value.filter((r) => r.is_in_queue || (!r.synced && r.status !== "Draft"));
  }
  if (activeFilter.value === "drafts") {
    return responsesList.value.filter((r) => r.status === "Draft");
  }
  if (activeFilter.value === "synced") {
    return responsesList.value.filter((r) => r.synced && r.status !== "Draft");
  }
  return responsesList.value;
});

const groupedResponses = computed(() => {
  const groups = new Map();
  const todayStr = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const r of filteredResponses.value) {
    const d = new Date(r.updated_at || r.created_at || Date.now());
    const dateKey = d.toDateString();

    let dateLabel = d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (dateKey === todayStr) {
      dateLabel = `Today · ${dateLabel}`;
    } else if (dateKey === yesterday) {
      dateLabel = `Yesterday · ${dateLabel}`;
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateLabel, items: [] });
    }
    groups.get(dateKey).items.push(r);
  }

  return Array.from(groups.values());
});

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function formatValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function copyCode(code) {
  try {
    navigator.clipboard?.writeText(code);
    copiedCode.value = code;
    setTimeout(() => {
      copiedCode.value = "";
    }, 2000);
  } catch (e) {}
}

function copyResponseJson(resp) {
  try {
    const payload = JSON.stringify(resp, null, 2);
    navigator.clipboard?.writeText(payload);
    copiedJsonId.value = resp.response_uid;
    setTimeout(() => {
      copiedJsonId.value = "";
    }, 2000);
  } catch (e) {}
}

async function generateFullBackupPayload() {
  const allWal = await db.wal.toArray().catch(() => []);
  const allResp = await db.responses.toArray().catch(() => []);
  return {
    backup_version: "2.0",
    exported_at: new Date().toISOString(),
    device_user: (window.frappe && window.frappe.user) || "Administrator",
    summary: {
      total_records: responsesList.value.length,
      in_queue_count: queuedCount.value,
      drafts_count: draftsCount.value,
      synced_count: syncedCount.value,
    },
    records: responsesList.value,
    raw_wal_queue: allWal,
    raw_responses_db: allResp,
  };
}

async function exportToJson() {
  try {
    const backupData = await generateFullBackupPayload();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `OmniQuery_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    alert("Export failed: " + e.message);
  }
}

async function copyFullBackupJson() {
  try {
    const backupData = await generateFullBackupPayload();
    const payload = JSON.stringify(backupData, null, 2);
    navigator.clipboard?.writeText(payload);
    hasCopiedAll.value = true;
    setTimeout(() => {
      hasCopiedAll.value = false;
    }, 2500);
  } catch (e) {}
}

function exportToCsv() {
  try {
    if (!responsesList.value.length) return;
    const rows = [
      ["Response UID", "Template", "Status", "Synced", "In Queue", "Date", "Respondent", "Answers Count", "Raw Answers JSON"],
    ];
    for (const r of responsesList.value) {
      rows.push([
        `"${r.response_uid}"`,
        `"${(r.template_title || r.template_name || '').replace(/"/g, '""')}"`,
        `"${r.status || 'Submitted'}"`,
        r.synced ? "Yes" : "No",
        r.is_in_queue ? "Yes" : "No",
        `"${r.updated_at || r.created_at || ''}"`,
        `"${(r.respondentName || '').replace(/"/g, '""')}"`,
        r.answerCount || 0,
        `"${JSON.stringify(r.responses || {}).replace(/"/g, '""')}"`,
      ]);
    }
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OmniQuery_Responses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    alert("CSV export failed: " + e.message);
  }
}

function inspectResponse(resp) {
  selectedInspectResponse.value = resp;
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadResponses();
    }
  }
);

onMounted(() => {
  if (props.isOpen) {
    loadResponses();
  }
});
</script>
