<template>
  <div class="space-y-4 animate-fade-in pb-12">
    <!-- 1. Top Navigation Bar & Breadcrumb -->
    <div class="flex items-center justify-between gap-3 pt-1">
      <Button
        @click="$emit('back')"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs sm:text-sm transition shadow-xs active:scale-95 cursor-pointer"
      >
        <span>←</span>
        <span>{{ __('Back to Dashboard') }}</span>
      </Button>

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

    <!-- 2. Hero Project Card (Frappe New-Age Software Aesthetic) -->
    <div class="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-800 relative space-y-4 min-w-0">
      <!-- Top Row Badges -->
      <div class="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold shrink-0">
            <Landmark class="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>{{ projectMeta.name || projectId }}</span>
          </span>
          <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            {{ projectMeta.status || __('Active Field Project') }}
          </span>
        </div>

        <span v-if="projectMeta.workspace" class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
          <Building2 class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ projectMeta.workspace_title || projectMeta.workspace }}</span>
        </span>
      </div>

      <!-- Project Title & Subtitle -->
      <div class="space-y-1 min-w-0">
        <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
          {{ projectMeta.project_name || projectMeta.name || projectId }}
        </h1>
        <p v-if="projectMeta.grantor_organization" class="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
          <Landmark class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{{ projectMeta.grantor_organization }}</span>
        </p>
      </div>

      <!-- Project Slogan / Description -->
      <p v-if="projectMeta.description" class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
        {{ projectMeta.description }}
      </p>

      <!-- Key Metadata Pills Row -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs min-w-0">
        <div class="flex items-center gap-4 flex-wrap text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-1.5 font-bold">
            <ClipboardList class="w-3.5 h-3.5 text-emerald-600" />
            <span>{{ projectSurveys.length }} {{ __('Surveys Assigned') }}</span>
          </div>
          <div class="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ __('Standard Field Investigator Protocol') }}</span>
          </div>
        </div>

        <a
          v-if="projectMeta.helpline_phone"
          :href="'tel:' + projectMeta.helpline_phone"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition shadow-xs cursor-pointer shrink-0 no-underline"
        >
          <Phone class="w-3.5 h-3.5" />
          <span>{{ __('Supervisor Helpline') }}</span>
        </a>
      </div>
    </div>

    <!-- 3. Tabbed Content Navigation -->
    <div v-if="projectMeta.sop_sections || projectMeta.helpline_phone || projectMeta.helpline_email" class="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md pt-1 pb-1">
      <div class="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <Button
          @click="activeTab = 'surveys'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'surveys' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <ClipboardList class="w-3.5 h-3.5" />
          <span>{{ __('Surveys in this Project') }} ({{ projectSurveys.length }})</span>
        </Button>

        <Button
          v-if="projectMeta.sop_sections"
          @click="activeTab = 'sops'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'sops' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Scroll class="w-3.5 h-3.5" />
          <span>{{ __('Field SOPs & Protocols') }}</span>
        </Button>

        <Button
          v-if="projectMeta.helpline_phone || projectMeta.helpline_email"
          @click="activeTab = 'helpline'"
          class="py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'helpline' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Phone class="w-3.5 h-3.5" />
          <span>{{ __('Supervisor Helpline') }}</span>
        </Button>
      </div>
    </div>

    <!-- 4. Tab Content Panels -->
    <div class="space-y-4">
      <!-- Tab 1: Surveys in this Project -->
      <div v-if="activeTab === 'surveys'" class="space-y-3">
        <div v-if="projectSurveys.length > 0" class="flex items-center justify-between text-xs px-1 font-bold text-slate-600 dark:text-slate-300 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span>{{ __('Select a survey to start collecting field data') }}</span>
            <span>·</span>
            <span class="text-emerald-700 dark:text-emerald-400 font-bold">
              {{ cachedSurveysCount }}/{{ projectSurveys.length }} {{ __('Ready Offline') }}
            </span>
          </div>

          <!-- Download All Button for this Project -->
          <Button
            v-if="cachedSurveysCount < projectSurveys.length && isOnline"
            @click="$emit('download-project-surveys', projectId)"
            class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download class="w-3.5 h-3.5" />
            <span>{{ __('Download All for Offline') }}</span>
          </Button>
        </div>

        <div v-if="projectSurveys.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Inbox class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
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

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="cachedTemplatesMap[s.name]"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                  :title="__('Survey questions and schema downloaded in device memory')"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{{ __('Offline Ready') }} ({{ cachedTemplatesMap[s.name].questionCount }} {{ __('Q') }})</span>
                </span>
                <Button
                  v-else-if="isOnline"
                  @click.stop="$emit('download-survey', s.name)"
                  class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                  :title="__('Pre-cache survey questions so you can fill it without internet')"
                >
                  <Download class="w-3.5 h-3.5" />
                  <span>{{ __('Download for Offline') }}</span>
                </Button>
                <span
                  v-else
                  class="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1"
                >
                  <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
                  <span>{{ __('Requires Internet to Download') }}</span>
                </span>
              </div>

              <Button
                @click="$emit('select-survey', s.name)"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{{ __('Fill Survey') }}</span>
                <span>→</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Field SOPs & Protocols -->
      <div v-if="activeTab === 'sops' && projectMeta.sop_sections" class="space-y-4">
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm">
            <Scroll class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{{ __('Standard Operating Procedures') }}</span>
          </div>
          <div class="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed" v-html="projectMeta.sop_sections" />
        </div>
      </div>

      <!-- Tab 3: Supervisor Helpline -->
      <div v-if="activeTab === 'helpline' && (projectMeta.helpline_phone || projectMeta.helpline_email)" class="space-y-4">
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center gap-3.5">
            <div class="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Phone class="w-7 h-7" />
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {{ __('Field Support & Supervisor Helpline') }}
              </h3>
              <p v-if="projectMeta.helpline_hours" class="text-xs text-slate-500 dark:text-slate-400">
                {{ projectMeta.helpline_hours }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              v-if="projectMeta.helpline_phone"
              :href="'tel:' + projectMeta.helpline_phone"
              class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition block text-left group cursor-pointer"
            >
              <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ __('Helpline Phone') }}
              </div>
              <div class="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 group-hover:underline">
                {{ projectMeta.helpline_phone }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                {{ __('Direct telephone dispatch to field supervisor') }}
              </div>
            </a>

            <a
              v-if="projectMeta.helpline_email"
              :href="'mailto:' + projectMeta.helpline_email"
              class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition block text-left group cursor-pointer"
            >
              <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {{ __('Email Dispatch') }}
              </div>
              <div class="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 group-hover:underline break-all">
                {{ projectMeta.helpline_email }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                {{ __('Official escalation & technical queries') }}
              </div>
            </a>
          </div>

          <div v-if="projectMeta.district_scope" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2 flex-wrap">
            <span class="text-slate-500 dark:text-slate-400">{{ __('Target Scope') }}:</span>
            <span class="font-extrabold text-slate-800 dark:text-slate-200">
              {{ projectMeta.district_scope }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Button, call } from "frappe-ui";
import {
  Landmark,
  Building2,
  ClipboardList,
  ShieldCheck,
  Phone,
  Scroll,
  Download,
  Inbox,
  AlertTriangle,
} from "lucide-vue-next";
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
  cachedTemplatesMap: {
    type: Object,
    default: () => ({}),
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  "back",
  "select-survey",
  "download-survey",
  "download-project-surveys",
]);

const { __ } = useTranslation();
const activeTab = ref("surveys");
const remoteProjectMeta = ref(null);

// Count of surveys in this project ready offline
const cachedSurveysCount = computed(() => {
  return projectSurveys.value.filter(
    (s) => Boolean(props.cachedTemplatesMap && props.cachedTemplatesMap[s.name])
  ).length;
});

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
      grantor_organization: match.grantor_organization || "",
      description: match.project_description || match.description || "",
      workspace: match.workspace || "",
      workspace_title: match.workspace_title || "",
      status: match.project_status || match.status || "Active",
      helpline_phone: match.helpline_phone || "",
      helpline_email: match.helpline_email || "",
      sop_sections: match.sop_sections || "",
      training_materials: match.training_materials || "",
    };
  }
  return {
    name: props.projectId,
    project_name: props.projectId,
    grantor_organization: "",
    description: "",
    workspace: "",
    workspace_title: "",
    status: "Active",
    helpline_phone: "",
    helpline_email: "",
    sop_sections: "",
    training_materials: "",
  };
});

// Filter templates that belong to this project
const projectSurveys = computed(() => {
  const targetId = props.projectId;
  const filtered = (props.templates || []).filter(
    (t) =>
      t.project === targetId ||
      t.project_name === targetId ||
      (projectMeta.value.name && t.project === projectMeta.value.name)
  );
  return filtered;
});

async function fetchProjectMeta() {
  if (!props.projectId) return;
  try {
    const data = await call("omniquery.api.survey.get_project_details", {
      project_id: props.projectId,
    });
    const proj = data?.project || data?.message?.project || data?.message || data;
    if (proj && (proj.name || proj.project_name)) {
      remoteProjectMeta.value = {
        ...proj,
        helpline_phone: proj.helpline_phone || data?.helpline?.phone || "",
        helpline_email: proj.helpline_email || data?.helpline?.email || "",
        sop_sections: proj.sop_sections || "",
      };
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
</script>
