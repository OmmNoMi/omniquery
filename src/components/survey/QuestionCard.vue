<template>
  <div
    ref="cardRef"
    data-question-card
    tabindex="-1"
    role="region"
    :aria-label="questionLabel"
    @click="onCardClick"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.esc.stop="onCardEsc"
    @keydown="onCardKeydown"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @contextmenu.prevent="openConfigModal"
    :class="[
      'p-4 sm:p-5 rounded-2xl border transition-all duration-150 focus:outline-none cursor-default scroll-mt-28',
      notApplicable
        ? 'bg-slate-50/70 dark:bg-slate-900/60 border-dashed border-slate-300 dark:border-slate-700 opacity-75'
        : errorMessage
          ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 border-l-4 border-l-rose-500 shadow-xs ring-1 ring-rose-500/20'
          : isFocused
            ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-md ring-1 ring-emerald-500/10'
            : isCompleted
              ? 'bg-[#edf3ef] dark:bg-[#18251f] border-[#d2dfd6] dark:border-[#27382e] shadow-2xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
    ]"
  >
    <!-- Pinned Parent Context (When rendering a subquestion belonging to a table/matrix) -->
    <div
      v-if="question._parentTitle"
      class="mb-3 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200"
    >
      <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
        <span>📋</span>
        <span>{{ __('Main Table Question') }}</span>
      </div>
      <div class="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
        {{ question._parentTitle }}
      </div>
      <div v-if="question._parentDescription" class="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {{ question._parentDescription }}
      </div>
    </div>

    <!-- Question Header -->
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <!-- Question Number Badge -->
        <span
          v-if="parsedQuestionMeta.number"
          class="px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs inline-flex items-center"
        >
          <span>{{ parsedQuestionMeta.number }}</span>
        </span>

        <label
          :for="'q_input_' + question.question_code"
          class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug cursor-pointer"
        >
          {{ parsedQuestionMeta.text }}
          <span v-if="question.is_mandatory" class="text-rose-500 font-extrabold ml-0.5" aria-hidden="true">*</span>
        </label>
      </div>
    </div>

    <!-- Description / Subtitle -->
    <p
      v-if="questionDescription"
      :id="'q_desc_' + question.question_code"
      class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3"
    >
      {{ questionDescription }}
    </p>

    <!-- Controls based on Field Type / Variant -->
    <div :class="['mt-2', notApplicable ? 'pointer-events-none opacity-60 select-none' : '']">
      <!-- 1. Binary Switch (Yes / No) -->
      <FSwitch
        v-if="isSwitchControl"
        :id="'q_input_' + question.question_code"
        :modelValue="modelValue"
        :ariaLabel="questionLabel"
        :ariaDescribedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        @update:modelValue="onControlInput"
        @next="$emit('next')"
      />

      <!-- 2. Range / Slider Control (Years, Scales, Ratings) -->
      <FRangeSlider
        v-else-if="isRangeControl"
        :id="'q_input_' + question.question_code"
        :modelValue="modelValue"
        :min="rangeMin"
        :max="rangeMax"
        :step="rangeStep"
        :unit="rangeUnit"
        :format="rangeFormat"
        :ariaLabel="questionLabel"
        :ariaDescribedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        @update:modelValue="onControlInput"
        @esc="focusCard"
      />

      <!-- 3. Rating Control -->
      <FRating
        v-else-if="isRatingControl"
        :id="'q_input_' + question.question_code"
        :modelValue="Number(modelValue) || 0"
        :maxStars="question.rating_max || 5"
        @update:modelValue="onControlInput"
      />

      <!-- 4. Currency Control -->
      <FCurrencyInput
        v-else-if="isCurrencyControl"
        :id="'q_input_' + question.question_code"
        :modelValue="modelValue"
        :ariaLabel="questionLabel"
        :ariaDescribedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        @update:modelValue="onControlInput"
        @enter="onInputEnter"
        @esc="focusCard"
      />

      <!-- 5. Choice Options: Direct Grid or Dropdown -->
      <div v-else-if="isChoiceControl">
        <!-- 5A. Searchable Combobox Dropdown -->
        <FCombobox
          v-if="effectiveMode === 'combobox'"
          :modelValue="modelValue"
          :options="normalizedOptions"
          :multiple="isMultiSelect"
          @update:modelValue="onComboboxUpdate"
          @keydown.esc.stop="focusCard"
        />

        <!-- 5B. Interactive Option Grid with Quick Search & Explicit Checkbox vs Radio Distinction -->
        <div v-else>
          <!-- Quick Search Bar above button cards (when options > 7) -->
          <div v-if="normalizedOptions.length > 7" class="relative mb-3">
            <div class="relative flex items-center">
              <svg class="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                ref="searchInputRef"
                data-search-input
                v-model="gridSearchQuery"
                type="text"
                :placeholder="__('Search options...')"
                @keydown.esc.prevent.stop="onSearchInputEsc"
                @keydown.enter.prevent="onSearchInputEnter"
                @keydown.down.prevent="focusFirstOption"
                class="w-full text-xs sm:text-sm pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs"
              />
              <button
                v-if="gridSearchQuery"
                type="button"
                @mousedown.prevent
                @click="onClearSearch"
                class="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-xs font-bold cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            </div>
            <!-- Filter summary if search is active -->
            <div v-if="gridSearchQuery" class="mt-1 px-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>{{ __('Showing') }} {{ displayedGridOptions.length }} {{ __('of') }} {{ normalizedOptions.length }}</span>
            </div>
          </div>

          <div
            class="grid gap-2.5 focus:outline-none outline-none"
            :class="displayedGridOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'"
            :role="isMultiSelect ? 'group' : 'radiogroup'"
            @keydown="onGridKeydown"
            @keydown.esc.stop="focusCard"
          >
            <button
              v-for="(option, index) in displayedGridOptions"
              :key="option.value"
              :ref="(el) => { if (el) optionButtonRefs[index] = el; }"
              type="button"
              :role="isMultiSelect ? 'checkbox' : 'radio'"
              :aria-checked="isOptionSelected(option.value)"
              :tabindex="getOptionTabindex(index)"
              @click="onOptionClick(option.value)"
              @focus="activeOptionIndex = index"
              @keydown.enter.prevent="onOptionEnter"
              @keydown.space.prevent="onOptionSpace(option.value)"
              @keydown="onOptionKeydown($event, index)"
              :class="[
                'w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all flex items-center group active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shadow-2xs gap-3',
                isOptionSelected(option.value)
                  ? (isMultiSelect
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30 font-bold')
                  : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-emerald-400 hover:bg-emerald-50/30'
              ]"
            >
              <!-- Left: Shape Indicator with Keyboard Hint (1, 2, 3...) INSIDE -->
              <!-- Multi-select: Square with hint/check -->
              <span
                v-if="isMultiSelect"
                :class="[
                  'w-6 h-6 rounded-[4px] border-2 flex items-center justify-center text-[11px] font-mono font-bold transition shrink-0',
                  isOptionSelected(option.value)
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 group-hover:border-emerald-400 group-hover:text-emerald-600'
                ]"
              >
                <span v-if="isOptionSelected(option.value)">✓</span>
                <span v-else>{{ index + 1 }}</span>
              </span>

              <!-- Single-select: Circle with hint/dot -->
              <span
                v-else
                :class="[
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-mono font-bold transition shrink-0',
                  isOptionSelected(option.value)
                    ? 'border-white bg-white/20 text-white'
                    : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 group-hover:border-emerald-400 group-hover:text-emerald-600'
                ]"
              >
                <span v-if="isOptionSelected(option.value)" class="w-2 h-2 rounded-full bg-white"></span>
                <span v-else>{{ index + 1 }}</span>
              </span>

              <!-- Option Text & Description: Full Width, No Crowding -->
              <div class="flex-1 min-w-0">
                <span class="text-sm sm:text-base font-bold leading-snug block">
                  {{ option.label }}
                </span>
                <span v-if="option.description" class="text-xs opacity-80 block mt-0.5 font-normal">
                  {{ option.description }}
                </span>
              </div>
            </button>

            <!-- Empty search result fallback -->
            <div v-if="displayedGridOptions.length === 0" class="col-span-full py-6 text-center text-xs text-slate-400">
              {{ __('No matching options found') }}
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Year Selector -->
      <div v-else-if="isYearControl" class="flex flex-wrap gap-2">
        <button
          v-for="year in yearOptions"
          :key="year"
          type="button"
          @click="$emit('update:modelValue', year)"
          :class="[
            'px-4 py-2 rounded-xl text-sm font-bold border transition',
            modelValue === year
              ? 'bg-emerald-600 text-white border-emerald-600 shadow'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          ]"
        >
          {{ year }}
        </button>
      </div>

      <!-- 7. Geolocation Input -->
      <div v-else-if="isGeolocationControl" class="flex flex-col gap-2">
        <div v-if="modelValue" class="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          ✓ {{ __('Location captured') }}: {{ formatCoords(modelValue) }}
        </div>
        <button
          type="button"
          @click="$emit('capture-gps')"
          class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-sm hover:bg-slate-800 transition"
        >
          <span>📍</span>
          <span>{{ modelValue ? __('Retry GPS') : __('Capturing GPS...') }}</span>
        </button>
      </div>

      <!-- 8. Number Input -->
      <input
        v-else-if="isNumberControl"
        :id="'q_input_' + question.question_code"
        type="number"
        :value="modelValue"
        :aria-label="questionLabel"
        :aria-describedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        :aria-invalid="Boolean(errorMessage)"
        :aria-errormessage="errorMessage ? 'q_err_' + question.question_code : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter="onInputEnter"
        @keydown.esc.stop="focusCard"
        :placeholder="__('Enter value')"
        class="block w-full min-h-[50px] rounded-xl border border-slate-300 dark:border-slate-700 py-3 px-4 text-base font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 bg-white dark:bg-slate-800"
      />

      <!-- 9. Date Input -->
      <input
        v-else-if="isDateControl"
        :id="'q_input_' + question.question_code"
        type="date"
        :value="modelValue"
        :aria-label="questionLabel"
        :aria-describedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        :aria-invalid="Boolean(errorMessage)"
        :aria-errormessage="errorMessage ? 'q_err_' + question.question_code : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter="onInputEnter"
        @keydown.esc.stop="focusCard"
        class="block w-full min-h-[50px] rounded-xl border border-slate-300 dark:border-slate-700 py-3 px-4 text-base font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 bg-white dark:bg-slate-800"
      />

      <!-- 10. Default Text Input -->
      <input
        v-else
        :id="'q_input_' + question.question_code"
        type="text"
        :value="modelValue"
        :aria-label="questionLabel"
        :aria-describedby="questionDescription ? 'q_desc_' + question.question_code : undefined"
        :aria-invalid="Boolean(errorMessage)"
        :aria-errormessage="errorMessage ? 'q_err_' + question.question_code : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter="onInputEnter"
        @keydown.esc.stop="focusCard"
        :placeholder="__('Enter value')"
        class="block w-full min-h-[50px] rounded-xl border border-slate-300 dark:border-slate-700 py-3 px-4 text-base font-medium text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 bg-white dark:bg-slate-800"
      />
    </div>

    <!-- Validation Error -->
    <p
      v-if="errorMessage"
      :id="'q_err_' + question.question_code"
      role="alert"
      class="mt-2 text-xs font-semibold text-rose-600"
    >
      {{ __(errorMessage) }}
    </p>

    <!-- Card Footer: Status Badge (Right) -->
    <div v-if="notApplicable || (isCompleted && !isInputFocused)" class="flex items-center justify-end mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <!-- Status Badge (Bottom-Right) -->
      <div class="min-h-[22px] flex items-center">
        <!-- Not Applicable Badge -->
        <span
          v-if="notApplicable"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2.5 py-0.5 rounded-full"
          :title="__('Skipped due to condition on another question')"
        >
          <span>⊘</span>
          <span>{{ __('Not Applicable') }}</span>
        </span>

        <!-- Answered Badge -->
        <span
          v-else-if="isCompleted && !isInputFocused"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full"
        >
          <span>✓</span>
          <span>{{ __('Answered') }}</span>
        </span>
      </div>
    </div>

    <!-- Question Configuration & Info Modal (Universal BaseModal with built-in scroll lock) -->
    <BaseModal
      :isOpen="showConfigModal"
      size="md"
      :title="__('Question Settings')"
      :subtitle="`${question.question_code} · ${question.is_mandatory ? __('Mandatory') : __('Optional')}`"
      @close="showConfigModal = false"
    >
      <div class="p-5 space-y-4">
        <!-- Question Title & Description -->
        <div>
          <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
            {{ questionLabel }}
          </h3>
          <p
            v-if="questionDescription"
            class="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 leading-relaxed"
          >
            ℹ️ {{ questionDescription }}
          </p>
        </div>

        <!-- Display Format Switcher (Choice Control) -->
        <div v-if="isChoiceControl" class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📱</span>
                <span>{{ __('Display Style') }}</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">
                {{ __('Choose how options appear on your screen') }}
              </div>
            </div>
            <span class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
              {{ __('Default:') }} {{ templateDefaultModeLabel }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              @click="setDisplayMode('grid')"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                effectiveMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <span>⊞</span>
              <span>{{ __('Button Grid') }}</span>
              <span v-if="templateDefaultMode === 'grid'" class="text-[10px] opacity-80 font-normal">({{ __('Default') }})</span>
            </button>
            <button
              type="button"
              @click="setDisplayMode('combobox')"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                effectiveMode === 'combobox'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <span>▾</span>
              <span>{{ __('Dropdown') }}</span>
              <span v-if="templateDefaultMode === 'combobox'" class="text-[10px] opacity-80 font-normal">({{ __('Default') }})</span>
            </button>
          </div>
        </div>

        <!-- Range Format Switcher (Buttons vs Slider) -->
        <div v-if="isRangeControl" class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-2">
          <div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🎚</span>
              <span>{{ __('Range Presentation') }}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              {{ __('Choose between discrete button pills or draggable bar') }}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              @click="setRangeFormat('buttons')"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                rangeFormat === 'buttons'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <span>🔘</span>
              <span>{{ __('Button Pills') }}</span>
            </button>
            <button
              type="button"
              @click="setRangeFormat('slider')"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                rangeFormat === 'slider'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              <span>🎚</span>
              <span>{{ __('Slider Bar') }}</span>
            </button>
          </div>
        </div>

        <!-- Technical Question Specifications -->
        <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800 text-xs">
          <div class="flex items-center justify-between px-3.5 py-2.5">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>
              {{ __('Field Type') }}
            </span>
            <span class="font-bold text-slate-900 dark:text-white">
              {{ formatFieldType() }}
            </span>
          </div>
          <div v-if="question.options && question.options.length" class="flex items-center justify-between px-3.5 py-2.5">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              {{ __('Options Count') }}
            </span>
            <span class="font-bold text-slate-900 dark:text-white">
              {{ question.options.length }} {{ __('choices') }}
            </span>
          </div>
          <div v-if="validationRuleSummary" class="flex items-center justify-between px-3.5 py-2.5">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              {{ __('Rules') }}
            </span>
            <span class="font-bold text-slate-900 dark:text-white">
              {{ validationRuleSummary }}
            </span>
          </div>
          <div v-if="dependencySummary" class="flex items-center justify-between px-3.5 py-2.5">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              {{ __('Depends On') }}
            </span>
            <span class="font-bold text-amber-700 dark:text-amber-400 truncate max-w-[200px]">
              {{ dependencySummary }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="w-full flex items-center justify-between">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            {{ __('Saved on your device') }}
          </span>
          <button
            type="button"
            @click="showConfigModal = false"
            class="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            {{ __('Done') }}
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useTranslation } from "../../composables/useTranslation";
import BaseModal from "../common/BaseModal.vue";
import FSwitch from "../common/FSwitch.vue";
import FRating from "../common/FRating.vue";
import FCurrencyInput from "../common/FCurrencyInput.vue";
import FCombobox from "../common/FCombobox.vue";
import FRangeSlider from "../common/FRangeSlider.vue";

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [String, Number, Boolean, Object, Array],
    default: "",
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

const emit = defineEmits(["update:modelValue", "capture-gps", "answered", "next"]);
const { __, getQuestionLabel } = useTranslation();

const cardRef = ref(null);
const isFocused = ref(false);
const isInputFocused = ref(false);
const showConfigModal = ref(false);

const localMode = ref(null);
const optionButtonRefs = ref([]);
const gridSearchQuery = ref("");
const searchInputRef = ref(null);

function onClearSearch() {
  gridSearchQuery.value = "";
  nextTick(() => {
    searchInputRef.value?.focus({ preventScroll: true });
  });
}

const isCompleted = computed(() => {
  const val = props.modelValue;
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return String(val).trim() !== "";
});

let touchTimer = null;
let touchStartX = 0;
let touchStartY = 0;

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

function onCardClick() {
  if (!isFocused.value && cardRef.value) {
    cardRef.value.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function onFocusIn(e) {
  const fromOutside = !cardRef.value?.contains(e.relatedTarget);
  isFocused.value = true;
  const tag = e?.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || e?.target?.isContentEditable) {
    isInputFocused.value = true;
  }

  if (fromOutside) {
    cardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    ensureVisibleAboveFooter(e.target);
  }
}

function onFocusOut(e) {
  const currentTag = e?.target?.tagName?.toLowerCase();
  if (currentTag === "input" || currentTag === "textarea" || e?.target?.isContentEditable) {
    isInputFocused.value = false;
  }
  if (!cardRef.value?.contains(e.relatedTarget)) {
    isFocused.value = false;
    isInputFocused.value = false;
    gridSearchQuery.value = "";
  }
}

function onCardEsc() {
  if (showConfigModal.value) {
    showConfigModal.value = false;
  }
}

function focusCard() {
  cardRef.value?.focus();
}

function onTouchStart(e) {
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  touchTimer = setTimeout(() => openConfigModal(), 600);
}

function onTouchMove(e) {
  if (!e.touches || e.touches.length !== 1) return;
  const dx = Math.abs(e.touches[0].clientX - touchStartX);
  const dy = Math.abs(e.touches[0].clientY - touchStartY);
  if (dx > 10 || dy > 10) {
    if (touchTimer) clearTimeout(touchTimer);
  }
}

function onTouchEnd() {
  if (touchTimer) clearTimeout(touchTimer);
}

function onTouchCancel() {
  if (touchTimer) clearTimeout(touchTimer);
}

function openConfigModal() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(50);
  }
  showConfigModal.value = true;
}

