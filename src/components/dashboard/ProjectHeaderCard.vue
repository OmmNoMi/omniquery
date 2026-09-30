<template>
  <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700/80 relative overflow-hidden space-y-3">
    <!-- Subtle Ambient Glow -->
    <div class="absolute -right-12 -top-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

    <!-- Top Eyebrow: Active Project Badge & Workspace -->
    <div class="flex items-center justify-between gap-2 flex-wrap relative z-10">
      <div class="flex items-center gap-1.5">
        <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
          🏛️ {{ __('Active Project') }}
        </span>
        <span v-if="activeProjectMeta.workspace_title" class="text-xs text-slate-400 font-medium">
          · {{ activeProjectMeta.workspace_title }}
        </span>
      </div>

      <!-- Quick Switcher if Multiple Projects Exist -->
      <div v-if="projectOptions.length > 1" class="relative">
        <select
          :value="selectedProject"
          @change="onProjectChange($event.target.value)"
          class="bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option v-for="proj in projectOptions" :key="proj.id" :value="proj.id">
            {{ proj.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Main Project Title & Grantor Organization -->
    <div class="relative z-10 space-y-1">
      <h1 class="text-base sm:text-xl font-black text-white tracking-tight leading-snug">
        {{ activeProjectMeta.project_name || activeProjectMeta.title || __('Field Survey Project') }}
      </h1>
      <p v-if="activeProjectMeta.grantor_organization" class="text-xs text-slate-300 font-medium leading-relaxed">
        {{ activeProjectMeta.grantor_organization }}
      </p>
    </div>

    <!-- Bottom Action Ribbon: Project Details & Training Materials Button -->
    <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap relative z-10">
      <div class="flex items-center gap-2 text-xs text-slate-300 font-medium">
        <span class="inline-flex items-center gap-1 text-emerald-400 font-bold">
          <span>✓</span>
          <span>{{ surveyCount }} {{ __('Surveys Active') }}</span>
        </span>
      </div>

      <button
        type="button"
        @click="$emit('open-project-details')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 active:scale-95 text-xs font-bold text-slate-100 transition shadow-xs cursor-pointer"
      >
        <span>📚</span>
        <span>{{ __('Project Details & Training Materials') }}</span>
        <span>→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
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

const projectOptions = computed(() => {
  const map = new Map();
  for (const t of props.templates) {
    const id = t.project || "default";
    const label = t.project_name || t.project || "General Project";
    if (!map.has(id)) {
      map.set(id, { id, label });
    }
  }
  return Array.from(map.values());
});

const activeProjectMeta = computed(() => {
  if (props.selectedProject && props.selectedProject !== "ALL") {
    const match = props.templates.find((t) => t.project === props.selectedProject);
    if (match) {
      return {
        project_name: match.project_name || match.project,
        grantor_organization: match.grantor_organization || "State Rural Livelihoods Mission / SVEP",
        workspace_title: match.workspace_title || match.workspace,
      };
    }
  }
  const first = props.templates[0];
  return {
    project_name: first?.project_name || first?.project || "SHG Rajasthan Women Entrepreneurs Study",
    grantor_organization: first?.grantor_organization || "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP",
    workspace_title: first?.workspace_title || first?.workspace || "National Rural Livelihoods Mission",
  };
});

const surveyCount = computed(() => {
  if (props.selectedProject && props.selectedProject !== "ALL") {
    return props.templates.filter((t) => t.project === props.selectedProject).length;
  }
  return props.templates.length;
});

function onProjectChange(val) {
  emit("update:selectedProject", val);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("omniquery_selected_project", val);
  }
}
</script>
