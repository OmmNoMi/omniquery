<template>
  <div class="space-y-4">
    <!-- 0. Active Project Header Section with Persistent Switcher & Training Material Link -->
    <ProjectHeaderCard
      v-if="s.showCatalog"
      :templates="s.availableTemplates"
      :cachedTemplatesMap="s.cachedTemplatesMap"
      :isOnline="s.isOnline"
      v-model:selectedProject="s.selectedProject"
      @open-project-details="s.openProjectPage"
      @download-project-surveys="s.handleDownloadProjectSurveys"
    />

    <!-- 1. Surveyor Daily KPI Dashboard -->
    <SurveyorDashboard
      :pendingWALCount="s.pendingWALCount"
      :isOnline="s.isOnline"
      :activeDrafts="s.activeDrafts"
      :drafts="s.allDrafts"
      :templates="s.availableTemplates"
      :selectedProject="s.selectedProject"
      :isUnassigned="s.isUnassigned"
      @open-wal="s.showWALDrawer = true"
      @sync-now="s.triggerSync()"
      @resume-draft="s.selectSurvey"
      @start-new-survey="s.selectSurvey($event, { startNew: true })"
      @open-filled-forms="s.openFilteredFilledForms('all')"
      @open-filtered-forms="s.openFilteredFilledForms"
    />

    <!-- 2. Survey Templates Section Header & Search/Filter Controls -->
    <div v-if="s.showCatalog" class="space-y-2.5 pt-1">
      <div class="flex items-center justify-between text-xs font-bold px-1">
        <span class="uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ClipboardList class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ __('Available Surveys') }} ({{ filteredTemplates.length }})</span>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <TextInput
          type="text"
          size="lg"
          variant="outline"
          ref="searchInput"
          class="flex-1"
          v-model="s.searchQuery"
          :placeholder="__('Search surveys...')"
          :aria-label="__('Search surveys')"
        >
          <template #prefix>
            <Search class="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </template>
          <template v-if="s.searchQuery" #suffix>
            <Button variant="ghost" :label="__('Clear search')" :title="__('Clear search')" @click="clearSearch">
              <template #icon><X class="w-4 h-4" aria-hidden="true" /></template>
            </Button>
          </template>
        </TextInput>
      </div>
    </div>

    <!-- Empty State (an unassigned user sees the dashboard's ask-your-supervisor card instead) -->
    <div v-if="s.showCatalog && filteredTemplates.length === 0" data-empty-templates class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
      <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ __('No active surveys available.') }}</p>
      <p class="text-xs text-slate-600 dark:text-slate-400">{{ __('Check your network connection or permissions.') }}</p>
    </div>

    <!-- Sleek, Native-Grade Survey Cards -->
    <div
      v-for="tmpl in filteredTemplates"
      :key="tmpl.name"
      class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/80 shadow-xs hover:shadow-md transition space-y-3"
    >
      <!-- Category Pill, Version & Draft Badge -->
      <div class="flex items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
          {{ tmpl.target_category || 'Survey' }}
        </span>
        <div class="flex items-center gap-2">
          <span
            v-if="s.activeDrafts[tmpl.name]"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs"
          >
            <FileText class="w-3 h-3 text-amber-600" />
            <span>{{ __('Draft') }}: {{ s.activeDrafts[tmpl.name].progress_percent || 0 }}%</span>
          </span>
          <span class="text-xs font-medium text-slate-600 dark:text-slate-400">
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
            v-if="s.cachedTemplatesMap[tmpl.name]"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
            :title="__('Survey questions and schema downloaded in device memory')"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{{ __('Offline Ready') }} ({{ s.cachedTemplatesMap[tmpl.name].questionCount }} {{ __('Q') }})</span>
          </span>
          <Button
            v-else-if="s.isOnline"
            @click.stop="s.handleDownloadSurvey(tmpl.name)"
            :disabled="s.downloadingSurveyId === tmpl.name"
            class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
            :title="__('Pre-cache survey questions so you can fill it without internet')"
          >
            <span v-if="s.downloadingSurveyId === tmpl.name" class="animate-spin inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full"></span>
            <Download v-else class="w-3.5 h-3.5" />
            <span>{{ s.downloadingSurveyId === tmpl.name ? __('Downloading...') : __('Download offline') }}</span>
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
            v-if="s.activeDrafts[tmpl.name]"
            @click.stop="s.selectSurvey(tmpl.name, { startNew: true })"
            class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
            :title="__('Start a fresh blank survey without discarding saved drafts')"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ __('Start New') }}</span>
          </Button>
          <Button
            @click="s.selectSurvey(tmpl.name)"
            :disabled="s.loadingSurveyId === tmpl.name"
            class="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="s.loadingSurveyId === tmpl.name" class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
            <span>{{ s.loadingSurveyId === tmpl.name ? __('Loading...') : (s.activeDrafts[tmpl.name] ? __('Resume Survey') : __('Start Survey')) }}</span>
            <span v-if="s.loadingSurveyId !== tmpl.name">→</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, useTemplateRef } from "vue";
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
import { useSurveySession } from "../composables/useSurveyApp";

const s = useSurveySession();
const { __ } = useTranslation();

// Clear search unmounts its own button, so focus goes back to the field instead of the page
const searchInput = useTemplateRef("searchInput");
function clearSearch() {
  s.searchQuery = "";
  searchInput.value?.el?.focus();
}

const filteredTemplates = computed(() => {
  const q = s.searchQuery.trim().toLowerCase();
  return s.availableTemplates.filter((t) => {
    if (s.selectedProject !== "ALL" && t.project !== s.selectedProject && t.project_name !== s.selectedProject) return false;
    if (!q) return true;
    const title = (t.title || "").toLowerCase();
    const name = (t.name || "").toLowerCase();
    const pName = (t.project_name || t.project || "").toLowerCase();
    const cat = (t.target_category || "").toLowerCase();
    return title.includes(q) || name.includes(q) || pName.includes(q) || cat.includes(q);
  });
});
</script>