function onCardKeydown(e) {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  if (document.activeElement === cardRef.value && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    openConfigModal();
    return;
  }
  if (isChoiceControl.value && searchInputRef.value && handleTypeaheadSearch(e)) {
    return;
  }
}

const inputTypeLabel = computed(() => {
  if (isSwitchControl.value) return __("Yes / No");
  if (isRangeControl.value) return __("Slider");
  if (isRatingControl.value) return __("Rating");
  if (isCurrencyControl.value) return __("Currency");
  if (isYearControl.value) return __("Year");
  if (isGeolocationControl.value) return __("GPS");
  if (isChoiceControl.value) return isMultiSelect.value ? __("Multi-select") : __("Select");
  if (isDateControl.value) return __("Date");
  if (isNumberControl.value) return __("Number");
  return __("Text");
});

function formatFieldType() {
  return inputTypeLabel.value;
}

const validationRuleSummary = computed(() => {
  const r = props.question.validation_rules;
  if (!r) return null;
  if (r.min !== undefined && r.max !== undefined) return `Min: ${r.min}, Max: ${r.max}`;
  if (r.min !== undefined) return `Min: ${r.min}`;
  if (r.max !== undefined) return `Max: ${r.max}`;
  return null;
});

const dependencySummary = computed(() => {
  const logic = props.question.conditional_logic;
  if (!logic) return null;
  if (typeof logic === "object") {
    return logic.depends_on || logic.field || logic.parent || __("Conditional Rule");
  }
  return String(logic);
});

