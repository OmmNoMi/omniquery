<template>
  <header class="sticky top-0 z-40 bg-[#d0ded3] dark:bg-[#142019] border-b border-[#b8cdbf] dark:border-[#1f3026] shadow-xs">
    <div class="max-w-3xl mx-auto px-3 sm:px-4 h-13 flex items-center justify-between">
      <!-- Left: Back Chevron & OmniQuery Wordmark -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Home / Exit Form Button (when in survey) -->
        <Button
          v-if="showBack"
          @click="$emit('exit')"
          class="w-8 h-8 rounded-full flex items-center justify-center bg-[#e6efe8] dark:bg-[#1c2c22] hover:bg-white dark:hover:bg-[#253a2d] active:scale-95 text-slate-800 dark:text-emerald-100 border border-[#b8cdbf] dark:border-[#2a4033] transition"
          :label="__('Return to Home')"
          :title="__('Return to Home')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Button>

        <!-- Logo: a real link home. A plain click stays in the app (home, or the exit dialog mid-survey);
             .exact leaves cmd/ctrl/shift-click to the browser, so it can open a new tab. The visible
             wordmark names the link, so the icon is decorative. -->
        <a
          href="/omniquery"
          @click.left.exact.prevent="$emit('home')"
          class="flex items-center gap-2 cursor-pointer select-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3"
        >
          <img
            :src="'/assets/omniquery/icons/desktop_icons/solid/omniquery.svg'"
            alt=""
            class="w-7 h-7 rounded-lg shadow-xs"
          />
          <span class="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">OmniQuery</span>
        </a>
      </div>

      <!-- Right: Progress Chip, Google Meet-style Microphone, and User Avatar -->
      <div class="flex items-center gap-2">
        <!-- Chip 1: Overall Progress in Percentage -->
        <div
          v-if="showBack"
          class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#e6efe8] dark:bg-[#1c2c22] border border-[#b8cdbf] dark:border-[#2a4033] text-slate-800 dark:text-emerald-100 flex items-center gap-1 shadow-2xs select-none"
          :title="__('Overall Form Progress')"
        >
          <span class="text-[11px] font-mono font-black text-emerald-700 dark:text-emerald-300">{{ progressPercent }}%</span>
        </div>

        <!-- Pending WAL Queue Offline Badge Pill -->
        <Button
          v-if="!isGuest && pendingWALCount > 0"
          @click="$emit('open-wal')"
          class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#fffbeb] dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition select-none hover:bg-amber-100 dark:hover:bg-amber-900/60"
          :title="`${pendingWALCount} ${__('Pending Offline Responses')} - ${__('Click to view & sync')}`"
          :label="`${pendingWALCount} ${__('Pending Offline Responses')}`"
        >
          <Zap class="w-3.5 h-3.5 leading-none" />
          <span class="font-bold text-xs leading-none text-amber-900 dark:text-amber-200">{{ pendingWALCount }}</span>
        </Button>

        <!-- Chip 2: Microphone Recording Button (only for logged-in surveyors) -->
        <Button
          v-if="showBack && !isGuest"
          @click="$emit('toggle-audio')"
          class="relative w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
          :class="[
            isRecording && !isAudioPaused
              ? 'bg-white dark:bg-[#1c2c22] text-slate-800 dark:text-white border border-[#b8cdbf] dark:border-[#2a4033] hover:bg-slate-50'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
          ]"
          :title="isRecording && !isAudioPaused ? __('Mute microphone') : __('Unmute / record microphone')"
          :label="isRecording && !isAudioPaused ? __('Mute microphone') : __('Unmute / record microphone')"
        >
          <!-- Mic Active Icon -->
          <svg
            v-if="isRecording && !isAudioPaused"
            class="w-4 h-4 text-slate-700 dark:text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <!-- Mic Muted Icon -->
          <svg
            v-else
            class="w-4 h-4 text-rose-600 dark:text-rose-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>

          <!-- Red Recording Dot -->
          <span
            v-if="isRecording && !isAudioPaused"
            class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#d0ded3] dark:border-[#142019] bg-rose-600 animate-pulse"
            :title="__('Recording Live')"
          />
          <span
            v-else
            class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#d0ded3] dark:border-[#142019] bg-slate-400"
            :title="__('Muted')"
          />
        </Button>

        <!-- Guest Login Button -->
        <a
          v-if="isGuest"
          href="/login?redirect-to=/omniquery"
          class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 no-underline"
          :title="__('Sign in with your OmniQuery surveyor or admin account')"
        >
          <KeyRound class="w-3.5 h-3.5" />
          <span>{{ __('Login') }}</span>
        </a>

        <!-- User Avatar Icon with Live Green Dot (Logged-in surveyor only) -->
        <Button
          v-else
          variant="solid"
          :label="__('Settings & Configuration')"
          ref="avatarRef"
          class="relative !h-9 !w-9 !px-0 rounded-full font-black select-none active:scale-95"
          @click="showConfigModal = true"
        >
          <span>{{ userInitial }}</span>

          <!-- Green Dot Indicator Positioned on the User Icon -->
          <span
            :class="[
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#d0ded3] dark:border-[#142019]',
              isOnline ? 'bg-emerald-500' : 'bg-amber-400'
            ]"
            :title="isOnline ? 'Online' : 'Offline'"
          />

          <!-- Pending WAL Alert Badge -->
          <span
            v-if="pendingWALCount > 0"
            class="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs"
          >
            !
          </span>
        </Button>
      </div>
    </div>

    <!-- Settings: a frappe-ui Dialog (reka), which traps focus, makes the page behind it inert, locks
      scrolling, closes on Escape only when it is the topmost layer, and gives focus back to the avatar -->
    <Dialog v-model="showConfigModal" :options="{ size: 'md' }">
      <template #body>
        <div class="p-5 space-y-4">
          <!-- Who is signed in, and the close button -->
          <div class="flex items-center justify-between gap-3 pb-3 border-b border-outline-gray-1">
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-12 h-12 shrink-0 rounded-full bg-surface-gray-7 text-ink-white font-black flex items-center justify-center text-sm" aria-hidden="true">
                {{ userInitial }}
                <span :class="['absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-outline-white', isOnline ? 'bg-emerald-500' : 'bg-amber-500']" />
              </div>
              <div class="min-w-0">
                <DialogTitle as="h3" class="text-sm font-bold text-ink-gray-9 leading-tight truncate">{{ userDisplayName }}</DialogTitle>
                <p v-if="userEmail && userEmail !== userDisplayName" class="text-xs text-ink-gray-6 mt-0.5 truncate">{{ userEmail }}</p>
                <DialogDescription as="p" class="text-xs font-semibold text-ink-gray-6 mt-1">
                  {{ isOnline ? __('Online') : __('Offline') }} · {{ roleLabel }}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="md" :icon="X" :label="__('Close settings')" :title="__('Close settings')" @click="showConfigModal = false" />
          </div>

          <!-- Preferences: each row is a frappe-ui TabButtons radio group, named by its row label -->
          <div class="rounded-2xl border border-outline-gray-1 bg-surface-gray-1 divide-y divide-outline-gray-1">
            <div v-for="row in preferenceRows" :key="row.id" class="p-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2 text-ink-gray-8">
                <component :is="row.icon" class="w-4 h-4 text-ink-gray-5" aria-hidden="true" />
                <span :id="row.id" class="text-xs font-bold">{{ row.label }}</span>
              </div>
              <TabButtons :aria-labelledby="row.id" :buttons="row.buttons" :modelValue="row.value" @update:modelValue="row.set" />
            </div>
          </div>

          <!-- Responses waiting to upload -->
          <div class="p-3.5 rounded-2xl border border-outline-gray-1 bg-surface-gray-1 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-1.5 text-xs font-bold text-ink-gray-8">
                <Package class="w-4 h-4 text-ink-gray-5" aria-hidden="true" />
                <span>{{ __('Waiting to upload') }}</span>
              </div>
              <p class="text-xs text-ink-gray-6 mt-0.5">{{ __('{0} pending responses', [pendingWALCount]) }}</p>
            </div>
            <Button variant="solid" :disabled="pendingWALCount === 0" @click="triggerSync">
              <template #prefix><Zap class="w-3.5 h-3.5" aria-hidden="true" /></template>
              {{ __('Sync Now') }}
            </Button>
          </div>

          <!-- Account: /me is a server page the service worker does not cache, so offline it would replace the app with an error -->
          <div class="flex items-center justify-between gap-3 text-xs px-1">
            <span class="text-ink-gray-6 font-medium">{{ __('Your account') }}</span>
            <a v-if="isOnline" href="/me" class="font-bold text-ink-gray-8 underline underline-offset-2 flex items-center gap-1 min-h-6 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3">
              <span>{{ __('My Account') }}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <span v-else class="text-ink-gray-6">{{ __('My Account needs internet') }}</span>
          </div>

          <!-- Manager review workspace -->
          <div v-if="isManager" class="flex items-center justify-between gap-3 text-xs px-1">
            <span class="text-ink-gray-6 font-medium">{{ __('OmniQuery Review Workspace') }}</span>
            <a href="/desk/omniquery" class="font-bold text-ink-gray-8 underline underline-offset-2 flex items-center gap-1 min-h-6 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3">
              <span>{{ __('Open Desk') }}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <Button variant="subtle" size="lg" class="w-full" @click="showConfigModal = false">{{ __('Done') }}</Button>
        </div>
      </template>
    </Dialog>
  </header>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { Button, Dialog, TabButtons } from "frappe-ui";
