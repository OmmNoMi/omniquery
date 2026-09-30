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
                {{ __('Filled Forms & Verification') }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ responsesList.length }} {{ __('recorded submissions in device memory') }}
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

        <!-- Emergency Data Recovery & Sync Action Bar -->
        <div class="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div class="flex items-center gap-2 text-xs font-bold">
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {{ syncedCount }} {{ __('Synced') }}
            </span>
            <span
              v-if="pendingCount > 0"
              class="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1"
            >
              <span>⚡</span>
              <span>{{ pendingCount }} {{ __('In Queue') }}</span>
            </span>
          </div>

          <!-- Data Recovery Action Buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-if="pendingCount > 0 && isOnline"
              type="button"
              @click="$emit('sync-all')"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span>⚡</span>
              <span>{{ __('Sync Queue') }}</span>
            </button>

            <!-- Export to JSON (Full Offline Backup) -->
            <button
              type="button"
              @click="exportToJson"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
              :title="__('Download complete local JSON database backup')"
            >
              <span>📥</span>
              <span>{{ __('JSON Backup') }}</span>
            </button>

            <!-- Export to CSV -->
            <button
              type="button"
              @click="exportToCsv"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
              :title="__('Download CSV spreadsheet format')"
            >
              <span>📊</span>
              <span>{{ __('CSV Export') }}</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Filled Forms List Grouped by Date -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          <!-- Empty State -->
          <div v-if="responsesList.length === 0" class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <div class="text-4xl">📝</div>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ __('No filled forms recorded yet.') }}</h3>
            <p class="text-xs">{{ __('Completed surveys will be listed here with full offline recovery options.') }}</p>
          </div>

          <!-- Grouped by Date Sections -->
          <div v-for="group in groupedResponses" :key="group.dateLabel" class="space-y-2.5">
            <!-- Date Section Header -->
            <div class="flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              <span>📅</span>
              <span>{{ group.dateLabel }}</span>
              <span class="text-[10px] font-normal lowercase">({{ group.items.length }} {{ __('responses') }})</span>
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
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      :class="[
                        resp.synced
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      ]"
                    >
                      {{ resp.synced ? '🟢 ' + __('Synced') : '🟠 ' + __('Offline Queue') }}
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
                    <span>{{ Object.keys(resp.responses || {}).length }} {{ __('answers recorded') }}</span>
                  </div>
                </div>

                <!-- Bottom Row: Verification & Single Record Recovery Actions -->
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    @click="inspectResponse(resp)"
                    class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <span>🔍</span>
                    <span>{{ __('Cross-Verify Answers') }}</span>
                  </button>

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
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end shrink-0">
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

const emit = defineEmits(["close", "sync-all"]);

const { __ } = useTranslation();

const responsesList = ref([]);
const copiedCode = ref("");
const copiedJsonId = ref("");
const selectedInspectResponse = ref(null);

async function loadResponses() {
  try {
    const list = await db.responses
      .where("status")
      .equals("Submitted")
      .reverse()
      .sortBy("updated_at");

    // enrich with template titles and respondent names
    responsesList.value = (list || []).map((r) => {
      const tmpl = props.templates.find((t) => (t.name || t.template_name) === r.template_name);
      const responses = r.responses || {};
      const respondentName =
        responses.respondent_name ||
        responses.entrepreneur_name ||
        responses.respondent ||
        responses.beneficiary_name ||
        "";
      return {
        ...r,
        template_title: tmpl?.title || r.template_name,
        respondentName,
      };
    });
  } catch (e) {
    responsesList.value = [];
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    loadResponses();
  }
});

onMounted(() => {
  if (props.isOpen) {
    loadResponses();
  }
});

const syncedCount = computed(() => {
  return responsesList.value.filter((r) => r.synced).length;
});

const pendingCount = computed(() => {
  return responsesList.value.filter((r) => !r.synced).length;
});

const groupedResponses = computed(() => {
  const groups = new Map();
  const todayStr = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const r of responsesList.value) {
    const d = new Date(r.updated_at || r.created_at || Date.now());
    const dateKey = d.toDateString();

    let dateLabel = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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

function inspectResponse(resp) {
  selectedInspectResponse.value = resp;
}

function exportToJson() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responsesList.value, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `OmniQuery_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    alert("Export failed: " + e.message);
  }
}

function exportToCsv() {
  try {
    if (!responsesList.value.length) return;
    const rows = [
      ["Response UID", "Template", "Status", "Synced", "Date", "Respondent", "Raw Answers JSON"],
    ];
    for (const r of responsesList.value) {
      rows.push([
        `"${r.response_uid}"`,
        `"${(r.template_title || r.template_name || '').replace(/"/g, '""')}"`,
        `"${r.status || 'Submitted'}"`,
        r.synced ? "Yes" : "No",
        `"${r.updated_at || r.created_at || ''}"`,
        `"${(r.respondentName || '').replace(/"/g, '""')}"`,
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
</script>