const isUserToggleAllowed = computed(() => {
  const variant = (props.question.control_variant || "Auto").toLowerCase();
  return Boolean(props.question.allow_user_toggle || variant === "auto");
});

const questionLabel = computed(() => getQuestionLabel(props.question));

const parsedQuestionMeta = computed(() => {
  const full = questionLabel.value || "";
  const match = full.match(/^(Q\d+[a-z]?\.?|\d+\.?|[A-Za-z]\.)\s*(.*)$/i);
  if (match) {
    const rawNum = match[1].replace(/\.$/, "").trim();
    const cleanText = match[2].replace(/^[\s.:-]+\s*/, "").trim();
    return {
      number: rawNum,
      text: cleanText,
    };
  }
  return {
    number: null,
    text: full.replace(/^[\s.:-]+\s*/, "").trim(),
  };
});

const questionDescription = computed(() => {
  if (props.question.description_translated) return props.question.description_translated;
  return props.question.description ? __(props.question.description) : "";
});

const isSwitchControl = computed(() => {
  const variant = (props.question.control_variant || "").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  return variant === "switch" || type === "check" || (type === "select" && isYesNoOptions.value);
});

const isYesNoOptions = computed(() => {
  const opts = props.question.options || [];
  if (opts.length !== 2) return false;
  const lower = opts.map((o) => String(o).toLowerCase());
  return lower.includes("yes") && lower.includes("no");
});

