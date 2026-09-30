<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
    <!-- Surveyor Greeting & Context Header -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
          {{ userInitial }}
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {{ formattedToday }}
          </div>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
            {{ __('Welcome,') }} {{ displayName }}
          </h2>
        </div>
      </div>

      <!-- Live Connectivity / Sync Status Pill -->
      <div class="flex items-center gap-1.5">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition select-none"
          :class="[
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          ]"
        >
          <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'" />
          <span>{{ isOnline ? __('Online (Auto-Sync)') : __('Offline (Local Mode)') }}</span>
        </span>
      </div>
    </div>

    <!-- Daily Target Goal Progress Strip -->
    <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
      <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <div class="flex items-center gap-1.5">
          <span>🎯</span>
          <span>{{ __('Daily Target') }}:</span>
          <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">{{ completedToday }} / {{ dailyTarget }}</span>
          <span class="font-normal text-slate-500 dark:text-slate-400">({{ __('Surveys') }})</span>
        </div>
        <span class="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">{{ targetProgressPct }}%</span>
      </div>
      <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-xs"
          :style="{ width: `${targetProgressPct}%` }"
        />
      </div>
    </div>

    <!-- 4 KPI Performance Cards Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      <!-- 1. Completed Today -->
      <div class="p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-left space-y-1 shadow-2xs">
        <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
          <span class="text-xs font-bold uppercase tracking-wider">{{ __('Today') }}</span>
          <span class="text-base">📋</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
          {{ completedToday }}
        </div>
        <div class="text-[11px] text-emerald-700/90 dark:text-emerald-400 font-medium truncate">
          {{ remainingTodayText }}
        </div>
      </div>

      <!-- 2. Pending Offline Queue (⚡ N) -->
      <div
        class="p-3 sm:p-3.5 rounded-xl border text-left space-y-1 shadow-2xs transition"
        :class="[
          pendingWALCount > 0
            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400/20'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {{ __('Queue') }}
          </span>
          <span class="text-base">⚡</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold font-mono" :class="pendingWALCount > 0 ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'">
          {{ pendingWALCount }}
        </div>
        <div class="flex items-center justify-between gap-1 text-[11px] text-amber-800/90 dark:text-amber-300 font-medium">
          <span class="truncate">{{ pendingWALCount === 0 ? __('All synced') : __('Pending sync') }}</span>
          <button
            v-if="pendingWALCount > 0"
            type="button"
            @click="$emit('open-wal')"
            class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
          >
            {{ __('View') }} →
          </button>
        </div>
      </div>

      <!-- 3. Active Drafts -->
      <div class="p-3 sm:p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 text-left space-y-1 shadow-2xs">
        <div class="flex items-center justify-between text-blue-700 dark:text-blue-400">
          <span class="text-xs font-bold uppercase tracking-wider">{{ __('Drafts') }}</span>
          <span class="text-base">📝</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-blue-900 dark:text-blue-100 font-mono">
          {{ activeDraftsCount }}
        </div>
        <div class="text-[11px] text-blue-700/90 dark:text-blue-400 font-medium truncate">
          {{ activeDraftsCount > 0 ? __('In progress') : __('None pending') }}
        </div>
      </div>

      <!-- 4. Total Lifetime Submissions -->
      <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-left space-y-1 shadow-2xs">
        <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span class="text-xs font-bold uppercase tracking-wider">{{ __('Total') }}</span>
          <span class="text-base">🏆</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
          {{ totalCompleted }}
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
          {{ __('Submitted records') }}
        </div>
      </div>
    </div>

    <!-- Active Draft Quick Resume Callout Banner (if surveyor has an unfinished survey) -->
    <div
      v-if="topDraft"
      class="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-3 flex-wrap"
    >
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <span class="text-xl shrink-0">⏳</span>
        <div class="min-w-0">
          <div class="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
            {{ __('Unfinished Survey') }}: {{ topDraft.title || topDraft.template_name }}
          </div>
          <div class="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2 mt-0.5">
            <span class="font-bold">{{ topDraft.progress_percent || 0 }}% {{ __('completed') }}</span>
            <span>·</span>
            <span>{{ __('Last updated') }} {{ formatRelativeTime(topDraft.updated_at) }}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        @click="$emit('resume-draft', topDraft.template_name)"
        class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
      >
        <span>{{ __('Resume Draft') }}</span>
        <span>→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useTranslation } from "../../composables/useTranslation";
