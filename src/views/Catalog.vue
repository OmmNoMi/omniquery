<template>
  <div class="space-y-4">
    <!-- 0. Active Project Header Section with Persistent Switcher & Training Material Link -->
    <ProjectHeaderCard
      :templates="availableTemplates"
      :cachedTemplatesMap="cachedTemplatesMap"
      :isOnline="isOnline"
      :selectedProject="selectedProject"
      @update:selectedProject="$emit('update:selectedProject', $event)"
      @open-project-details="$emit('open-project-details', $event)"
      @download-project-surveys="$emit('download-project-surveys', $event)"
    />

    <!-- 1. Surveyor Daily KPI Dashboard -->
    <SurveyorDashboard
      :pendingWALCount="pendingWALCount"
      :isOnline="isOnline"
      :activeDrafts="activeDrafts"
      :templates="availableTemplates"
      :selectedProject="selectedProject"
      @open-wal="$emit('open-wal')"
      @sync-now="$emit('sync-now')"
      @resume-draft="$emit('select-survey', $event)"
      @start-new-survey="$emit('select-survey', $event, { startNew: true })"
      @open-filled-forms="$emit('open-filled-forms', 'all')"
      @open-filtered-forms="$emit('open-filled-forms', $event)"
    />

    <!-- 2. Survey Templates Section Header & Search/Filter Controls -->
    <div class="space-y-2.5 pt-1">
      <div class="flex items-center justify-between text-xs font-bold px-1">
        <span class="uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ClipboardList class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ __('Available Surveys') }} ({{ filteredTemplates.length }})</span>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <TextInput
            type="text"
            :modelValue="searchQuery"
            @update:modelValue="(val) => (searchQuery = val)"
            :placeholder="__('Search surveys...')"
            class="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium shadow-xs focus:border-emerald-500 focus:outline-none transition text-slate-900 dark:text-white"
          />
          <Search class="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            :title="__('Clear search')"
            :aria-label="__('Clear search')"
            :label="__('Clear search')"
          >
            <X class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTemplates.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
      <p class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ __('No active surveys available.') }}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ __('Check your network connection or permissions.') }}</p>
    </div>

    <!-- Sleek, Native-Grade Survey Cards -->
    <div
      v-for="tmpl in filteredTemplates"
      :key="tmpl.name"
      class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/80 shadow-xs hover:shadow-md transition space-y-3"
    >
      <!-- Category Pill, Version & Draft Badge -->
      <div class="flex items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
          {{ tmpl.target_category || 'Survey' }}
        </span>
        <div class="flex items-center gap-2">
          <span
            v-if="activeDrafts[tmpl.name]"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs"
          >
            <FileText class="w-3 h-3 text-amber-600" />
            <span>{{ __('Draft') }}: {{ activeDrafts[tmpl.name].progress_percent || 0 }}%</span>
          </span>
          <span class="text-xs font-medium text-slate-400">
            v{{ tmpl.version }}.0
          </span>
        </div>
      </div>

      <!-- Clean Survey Title -->
      <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
        {{ tmpl.title }}
      </h2>

      <!-- Workspace & Project Context Line -->
      <div class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
        <span v-if="tmpl.workspace_title" class="inline-flex items-center gap-1">
          <Landmark class="w-3 h-3 text-slate-400" />
          <span>{{ tmpl.workspace_title }}</span>
        </span>
        <span v-if="tmpl.workspace_title && tmpl.project_name">·</span>
        <span v-if="tmpl.project_name" class="inline-flex items-center gap-1">
          <Folder class="w-3 h-3 text-slate-400" />
          <span>{{ tmpl.project_name }}</span>
        </span>
      </div>

      <!-- Bottom Action Row -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span
            v-if="cachedTemplatesMap[tmpl.name]"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
            :title="__('Survey questions and schema downloaded in device memory')"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{{ __('Offline Ready') }} ({{ cachedTemplatesMap[tmpl.name].questionCount }} {{ __('Q') }})</span>
          </span>
          <Button
            v-else-if="isOnline"
            @click.stop="$emit('download-survey', tmpl.name)"
            :disabled="downloadingSurveyId === tmpl.name"
            class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
            :title="__('Pre-cache survey questions so you can fill it without internet')"
          >
            <span v-if="downloadingSurveyId === tmpl.name" class="animate-spin inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full"></span>
            <Download v-else class="w-3.5 h-3.5" />
            <span>{{ downloadingSurveyId === tmpl.name ? __('Downloading...') : __('Download offline') }}</span>
          </Button>
          <span
            v-else
            class="text-[11px] font-medium text-amber-700 dark:text-amber-400 inline-flex items-center gap-1"
          >
            <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
            <span>{{ __('Requires Internet to Download') }}</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button
            v-if="activeDrafts[tmpl.name]"
            @click.stop="$emit('select-survey', tmpl.name, { startNew: true })"
            class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
            :title="__('Start a fresh blank survey without discarding saved drafts')"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ __('Start New') }}</span>
          </Button>
          <Button
            @click="$emit('select-survey', tmpl.name)"
            :disabled="loadingSurveyId === tmpl.name"
            class="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="loadingSurveyId === tmpl.name" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
            <span>{{ loadingSurveyId === tmpl.name ? __('Loading...') : (activeDrafts[tmpl.name] ? __('Resume Survey') : __('Start Survey')) }}</span>
            <span v-if="loadingSurveyId !== tmpl.name">→</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { Button, TextInput } from "frappe-ui";
import {
  ClipboardList,
  Search,
  X,
  FileText,
  Landmark,
  Folder,
  Download,
  AlertTriangle,
  Plus,
} from "lucide-vue-next";
import ProjectHeaderCard from "../components/dashboard/ProjectHeaderCard.vue";
import SurveyorDashboard from "../components/dashboard/SurveyorDashboard.vue";
import { useTranslation } from "../composables/useTranslation";

const props = defineProps({
  availableTemplates: {
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
  pendingWALCount: {
    type: Number,
    default: 0,
  },
  activeDrafts: {
    type: Object,
    default: () => ({}),
  },
  downloadingSurveyId: {
    type: String,
    default: "",
  },
  loadingSurveyId: {
    type: String,
    default: "",
  },
  selectedProject: {
    type: String,
    default: "ALL",
  },
  selectedWorkspace: {
    type: String,
    default: "ALL",
  },
});

defineEmits([
  "update:selectedProject",
  "open-project-details",
  "download-project-surveys",
  "download-survey",
  "select-survey",
  "open-wal",
  "open-filled-forms",
  "sync-now",
]);

const { __ } = useTranslation();
const searchQuery = ref("");

const filteredTemplates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return (props.availableTemplates || []).filter((t) => {
    if (props.selectedProject !== "ALL" && t.project !== props.selectedProject && t.project_name !== props.selectedProject) return false;
    if (props.selectedWorkspace !== "ALL" && t.workspace !== props.selectedWorkspace) return false;
    if (!q) return true;
    const title = (t.title || "").toLowerCase();
    const name = (t.name || "").toLowerCase();
    const pName = (t.project_name || t.project || "").toLowerCase();
    const cat = (t.target_category || "").toLowerCase();
    return title.includes(q) || name.includes(q) || pName.includes(q) || cat.includes(q);
  });
});
</script>