const isRatingControl = computed(() => {
  const variant = (props.question.control_variant || "").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  return variant === "rating" || type === "rating";
});

const isRangeControl = computed(() => {
  const variant = (props.question.control_variant || "").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  const code = (props.question.question_code || "").toLowerCase();
  return variant === "range" || variant === "slider" || type.includes("range") || code === "years_of_shg_membership";
});

const rangeMin = computed(() => {
  const q = props.question;
  if (q.validation_rules && q.validation_rules.min !== undefined) return Number(q.validation_rules.min);
  return 0;
});

const rangeMax = computed(() => {
  const q = props.question;
  if (q.validation_rules && q.validation_rules.max !== undefined) return Number(q.validation_rules.max);
  if (Array.isArray(q.options) && q.options.length > 0) {
    const nums = q.options.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) return Math.max(...nums);
  }
  return 7;
});

const rangeStep = computed(() => {
  const q = props.question;
  if (q.validation_rules && q.validation_rules.step !== undefined) return Number(q.validation_rules.step);
  return 1;
});

const rangeUnit = computed(() => {
  const label = (props.question.label_en || "").toLowerCase();
  if (label.includes("year")) return "Years";
  if (label.includes("month")) return "Months";
  return "";
});

const isCurrencyControl = computed(() => {
  const variant = (props.question.control_variant || "").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  const label = (props.question.label_en || "").toLowerCase();
  const code = (props.question.question_code || "").toLowerCase();
  if (label.includes("year") || code.includes("year") || label.includes("age") || code.includes("age") || label.includes("role") || code.includes("role")) {
    return false;
  }
  if (variant === "currency" || type === "currency" || type === "currency (inr)") return true;
  return /\b(rupees?|inr|rs\.?)\b/i.test(label) || label.includes("₹");
});

