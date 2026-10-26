<template>
  <div>
    <SectionCard
      :section="activeSection"
      :currentIndex="activeSectionIndex"
      :totalSections="sections.length"
      :isComplete="isSectionComplete(activeSection)"
      :isSubmitting="isSubmitting"
      :autoAdvance="autoAdvance"
      :isFullForm="isFullForm"
      :isFocusMode="isFocusMode"
      :isRecording="isRecording"
      :isAudioPaused="isAudioPaused"
      :isGuest="isGuest"
      @open-focus-mode="$emit('open-focus-mode')"
      @toggle-focus-mode="$emit('toggle-focus-mode')"
      @toggle-auto-advance="$emit('toggle-auto-advance')"
      @toggle-full-form="$emit('toggle-full-form')"
      @toggle-audio="$emit('toggle-audio')"
      @prev="$emit('prev-section')"
      @next="$emit('next-section')"
      @submit="$emit('submit-form')"
    >
      <template v-for="item in displayQuestionItems" :key="item.type === 'group' ? item.group_code : (item.type === 'matrix' ? 'matrix_' + item.question.question_code : item.question.question_code)">
        <GroupedQuestionCard
          v-if="item.type === 'group'"
          :group="item"
          :responses="responses"
          :validationErrors="validationErrors"
          :notApplicable="item.questions && item.questions.every(q => !isQuestionVisible(q))"
          @update-response="(qc, val) => $emit('group-response-update', qc, val)"
          @answered="$emit('question-answered', $event)"
        />
        <MatrixQuestionCard
          v-else-if="item.type === 'matrix'"
          :id="'qc_' + item.question.question_code"
          :question="item.question"
          v-model="responses[item.question.question_code]"
          :errorMessage="validationErrors[item.question.question_code]"
          :notApplicable="!isQuestionVisible(item.question)"
          @answered="$emit('question-answered', item.question)"
          @next="$emit('question-answered', item.question)"
        />
        <QuestionCard
          v-else
          :id="'qc_' + item.question.question_code"
          :question="item.question"
          v-model="responses[item.question.question_code]"
          :errorMessage="validationErrors[item.question.question_code]"
          :notApplicable="!isQuestionVisible(item.question)"
          @answered="$emit('question-answered', item.question)"
          @next="$emit('question-answered', item.question)"
          @capture-gps="$emit('capture-gps')"
        />
      </template>
    </SectionCard>

    <!-- Focus Mode / Auto Form Popup Modal -->
    <FocusModeModal
      :isOpen="isFocusMode"
      :questions="activeQuestions"
      :currentIndex="focusQuestionIndex"
      :responses="responses"
      :validationErrors="validationErrors"
      :autoAdvance="autoAdvance"
      :isFullForm="isFullForm"
      :sectionTitle="activeSection ? activeSection.section_title || activeSection.section_code : ''"
      @close="$emit('close-focus-mode')"
      @prev-question="$emit('prev-focus-question')"
      @next-question="$emit('next-focus-question')"
      @finish-section="$emit('finish-focus-section')"
      @update-response="(qc, val) => $emit('update-focus-response', qc, val)"
      @toggle-auto-advance="$emit('toggle-auto-advance')"
      @toggle-full-form="$emit('toggle-full-form')"
      @capture-gps="$emit('capture-gps')"
    />
  </div>
</template>

<script setup>
import SectionCard from "../components/survey/SectionCard.vue";
import QuestionCard from "../components/survey/QuestionCard.vue";
import GroupedQuestionCard from "../components/survey/GroupedQuestionCard.vue";
import MatrixQuestionCard from "../components/survey/MatrixQuestionCard.vue";
import FocusModeModal from "../components/survey/FocusModeModal.vue";

defineProps({
  activeSection: Object,
  activeSectionIndex: Number,
  sections: Array,
  responses: Object,
  validationErrors: Object,
  isSubmitting: Boolean,
  autoAdvance: Boolean,
  isFullForm: Boolean,
  isFocusMode: Boolean,
  isRecording: Boolean,
  isAudioPaused: Boolean,
  isGuest: Boolean,
  displayQuestionItems: Array,
  activeQuestions: Array,
  focusQuestionIndex: Number,
  isQuestionVisible: Function,
  isSectionComplete: Function,
});

defineEmits([
  "open-focus-mode",
  "toggle-focus-mode",
  "toggle-auto-advance",
  "toggle-full-form",
  "toggle-audio",
  "prev-section",
  "next-section",
  "submit-form",
  "group-response-update",
  "question-answered",
  "capture-gps",
  "close-focus-mode",
  "prev-focus-question",
  "next-focus-question",
  "finish-focus-section",
  "update-focus-response",
]);
</script>
