<template>
  <div class="space-y-2 w-full max-w-full min-w-0">
    <!-- Top Row Context: Project Counter & Quick Dots -->
    <div v-if="projectList.length > 1" class="flex items-center justify-between px-1 text-xs">
      <div class="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
        <span>🏛️</span>
        <span>{{ __('Active Project') }} ({{ activeIndex + 1 }} {{ __('of') }} {{ projectList.length }})</span>
      </div>

      <!-- Quick Dots Indicator -->
      <div class="flex items-center gap-1.5">
        <span
          v-for="(_, idx) in projectList"
          :key="idx"
          @click="scrollToIndex(idx)"
          class="h-1.5 rounded-full transition-all duration-200 cursor-pointer"
          :class="idx === activeIndex ? 'w-5 bg-emerald-600' : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'"
          :title="`${__('Switch to Project')} ${idx + 1}`"
        />
      </div>
    </div>

    <!-- Carousel Container with Prominent On-Card Navigation Chevrons -->
    <div class="relative w-full max-w-full min-w-0 group">
      <!-- On-Card Left Carousel Arrow -->
      <button
        v-if="projectList.length > 1"
        type="button"
        @click.stop="scrollToIndex(activeIndex - 1)"
        :disabled="activeIndex === 0"
        class="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-0 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
        :title="__('Previous Project')"
        aria-label="Previous Project"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- On-Card Right Carousel Arrow -->
      <button
        v-if="projectList.length > 1"
        type="button"
        @click.stop="scrollToIndex(activeIndex + 1)"
        :disabled="activeIndex === projectList.length - 1"
        class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-0 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
        :title="__('Next Project')"
        aria-label="Next Project"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Scrollable Snap Container -->
      <div
        ref="scrollContainerRef"
        @scroll.passive="handleScroll"
        class="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar scroll-smooth w-full max-w-full min-w-0"
      >
        <div
          v-for="(proj, idx) in projectList"
          :key="proj.id"
          :data-project-index="idx"
          class="snap-start shrink-0 w-full min-w-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 relative space-y-3 transition-all duration-200"
          :class="[
            projectList.length > 1 ? 'px-8 sm:px-12' : '',
            selectedProject === proj.id || (selectedProject === 'ALL' && idx === 0)
              ? 'ring-1 ring-emerald-500/40 border-emerald-300 dark:border-emerald-700/60'
              : ''
          ]"
        >
          <!-- Top Row: Active Badge & Workspace Context -->
          <div class="flex items-center justify-between gap-2 flex-wrap min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <span>🏛️</span>
                <span>{{ __('Active Project') }}</span>
              </span>
              <span v-if="proj.workspace_title" class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate min-w-0">
                · {{ proj.workspace_title }}
              </span>
            </div>

            <div v-if="projectList.length > 1" class="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
              {{ idx + 1 }} / {{ projectList.length }}
            </div>
          </div>

          <!-- Project Title & Grantor Organization -->
          <div class="space-y-1 min-w-0">
            <h1 class="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words">
              {{ proj.project_name }}
            </h1>
            <p v-if="proj.grantor_organization" class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {{ proj.grantor_organization }}
            </p>
            <p v-if="proj.description" class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-0.5">
              {{ proj.description }}
            </p>
          </div>

          <!-- Project Surveys Count & Offline Readiness Strip -->
          <div class="flex items-center justify-between gap-2 pt-1 text-xs flex-wrap min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-slate-700 dark:text-slate-300">
                📋 {{ getProjectSurveys(proj.id).length }} {{ __('Surveys') }}
              </span>
              <span>·</span>
              <span
                v-if="isProjectFullyCached(proj.id)"
                class="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{{ __('All Downloaded Offline') }}</span>
              </span>
              <span v-else class="text-slate-500 dark:text-slate-400 font-medium">
                {{ getProjectCachedCount(proj.id) }}/{{ getProjectSurveys(proj.id).length }} {{ __('Ready Offline') }}
              </span>
            </div>

            <!-- Download All for Offline Button -->
            <button
              v-if="!isProjectFullyCached(proj.id) && isOnline && getProjectSurveys(proj.id).length > 0"
              type="button"
              @click.stop="$emit('download-project-surveys', proj.id)"
              class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-[11px] transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
              :title="__('Download all survey templates for this project so they can be filled offline')"
            >
              <span>⬇️</span>
              <span>{{ __('Download All for Offline') }}</span>
            </button>
          </div>

          <!-- Bottom Action Row: On-Card Interactive Switcher + Training Materials -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap min-w-0">
            <!-- Carousel Switcher Controls directly on Card -->
            <div v-if="projectList.length > 1" class="flex items-center gap-1.5">
              <button
                type="button"
                @click.stop="scrollToIndex(activeIndex - 1)"
                :disabled="activeIndex === 0"
                class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer flex items-center gap-1"
                :title="__('Previous Project')"
              >
                <span>←</span>
                <span class="hidden sm:inline">{{ __('Prev') }}</span>
              </button>

              <div class="flex items-center gap-1 px-1">
                <span
                  v-for="(_, dotIdx) in projectList"
                  :key="dotIdx"
                  @click.stop="scrollToIndex(dotIdx)"
                  class="h-2 rounded-full transition-all duration-200 cursor-pointer"
                  :class="dotIdx === activeIndex ? 'w-5 bg-emerald-600' : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'"
                />
              </div>

              <button
                type="button"
                @click.stop="scrollToIndex(activeIndex + 1)"
                :disabled="activeIndex === projectList.length - 1"
                class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer flex items-center gap-1"
                :title="__('Next Project')"
              >
                <span class="hidden sm:inline">{{ __('Next') }}</span>
                <span>→</span>
              </button>
            </div>
            <div v-else class="text-[11px] text-slate-400 font-medium"></div>

            <button
              type="button"
              @click.stop="$emit('open-project-details', proj.id)"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            >
              <span>📚</span>
              <span>{{ __('Project Details & Training Materials') }}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  templates: {
    type: Array,
    default: () => [],
  },
  selectedProject: {
    type: String,
    default: "ALL",
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
  "update:selectedProject",
  "open-project-details",
  "download-project-surveys",
]);