const localRangeFormat = ref(null);

const rangeFormat = computed(() => {
  if (localRangeFormat.value) return localRangeFormat.value;
  const qId = props.question.question_code || props.question.name;
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(`omniquery_range_format_${qId}`);
    if (saved) return saved;
  }
  const variant = (props.question.control_variant || "Auto").toLowerCase();
  if (variant === "slider" || variant === "range") return "slider";
  if (variant === "buttons" || variant === "radio" || variant === "grid") return "buttons";
  return "buttons";
});

function setRangeFormat(fmt) {
  localRangeFormat.value = fmt;
  const qId = props.question.question_code || props.question.name;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`omniquery_range_format_${qId}`, fmt);
  }
}

const isMultiSelect = computed(() => {
  const category = (props.question.field_category || "").toLowerCase();
  const label = (props.question.label_en || props.question.label || "").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  const variant = (props.question.control_variant || "").toLowerCase();
  return (
    category.includes("multi") ||
    label.includes("multi-select") ||
    label.includes("multiselect") ||
    type.includes("multi") ||
    type.includes("checkbox") ||
    variant.includes("multi") ||
    variant.includes("checkbox")
  );
});

const isChoiceControl = computed(() => {
  if (isSwitchControl.value || isRatingControl.value || isRangeControl.value || isCurrencyControl.value || isYearControl.value) {
    return false;
  }
  const type = props.question.field_type || "";
  return type === "Select" || Boolean(props.question.options && props.question.options.length);
});

