<template>
  <div
    ref="cardRef"
    data-matrix-question-card
    tabindex="-1"
    role="region"
    :aria-label="parsedMeta.text"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.esc.stop="focusCard"
    :class="[
      'p-4 sm:p-5 rounded-2xl border transition-all duration-150 focus:outline-none cursor-default scroll-mt-20',
      notApplicable
        ? 'bg-slate-50/70 dark:bg-slate-900/60 border-dashed border-slate-300 dark:border-slate-700 opacity-75'
        : errorMessage
          ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 border-l-4 border-l-rose-500 shadow-xs ring-1 ring-rose-500/20'
          : isFocused
            ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 border-l-4 border-l-emerald-600 shadow-md ring-1 ring-emerald-500/10'
            : isCompleted
              ? 'bg-[#edf3ef] dark:bg-[#18251f] border-[#d2dfd6] dark:border-[#27382e] shadow-2xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
    ]"
  >
    <!-- Header -->
    <div class="mb-3 flex items-start justify-between gap-2 flex-wrap">
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <!-- Question Number Badge -->
        <span
          v-if="parsedMeta.number"
          class="px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs inline-flex items-center"
        >
          <span>{{ parsedMeta.number }}</span>
        </span>

        <div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {{ parsedMeta.text }}
            <span v-if="question.is_mandatory" class="text-rose-500 font-extrabold ml-0.5">*</span>
          </h3>
          <p v-if="question.description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ __(question.description) }}
          </p>
        </div>
      </div>

      <!-- Right: Filled Count Pill -->
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
        {{ filledRowsCount }} / {{ matrixRows.length }} {{ __('filled') }}
      </span>
    </div>

    <!-- 4D Nested Matrix Instance Switcher (e.g. Years [2024 | 2025 | 2026] or Multiple Business Activities) -->
    <div v-if="is4DMatrix" class="mb-3 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1.5 flex-wrap">
      <div class="flex items-center gap-1 flex-wrap">
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
          {{ __('Dimension') }}:
        </span>
        <button
          v-for="(inst, idx) in matrixInstances"
          :key="inst"
          type="button"
          @click="activeInstance = inst"
          class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          :class="[
            activeInstance === inst
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
          ]"
        >
          <span>{{ inst }}</span>
          <span
            v-if="isInstanceCompleted(inst)"
            class="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0"
          />
        </button>
      </div>

      <!-- 4D Toggle pill / add instance -->
      <button
        type="button"
        @click="addCustomInstance"
        class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-0.5 cursor-pointer"
      >
        + {{ __('Add Instance') }}
      </button>
    </div>

    <!-- 3D / 4D Matrix Content: Desktop Table Grid (sm:block) -->
    <div class="hidden sm:block rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <th class="py-2.5 px-3.5 w-1/4">
              {{ rowHeaderTitle }}
            </th>
            <th
              v-for="col in matrixColumns"
              :key="col.key"
              class="py-2.5 px-3"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
          <tr
            v-for="(row, rIdx) in matrixRows"
            :key="row.id"
            class="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
          >
            <!-- Row Label Header -->
            <td class="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-100 align-middle">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>{{ row.label }}</span>
              </span>
            </td>

            <!-- Columns for this Row -->
            <td
              v-for="(col, cIdx) in matrixColumns"
              :key="col.key"
              class="py-2 px-3 align-middle"
            >
              <!-- Number input / Stepper -->
              <div v-if="col.type === 'number'" class="flex items-center gap-1">
                <button
                  type="button"
                  tabindex="-1"
                  @click="stepCellValue(row.id, col.key, -1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                >
                  -
                </button>
                <input
                  :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                  type="number"
                  :value="getCellValue(row.id, col.key)"
                  @input="updateCellValue(row.id, col.key, $event.target.value)"
                  @keydown="onCellKeydown($event, rIdx, cIdx)"
                  :placeholder="col.placeholder || '0'"
                  class="w-16 sm:w-20 text-center rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 px-2 text-xs font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  tabindex="-1"
                  @click="stepCellValue(row.id, col.key, 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer active:scale-95"
                >
                  +
                </button>
              </div>

              <!-- Currency input -->
              <div v-else-if="col.type === 'currency'" class="relative rounded-lg shadow-2xs">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 dark:text-slate-500 font-bold text-xs pointer-events-none">
                  ₹
                </span>
                <input
                  :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                  type="number"
                  :value="getCellValue(row.id, col.key)"
                  @input="updateCellValue(row.id, col.key, $event.target.value)"
                  @keydown="onCellKeydown($event, rIdx, cIdx)"
                  :placeholder="col.placeholder || '0'"
                  class="w-full text-right rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 pl-6 pr-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                />
              </div>

              <!-- Select Dropdown -->
              <select
                v-else-if="col.type === 'select'"
                :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                :value="getCellValue(row.id, col.key)"
                @change="updateCellValue(row.id, col.key, $event.target.value)"
                @keydown="onCellKeydown($event, rIdx, cIdx)"
                class="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 px-2 text-xs font-medium text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/60 focus:border-emerald-500 outline-none"
              >
                <option value="">{{ __('-- Select --') }}</option>
                <option v-for="opt in col.options" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>

              <!-- Standard Text Input -->
              <input
                v-else
                :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                type="text"
                :value="getCellValue(row.id, col.key)"
                @input="updateCellValue(row.id, col.key, $event.target.value)"
                @keydown="onCellKeydown($event, rIdx, cIdx)"
                :placeholder="col.placeholder || __('Enter text')"
                class="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 px-2.5 text-xs font-medium text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 outline-none transition"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 3D / 4D Matrix Content: Mobile Card-Per-Row Layout (block sm:hidden - ZERO Horizontal Scroll) -->
    <div class="block sm:hidden space-y-3">
      <div
        v-for="(row, rIdx) in matrixRows"
        :key="row.id"
        class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-2.5 shadow-2xs"
      >
        <!-- Row Header Badge -->
        <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-1.5">
          <span class="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>{{ row.label }}</span>
          </span>
          <span
            v-if="isRowCompleted(row.id)"
            class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800"
          >
            ✓ {{ __('Done') }}
          </span>
        </div>

        <!-- Inputs for this row in mobile stack -->
        <div class="space-y-2">
          <div
            v-for="(col, cIdx) in matrixColumns"
            :key="col.key"
            class="flex items-center justify-between gap-2"
          >
            <label class="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex-1 leading-tight">
              {{ col.label }}
            </label>

            <!-- Number input / Stepper -->
            <div v-if="col.type === 'number'" class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                tabindex="-1"
                @click="stepCellValue(row.id, col.key, -1)"
                class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center cursor-pointer active:scale-95"
              >
                -
              </button>
              <input
                :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                type="number"
                :value="getCellValue(row.id, col.key)"
                @input="updateCellValue(row.id, col.key, $event.target.value)"
                @keydown="onCellKeydown($event, rIdx, cIdx)"
                :placeholder="col.placeholder || '0'"
                class="w-14 text-center rounded-lg border border-slate-300 dark:border-slate-600 py-1 px-1.5 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                tabindex="-1"
                @click="stepCellValue(row.id, col.key, 1)"
                class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center cursor-pointer active:scale-95"
              >
                +
              </button>
            </div>

            <!-- Currency input -->
            <div v-else-if="col.type === 'currency'" class="relative rounded-lg shadow-2xs w-32 shrink-0">
              <span class="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 dark:text-slate-500 font-bold text-xs pointer-events-none">
                ₹
              </span>
              <input
                :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
                type="number"
                :value="getCellValue(row.id, col.key)"
                @input="updateCellValue(row.id, col.key, $event.target.value)"
                @keydown="onCellKeydown($event, rIdx, cIdx)"
                :placeholder="col.placeholder || '0'"
                class="w-full text-right rounded-lg border border-slate-300 dark:border-slate-600 py-1 pl-5 pr-2 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>

            <!-- Select Dropdown -->
            <select
              v-else-if="col.type === 'select'"
              :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
              :value="getCellValue(row.id, col.key)"
              @change="updateCellValue(row.id, col.key, $event.target.value)"
              @keydown="onCellKeydown($event, rIdx, cIdx)"
              class="w-36 rounded-lg border border-slate-300 dark:border-slate-600 py-1 px-2 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none shrink-0"
            >
              <option value="">{{ __('-- Select --') }}</option>
              <option v-for="opt in col.options" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>

            <!-- Standard Text Input -->
            <input
              v-else
              :ref="(el) => setCellInputRef(rIdx, cIdx, el)"
              type="text"
              :value="getCellValue(row.id, col.key)"
              @input="updateCellValue(row.id, col.key, $event.target.value)"
              @keydown="onCellKeydown($event, rIdx, cIdx)"
              :placeholder="col.placeholder || __('Enter text')"
              class="w-36 rounded-lg border border-slate-300 dark:border-slate-600 py-1 px-2 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none shrink-0"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Card Footer -->
    <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <!-- Input Type Badge (Bottom-Left) -->
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
        <span>{{ is4DMatrix ? __('Nested Matrix (4D)') : __('Matrix (3D)') }}</span>
      </span>

      <!-- Bottom-Right Status Badge -->
      <div class="min-h-[22px] flex items-center">
        <span
          v-if="notApplicable"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2.5 py-0.5 rounded-full"
        >
          <span>⊘</span>
          <span>{{ __('Not Applicable') }}</span>
        </span>
        <span
          v-else-if="isCompleted && !isInputFocused"
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
import { computed, ref, reactive, watch, nextTick } from "vue";
import { useTranslation } from "../../composables/useTranslation";

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [Object, Array],
    default: () => ({}),
  },
  errorMessage: {
    type: String,
    default: "",
  },
  notApplicable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "answered", "next"]);
