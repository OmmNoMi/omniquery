<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-950 h-screen w-screen flex flex-col overflow-hidden animate-fade-in select-none overscroll-contain"
      @wheel.stop
    >
      <!-- 1. Full-Page Top App Bar (Replaces cramped bottom sheet) -->
      <header class="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div class="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            @click="$emit('close')"
            class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 shadow-2xs"
            :title="__('Return to Dashboard')"
          >
            <span>←</span>
            <span>{{ __('Back') }}</span>
          </button>

          <div class="min-w-0">
            <h1 class="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>📋</span>
              <span>{{ __('Field Data Recovery & Submissions') }}</span>
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {{ responsesList.length }} {{ __('total records stored on device (Queue, Drafts & Synced)') }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border select-none"
            :class="isOnline ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'"
          >
            <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'" />
            <span class="hidden sm:inline">{{ isOnline ? __('Online (Auto-Sync Active)') : __('Offline Mode') }}</span>
            <span class="sm:hidden">{{ isOnline ? __('Online') : __('Offline') }}</span>
          </span>

          <button
            type="button"
            @click="$emit('close')"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition cursor-pointer"
            :title="__('Close')"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Live Sync Feedback Toast Banner -->
      <div
        v-if="syncFeedbackMessage"
        class="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-fade-in shadow-xs"
      >
        <div class="flex items-center gap-2">
          <span>⚡</span>
          <span>{{ syncFeedbackMessage }}</span>
        </div>
        <button
          type="button"
          @click="syncFeedbackMessage = ''"
          class="text-xs opacity-80 hover:opacity-100 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- 3. Primary Data Action & Emergency Recovery Toolbar -->
      <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 shrink-0 shadow-2xs space-y-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <!-- Counter Badges -->
          <div class="flex items-center gap-1.5 text-xs font-bold flex-wrap">
            <span
              v-if="queuedCount > 0"
              class="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs"
            >
              <span>⚡</span>
              <span>{{ queuedCount }} {{ __('In Queue') }}</span>
            </span>
            <span
              v-if="quarantinedCount > 0"
              class="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 flex items-center gap-1 shadow-2xs font-extrabold"
            >
              <span>⚠️</span>
              <span>{{ quarantinedCount }} {{ __('Needs Review') }}</span>
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

          <!-- Action Buttons Bar -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- ⚡ Force Sync All Button -->
            <button
              type="button"
              @click="handleForceSync"
              :disabled="isSyncingLocal || !isOnline"
              class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              :title="__('Push all queued submissions and drafts to the server immediately')"
            >
              <span v-if="isSyncingLocal" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              <span v-else>⚡</span>
              <span>{{ isSyncingLocal ? __('Syncing...') : __('Force Sync All') }}</span>
            </button>

            <!-- 📦 Export Full ZIP Backup (The requested ZIP export!) -->
            <button
              type="button"
              @click="exportToZip"
              :disabled="isExportingZip || responsesList.length === 0"
              class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40"
              :title="__('Download complete ZIP archive containing individual survey JSONs, summary CSV, and full manifest')"
            >
              <span v-if="isExportingZip" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              <span v-else>📦</span>
              <span>{{ isExportingZip ? __('Compressing...') : __('Export ZIP') }}</span>
            </button>

            <!-- 📥 Export JSON -->
            <button
              type="button"
              @click="exportToJson"
              :disabled="responsesList.length === 0"
              class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Download complete raw JSON database backup')"
            >
              <span>📥</span>
              <span>{{ __('JSON Backup') }}</span>
            </button>

            <!-- 📊 Export CSV -->
            <button
              type="button"
              @click="exportToCsv"
              :disabled="responsesList.length === 0"
              class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Download CSV spreadsheet format')"
            >
              <span>📊</span>
              <span>{{ __('CSV Export') }}</span>
            </button>

            <!-- 📋 Copy Full Backup -->
            <button
              type="button"
              @click="copyFullBackupJson"
              :disabled="responsesList.length === 0"
              class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-40"
              :title="__('Copy complete backup JSON to clipboard for emergency messaging')"
            >
              <span>📋</span>
              <span>{{ hasCopiedAll ? '✓ ' + __('Copied All') : __('Copy All') }}</span>
            </button>
          </div>
        </div>

        <!-- Filter Tabs Row -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 text-xs font-bold">
          <button
            type="button"
            @click="activeFilter = 'all'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer"
            :class="activeFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
          >
            {{ __('All Records') }} ({{ responsesList.length }})
          </button>
          <button
            type="button"
            @click="activeFilter = 'today'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'today' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'"
          >
            <span>📅</span>
            <span>{{ __('Today') }} ({{ todayCount }})</span>
          </button>
          <button
            type="button"
            @click="activeFilter = 'queue'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'queue' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100'"
          >
            <span>⚡</span>
            <span>{{ __('In Queue') }} ({{ queuedCount }})</span>
          </button>
          <button
            v-if="quarantinedCount > 0"
            type="button"
            @click="activeFilter = 'quarantined'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'quarantined' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 hover:bg-rose-100'"
          >
            <span>⚠️</span>
            <span>{{ __('Needs Review') }} ({{ quarantinedCount }})</span>
          </button>
          <button
            type="button"
            @click="activeFilter = 'drafts'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'drafts' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 hover:bg-blue-100'"
          >
            <span>📝</span>
            <span>{{ __('Drafts') }} ({{ draftsCount }})</span>
          </button>
          <button
            type="button"
            @click="activeFilter = 'synced'"
            class="px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1"
            :class="activeFilter === 'synced' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'"
          >
            <span>🟢</span>
            <span>{{ __('Synced') }} ({{ syncedCount }})</span>
          </button>
        </div>
      </div>

      <!-- 4. Scrollable Full-Page List of Cards -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5">
        <!-- Empty State -->
        <div v-if="filteredResponses.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div class="text-4xl">📝</div>
          <h3 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            {{ activeFilter === 'all' ? __('No records found in device memory.') : __('No records match the selected filter.') }}
          </h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            {{ __('Completed surveys, offline queue submissions, and saved drafts will appear here with full cross-verification.') }}
          </p>
        </div>

        <!-- Grouped by Date Sections -->
        <div v-for="group in groupedResponses" :key="group.dateLabel" class="space-y-3">
          <!-- Date Section Header -->
          <div class="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            <span>📅</span>
            <span>{{ group.dateLabel }}</span>
            <span class="text-[10px] font-normal lowercase">({{ group.items.length }} {{ __('records') }})</span>
          </div>

          <!-- Response Cards in Date Group -->
          <div class="space-y-2.5">
            <div
              v-for="resp in group.items"
              :key="resp.response_uid"
              class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs space-y-3 transition"
            >
              <!-- Top Row: Survey Code, Status Pill & Time -->
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <code class="font-mono text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
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
                        : resp.is_quarantined || resp.wal_status === 'quarantined'
                          ? 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                          : resp.is_in_queue || !resp.synced
                            ? 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    ]"
                  >
                    <span v-if="resp.status === 'Draft'">📝 {{ __('Draft') }} ({{ resp.progress_percent || 0 }}%)</span>
                    <span v-else-if="resp.is_quarantined || resp.wal_status === 'quarantined'">⚠️ {{ __('Needs Review') }}</span>
                    <span v-else-if="resp.is_in_queue || !resp.synced">⚡ {{ __('In Queue') }}</span>
                    <span v-else>🟢 {{ __('Synced') }}</span>
                  </span>
                  <span class="text-xs font-mono text-slate-400">
                    {{ formatTime(resp.updated_at || resp.created_at) }}
                  </span>
                </div>
              </div>

              <!-- Middle Row: Template Name & Dynamic Response Title -->
              <div class="space-y-0.5 min-w-0">
                <h4 class="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug break-words">
                  {{ resolveResponseTitle(resp.responses, resp.response_title_format, resp.template_title || resp.template_name) }}
                </h4>
                <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap min-w-0">
                  <span class="truncate">📋 {{ resp.template_title || resp.template_name }}</span>
                  <span>·</span>
                  <span>{{ resp.answerCount }} {{ __('answers recorded') }}</span>
                  <span v-if="resp.wal_attempts && resp.wal_attempts > 0" class="text-amber-600 font-medium">
                    · ({{ resp.wal_attempts }} sync {{ __('attempts') }})
                  </span>
                </div>
              </div>

              <!-- Quarantined / Needs Review Action Bar -->
              <div v-if="resp.is_quarantined || resp.wal_status === 'quarantined'" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="font-extrabold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{{ __('Quarantined (Needs Review)') }}</span>
                  </div>
                  <span class="text-[11px] font-mono text-rose-700 dark:text-rose-400 font-bold">
                    {{ resp.wal_attempts || 5 }} {{ __('attempts') }}
                  </span>
                </div>
                <p class="text-[11px] text-rose-800/90 dark:text-rose-300 font-mono">
                  {{ resp.quarantine_reason || __('Multiple sync failures. Please check survey values before retrying.') }}
                </p>
                <div class="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    @click="handleRetryQuarantined(resp.wal_id)"
                    :disabled="!isOnline"
                    class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                  >
                    <span>⚡</span>
                    <span>{{ __('Retry Sync') }}</span>
                  </button>
                </div>
              </div>

              <!-- Draft Direct Action Bar -->
              <div v-if="resp.status === 'Draft'" class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2 min-w-0">
                <button
                  type="button"
                  @click="resumeSpecificDraft(resp.template_name, resp.response_uid)"
                  class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>▶</span>
                  <span>{{ __('Resume This Draft') }}</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  @click="deleteSpecificDraft(resp.response_uid)"
                  class="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                  :title="__('Discard draft')"
                >
                  <span>🗑️</span>
                  <span>{{ __('Discard') }}</span>
                </button>
              </div>

              <!-- Bottom Row: Verification & Recovery Actions -->
              <div class="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    @click="inspectResponse(resp)"
                    class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <span>🔍</span>
                    <span>{{ __('Cross-Verify Answers') }}</span>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="copyResponseJson(resp)"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition cursor-pointer"
                    :title="__('Copy raw response JSON to clipboard')"
                  >
                    {{ copiedJsonId === resp.response_uid ? '✓ ' + __('Copied JSON') : '📋 ' + __('Copy JSON') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 5. Cross-Verification Inspector Dialog (Universal BaseModal with built-in scroll lock) -->
      <BaseModal
        :isOpen="Boolean(selectedInspectResponse)"
        size="xl"
        :title="selectedInspectResponse ? `${__('Cross-Verification')}: ${selectedInspectResponse.response_uid}` : ''"
        :subtitle="selectedInspectResponse?.template_title || selectedInspectResponse?.template_name || ''"
        icon="🔍"
        @close="selectedInspectResponse = null"
      >
        <div v-if="selectedInspectResponse" class="p-4 sm:p-5 space-y-3">
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

        <template #footer>
          <div v-if="selectedInspectResponse" class="w-full flex justify-between gap-2 items-center">
            <button
              type="button"
              @click="copyResponseJson(selectedInspectResponse)"
              class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {{ copiedJsonId === selectedInspectResponse.response_uid ? '✓ ' + __('Copied') : '📋 ' + __('Copy JSON') }}
            </button>
            <button
              type="button"
              @click="selectedInspectResponse = null"
              class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
            >
              {{ __('Verified Good') }} ✓
            </button>
          </div>
        </template>
      </BaseModal>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, watch, toRef } from "vue";
import JSZip from "jszip";
import BaseModal from "../common/BaseModal.vue";
import { useScrollLock } from "../../composables/useScrollLock";
import { useTranslation } from "../../composables/useTranslation";
import { useWAL } from "../../composables/useWAL";
import { resolveResponseTitle } from "../../utils/responseTitle";
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
  initialFilter: {
    type: String,
    default: "all",
  },
});

