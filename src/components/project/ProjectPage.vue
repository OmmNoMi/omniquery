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
          <!-- the project's own status, sent with its templates, so the badge does not change on load (#16) -->
          <span v-if="projectMeta.status" class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
            {{ __(projectMeta.status) }}
          </span>
        </div>

        <!-- the workspace's title only, never its raw id (#16) -->
        <span v-if="showWorkspace" class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
          <Building2 class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ projectMeta.workspace_title }}</span>
        </span>
      </div>

      <!-- Project Title & Subtitle -->
      <div class="space-y-1 min-w-0">
        <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
          {{ projectTitle }}
        </h1>
        <p v-if="projectMeta.grantor_organization" class="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
          <Landmark class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{{ projectMeta.grantor_organization }}</span>
        </p>
      </div>

      <!-- Project Slogan / Description -->
      <p v-if="showDescription" class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
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

        <!-- the project's helpline, shown once: a number to call and an address to write to (#17) -->
        <div v-if="hasHelpline" class="flex items-center gap-2 flex-wrap min-w-0">
          <a
            v-if="projectMeta.helpline_phone"
            :href="'tel:' + projectMeta.helpline_phone"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition shadow-xs cursor-pointer shrink-0 no-underline"
          >
            <Phone class="w-3.5 h-3.5" />
            <span>{{ __('Supervisor Helpline') }}</span>
            <span class="font-mono">{{ projectMeta.helpline_phone }}</span>
          </a>
          <a
            v-if="projectSupportEmail"
            :href="'mailto:' + projectSupportEmail"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer min-w-0 no-underline"
          >
            <Mail class="w-3.5 h-3.5 shrink-0" />
            <span class="break-all">{{ projectSupportEmail }}</span>
          </a>
        </div>
      </div>
    </div>

    <!-- 3. The project's surveys, with its SOPs in a second tab when it has some. frappe-ui Tabs gives
         the tablist, roving tabindex and arrow keys (#17); its strip stays in view, under the sticky
         header, while the list scrolls. -->
    <Tabs
      v-if="tabs.length > 1"
      v-model="activeTabIndex"
      :tabs="tabs"
      class="!overflow-visible [&>[role=tablist]]:sticky [&>[role=tablist]]:top-[52px] sm:[&>[role=tablist]]:top-[56px] [&>[role=tablist]]:z-20 [&>[role=tablist]]:bg-slate-100/95 dark:[&>[role=tablist]]:bg-slate-950/95 [&>[role=tablist]]:backdrop-blur-md [&>[role=tablist]]:[scrollbar-width:none] [&>[role=tablist]::-webkit-scrollbar]:hidden [&>[role=tabpanel]]:pt-4"
    >
      <template #tab-panel="{ tab }">
        <ProjectSurveyList v-if="tab.id === 'surveys'" v-bind="surveyList" />
        <div v-else class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm">
            <Scroll class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{{ __('Standard Operating Procedures') }}</span>
          </div>
          <!-- sanitized on the server by survey.project_help, as are the copies cached with the templates -->
          <div class="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed" v-html="projectMeta.sop_sections" />
        </div>
      </template>
    </Tabs>
    <!-- with nothing to switch to, the list stands alone: no strip and no panel without a tab -->
    <ProjectSurveyList v-else v-bind="surveyList" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Button, Tabs, call } from "frappe-ui";
import { Landmark, Building2, ClipboardList, ShieldCheck, Phone, Mail, Scroll } from "lucide-vue-next";
import ProjectSurveyList from "./ProjectSurveyList.vue";
import { useTranslation } from "../../composables/useTranslation";
import { projectHelp } from "../../utils/projectHelp";
import { templatesOfProject } from "../../utils/projectTemplates";
import { addsFact } from "../../utils/text";

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
      grantor_organization: match.grantor_organization || "",
      description: match.project_description || match.description || "",
      workspace: match.workspace || "",
      workspace_title: match.workspace_title || "",
      status: match.project_status || "",
      ...projectHelp(match),
    };
  }
  return {
    name: props.projectId,
    project_name: props.projectId,
    grantor_organization: "",
    description: "",
    workspace: "",
    workspace_title: "",
    status: "",
    ...projectHelp({}),
  };
});

const projectTitle = computed(() => projectMeta.value.project_name || projectMeta.value.name || props.projectId);

// each header line shows only when it adds a fact the header does not already show (#18)
const showWorkspace = computed(() => addsFact(projectMeta.value.workspace_title, projectMeta.value.grantor_organization));
const showDescription = computed(() =>
  addsFact(projectMeta.value.description, projectTitle.value, projectMeta.value.grantor_organization)
);

// set per project on OmniQuery Project; each link hides until someone sets it (#14, #51)
const projectSupportEmail = computed(() => projectMeta.value.support_email || "");
const hasHelpline = computed(() => Boolean(projectMeta.value.helpline_phone || projectSupportEmail.value));

// Filter templates that belong to this project
const projectSurveys = computed(() =>
  templatesOfProject(props.templates, props.projectId, projectMeta.value.name)
);

const surveyList = computed(() => ({
  surveys: projectSurveys.value,
  cachedTemplatesMap: props.cachedTemplatesMap,
  isOnline: props.isOnline,
  projectId: props.projectId,
  shownFacts: [projectTitle.value, projectMeta.value.grantor_organization, projectMeta.value.description],
  onSelectSurvey: (name) => emit("select-survey", name),
  onDownloadSurvey: (name) => emit("download-survey", name),
  onDownloadProjectSurveys: (id) => emit("download-project-surveys", id),
}));

// The tabs this project has. The SOPs tab comes and goes with the project's SOPs.
const tabs = computed(() => [
  { id: "surveys", label: `${__("Surveys in this Project")} (${projectSurveys.value.length})`, icon: ClipboardList },
  ...(projectMeta.value.sop_sections ? [{ id: "sops", label: __("Field SOPs & Protocols"), icon: Scroll }] : []),
]);

// frappe-ui Tabs selects by index. Keep the choice by id, so a tab that goes away (the SOPs, once the
// details load without them) falls back to the surveys rather than to an empty or wrong panel.
const activeTab = ref("surveys");
const activeTabIndex = computed({
  get: () => Math.max(0, tabs.value.findIndex((t) => t.id === activeTab.value)),
  set: (i) => {
    activeTab.value = tabs.value[i]?.id || "surveys";
  },
});

async function fetchProjectMeta() {
  if (!props.projectId) return;
  try {
    const data = await call("omniquery.api.survey.get_project_details", {
      project_id: props.projectId,
    });
    // { project } for a project this user can see, {} for any other
    const proj = data?.project;
    if (proj?.name) {
      remoteProjectMeta.value = { ...proj, ...projectHelp(proj) };
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