const rawOptions = computed(() => {
  if (props.question.options_translated && props.question.options_translated.length) {
    return props.question.options_translated;
  }
  return props.question.options || [];
});

const normalizedOptions = computed(() => {
  return rawOptions.value.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return { value: opt.value || opt.label, label: __(opt.label || opt.value) };
    }
    return { value: opt, label: __(String(opt)) };
  });
});

const displayedGridOptions = computed(() => {
  if (!gridSearchQuery.value) return normalizedOptions.value;
  const q = gridSearchQuery.value.toLowerCase().trim();
  return normalizedOptions.value.filter((opt) => opt.label.toLowerCase().includes(q));
});

const effectiveMode = computed(() => {
  if (localMode.value) return localMode.value;
  const qId = props.question.question_code || props.question.name;
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(`omniquery_mode_${qId}`);
    if (saved) return saved;
  }
  const variant = (props.question.control_variant || "Auto").toLowerCase();
  if (variant === "combobox" || variant === "dropdown") return "combobox";
  if (variant === "radio" || variant === "buttons" || variant === "grid" || variant === "chips") return "grid";
  return normalizedOptions.value.length > 25 ? "combobox" : "grid";
});

const templateDefaultMode = computed(() => {
  const variant = (props.question.control_variant || "Auto").toLowerCase();
  const type = (props.question.field_type || "").toLowerCase();
  if (variant === "combobox" || variant === "dropdown" || type.includes("dropdown")) return "combobox";
  if (variant === "radio" || variant === "buttons" || variant === "grid" || variant === "chips" || type.includes("radio")) return "grid";
  return normalizedOptions.value.length > 25 ? "combobox" : "grid";
});

const templateDefaultModeLabel = computed(() => {
  const mode = templateDefaultMode.value === "combobox" ? __("Dropdown") : __("Button Grid");
  const variant = props.question.control_variant || "";
  const type = props.question.field_type || "";
  const source = variant || (type.includes("Dropdown") ? "Dropdown" : type.includes("Radio") ? "Radio" : "Auto");
  return `${mode} (${source})`;
});

function setDisplayMode(mode) {
  localMode.value = mode;
  const qId = props.question.question_code || props.question.name;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`omniquery_mode_${qId}`, mode);
  }
}

function isOptionSelected(val) {
  if (isMultiSelect.value) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val);
  }
  return props.modelValue === val;
}

const activeOptionIndex = ref(0);

watch(
  () => [props.question?.question_code, displayedGridOptions.value.length],
  () => {
    optionButtonRefs.value = [];
    gridSearchQuery.value = "";
    const firstSelected = displayedGridOptions.value.findIndex((opt) => isOptionSelected(opt.value));
    activeOptionIndex.value = firstSelected >= 0 ? firstSelected : 0;
  },
  { immediate: true }
);