const { __ } = useTranslation();

const cardRef = ref(null);
const isFocused = ref(false);
const isInputFocused = ref(false);
const cellInputRefs = ref({});

// Parse question title & number
const parsedMeta = computed(() => {
  const full = props.question.label_en || props.question.label || "";
  const match = full.match(/^(Q\d+[a-z]?\.?|\d+\.?|[A-Za-z]\.)\s*(.*)$/i);
  if (match) {
    return {
      number: match[1].replace(/\.$/, "").trim(),
      text: match[2].replace(/^[\s.:-]+\s*/, "").trim(),
    };
  }
  return {
    number: null,
    text: full,
  };
});

// Row Header Title
const rowHeaderTitle = computed(() => {
  const code = (props.question.question_code || "").toLowerCase();
  if (code.includes("turnover") || code.includes("season")) return __("Season");
  if (code.includes("involvement") || code.includes("activity")) return __("Activity");
  if (code.includes("capital")) return __("Capital Source");
  return __("Category / Row");
});

// Matrix Rows Definition
const matrixRows = computed(() => {
  const code = (props.question.question_code || "").toLowerCase();
  if (code.includes("turnover") || code.includes("season")) {
    return [
      { id: "peak", label: __("Peak season") },
      { id: "average", label: __("Average") },
      { id: "lean", label: __("Lean") },
    ];
  }
  if (code.includes("involvement") || code.includes("activity")) {
    return [
      { id: "procurement", label: __("Raw Material Procurement") },
      { id: "production", label: __("Production / Processing") },
      { id: "selling", label: __("Selling / Marketing") },
      { id: "records", label: __("Record Keeping / Accounting") },
    ];
  }
  if (props.question.rows && Array.isArray(props.question.rows)) {
    return props.question.rows;
  }
  return [
    { id: "item_1", label: __("Item 1") },
    { id: "item_2", label: __("Item 2") },
    { id: "item_3", label: __("Item 3") },
  ];
});

