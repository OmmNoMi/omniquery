<template>
  <div class="space-y-3">
    <div v-if="surveys.length > 0" class="flex items-center justify-between text-xs px-1 font-bold text-slate-600 dark:text-slate-300 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <span>{{ __('Select a survey to start collecting field data') }}</span>
        <span>·</span>
        <span class="text-emerald-700 dark:text-emerald-400 font-bold">
          {{ cachedSurveysCount }}/{{ surveys.length }} {{ __('Ready Offline') }}
        </span>
      </div>

      <Button
        v-if="cachedSurveysCount < surveys.length && isOnline"
        @click="$emit('download-project-surveys', projectId)"
        class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
      >
        <Download class="w-3.5 h-3.5" />
        <span>{{ __('Download all for offline') }}</span>
      </Button>
    </div>

    <div v-if="surveys.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
      <Inbox class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
      <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ __('No published surveys found for this project') }}</h3>
      <p class="text-xs text-slate-500">{{ __('Please check with your field supervisor or reload your template list.') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <div
        v-for="s in surveys"
        :key="s.name"
        class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between gap-4 group"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200/60 dark:border-emerald-800/60">
              {{ s.target_category || __('Survey') }}
            </span>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
              v{{ s.version || '1.0' }}
            </span>
          </div>

          <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {{ s.title || s.name }}
          </h3>

          <!-- only a description of the survey's own: the project's is in the page header (#18) -->
          <p v-if="addsFact(s.description, s.title || s.name, ...shownFacts)" class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {{ s.description }}
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
              class="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
              <span>{{ __('Requires Internet to Download') }}</span>
            </span>
          </div>

          <Button
            @click="$emit('select-survey', s.name)"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{{ __('Start Survey') }}</span>
            <span>→</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Button } from "frappe-ui";
import { Download, Inbox, AlertTriangle } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";
import { addsFact } from "../../utils/text";

// A project's surveys, each ready to fill or download for offline use
const props = defineProps({
  surveys: { type: Array, default: () => [] },
  cachedTemplatesMap: { type: Object, default: () => ({}) },
  isOnline: { type: Boolean, default: true },
  projectId: { type: String, required: true },
  // what the page already shows above the list (the project's title, grantor and description),
  // so a survey description that only repeats one of them is not shown again
  shownFacts: { type: Array, default: () => [] },
});

defineEmits(["select-survey", "download-survey", "download-project-surveys"]);

const { __ } = useTranslation();

const cachedSurveysCount = computed(
  () => props.surveys.filter((s) => Boolean(props.cachedTemplatesMap?.[s.name])).length
);
</script>