import { db } from "../../services/db";

const props = defineProps({
  pendingWALCount: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  activeDrafts: {
    type: Object,
    default: () => ({}),
  },
  templates: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["open-wal", "sync-now", "resume-draft"]);

const { __ } = useTranslation();

const dailyTarget = ref(10);
const serverTodayCount = ref(0);
const serverTotalCount = ref(0);
const localTodayCount = ref(0);
const localTotalCount = ref(0);

const user = computed(() => {
  return (window.frappe && window.frappe.user) || "Administrator";
});

const displayName = computed(() => {
  if (user.value === "Administrator") return "Administrator";
  return user.value.split("@")[0] || user.value;
});

const userInitial = computed(() => {
  return (displayName.value || "A").charAt(0).toUpperCase();
});

const formattedToday = computed(() => {
  const d = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
});

async function refreshLocalMetrics() {
  try {
    const allSubmitted = await db.responses
      .where("status")
      .equals("Submitted")
      .toArray();

    localTotalCount.value = allSubmitted.length;

    const todayStr = new Date().toDateString();
    const todaySubmitted = allSubmitted.filter((r) => {
      const d = new Date(r.updated_at || r.created_at || Date.now());
      return d.toDateString() === todayStr;
    });

    localTodayCount.value = todaySubmitted.length;
  } catch (e) {
    localTotalCount.value = 0;
    localTodayCount.value = 0;
  }
}

async function fetchServerMetrics() {
  if (!props.isOnline) return;
  try {
    const res = await fetch("/api/method/omniquery.api.survey.get_surveyor_kpis");
    if (res.ok) {
      const data = await res.json();
      const msg = data.message || {};
      serverTodayCount.value = Number(msg.today_count) || 0;
      serverTotalCount.value = Number(msg.total_count) || 0;
      if (msg.daily_target) {
        dailyTarget.value = Number(msg.daily_target);
      }
    }
  } catch (e) {}
}

const completedToday = computed(() => {
  return Math.max(localTodayCount.value, serverTodayCount.value);
});

const totalCompleted = computed(() => {
  return Math.max(localTotalCount.value, serverTotalCount.value);
});

const targetProgressPct = computed(() => {
  if (!dailyTarget.value) return 0;
  return Math.min(100, Math.round((completedToday.value / dailyTarget.value) * 100));
});

const remainingTodayText = computed(() => {
  const left = dailyTarget.value - completedToday.value;
  if (left <= 0) return __("Target reached! 🎉");
  return `${left} ${__("left for target")}`;
});

const activeDraftsCount = computed(() => {
  return Object.keys(props.activeDrafts || {}).length;
});

const topDraft = computed(() => {
  const list = Object.values(props.activeDrafts || {});
  if (!list.length) return null;
  // sort by updated_at descending
  const sorted = [...list].sort((a, b) => {
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
  const draft = sorted[0];
  const tmpl = props.templates.find((t) => (t.name || t.template_name) === draft.template_name);
  return {
    ...draft,
    title: tmpl?.title || draft.template_name,
  };
});

function formatRelativeTime(isoStr) {
  if (!isoStr) return __("recently");
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return __("just now");
    if (mins < 60) return `${mins}m ${__("ago")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${__("ago")}`;
    return new Date(isoStr).toLocaleDateString();
  } catch (e) {
    return __("recently");
  }
}

watch(() => props.pendingWALCount, () => {
  refreshLocalMetrics();
  fetchServerMetrics();
});

watch(() => props.activeDrafts, () => {
  refreshLocalMetrics();
}, { deep: true });

onMounted(() => {
  refreshLocalMetrics();
  fetchServerMetrics();
});
</script>