// Matrix Columns Definition
const matrixColumns = computed(() => {
  const code = (props.question.question_code || "").toLowerCase();
  if (code.includes("turnover") || code.includes("season")) {
    return [
      { key: "duration_months", label: __("Duration in months (count)"), type: "number", placeholder: "0" },
      { key: "monthly_sales", label: __("Monthly sales"), type: "currency", placeholder: "0" },
      { key: "monthly_profit", label: __("Monthly income profit (Net profit)"), type: "currency", placeholder: "0" },
    ];
  }
  if (code.includes("involvement") || code.includes("activity")) {
    return [
      {
        key: "involvement",
        label: __("Involvement"),
        type: "select",
        options: ["Regular", "Occasional", "Only respondent", "Not relevant"],
      },
      { key: "family_count", label: __("Family members involved #"), type: "number", placeholder: "0" },
      { key: "hired_count", label: __("Hired help #"), type: "number", placeholder: "0" },
    ];
  }
  if (props.question.columns && Array.isArray(props.question.columns)) {
    return props.question.columns;
  }
  return [
    { key: "col_1", label: __("Quantity / Count"), type: "number", placeholder: "0" },
    { key: "col_2", label: __("Amount (₹)"), type: "currency", placeholder: "0" },
  ];
});

// 4D Matrix (Multi-Instance) Configuration
const is4DMatrix = computed(() => {
  const code = (props.question.question_code || "").toLowerCase();
  // 4D is supported for turnover (multi-year), multiple enterprises, or when explicitly configured
  return code.includes("turnover") || props.question.enable_4d === true;
});

