<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none antialiased w-full max-w-full overflow-x-hidden">
    <!-- Live Region for Screen Readers (WCAG 2.2 AA) -->
    <div id="omniquery-live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ s.liveAnnouncementText }}
    </div>

    <!-- 1. Sleek Native Mobile Header (At most 2 props; session & WAL injected) -->
    <CompactHeader
      :surveyTitle="s.headerTitle"
      :showBack="Boolean(s.activeTemplate || s.activeProjectId)"
      @exit="s.onExit"
      @home="s.onHome"
      @open-wal="s.showWALDrawer = true"
      @cycle-text-size="s.cycleTextSize"
      @set-text-size="s.setTextSize"
      @toggle-audio="s.toggleAudio"
    />

    <!-- 2. Main View Container -->
    <main :class="['flex-1 w-full min-w-0 mx-auto p-3 sm:p-6 transition-all', s.activeProjectId ? 'max-w-4xl' : 'max-w-3xl', s.activeSection ? 'pb-0' : 'pb-24']">
      <!-- Loading State -->
      <div v-if="s.isLoading" class="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center select-none">
        <div class="relative mb-3">
          <img :src="'/assets/omniquery/icons/desktop_icons/solid/omniquery.svg'" alt="OmniQuery" class="w-16 h-16 rounded-2xl shadow-sm" onerror="this.onerror=null; this.src='/assets/omniquery/pwa/icon-192.png';" />
          <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-100 dark:border-slate-900" />
        </div>
        <h2 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">OmniQuery</h2>
        <p class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-4">Field Intelligence Platform</p>
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
          <div class="animate-spin inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
          <span>{{ s.__('Loading surveys & workspace...') }}</span>
        </div>
      </div>

      <!-- Views read the session from provideSurveyApp() instead of taking props -->
      <SuccessView v-else-if="s.isSubmitted" />
      <SurveyView v-else-if="s.activeSection" />

      <!-- Dedicated Project Page View -->
      <ProjectPage
        v-else-if="s.activeProjectId"
        :projectId="s.activeProjectId" :templates="s.availableTemplates" :cachedTemplatesMap="s.cachedTemplatesMap" :isOnline="s.isOnline"
        @back="s.closeProjectPage" @select-survey="s.selectSurvey" @download-survey="s.handleDownloadSurvey" @download-project-surveys="s.handleDownloadProjectSurveys"
      />

      <!-- Survey Catalog Hub & Surveyor KPI Dashboard View -->
      <CatalogView v-else />
    </main>

    <!-- frappe-ui Dialogs: focus trap, focus return, scroll lock and topmost-only Escape -->
    <Dialog v-model="s.showWALDrawer" :options="{ title: s.__('Offline Sync Queue'), size: 'md' }">
      <template #body-content>
      <div class="space-y-4">
        <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div class="font-extrabold flex items-center justify-between">
            <span>{{ s.pendingWALCount }} {{ s.__('Pending Submissions In Device Memory') }}</span>
          </div>
          <DialogDescription as="p" class="text-[11px] text-amber-800/80 dark:text-amber-300">
            {{ s.__('These records are saved safely in local offline storage. When connected, tap Force Sync All to push to the server.') }}
          </DialogDescription>
        </div>
        <div class="space-y-2 pt-1">
          <Button @click="s.triggerSync" :disabled="!s.isOnline" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
            <Zap class="w-4 h-4" />
            <span>{{ s.__('Sync all records now') }}</span>
          </Button>
          <Button @click="s.openRecoveryFromWALDrawer" class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <ClipboardList class="w-4 h-4 text-emerald-600" />
            <span>{{ s.__('View saved responses') }}</span>
          </Button>
        </div>
      </div>
      </template>
    </Dialog>

    <Dialog v-model="s.showExitDialog" :options="{ size: 'sm' }">
      <template #body>
      <div class="p-6 text-center space-y-4">
        <div class="w-13 h-13 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-xs" :class="s.isGuest ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'">
          <KeyRound v-if="s.isGuest" class="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          <AlertTriangle v-else class="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div class="space-y-1">
          <DialogTitle as="h3" class="text-base font-extrabold text-slate-900 dark:text-white">{{ s.isGuest ? s.__('Go to Login?') : s.__('Exit Survey?') }}</DialogTitle>
          <DialogDescription as="p" class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{{ s.isGuest ? s.__('Sign in with your OmniQuery account for full surveyor and management access.') : s.__('Your responses are saved in offline drafts. Return to the survey list?') }}</DialogDescription>
        </div>
        <div class="grid grid-cols-2 gap-2.5 pt-2">
          <Button @click="s.showExitDialog = false" class="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer">{{ s.isGuest ? s.__('Stay Here') : s.__('Stay') }}</Button>
          <Button @click="s.confirmExit" :class="s.isGuest ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'" class="w-full py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm active:scale-95 transition shadow-xs cursor-pointer">{{ s.isGuest ? s.__('Login') : s.__('Exit') }}</Button>
        </div>
      </div>
      </template>
    </Dialog>

    <!-- Filled Forms Verification & Data Recovery Modal -->
    <FilledFormsModal :isOpen="s.showFilledFormsModal" :initialFilter="s.filledFormsInitialFilter" :isOnline="s.isOnline" :templates="s.availableTemplates" @close="s.showFilledFormsModal = false" @sync-all="s.triggerSync" @resume-draft="s.handleResumeDraftFromModal" @drafts-changed="s.loadActiveDrafts" />
  </div>
</template>

<script setup>
import { Button, Dialog } from "frappe-ui";
import { DialogDescription, DialogTitle } from "reka-ui";
import { AlertTriangle, ClipboardList, KeyRound, Zap } from "lucide-vue-next";
import { provideSurveyApp } from "./composables/useSurveyApp";
import CompactHeader from "./components/header/CompactHeader.vue";
import ProjectPage from "./components/project/ProjectPage.vue";
import FilledFormsModal from "./components/dashboard/FilledFormsModal.vue";
import CatalogView from "./views/Catalog.vue";
import SurveyView from "./views/Survey.vue";
import SuccessView from "./views/Success.vue";

// reactive session: templates read s.isLoading as a value and writes like s.showWALDrawer = true land in the ref
const s = provideSurveyApp();
</script>