const emit = defineEmits(["close", "sync-all", "resume-draft"]);

const { __ } = useTranslation();
const { forceSyncAll, retryQuarantinedEntry } = useWAL();

// Universal scroll locking: strictly prevents background scrolling while open
useScrollLock(toRef(props, "isOpen"));

const responsesList = ref([]);
const activeFilter = ref("all");
const copiedCode = ref("");
const copiedJsonId = ref("");
const hasCopiedAll = ref(false);
const isSyncingLocal = ref(false);
const isExportingZip = ref(false);
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
        response_title_format: tmpl?.response_title_format || r.response_title_format || "{respondent_name} - {village_gp} ({enterprise_name})",
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
        existing.quarantine_reason = entry.quarantine_reason || entry.last_error;
        if (entry.status === "synced") {
          existing.synced = true;
          existing.is_in_queue = false;
        } else if (entry.status === "pending") {
          existing.synced = false;
          existing.is_in_queue = true;
        } else if (entry.status === "quarantined") {
          existing.synced = false;
          existing.is_in_queue = false;
          existing.is_quarantined = true;
          existing.status = "Needs Review";
        }
      } else {
        responseMap.set(key, {
          response_uid: key,
          wal_id: entry.wal_id,
          template_name: payload.survey_template || "Survey",
          template_title: tmpl?.title || payload.survey_template || "Survey",
          responses: walResponses,
          respondentName,
          status: entry.status === "synced" ? "Submitted" : (entry.status === "quarantined" ? "Needs Review" : "Queued"),
          synced: entry.status === "synced",
          is_in_queue: isQueued,
          is_quarantined: entry.status === "quarantined",
          quarantine_reason: entry.quarantine_reason || entry.last_error,
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

async function handleRetryQuarantined(walId) {
  if (!walId) return;
  isSyncingLocal.value = true;
  try {
    await retryQuarantinedEntry(walId);
    await loadResponses();
    emit("sync-all");
  } catch (e) {
    console.warn("Retry quarantined entry failed:", e);
  } finally {
    isSyncingLocal.value = false;
  }
}

function resumeDraft(templateName) {
  emit("resume-draft", templateName);
  emit("close");
}

function resumeSpecificDraft(templateName, draftId) {
  emit("resume-draft", templateName, draftId);
  emit("close");
}

async function deleteSpecificDraft(responseUid) {
  if (confirm(__("Are you sure you want to discard this saved draft?"))) {
    try {
      await db.responses.delete(responseUid);
      await loadResponses();
    } catch (e) {
      console.warn("Failed to delete draft:", e);
    }
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      if (props.initialFilter) {
        activeFilter.value = props.initialFilter;
      }
      loadResponses();
    }
  },
  { immediate: true }
);

watch(
  () => props.initialFilter,
  (newVal) => {
    if (newVal) {
      activeFilter.value = newVal;
    }
  }
);

const todayCount = computed(() => {
  const todayStr = new Date().toDateString();
  return responsesList.value.filter((r) => {
    const d = new Date(r.updated_at || r.created_at || r.captured_at_local || Date.now());
    return d.toDateString() === todayStr && r.status !== "Draft";
  }).length;
});

const queuedCount = computed(() => {
  return responsesList.value.filter((r) => r.is_in_queue || (!r.synced && r.status !== "Draft" && !r.is_quarantined && r.wal_status !== "quarantined")).length;
});

const quarantinedCount = computed(() => {
  return responsesList.value.filter((r) => r.is_quarantined || r.wal_status === "quarantined").length;
});

const draftsCount = computed(() => {
  return responsesList.value.filter((r) => r.status === "Draft").length;
});

const syncedCount = computed(() => {
  return responsesList.value.filter((r) => r.synced && r.status !== "Draft").length;
});

const filteredResponses = computed(() => {
  if (activeFilter.value === "today") {
    const todayStr = new Date().toDateString();
    return responsesList.value.filter((r) => {
      const d = new Date(r.updated_at || r.created_at || r.captured_at_local || Date.now());
      return d.toDateString() === todayStr && r.status !== "Draft";
    });
  }
  if (activeFilter.value === "queue") {
    return responsesList.value.filter((r) => r.is_in_queue || (!r.synced && r.status !== "Draft" && !r.is_quarantined && r.wal_status !== "quarantined"));
  }
  if (activeFilter.value === "quarantined") {
    return responsesList.value.filter((r) => r.is_quarantined || r.wal_status === "quarantined");
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

function generateCsvString() {
  if (!responsesList.value.length) return "";
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
  return rows.map((e) => e.join(",")).join("\n");
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
    const csvContent = generateCsvString();
    if (!csvContent) return;
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
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

async function exportToZip() {
  if (!responsesList.value.length) return;
  isExportingZip.value = true;
  try {
    const zip = new JSZip();
    const backupData = await generateFullBackupPayload();
    const timestampStr = new Date().toISOString().slice(0, 10);

    // 1. Manifest
    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          package_title: "OmniQuery Field Data Recovery & Archive",
          exported_at: new Date().toISOString(),
          surveyor: (window.frappe && window.frappe.user) || "Administrator",
          counts: {
            total: responsesList.value.length,
            in_queue: queuedCount.value,
            drafts: draftsCount.value,
            synced: syncedCount.value,
          },
        },
        null,
        2
      )
    );

    // 2. Full consolidated JSON
    zip.file("all_records.json", JSON.stringify(backupData, null, 2));

    // 3. Tabular CSV
    const csvData = generateCsvString();
    if (csvData) {
      zip.file("records_summary.csv", csvData);
    }

    // 4. Individual responses folder with individual JSON files
    const surveysFolder = zip.folder("individual_surveys");
    for (const r of responsesList.value) {
      const fileName = `${r.response_uid}.json`;
      surveysFolder.file(fileName, JSON.stringify(r, null, 2));
    }

    // 5. Audit Instructions
    zip.file(
      "README.txt",
      `============================================================
OMNIQUERY EMERGENCY FIELD RECOVERY ARCHIVE
============================================================
Exported: ${new Date().toLocaleString()}
Surveyor: ${(window.frappe && window.frappe.user) || "Administrator"}
Total Records: ${responsesList.value.length} (In Queue: ${queuedCount.value}, Drafts: ${draftsCount.value}, Synced: ${syncedCount.value})

ARCHIVE LAYOUT:
- manifest.json: Metadata and verification totals
- all_records.json: Complete raw and parsed IndexedDB snapshot
- records_summary.csv: Tabular data for Excel / Google Sheets
- individual_surveys/: Standalone JSON files for each survey response

RECOVERY NOTE:
Transfer this ZIP file to your study supervisor or operations lead. 
Individual JSON files can be ingested directly into the OmniQuery backend.
`
    );

    // Generate zip blob
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `OmniQuery_Recovery_Archive_${timestampStr}.zip`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    alert("ZIP archive creation failed: " + (e.message || e));
  } finally {
    isExportingZip.value = false;
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
