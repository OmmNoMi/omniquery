<template>
  <div class="p-6 sm:p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-4">
    <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-xs">
      <Check class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
    </div>
    <div>
      <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ isGuest ? __('Thank you') : __('Survey Submitted') }}
      </h2>
      <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
        {{ isGuest ? __('Thank you for taking the time to complete this survey. Your response has been submitted successfully.') : __('Response recorded successfully in offline queue.') }}
      </p>
    </div>

    <!-- Survey response code / Reference ID Card -->
    <div class="max-w-md mx-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2.5 shadow-2xs">
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span class="uppercase tracking-wider font-bold text-[10px] text-slate-400 dark:text-slate-500">
          {{ __('Survey response code') }}
        </span>
        <Button
          v-if="submittedResponseId"
          @click="$emit('copy-response-code')"
          class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline cursor-pointer active:scale-95 transition"
        >
          <Check v-if="hasCopiedCode" class="w-3.5 h-3.5" />
          <ClipboardList v-else class="w-3.5 h-3.5" />
          <span>{{ hasCopiedCode ? __('Copied') : __('Copy Code') }}</span>
        </Button>
      </div>

      <div class="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
        <code class="font-mono text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 select-all tracking-tight break-all">
          {{ submittedResponseId || __('Generating...') }}
        </code>
        <span
          class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1"
          :class="isSubmissionSynced ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'"
        >
          <Check v-if="isSubmissionSynced" class="w-3 h-3 text-emerald-600" />
          <Zap v-else class="w-3 h-3 text-amber-500" />
          <span>{{ isSubmissionSynced ? __('Synced') : __('Queued') }}</span>
        </span>
      </div>

      <!-- Direct Sync Action if in offline queue -->
      <div v-if="!isSubmissionSynced" class="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded-lg text-xs">
        <span class="text-amber-800 dark:text-amber-300 font-medium">
          {{ isOnline ? __('Waiting to upload to server') : __('Stored locally. Will auto-sync when online') }}
        </span>
        <Button
          v-if="isOnline"
          @click="$emit('sync-submitted-now')"
          :disabled="isSyncingSubmission"
          class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
        >
          <Zap v-if="!isSyncingSubmission" class="w-3 h-3" />
          <span>{{ isSyncingSubmission ? __('Syncing...') : __('Sync Now') }}</span>
        </Button>
      </div>

      <div v-if="activeTemplate" class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
        <span class="truncate pr-2 flex items-center gap-1">
          <ClipboardList class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span class="truncate">{{ activeTemplate.title || activeTemplate.name }}</span>
        </span>
        <span class="shrink-0 font-mono">{{ submittedTimestamp || 'Just now' }}</span>
      </div>
    </div>

    <div class="flex justify-center gap-3 pt-2">
      <Button
        @click="$emit('reset-survey')"
        class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-95 transition shadow-xs cursor-pointer flex items-center gap-1.5"
      >
        <Plus class="w-4 h-4" />
        <span>{{ isGuest ? __('Fill Again') : __('New Response') }}</span>
      </Button>
      <Button
        v-if="!isGuest"
        @click="$emit('go-home')"
        class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
      >
        {{ __('All Surveys') }}
      </Button>
    </div>
  </div>
</template>

<script setup>
import { Button } from "frappe-ui";
import { Check, ClipboardList, Plus, Zap } from "lucide-vue-next";
import { useTranslation } from "../composables/useTranslation";

defineProps({
  isGuest: Boolean,
  submittedResponseId: String,
  hasCopiedCode: Boolean,
  isSubmissionSynced: Boolean,
  isOnline: Boolean,
  isSyncingSubmission: Boolean,
  activeTemplate: Object,
  submittedTimestamp: String,
});

defineEmits(["copy-response-code", "sync-submitted-now", "reset-survey", "go-home"]);

const { __ } = useTranslation();
</script>