const matrixInstances = ref(["Year 1 (Current)", "Year 2 (Last Year)", "Year 3 (Prior Year)"]);
const activeInstance = ref("Year 1 (Current)");

function addCustomInstance() {
  const nextNum = matrixInstances.value.length + 1;
  const newInst = `Year ${nextNum}`;
  matrixInstances.value.push(newInst);
  activeInstance.value = newInst;
}

// State container: supports both flat 3D and nested 4D
const internalData = reactive({});

function initData() {
  const val = props.modelValue;
  if (val && typeof val === "object") {
    Object.assign(internalData, val);
  }
}
initData();

watch(
  () => props.modelValue,
  (val) => {
    if (val && typeof val === "object") {
      Object.assign(internalData, val);
    }
  },
  { deep: true }
);

function getCellKey(rowId, colKey) {
  if (is4DMatrix.value) {
    return `${activeInstance.value}__${rowId}__${colKey}`;
  }
  return `${rowId}__${colKey}`;
}

function getCellValue(rowId, colKey) {
  const key = getCellKey(rowId, colKey);
  return internalData[key] !== undefined ? internalData[key] : "";
}

function updateCellValue(rowId, colKey, value) {
  const key = getCellKey(rowId, colKey);
  internalData[key] = value;
  emitData();
}

function stepCellValue(rowId, colKey, delta) {
  const current = Number(getCellValue(rowId, colKey)) || 0;
  const next = Math.max(0, current + delta);
  updateCellValue(rowId, colKey, next);
}

function emitData() {
  const payload = { ...internalData };
  emit("update:modelValue", payload);
  if (isCompleted.value) {
    emit("answered", { code: props.question.question_code, value: payload });
  }
}

// Completion Checkers
function isRowCompleted(rowId) {
  return matrixColumns.value.some((col) => {
    const val = getCellValue(rowId, col.key);
    return val !== "" && val !== undefined && val !== null;
  });
}

function isInstanceCompleted(inst) {
  return matrixRows.value.every((row) =>
    matrixColumns.value.some((col) => {
      const key = `${inst}__${row.id}__${col.key}`;
      return internalData[key] !== "" && internalData[key] !== undefined && internalData[key] !== null;
    })
  );
}

const filledRowsCount = computed(() => {
  return matrixRows.value.filter((row) => isRowCompleted(row.id)).length;
});

const isCompleted = computed(() => {
  return filledRowsCount.value > 0;
});

// Keyboard Matrix Navigation
function setCellInputRef(rIdx, cIdx, el) {
  if (el) {
    cellInputRefs.value[`${rIdx}_${cIdx}`] = el;
  }
}

function onCellKeydown(e, rIdx, cIdx) {
  const numRows = matrixRows.value.length;
  const numCols = matrixColumns.value.length;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const nextRow = (rIdx + 1) % numRows;
    cellInputRefs.value[`${nextRow}_${cIdx}`]?.focus({ preventScroll: true });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prevRow = (rIdx - 1 + numRows) % numRows;
    cellInputRefs.value[`${prevRow}_${cIdx}`]?.focus({ preventScroll: true });
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (rIdx === numRows - 1 && cIdx === numCols - 1) {
      emit("next");
    } else {
      // Advance to next cell in matrix
      let nextC = cIdx + 1;
      let nextR = rIdx;
      if (nextC >= numCols) {
        nextC = 0;
        nextR = (rIdx + 1) % numRows;
      }
      cellInputRefs.value[`${nextR}_${nextC}`]?.focus({ preventScroll: true });
    }
  }
}

function focusCard() {
  cardRef.value?.focus();
}

function onFocusIn(e) {
  isFocused.value = true;
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "select") {
    isInputFocused.value = true;
  }
}

function onFocusOut(e) {
  if (!cardRef.value?.contains(e.relatedTarget)) {
    isFocused.value = false;
    isInputFocused.value = false;
  }
}

defineExpose({
  focus: () => {
    cellInputRefs.value["0_0"]?.focus({ preventScroll: true }) || cardRef.value?.focus();
  },
});
</script>
