<template>
  <div class="space-y-2">
    <!-- Carousel Navigation Controls & Project Counter (shown when multiple projects exist) -->
    <div v-if="projectList.length > 1" class="flex items-center justify-between px-1 text-xs">
      <div class="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
        <span>🏛️</span>
        <span>{{ __('Project') }} {{ activeIndex + 1 }} {{ __('of') }} {{ projectList.length }}</span>
        <span class="text-[10px] text-slate-400 font-normal">({{ __('Scroll right to switch') }})</span>
      </div>

      <!-- Arrow Controls & Pagination Dots -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="scrollToIndex(activeIndex - 1)"
          :disabled="activeIndex === 0"
          class="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          :title="__('Previous Project')"
        >
          ←
        </button>

        <div class="flex items-center gap-1">
          <span
            v-for="(_, idx) in projectList"
            :key="idx"
            @click="scrollToIndex(idx)"
            class="h-1.5 rounded-full transition-all duration-200 cursor-pointer"
            :class="idx === activeIndex ? 'w-4 bg-emerald-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'"
          />
        </div>

        <button
          type="button"
          @click="scrollToIndex(activeIndex + 1)"
          :disabled="activeIndex === projectList.length - 1"
          class="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          :title="__('Next Project')"
        >
          →
        </button>
      </div>
    </div>

    <!-- Horizontal Swipeable Project Cards Container (No dropdown, swipe right to switch!) -->
    <div
      ref="scrollContainerRef"
      @scroll.passive="handleScroll"
      class="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar scroll-smooth"
    >
      <div
        v-for="(proj, idx) in projectList"
        :key="proj.id"
        :data-project-index="idx"
        class="snap-start shrink-0 w-full bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border relative overflow-hidden space-y-3 transition-all duration-200"
        :class="[
          selectedProject === proj.id || (selectedProject === 'ALL' && idx === 0)
            ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
            : 'border-slate-700/80 opacity-90'
        ]"
      >
        <!-- Ambient Decorative Glow -->
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <!-- Top Row: Active Badge & Workspace Context -->
        <div class="flex items-center justify-between gap-2 flex-wrap relative z-10">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              🏛️ {{ __('Project Context') }}
            </span>
            <span v-if="proj.workspace_title" class="text-xs text-slate-400 font-medium truncate max-w-[200px]">
              · {{ proj.workspace_title }}
            </span>
          </div>

          <div v-if="projectList.length > 1" class="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
            {{ idx + 1 }} / {{ projectList.length }}
          </div>
        </div>

        <!-- Project Title & Grantor Organization (Clean Executive Presentation for Screenshots) -->
        <div class="relative z-10 space-y-1">
          <h1 class="text-base sm:text-lg font-black text-white tracking-tight leading-snug break-words">
            {{ proj.project_name }}
          </h1>
          <p v-if="proj.grantor_organization" class="text-xs text-slate-300 font-medium leading-relaxed">
            {{ proj.grantor_organization }}
          </p>
          <p v-if="proj.description" class="text-xs text-slate-400 line-clamp-2 pt-0.5">
            {{ proj.description }}
          </p>
        </div>

        <!-- Bottom Action: Project Details & Training Materials -->
        <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap relative z-10">
          <div class="text-[11px] text-slate-400 font-medium">
            <span v-if="projectList.length > 1" class="text-slate-400">
              {{ __('Swipe right for next project') }} →
            </span>
          </div>

          <button
            type="button"
            @click.stop="$emit('open-project-details')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 active:scale-95 text-xs font-bold text-slate-100 transition shadow-xs cursor-pointer"
          >
            <span>📚</span>
            <span>{{ __('Project Details & Training Materials') }}</span>
            <span>→</span>
          </button>
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
});

const emit = defineEmits(["update:selectedProject", "open-project-details"]);

const { __ } = useTranslation();

const scrollContainerRef = ref(null);
const activeIndex = ref(0);

const projectList = computed(() => {
  const map = new Map();
  for (const t of props.templates) {
    const id = t.project || "default";
    if (!map.has(id)) {
      map.set(id, {
        id,
        project_name: t.project_name || t.project || "SHG Rajasthan Women Entrepreneurs Study",
        grantor_organization: t.grantor_organization || "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
        workspace_title: t.workspace_title || t.workspace || "National Rural Livelihoods Mission",
        description: t.project_description || t.description || "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan",
      });
    }
  }

  if (map.size === 0) {
    map.set("OQP-001-001", {
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