import { DialogDescription, DialogTitle } from "reka-ui";
import { Zap, KeyRound, Globe, Languages, Palette, Sun, Moon, LayoutGrid, ChevronDown, Package, X } from "lucide-vue-next";
import { useTranslation } from "../../composables/useTranslation";
import { useUserRoles } from "../../composables/useUserRoles";
import { useSession } from "../../composables/useSession";
import { useOmniqueryContext } from "../../composables/useSurveyApp";
import { THEME_KEY, storedTheme, applyTheme } from "../../utils/theme";

defineProps({
  surveyTitle: {
    type: String,
    default: "",
  },
  showBack: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["exit", "home", "open-wal", "cycle-text-size", "set-text-size", "toggle-audio"]);
const { __, currentLang, setLanguage } = useTranslation();

const showConfigModal = ref(false);
const avatarRef = ref(null);
const activeTheme = ref(storedTheme());

const { email: userEmail, displayName: userDisplayName, userInitial } = useSession();

const { isOnline, pendingWALCount, textSize, progressPercent, isRecording, isAudioPaused } = useOmniqueryContext();
const { isGuest, isManager, isSurveyor, isAdmin } = useUserRoles();

const roleLabel = computed(() => {
  if (isAdmin.value) return __("OmniQuery Admin");
  if (isManager.value) return __("OmniQuery Manager");
  if (isSurveyor.value) return __("Field Surveyor");
  return __("Public Respondent");
});

function setTextScale(size) {
  emit("set-text-size", size);
}

function setAppTheme(theme) {
  activeTheme.value = theme;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(theme);
}

// Sync Now opens the offline queue dialog in place of this one. Settings closes first, so it stops
// trapping focus, and the avatar takes focus before the queue opens: the queue then records the
// avatar, not the vanishing Sync Now button, as the place to return focus to (as SurveyModeMenu does).
async function triggerSync() {
  showConfigModal.value = false;
  await nextTick();
  avatarRef.value?.rootRef?.focus(); // frappe-ui Button exposes its DOM element as rootRef
  emit("open-wal");
}

const activeChoiceMode = ref(
  (typeof localStorage !== "undefined" && localStorage.getItem("omniquery_choice_mode")) || "grid"
);

function setChoiceMode(mode) {
  activeChoiceMode.value = mode;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("omniquery_choice_mode", mode);
    window.dispatchEvent(new CustomEvent("omniquery:choicemode", { detail: mode }));
  }
}