function getOptionTabindex(index) {
  // Strict W3C roving tabindex for BOTH single-select and multi-select:
  // Exactly ONE tab stop for the entire option group!
  if (activeOptionIndex.value >= displayedGridOptions.value.length) {
    activeOptionIndex.value = 0;
  }
  return index === activeOptionIndex.value ? 0 : -1;
}

function onOptionClick(val) {
  const clickedIdx = displayedGridOptions.value.findIndex((opt) => opt.value === val);
  if (clickedIdx !== -1) {
    activeOptionIndex.value = clickedIdx;
  }
  if (isMultiSelect.value) {
    const list = Array.isArray(props.modelValue) ? [...props.modelValue] : (props.modelValue ? [props.modelValue] : []);
    const idx = list.indexOf(val);
    if (idx > -1) list.splice(idx, 1);
    else list.push(val);
    emit("update:modelValue", list);
  } else {
    emit("update:modelValue", val);
    gridSearchQuery.value = "";
    emit("answered", { code: props.question.question_code, value: val });
  }
}

function onControlInput(val) {
  emit("update:modelValue", val);
}

function onComboboxUpdate(val) {
  emit("update:modelValue", val);
  if (!isMultiSelect.value && val) {
    emit("answered", { code: props.question.question_code, value: val });
  }
}

function onInputEnter(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  emit("next");
}

function onOptionEnter(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  gridSearchQuery.value = "";
  emit("next");
}

function focusFirstOption() {
  if (optionButtonRefs.value[0]) {
    optionButtonRefs.value[0].focus({ preventScroll: true });
  } else if (cardRef.value) {
    const btn = cardRef.value.querySelector("button[role=radio], button[role=checkbox]");
    if (btn) btn.focus({ preventScroll: true });
  }
}

function onSearchInputEsc() {
  if (gridSearchQuery.value) {
    gridSearchQuery.value = "";
  } else {
    focusCard();
  }
}

function onSearchInputEnter() {
  if (displayedGridOptions.value.length === 1) {
    onOptionClick(displayedGridOptions.value[0].value);
    gridSearchQuery.value = "";
    emit("next");
  } else if (displayedGridOptions.value.length > 0) {
    focusFirstOption();
  } else {
    gridSearchQuery.value = "";
    emit("next");
  }
}

function onOptionSpace(val) {
  if (isMultiSelect.value) {
    const list = Array.isArray(props.modelValue) ? [...props.modelValue] : (props.modelValue ? [props.modelValue] : []);
    const idx = list.indexOf(val);
    if (idx > -1) list.splice(idx, 1);
    else list.push(val);
    emit("update:modelValue", list);
  } else {
    emit("update:modelValue", val);
  }
}

function handleOptionArrowNav(e, curIdx) {
  const len = displayedGridOptions.value.length;
  if (len === 0) return;

  // When on the first option, ArrowUp smoothly transitions back up to the quick search input
  if (e.key === "ArrowUp" && curIdx === 0 && searchInputRef.value) {
    e.preventDefault();
    e.stopPropagation();
    searchInputRef.value.focus({ preventScroll: true });
    return;
  }

  let nextIdx = curIdx;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    nextIdx = (curIdx + 1) % len;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    nextIdx = (curIdx - 1 + len) % len;
  }
  activeOptionIndex.value = nextIdx;
  let targetBtn = optionButtonRefs.value[nextIdx];
  if (!targetBtn && cardRef.value) {
    const allBtns = cardRef.value.querySelectorAll("button[role=radio], button[role=checkbox]");
    targetBtn = allBtns[nextIdx];
  }
  if (targetBtn) {
    targetBtn.focus({ preventScroll: true });
    ensureVisibleAboveFooter(targetBtn);
    if (!isMultiSelect.value) {
      emit("update:modelValue", displayedGridOptions.value[nextIdx].value);
    }
  }
}

function handleTypeaheadSearch(e) {
  if (!searchInputRef.value && normalizedOptions.value.length <= 7) {
    return false;
  }

  // Backspace key on option button or grid: deletes last search character and refocuses input
  if (e.key === "Backspace") {
    if (gridSearchQuery.value && gridSearchQuery.value.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      gridSearchQuery.value = gridSearchQuery.value.slice(0, -1);
      nextTick(() => {
        if (searchInputRef.value) {
          searchInputRef.value.focus({ preventScroll: true });
          const len = gridSearchQuery.value.length;
          searchInputRef.value.setSelectionRange?.(len, len);
        }
      });
      return true;
    }
    return false;
  }

  // Ignore navigation, action, and modifier keys
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.key === "Tab" ||
    e.key === "Enter" ||
    e.key === "Escape" ||
    e.key === " "
  ) {
    return false;
  }

  // Single printable characters (letters, numbers, symbols): append to search query and refocus input at end
  if (e.key.length === 1) {
    e.preventDefault();
    e.stopPropagation();
    gridSearchQuery.value += e.key;
    nextTick(() => {
      if (searchInputRef.value) {
        searchInputRef.value.focus({ preventScroll: true });
        const len = gridSearchQuery.value.length;
        searchInputRef.value.setSelectionRange?.(len, len);
      }
    });
    return true;
  }

  return false;
}

