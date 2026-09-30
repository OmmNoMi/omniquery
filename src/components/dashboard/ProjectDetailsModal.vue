<template>
  <BaseModal
    :isOpen="isOpen"
    :title="projectData.project_name || __('Project Overview & Training')"
    :subtitle="projectData.grantor_organization || 'National Rural Livelihoods Mission'"
    icon="📚"
    size="2xl"
    maxHeightClass="max-h-[88vh]"
    @close="$emit('close')"
  >
    <!-- Tab Navigation Bar -->
    <div class="sticky top-0 z-10 flex border-b border-slate-100 dark:border-slate-800 px-4 gap-4 overflow-x-auto no-scrollbar shrink-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs">
          <button
            type="button"
            @click="activeTab = 'sops'"
            class="py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer"
            :class="activeTab === 'sops' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            📜 {{ __('Field SOPs & Code') }}
          </button>
          <button
            type="button"
            @click="activeTab = 'finance'"
            class="py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer"
            :class="activeTab === 'finance' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            💰 {{ __('Turnover & Calculations') }}
          </button>
          <button
            type="button"
            @click="activeTab = 'offline'"
            class="py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer"
            :class="activeTab === 'offline' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            ⚡ {{ __('Offline Data Guidelines') }}
          </button>
          <button
            type="button"
            @click="activeTab = 'helpline'"
            class="py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer"
            :class="activeTab === 'helpline' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            📞 {{ __('Supervisor Helpline') }}
          </button>
        </div>

        <!-- Scrollable Tab Content Area -->
        <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <!-- Tab 1: Field SOPs & Code of Conduct -->
          <div v-if="activeTab === 'sops'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
              <span class="font-extrabold">{{ __('Core Principle') }}:</span>
              {{ __('Field surveyors represent the institution. Maintain respect, confidentiality, and data integrity at all times.') }}
            </div>

            <div class="space-y-3">
              <div v-for="(item, idx) in sopsPoints" :key="idx" class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </span>
                <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {{ item }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tab 2: Financial Calculation Tips -->
          <div v-if="activeTab === 'finance'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <span class="font-extrabold">{{ __('Multi-Year Turnover Formula') }}:</span>
              {{ __('If monthly receipts fluctuate, compute typical monthly turnover and multiply by active operating months in the financial year.') }}
            </div>

            <div class="space-y-3">
              <div v-for="(tip, idx) in financeTips" :key="idx" class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span class="text-lg shrink-0 mt-0.5">{{ tip.icon }}</span>
                <div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{{ tip.title }}</h4>
                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{{ tip.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 3: Offline Data & Recovery Guidelines -->
          <div v-if="activeTab === 'offline'" class="space-y-4">
            <div class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
              <span class="font-extrabold">{{ __('Zero-Data-Loss Architecture') }}:</span>
              {{ __('All surveys are buffered locally in SQLite/IndexedDB Write-Ahead Log. Even with zero mobile signal, your data is safe.') }}
            </div>

            <div class="space-y-3">
              <div v-for="(item, idx) in offlinePoints" :key="idx" class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </span>
                <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {{ item }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tab 4: Supervisor Helpline -->
          <div v-if="activeTab === 'helpline'" class="space-y-4">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
                  📞
                </div>
                <div>
                  <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {{ __('Field Support & Supervisor Helpline') }}
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    {{ __('Available Mon–Sat, 8:00 AM – 7:00 PM IST') }}
                  </p>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span class="text-slate-500 dark:text-slate-400">{{ __('Toll-Free Helpline') }}:</span>
                  <a href="tel:18001026664" class="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                    1800-102-OMNI (+91)
                  </a>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span class="text-slate-500 dark:text-slate-400">{{ __('Email Dispatch') }}:</span>
                  <a href="mailto:fieldsupport@ommnomi.in" class="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                    fieldsupport@ommnomi.in
                  </a>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span class="text-slate-500 dark:text-slate-400">{{ __('State Lead') }}:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">
                    SVEP State Field Operations Desk
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

    <template #footer>
      <button
        type="button"
        @click="$emit('close')"
        class="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
      >
        {{ __('Close') }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from "vue";
import BaseModal from "../common/BaseModal.vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  projectData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["close"]);

const { __ } = useTranslation();
const activeTab = ref("sops");

const sopsPoints = [
  "Always introduce yourself as an authorized field surveyor and explain the non-commercial research objectives before starting questions.",
  "Seek voluntary informed consent from the respondent or enterprise owner.",
  "Never coerce or push respondents when they hesitate on personal financial queries. Reassure them of complete confidentiality.",
  "Capture GPS coordinates accurately while physically standing at the enterprise location.",
  "Review all table sub-items (e.g. Q4 challenges and Q9 turnover categories) before tapping Next Section.",
];

const financeTips = [
  {
    icon: "💵",
    title: "Annual Turnover Estimation",
    desc: "Multiply typical monthly business receipts by the number of active months in that specific financial year (e.g. FY 2022-23, FY 2023-24).",
  },
  {
    icon: "📊",
    title: "Percentage Distribution Verification",
    desc: "For questions where multiple business activities or challenges are categorized, cross-check that totals make logical sense.",
  },
  {
    icon: "🏦",
    title: "Capital Sources & Borrowing",
    desc: "Distinguish between SHG loans (CIF/RF), bank loans (Mudra/KCC), family borrowing, and private moneylenders.",
  },
];

const offlinePoints = [
  "OmniQuery runs 100% offline. All responses, in-progress draft edits, and GPS are recorded directly in device storage (IndexedDB).",
  "Observe the ⚡ badge in the header: it indicates how many completed responses are stored locally waiting to sync.",
  "When returning to network coverage or Wi-Fi, tap 'Sync Now' in the header to push records to the server.",
  "Before leaving the field, verify all completed forms in the 'Filled Forms' verification list.",
];
</script>
