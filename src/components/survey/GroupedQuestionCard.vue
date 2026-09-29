<template>
  <div
    :id="'qc_' + group.group_code"
    data-question-card
    tabindex="-1"
    role="region"
    :aria-label="group.title"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    :class="[
      'p-4 sm:p-5 rounded-2xl border transition-all duration-150 focus:outline-none cursor-default scroll-mt-20',
      hasGroupError
        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 border-l-4 border-l-rose-500 shadow-xs ring-1 ring-rose-500/20'
        : isGroupCompleted
          ? 'bg-[#edf3ef] dark:bg-[#18251f] border-[#d2dfd6] dark:border-[#27382e] shadow-2xs'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
    ]"
  >
    <!-- Group Header -->
    <div class="mb-3 flex items-start justify-between gap-2 flex-wrap">
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <!-- Question Number / Group Badge -->
        <span
          class="px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs inline-flex items-center"
        >
          <span>{{ group.number || 'TABLE' }}</span>
        </span>

        <div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {{ group.title }}
          </h3>
          <p v-if="group.description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ group.description }}
          </p>
        </div>
      </div>

      <!-- Item Counter Pill -->
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
        {{ answeredCount }} / {{ group.questions.length }} {{ __('filled') }}
      </span>
    </div>

    <!-- Unified Table / Grid Layout -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40 divide-y divide-slate-200 dark:divide-slate-700/70">
      <div
        v-for="q in group.questions"
        :key="q.question_code"
        class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition hover:bg-white/60 dark:hover:bg-slate-800/80"
      >
        <!-- Sub-Question Label -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-if="getSubLetter(q)"
              class="w-5 h-5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center shrink-0"
            >
              {{ getSubLetter(q) }}
            </span>
            <label class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              {{ getCleanSubLabel(q) }}
              <span v-if="q.is_mandatory" class="text-rose-500 font-bold">*</span>
            </label>
          </div>
          <p v-if="validationErrors[q.question_code]" class="text-[11px] text-rose-600 font-semibold mt-1">
            {{ validationErrors[q.question_code] }}
          </p>
        </div>

        <!-- Sub-Question Input Control -->
        <div class="shrink-0 w-full sm:w-auto">
          <!-- Choice Radio/Percent Pills -->
          <div
            v-if="isChoiceQuestion(q)"
            class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
          >
            <button
              v-for="opt in getQuestionOptions(q)"
              :key="opt.value"
              type="button"
              @click="onUpdateValue(q.question_code, opt.value)"
              :class="[
                'px-2.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 border',
                responses[q.question_code] === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Numeric Stepper / Input -->
          <div
            v-else-if="isNumericQuestion(q)"
            class="flex items-center gap-1.5 justify-end"
          >
            <button
              type="button"
              @click="stepNumber(q.question_code, -1)"
              class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
              aria-label="Decrement"
            >
              -
            </button>
            <input
              type="number"
              :value="responses[q.question_code]"
              @input="onUpdateValue(q.question_code, $event.target.value)"
              :placeholder="__('0')"
              class="w-20 sm:w-24 text-center rounded-lg border border-slate-300 dark:border-slate-600 py-1.5 px-2 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              @click="stepNumber(q.question_code, 1)"
              class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
              aria-label="Increment"
            >
              +
            </button>
          </div>

          <!-- Default Text Box -->
          <div v-else>
            <input
              type="text"
              :value="responses[q.question_code]"
              @input="onUpdateValue(q.question_code, $event.target.value)"
              :placeholder="__('Enter value')"
              class="w-full sm:w-44 rounded-lg border border-slate-300 dark:border-slate-600 py-1.5 px-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Card Footer: Left = Type (Table), Right = Status Badge -->
    <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <!-- Input Type Badge (Bottom-Left) -->
      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
        {{ __('Table') }}
      </span>

      <!-- Bottom-Right Status Badge -->
      <div class="min-h-[22px] flex items-center">
        <span
          v-if="isGroupCompleted && !isInputFocused"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full"
        >
          <span>✓</span>
          <span>{{ __('All items filled') }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  group: {
    type: Object,
    required: true,
  },
  responses: {
    type: Object,
    required: true,
  },
  validationErrors: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update-response", "answered"]);
const { __ } = useTranslation();

const answeredCount = computed(() => {
  return props.group.questions.filter((q) => {
    const val = props.responses[q.question_code];
    return val !== undefined && val !== null && String(val).trim() !== "";
  }).length;
});

const isGroupCompleted = computed(() => {
  return props.group.questions.every((q) => {
    const val = props.responses[q.question_code];
    return val !== undefined && val !== null && String(val).trim() !== "";
  });
});

const hasGroupError = computed(() => {
  return props.group.questions.some((q) => Boolean(props.validationErrors[q.question_code]));
});

function getSubLetter(q) {
  const label = q.label_en || q.label || "";
  const match = label.match(/^(Q\d+)?([a-z])\.\s*/i);
  return match ? match[2].toLowerCase() : null;
}

function getCleanSubLabel(q) {
  const label = q.label_en || q.label || "";
  return label.replace(/^(Q\d+[a-z]?|\d+\.?|[A-Za-z]\.)\s*/i, "").trim();
}

function isNumericQuestion(q) {
  const type = (q.field_type || "").toLowerCase();
  return type === "integer" || type === "int" || type === "float" || type === "number";
}

function isChoiceQuestion(q) {
  const type = (q.field_type || "").toLowerCase();
  return (type.includes("choice") || type.includes("radio") || type.includes("select")) && Array.isArray(q.options) && q.options.length > 0;
}

function getQuestionOptions(q) {
  const raw = q.options_translated || q.options || [];
  return raw.map((opt) => ({
    value: typeof opt === "object" && opt ? opt.value : opt,
    label: typeof opt === "object" && opt ? opt.label : String(opt),
  }));
}

function onUpdateValue(code, val) {
  emit("update-response", { code, value: val });
  emit("answered", { code, value: val });
}

function stepNumber(code, delta) {
  const current = Number(props.responses[code]) || 0;
  const nextVal = Math.max(0, current + delta);
  onUpdateValue(code, nextVal);
}

const isInputFocused = ref(false);

function onFocusIn(e) {
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    isInputFocused.value = true;
  }
}

function onFocusOut(e) {
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    isInputFocused.value = false;
  }
}
</script>
