<template>
  <div
    ref="cardRef"
    :id="'qc_' + group.group_code"
    data-question-card
    tabindex="-1"
    role="region"
    :aria-label="group.title"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    :class="[
      'p-4 sm:p-5 rounded-2xl border transition-all duration-150 focus:outline-none cursor-default scroll-mt-28',
      hasGroupError
        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 border-l-4 border-l-rose-500 shadow-xs ring-1 ring-rose-500/20'
        : isFocused
          ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-md ring-1 ring-emerald-500/10'
          : isGroupCompleted
            ? 'bg-[#edf3ef] dark:bg-[#18251f] border-[#d2dfd6] dark:border-[#27382e] shadow-2xs'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
    ]"
  >
    <!-- Group Header (Pinned / Sticky during scroll so user always knows the main question) -->
    <div class="sticky top-[52px] sm:top-[56px] z-20 -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-3 p-4 sm:p-5 rounded-t-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2 flex-wrap shadow-xs">
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <!-- Question Number / Group Badge -->
        <span
          v-if="parsedGroupMeta.number"
          class="px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs inline-flex items-center"
        >
          <span>{{ parsedGroupMeta.number }}</span>
        </span>

        <div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {{ parsedGroupMeta.text }}
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
        :id="'qc_' + q.question_code"
        :data-subquestion-code="q.question_code"
        class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition border-l-4 scroll-mt-28"
        :class="[
          focusedQuestionCode === q.question_code
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-emerald-600 shadow-2xs'
            : 'border-l-transparent hover:bg-white/60 dark:hover:bg-slate-800/80'
        ]"
      >
        <!-- Sub-Question Label -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-if="getSubLetter(q)"
              :class="[
                'w-5 h-5 rounded-md text-[11px] font-mono font-bold flex items-center justify-center shrink-0 transition',
                focusedQuestionCode === q.question_code
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              ]"
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
          <!-- Choice Radio/Percent Pills (Clean wrap, ZERO horizontal scroll, Roving Tabindex: 1 tab stop per row) -->
          <div
            v-if="isChoiceQuestion(q)"
            role="radiogroup"
            :aria-label="getCleanSubLabel(q)"
            class="flex flex-wrap items-center gap-1.5 py-1"
          >
            <button
              v-for="(opt, optIdx) in getQuestionOptions(q)"
              :key="opt.value"
              :ref="(el) => setOptionRef(q.question_code, optIdx, el)"
              type="button"
              role="radio"
              :aria-checked="responses[q.question_code] === opt.value"
              :tabindex="getChoiceTabindex(q, opt.value, optIdx)"
              @keydown="onChoiceKeydown($event, q, optIdx, getQuestionOptions(q))"
              @click="onUpdateValue(q.question_code, opt.value)"
              :class="[
                'px-2.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                responses[q.question_code] === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700 hover:border-emerald-700 focus:bg-emerald-700'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 hover:border-slate-300 dark:hover:bg-slate-600 focus:border-emerald-500'
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
        <!-- Not Applicable Badge -->
        <span
          v-if="notApplicable"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2.5 py-0.5 rounded-full"
        >
          <span>⊘</span>
          <span>{{ __('Not Applicable') }}</span>
        </span>
        <span
          v-else-if="isGroupCompleted && !isInputFocused"
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
  notApplicable: {
    type: Boolean,
    default: false,
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

const parsedGroupMeta = computed(() => {
  const full = props.group.title || "";
  const match = full.match(/^(Q\d+[a-z]?\.?|\d+\.?|[A-Za-z]\.)\s*(.*)$/i);
  if (match) {
    const rawNum = match[1].replace(/\.$/, "").trim();
    const cleanText = match[2].replace(/^[\s.:-]+\s*/, "").trim();
    return {
      number: rawNum,
      text: cleanText,
    };
  }
  const num = props.group.number;
  if (num && !["TABLE", "GRID"].includes(String(num).toUpperCase())) {
    return {
      number: num,
      text: full,
    };
  }
  return {
    number: null,
    text: full,
  };
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
  return label.replace(/^(Q\d+[a-z]?\.?|\d+\.?|[A-Za-z]\.)\s*/i, "").replace(/^[\s.:-]+\s*/, "").trim();
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

const optionRefsMap = ref({});

function setOptionRef(qCode, optIdx, el) {
  if (!optionRefsMap.value[qCode]) {
    optionRefsMap.value[qCode] = [];
  }
  if (el) {
    optionRefsMap.value[qCode][optIdx] = el;
  }
}

function getChoiceTabindex(q, optValue, optIdx) {
  const currentVal = props.responses[q.question_code];
  const options = getQuestionOptions(q);
  const selectedIdx = options.findIndex((o) => o.value === currentVal);
  if (selectedIdx === -1) {
    return optIdx === 0 ? 0 : -1;
  }
  return optIdx === selectedIdx ? 0 : -1;
}

function onChoiceKeydown(e, q, optIdx, options) {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    e.stopPropagation();
    const nextIdx = (optIdx + 1) % options.length;
    const nextOpt = options[nextIdx];
    optionRefsMap.value[q.question_code]?.[nextIdx]?.focus({ preventScroll: true });
    onUpdateValue(q.question_code, nextOpt.value);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    const prevIdx = (optIdx - 1 + options.length) % options.length;
    const prevOpt = options[prevIdx];
    optionRefsMap.value[q.question_code]?.[prevIdx]?.focus({ preventScroll: true });
    onUpdateValue(q.question_code, prevOpt.value);
  } else if (["ArrowDown", "ArrowUp"].includes(e.key)) {
    const qList = props.group.questions || [];
    const curQIdx = qList.findIndex((item) => item.question_code === q.question_code);
    if (curQIdx !== -1) {
      const nextQIdx = e.key === "ArrowDown" ? curQIdx + 1 : curQIdx - 1;
      if (nextQIdx >= 0 && nextQIdx < qList.length) {
        e.preventDefault();
        e.stopPropagation();
        const nextQ = qList[nextQIdx];
        focusedQuestionCode.value = nextQ.question_code;
        // Focus selected or first option in target row
        const targetOpts = getQuestionOptions(nextQ);
        const selIdx = targetOpts.findIndex((o) => o.value === props.responses[nextQ.question_code]);
        const focusIdx = selIdx >= 0 ? selIdx : 0;
        const targetBtn = optionRefsMap.value[nextQ.question_code]?.[focusIdx];
        if (targetBtn) {
          targetBtn.focus({ preventScroll: true });
          ensureVisibleAboveFooter(targetBtn);
        }
      }
    }
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    onUpdateValue(q.question_code, options[optIdx].value);
  }
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

const cardRef = ref(null);
const isFocused = ref(false);
const focusedQuestionCode = ref(null);
const isInputFocused = ref(false);

function ensureVisibleAboveFooter(targetEl) {
  if (!targetEl || typeof targetEl.getBoundingClientRect !== "function") return;
  const rect = targetEl.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const footerClearance = 80;
  const headerClearance = 96;

  if (rect.bottom > vh - footerClearance) {
    const diff = rect.bottom - (vh - footerClearance) + 16;
    window.scrollBy({ top: diff, behavior: "smooth" });
  } else if (rect.top < headerClearance) {
    const diff = rect.top - headerClearance - 16;
    window.scrollBy({ top: diff, behavior: "smooth" });
  }
}

function onFocusIn(e) {
  const fromOutside = !cardRef.value?.contains(e.relatedTarget);
  isFocused.value = true;
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    isInputFocused.value = true;
  }
  const rowEl = e?.target?.closest?.("[data-subquestion-code]");
  if (rowEl) {
    focusedQuestionCode.value = rowEl.getAttribute("data-subquestion-code");
  }

  if (fromOutside) {
    cardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    ensureVisibleAboveFooter(e.target);
  }
}

function onFocusOut(e) {
  const currentTarget = e?.currentTarget;
  if (!currentTarget?.contains(e?.relatedTarget)) {
    isFocused.value = false;
    focusedQuestionCode.value = null;
  }
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    isInputFocused.value = false;
  }
}
</script>