function onOptionKeydown(e, index) {
  if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    handleOptionArrowNav(e, index);
    return;
  }

  if (handleTypeaheadSearch(e)) {
    return;
  }
}

function onGridKeydown(e) {
  if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    let curIdx = optionButtonRefs.value.findIndex((btn) => btn === document.activeElement);
    if (curIdx === -1) {
      curIdx = displayedGridOptions.value.findIndex((opt) => isOptionSelected(opt.value));
    }
    if (curIdx === -1) curIdx = 0;
    handleOptionArrowNav(e, curIdx);
    return;
  }

  if (handleTypeaheadSearch(e)) {
    return;
  }

  // Only use 1-9 numeric jump shortcuts when quick search is NOT present
  if (normalizedOptions.value.length <= 7) {
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= displayedGridOptions.value.length && num <= 9) {
      e.preventDefault();
      e.stopPropagation();
      const targetIdx = num - 1;
      optionButtonRefs.value[targetIdx]?.focus({ preventScroll: true });
      onOptionClick(displayedGridOptions.value[targetIdx].value);
    }
  }
}

function onGlobalChoiceMode(e) {
  if (e && e.detail) {
    localMode.value = e.detail;
  }
}

const isYearControl = computed(() => {
  const variant = props.question.control_variant || "";
  return variant === "Year" || props.question.temporal_granularity === "Year";
});

const yearOptions = computed(() => {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2, current - 3, current - 4];
});

const isGeolocationControl = computed(() => {
  const type = props.question.field_type || "";
  return type === "Geolocation" || props.question.control_variant === "GPS";
});

const isNumberControl = computed(() => {
  const type = props.question.field_type || "";
  return type === "Int" || type === "Float" || type === "Number";
});

const isDateControl = computed(() => {
  const type = (props.question.field_type || "").toLowerCase();
  return type.includes("date");
});

function formatCoords(coords) {
  if (typeof coords === "object" && coords.latitude) {
    return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
  }
  return String(coords);
}

onMounted(() => {
  window.addEventListener("omniquery:choicemode", onGlobalChoiceMode);
});

onUnmounted(() => {
  if (showConfigModal.value && typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
  window.removeEventListener("omniquery:choicemode", onGlobalChoiceMode);
});

function focusPrimaryInput() {
  nextTick(() => {
    if (!cardRef.value) return;
    // 0. Quick search bar at top of options
    if (searchInputRef.value) {
      searchInputRef.value.focus({ preventScroll: true });
      return;
    }
    // 1. Standard text / number / date input or textarea (exclude quick search inputs)
    const input = cardRef.value.querySelector("input:not([type=hidden]):not([disabled]):not([data-search-input]), textarea:not([disabled])");
    if (input) {
      input.focus({ preventScroll: true });
      return;
    }
    // 2. Combobox trigger button: [role="combobox"] (Multi-select or single-select combobox dropdown)
    const comboboxBtn = cardRef.value.querySelector("button[role=combobox]:not([disabled])");
    if (comboboxBtn) {
      comboboxBtn.focus({ preventScroll: true });
      return;
    }
    // 3. Option buttons grid: focus selected option button or first option button
    const checkedOptionBtn = cardRef.value.querySelector("button[role=radio][aria-checked=true], button[role=checkbox][aria-checked=true]");
    if (checkedOptionBtn) {
      checkedOptionBtn.focus({ preventScroll: true });
      return;
    }
    const firstOptionBtn = cardRef.value.querySelector("button[role=radio], button[role=checkbox]");
    if (firstOptionBtn) {
      firstOptionBtn.focus({ preventScroll: true });
      return;
    }
    // 4. Binary switch control
    const switchBtn = cardRef.value.querySelector("button[role=switch]");
    if (switchBtn) {
      switchBtn.focus({ preventScroll: true });
      return;
    }
    // 5. Any interactive button inside control area
    const anyBtn = cardRef.value.querySelector("button:not([disabled])");
    if (anyBtn) {
      anyBtn.focus({ preventScroll: true });
      return;
    }
    cardRef.value.focus({ preventScroll: true });
  });
}

defineExpose({
  focus: focusPrimaryInput,
});
</script>
