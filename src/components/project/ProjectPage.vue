<template>
  <div class="space-y-4 animate-fade-in pb-12">
    <!-- 1. Top Navigation Bar & Breadcrumb -->
    <div class="flex items-center justify-between gap-3 pt-1">
      <button
        type="button"
        @click="$emit('back')"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs sm:text-sm transition shadow-xs active:scale-95 cursor-pointer"
      >
        <span>←</span>
        <span>{{ __('Back to Dashboard') }}</span>
      </button>

      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
          :class="isOnline ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'"
        >
          <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'" />
          <span>{{ isOnline ? __('Online') : __('Offline Mode') }}</span>
        </span>
      </div>
    </div>

    <!-- 2. Hero Project Banner Card -->
    <div class="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl border border-slate-800 relative overflow-hidden space-y-4">
      <div class="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div class="absolute -left-8 -top-8 w-44 h-44 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

      <!-- Top Row Badges -->
      <div class="flex items-center justify-between gap-2 flex-wrap relative z-10">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold">
            <span>🏛️</span>
            <span>{{ projectMeta.name || projectId }}</span>
          </span>
          <span class="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">
            {{ projectMeta.status || __('Active Field Project') }}
          </span>
        </div>

        <span v-if="projectMeta.workspace" class="text-xs text-slate-300 font-medium">
          🏢 {{ projectMeta.workspace_title || projectMeta.workspace }}
        </span>
      </div>

      <!-- Project Title & Subtitle -->
      <div class="space-y-1 relative z-10">
        <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
          {{ projectMeta.project_name || projectMeta.name || projectId }}
        </h1>
        <p class="text-xs sm:text-sm text-emerald-300/90 font-medium flex items-center gap-1.5">
          <span>🏛️</span>
          <span>{{ projectMeta.grantor_organization || 'National Rural Livelihoods Mission / State Agency' }}</span>
        </p>
      </div>

      <!-- Project Slogan / Description -->
      <p v-if="projectMeta.description" class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl relative z-10">
        {{ projectMeta.description }}
      </p>

      <!-- Key Metadata Pills Row -->
      <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap relative z-10 text-xs">
        <div class="flex items-center gap-4 flex-wrap text-slate-300">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-emerald-400 text-sm">📋</span>
            <span>{{ projectSurveys.length }} {{ __('Surveys Assigned') }}</span>
          </div>
          <div class="flex items-center gap-1.5 font-medium text-slate-400">
            <span>🛡️</span>
            <span>{{ __('Standard Field Investigator Protocol') }}</span>
          </div>
        </div>

        <a
          href="tel:18001026664"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition shadow-xs cursor-pointer"
        >
          <span>📞</span>
          <span>{{ __('Supervisor Helpline') }}</span>
        </a>
      </div>
    </div>

    <!-- 3. Tabbed Content Navigation -->
    <div class="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md pt-1 pb-1">
      <div class="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          @click="activeTab = 'surveys'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'surveys' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <span>📋</span>
          <span>{{ __('Surveys in this Project') }} ({{ projectSurveys.length }})</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'sops'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'sops' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <span>📜</span>
          <span>{{ __('Field SOPs & Code') }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'finance'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'finance' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <span>💰</span>
          <span>{{ __('Turnover & Calculations') }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'offline'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'offline' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <span>⚡</span>
          <span>{{ __('Offline Data Guidelines') }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'helpline'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'helpline' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <span>📞</span>
          <span>{{ __('Supervisor Helpline') }}</span>
        </button>
      </div>
    </div>

    <!-- 4. Tab Content Panels -->
    <div class="space-y-4">
      <!-- Tab 1: Surveys in this Project -->
      <div v-if="activeTab === 'surveys'" class="space-y-3">
        <div class="flex items-center justify-between text-xs px-1 font-bold text-slate-600 dark:text-slate-300">
          <span>{{ __('Select a survey to start collecting field data') }}</span>
          <span class="text-slate-500">{{ projectSurveys.length }} {{ __('available') }}</span>
        </div>

        <div v-if="projectSurveys.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span class="text-3xl">📭</span>
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ __('No published surveys found for this project') }}</h3>
          <p class="text-xs text-slate-500">{{ __('Please check with your field supervisor or reload your template list.') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            v-for="s in projectSurveys"
            :key="s.name"
            class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between gap-4 group"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200/60 dark:border-emerald-800/60">
                  {{ s.target_category || __('Survey') }}
                </span>
                <span class="text-[11px] font-mono text-slate-400 font-semibold">
                  v{{ s.version || '1.0' }}
                </span>
              </div>

              <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {{ s.title || s.name }}
              </h3>

              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {{ s.description || projectMeta.description || __('Field data collection instrument for this study.') }}
              </p>
            </div>

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span class="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                {{ s.name }}
              </span>

              <button
                type="button"
                @click="$emit('select-survey', s.name)"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{{ __('Fill Survey') }}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Field SOPs & Code of Conduct -->
      <div v-if="activeTab === 'sops'" class="space-y-4">
        <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 space-y-1 shadow-2xs">
          <div class="font-extrabold flex items-center gap-1.5">
            <span>🛡️</span>
            <span>{{ __('Core Ethical Principle') }}</span>
          </div>
          <p class="text-emerald-800/90 dark:text-emerald-300">
            {{ __('Field surveyors represent the institution. Maintain respect, confidentiality, and data integrity at all times.') }}
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(item, idx) in sopsPoints"
            :key="idx"
            class="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
          >
            <span class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              {{ idx + 1 }}
            </span>
            <div class="space-y-1">
              <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ item.title }}
              </h4>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {{ item.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Financial Calculations & Turnover Aids -->
      <div v-if="activeTab === 'finance'" class="space-y-4">
        <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1 shadow-2xs">
          <div class="font-extrabold flex items-center gap-1.5">
            <span>💰</span>
            <span>{{ __('Multi-Year Turnover Formula') }}</span>
          </div>
          <p class="text-amber-800/90 dark:text-amber-300">
            {{ __('If monthly receipts fluctuate, compute typical monthly turnover and multiply by active operating months in the financial year.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div
            v-for="(tip, idx) in financeTips"
            :key="idx"
            class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2"
          >
            <div class="text-2xl">{{ tip.icon }}</div>
            <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{{ tip.title }}</h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{{ tip.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Tab 4: Offline Data Guidelines -->
      <div v-if="activeTab === 'offline'" class="space-y-4">
        <div class="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm text-blue-900 dark:text-blue-200 space-y-1 shadow-2xs">
          <div class="font-extrabold flex items-center gap-1.5">
            <span>⚡</span>
            <span>{{ __('Zero-Data-Loss Architecture') }}</span>
          </div>
          <p class="text-blue-800/90 dark:text-blue-300">
            {{ __('All surveys are buffered locally in SQLite/IndexedDB Write-Ahead Log. Even with zero mobile signal, your data is safe.') }}
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(item, idx) in offlinePoints"
            :key="idx"
            class="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
          >
            <span class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              {{ idx + 1 }}
            </span>
            <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {{ item }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tab 5: Supervisor Helpline -->
      <div v-if="activeTab === 'helpline'" class="space-y-4">
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center gap-3.5">
            <div class="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-xs">
              📞
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {{ __('Field Support & Supervisor Helpline') }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ __('Available Mon–Sat, 8:00 AM – 7:00 PM IST') }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href="tel:18001026664"
              class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition block text-left group cursor-pointer"
            >
              <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ __('Toll-Free Helpline') }}
              </div>
              <div class="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 group-hover:underline">
                1800-102-OMNI (+91)
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                {{ __('Direct telephone dispatch to state field supervisor') }}
              </div>
            </a>

            <a
              href="mailto:fieldsupport@ommnomi.in"
              class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition block text-left group cursor-pointer"
            >
              <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ __('Email Dispatch') }}
              </div>
              <div class="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 group-hover:underline break-all">
                fieldsupport@ommnomi.in
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                {{ __('Official escalation & technical bug reports') }}
              </div>
            </a>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2 flex-wrap">
            <span class="text-slate-500 dark:text-slate-400">{{ __('State Lead') }}:</span>
            <span class="font-extrabold text-slate-800 dark:text-slate-200">
              SVEP State Field Operations Desk · Rajasthan Cluster
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
  templates: {
    type: Array,
    default: () => [],
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["back", "select-survey"]);

const { __ } = useTranslation();
const activeTab = ref("surveys");
const remoteProjectMeta = ref(null);

// Find metadata from templates or fallback to fetched
const projectMeta = computed(() => {
  if (remoteProjectMeta.value && remoteProjectMeta.value.name) {
    return remoteProjectMeta.value;
  }
  const match = props.templates.find(
    (t) =>
      t.project === props.projectId ||
      t.project_name === props.projectId ||
      t.name === props.projectId
  );
  if (match) {
    return {
      name: match.project || props.projectId,
      project_name: match.project_name || match.project || props.projectId,
      grantor_organization: match.grantor_organization || "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
      description: match.project_description || match.description || "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan",
      workspace: match.workspace || "OQW-001",
      workspace_title: match.workspace_title || "Livelihoods Enterprise Study",
      status: "Active",
    };
  }
  return {
    name: props.projectId,
    project_name: props.projectId,
    grantor_organization: "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
    description: "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan",
    status: "Active",
  };
});

// Filter templates that belong to this project
const projectSurveys = computed(() => {
  const targetId = props.projectId;
  const filtered = props.templates.filter(
    (t) =>
      t.project === targetId ||
      t.project_name === targetId ||
      (projectMeta.value.name && t.project === projectMeta.value.name)
  );
  return filtered.length > 0 ? filtered : props.templates;
});

async function fetchProjectMeta() {
  if (!props.projectId) return;
  try {
    const res = await fetch(
      `/api/method/omniquery.api.survey.get_project_details?project_id=${encodeURIComponent(props.projectId)}`
    );
    if (res.ok) {
      const data = await res.json();
      const proj = data?.message?.project || data?.message;
      if (proj && (proj.name || proj.project_name)) {
        remoteProjectMeta.value = proj;
      }
    }
  } catch (e) {
    console.warn("Could not fetch remote project details:", e);
  }
}

onMounted(() => {
  fetchProjectMeta();
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

const sopsPoints = [
  {
    title: "1. Identification & Non-Commercial Objective",
    desc: "Always introduce yourself as an authorized field surveyor and explain the non-commercial research objectives before starting questions.",
  },
  {
    title: "2. Voluntary Informed Consent",
    desc: "Seek voluntary informed consent from the respondent or enterprise owner before recording any data.",
  },
  {
    title: "3. Financial Privacy & Reassurance",
    desc: "Never coerce or push respondents when they hesitate on personal financial queries. Reassure them of complete confidentiality under institutional research protocols.",
  },
  {
    title: "4. Physical Real-Time Geolocation",
    desc: "Capture GPS coordinates accurately while physically standing at the enterprise location to maintain spatial data fidelity.",
  },
  {
    title: "5. Pre-Submission Cross-Verification",
    desc: "Review all table sub-items (e.g. Q4 challenges and Q9 turnover categories) before advancing to the final submission step.",
  },
];

const financeTips = [
  {
    icon: "💵",
    title: "Annual Turnover Estimation",
    desc: "Multiply typical monthly business receipts by the number of active months in that specific financial year (e.g. FY 2022-23, FY 2023-24).",
  },
  {
    icon: "📊",
    title: "Percentage Distribution Verification",
    desc: "For questions where multiple business activities or challenges are categorized, cross-check that totals make logical sense.",
  },
  {
    icon: "🏦",
    title: "Capital Sources & Borrowing",
    desc: "Distinguish between SHG loans (CIF/RF), bank loans (Mudra/KCC), family borrowing, and private moneylenders.",
  },
];

const offlinePoints = [
  "OmniQuery runs 100% offline. All responses, in-progress draft edits, and GPS are recorded directly in device storage (IndexedDB).",
  "Observe the ⚡ badge in the header: it indicates how many completed responses are stored locally waiting to sync.",
  "When returning to network coverage or Wi-Fi, tap 'Sync Now' in the header to push records to the server.",
  "Before leaving the field, verify all completed forms in the 'Filled Forms' verification list.",
];
</script>
