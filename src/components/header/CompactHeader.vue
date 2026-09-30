<template>
  <header class="sticky top-0 z-40 bg-[#d0ded3] dark:bg-[#142019] border-b border-[#b8cdbf] dark:border-[#1f3026] shadow-xs">
    <div class="max-w-3xl mx-auto px-3 sm:px-4 h-13 flex items-center justify-between">
      <!-- Left: Back Chevron & OmniQuery Wordmark -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Home / Exit Form Button (when in survey) -->
        <button
          v-if="showBack"
          type="button"
          @click="$emit('exit')"
          class="w-8 h-8 rounded-full flex items-center justify-center bg-[#e6efe8] dark:bg-[#1c2c22] hover:bg-white dark:hover:bg-[#253a2d] active:scale-95 text-slate-800 dark:text-emerald-100 border border-[#b8cdbf] dark:border-[#2a4033] transition"
          :aria-label="__('Return to Home')"
          :title="__('Return to Home')"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <!-- Official OmniQuery Cloud Icon & Brand Title -->
        <div class="flex items-center gap-2 cursor-pointer select-none" @click="$emit('home')">
          <img
            :src="'/assets/omniquery/icons/desktop_icons/solid/omniquery.svg'"
            alt="OmniQuery"
            class="w-7 h-7 rounded-lg shadow-xs"
          />
          <span class="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">OmniQuery</span>
        </div>
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

        <!-- Pending WAL Queue Offline Badge Pill (⚡ N, only for logged-in surveyors) -->
        <button
          v-if="!isGuest && pendingWALCount > 0"
          type="button"
          @click="$emit('open-wal')"
          class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#fffbeb] dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition select-none hover:bg-amber-100 dark:hover:bg-amber-900/60"
          :title="`${pendingWALCount} ${__('Pending Offline Responses')} - ${__('Click to view & sync')}`"
          :aria-label="`${pendingWALCount} ${__('Pending Offline Responses')}`"
        >
          <span class="text-xs leading-none">⚡</span>
          <span class="font-bold text-xs leading-none text-amber-900 dark:text-amber-200">{{ pendingWALCount }}</span>
        </button>

        <!-- Chip 2: Microphone Recording Button (only for logged-in surveyors) -->
        <button
          v-if="showBack && !isGuest"
          type="button"
          @click="$emit('toggle-audio')"
          class="relative w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
          :class="[
            isRecording && !isAudioPaused
              ? 'bg-white dark:bg-[#1c2c22] text-slate-800 dark:text-white border border-[#b8cdbf] dark:border-[#2a4033] hover:bg-slate-50'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
          ]"
          :title="isRecording && !isAudioPaused ? __('Mute microphone') : __('Unmute / record microphone')"
          :aria-label="isRecording && !isAudioPaused ? __('Mute microphone') : __('Unmute / record microphone')"
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
        </button>

        <!-- Guest Login Button -->
        <a
          v-if="isGuest"
          href="/login?redirect-to=/omniquery"
          class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 no-underline"
          :title="__('Sign in with your OmniQuery surveyor or admin account')"
        >
          <span>🔑</span>
          <span>{{ __('Login') }}</span>
        </a>

        <!-- User Avatar Icon with Live Green Dot (Logged-in surveyor only) -->
        <button
          v-else
          type="button"
          @click="showConfigModal = true"
          class="relative w-9 h-9 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-[#b8cdbf] transition cursor-pointer select-none"
          :title="__('Settings & Configuration')"
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
        </button>
      </div>
    </div>

    <!-- Unified Native Settings Bottom Sheet (Teleported to body with z-[9999] to completely overlay all chrome) -->
    <Teleport to="body">
      <div
        v-if="showConfigModal"
        class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end justify-center overscroll-contain select-none"
        @click.self="showConfigModal = false"
        @wheel.stop
        @touchmove.self.prevent
      >
        <div class="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto pb-safe overscroll-contain">
          <!-- iOS Grabber Bar -->
          <div class="w-12 h-1.5 bg-slate-300 rounded-full mx-auto"></div>

          <!-- Sheet Header: User Avatar & Live Status & WCAG 44x44 Close Button -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="relative w-12 h-12 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs ring-2 ring-emerald-100">
                {{ userInitial }}
                <span
                  :class="[
                    'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white',
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  ]"
                />
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 leading-tight">{{ userDisplayName }}</h3>
                <p class="text-xs text-slate-500 mt-0.5">{{ userEmail }}</p>
                <div class="flex items-center gap-1.5 mt-1">
                  <span
                    :class="[
                      'inline-block w-2 h-2 rounded-full',
                      isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                    ]"
                  />
                  <span class="text-[11px] font-semibold text-slate-600">
                    {{ isOnline ? __('Online') : __('Offline') }} · {{ __('Field Surveyor') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Accessible WCAG 2.2 AA Close Button (44x44px target) -->
            <button
              type="button"
              @click="showConfigModal = false"
              class="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-900 transition flex items-center justify-center border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              :aria-label="__('Close settings')"
              :title="__('Close settings')"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Grouped Native Settings Rows -->
          <div class="bg-slate-50 rounded-2xl border border-slate-200/80 divide-y divide-slate-200/60 overflow-hidden">
            <!-- 1. Language Row -->
            <div class="p-3.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-base">🌐</span>
                <span class="text-xs font-bold text-slate-800">{{ __('Language') || 'Language' }}</span>
              </div>
              <div class="inline-flex items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-bold">
                <button
                  type="button"
                  @click="setLanguage('en')"
                  :class="[
                    'px-3.5 py-1.5 rounded-lg transition font-bold',
                    currentLang === 'en' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  English
                </button>
                <button
                  type="button"
                  @click="setLanguage('hi')"
                  :class="[
                    'px-3.5 py-1.5 rounded-lg transition font-bold',
                    currentLang === 'hi' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  हिन्दी
                </button>
              </div>
            </div>

            <!-- 2. Text Scale Row -->
            <div class="p-3.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-base">🔤</span>
                <span class="text-xs font-bold text-slate-800">{{ __('Text Size') || 'Text Size' }}</span>
              </div>
              <div class="inline-flex items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-bold">
                <button
                  type="button"
                  @click="setTextScale('md')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition font-bold',
                    textSize === 'md' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  A
                </button>
                <button
                  type="button"
                  @click="setTextScale('lg')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition font-bold',
                    textSize === 'lg' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  A+
                </button>
                <button
                  type="button"
                  @click="setTextScale('xl')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition font-bold',
                    textSize === 'xl' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  A++
                </button>
              </div>
            </div>

            <!-- 3. Theme Row -->
            <div class="p-3.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-base">🎨</span>
                <span class="text-xs font-bold text-slate-800">{{ __('Theme') || 'Theme' }}</span>
              </div>
              <div class="inline-flex items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-bold">
                <button
                  type="button"
                  @click="setAppTheme('light')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-bold',
                    activeTheme === 'light' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <span>☀️</span>
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  @click="setAppTheme('dark')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-bold',
                    activeTheme === 'dark' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <span>🌙</span>
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <!-- 4. Choice Layout Row -->
            <div class="p-3.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-base">⊞</span>
                <span class="text-xs font-bold text-slate-800">{{ __('Choice Layout') || 'Choice Layout' }}</span>
              </div>
              <div class="inline-flex items-center p-0.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-bold">
                <button
                  type="button"
                  @click="setChoiceMode('grid')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1',
                    activeChoiceMode === 'grid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <span>⊞</span>
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  @click="setChoiceMode('combobox')"
                  :class="[
                    'px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1',
                    activeChoiceMode === 'combobox' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <span>▾</span>
                  <span>Dropdown</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 4. Offline WAL Queue & Sync Status -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span>📦</span>
                <span>{{ __('WAL Queue') }}</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ pendingWALCount }} {{ __('Pending Responses') }}
              </p>
            </div>
            <button
              type="button"
              @click="triggerSync"
              :disabled="pendingWALCount === 0"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-40"
            >
              ⚡ {{ __('Sync Now') }}
            </button>
          </div>

          <!-- 5. Profile Details & Manage Link -->
          <div class="pt-1 flex items-center justify-between text-xs px-1">
            <span class="text-slate-500 font-medium">{{ __('Manage Profile & Credentials') }}</span>
            <a
              href="/app/user-profile"
              class="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>{{ __('ERPNext Profile') }}</span>
              <span>↗</span>
            </a>
          </div>

          <!-- Sheet Dismiss Button -->
          <button
            type="button"
            @click="showConfigModal = false"
            class="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-sm transition shadow-sm"
          >
            {{ __('Done') || 'Done' }}
          </button>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useScrollLock } from "../../composables/useScrollLock";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  surveyTitle: {
    type: String,
    default: "",
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  pendingWALCount: {
    type: Number,
    default: 0,
  },
  textSize: {
    type: String,
    default: "md",
  },
  progressPercent: {
    type: Number,
    default: 0,
  },
  isRecording: {
    type: Boolean,
    default: false,
  },
  isAudioPaused: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["exit", "home", "open-wal", "cycle-text-size", "set-text-size", "toggle-audio"]);
const { __, currentLang, setLanguage } = useTranslation();

const showConfigModal = ref(false);
useScrollLock(showConfigModal);
const activeTheme = ref("light");

const userEmail = computed(() => {
  return (window.frappe && window.frappe.user) || "surveyor@ommnomi.in";
});

const userDisplayName = computed(() => {
  const f = window.frappe;
  if (f && f.user_info && f.user && f.user_info[f.user]?.fullname) {
    return f.user_info[f.user].fullname;
  }
  return (f && f.user) || "Surveyor";
});

const userName = userDisplayName;

const userInitial = computed(() => {
  const name = userDisplayName.value || "S";
  return name.charAt(0).toUpperCase();
});

function setTextScale(size) {
  emit("set-text-size", size);
}

function setAppTheme(theme) {
  activeTheme.value = theme;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("omniquery_theme", theme);
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
}

function triggerSync() {
  emit("open-wal");
  showConfigModal.value = false;
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

watch(showConfigModal, (isOpen) => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
});

onMounted(() => {
  if (typeof localStorage !== "undefined") {
    const savedTheme = localStorage.getItem("omniquery_theme") || "light";
    setAppTheme(savedTheme);
  }
});
</script>