const { __ } = useTranslation();

function getProjectSurveys(projId) {
  if (projId === "ALL") return props.templates;
  return props.templates.filter((t) => (t.project || "default") === projId || t.project_name === projId);
}

function getProjectCachedCount(projId) {
  const surveys = getProjectSurveys(projId);
  return surveys.filter((t) => Boolean(props.cachedTemplatesMap && props.cachedTemplatesMap[t.name])).length;
}

function isProjectFullyCached(projId) {
  const surveys = getProjectSurveys(projId);
  if (!surveys.length) return false;
  return surveys.every((t) => Boolean(props.cachedTemplatesMap && props.cachedTemplatesMap[t.name]));
}

const scrollContainerRef = ref(null);
const activeIndex = ref(0);

// Deduplicate projects strictly by canonical project_name so aliases or duplicate records collapse into 1
const projectList = computed(() => {
  const map = new Map();

  for (const t of props.templates) {
    const rawName = t.project_name || t.project || "SHG Rajasthan Women Entrepreneurs Study";
    const normKey = rawName.toLowerCase().trim();

    if (!map.has(normKey)) {
      map.set(normKey, {
        id: t.project || "OQP-001-001",
        project_name: rawName,
        grantor_organization: t.grantor_organization || "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
        workspace_title: t.workspace_title || t.workspace || "National Rural Livelihoods Mission",
        description: t.project_description || t.description || "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan",
      });
    }
  }

  if (map.size === 0) {
    map.set("shg rajasthan women entrepreneurs study", {
      id: "OQP-001-001",
      project_name: "SHG Rajasthan Women Entrepreneurs Study",
      grantor_organization: "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
      workspace_title: "National Rural Livelihoods Mission",
      description: "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan",
    });
  }

  return Array.from(map.values());
});

let scrollTimer = null;

function handleScroll() {
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    updateActiveFromScroll();
  }, 60);
}

function updateActiveFromScroll() {
  const container = scrollContainerRef.value;
  if (!container) return;

  const scrollLeft = container.scrollLeft;
  const width = container.offsetWidth;
  if (width <= 0) return;

  const newIndex = Math.round(scrollLeft / width);
  if (newIndex >= 0 && newIndex < projectList.value.length && newIndex !== activeIndex.value) {
    activeIndex.value = newIndex;
    const proj = projectList.value[newIndex];
    if (proj && proj.id !== props.selectedProject) {
      selectProject(proj.id);
    }
  }
}

function scrollToIndex(idx) {
  if (idx < 0 || idx >= projectList.value.length) return;
  activeIndex.value = idx;
  const container = scrollContainerRef.value;
  if (container) {
    const width = container.offsetWidth;
    container.scrollTo({ left: idx * width, behavior: "smooth" });
  }
  const proj = projectList.value[idx];
  if (proj) {
    selectProject(proj.id);
  }
}

function selectProject(projId) {
  emit("update:selectedProject", projId);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("omniquery_selected_project", projId);
  }
}

onMounted(() => {
  nextTick(() => {
    if (props.selectedProject && props.selectedProject !== "ALL") {
      const idx = projectList.value.findIndex((p) => p.id === props.selectedProject);
      if (idx > 0) {
        scrollToIndex(idx);
      }
    }
  });
});
</script>