// The preference rows of the settings dialog, one TabButtons radio group each
const preferenceRows = computed(() => [
  {
    id: "oq_settings_language",
    label: __("Language"),
    icon: Globe,
    value: currentLang.value,
    set: setLanguage,
    buttons: [
      { label: "English", value: "en" },
      { label: "हिन्दी", value: "hi" },
    ],
  },
  {
    id: "oq_settings_text_size",
    label: __("Text size"),
    icon: Languages,
    value: textSize.value,
    set: setTextScale,
    buttons: [
      { label: "A", value: "md" },
      { label: "A+", value: "lg" },
      { label: "A++", value: "xl" },
    ],
  },
  {
    id: "oq_settings_theme",
    label: __("Theme"),
    icon: Palette,
    value: activeTheme.value,
    set: setAppTheme,
    buttons: [
      { label: __("Light"), value: "light", icon: Sun },
      { label: __("Dark"), value: "dark", icon: Moon },
    ],
  },
  {
    id: "oq_settings_choice_layout",
    label: __("Choice layout"),
    icon: LayoutGrid,
    value: activeChoiceMode.value,
    set: setChoiceMode,
    buttons: [
      { label: __("Grid"), value: "grid", icon: LayoutGrid },
      { label: __("Dropdown"), value: "combobox", icon: ChevronDown },
    ],
  },
]);

defineExpose({
  roleLabel,
  isGuest,
  isManager,
  showConfigModal
});
</script>
