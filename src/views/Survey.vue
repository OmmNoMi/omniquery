<template>
  <div>
    <SectionCard
      :section="s.activeSection"
      :currentIndex="s.activeSectionIndex"
      :totalSections="s.sections.length"
      :isComplete="s.isSectionComplete(s.activeSection)"
      :isSubmitting="s.isSubmitting"
      :autoAdvance="s.autoAdvance"
      :isFullForm="s.isFullForm"
      :isFocusMode="s.isFocusMode"
      :isRecording="s.isRecording"
      :isAudioPaused="s.isAudioPaused"
      :isGuest="s.isGuest"
      @toggle-focus-mode="s.toggleFocusMode()"
      @toggle-auto-advance="s.autoAdvance = !s.autoAdvance"
      @toggle-full-form="s.toggleFullForm()"
      @toggle-audio="s.toggleAudio()"
      @prev="s.handlePrevSection()"
      @next="s.handleNextSection()"
      @submit="s.submitForm()"
    >
      <template v-for="item in s.displayQuestionItems" :key="item.type === 'group' ? item.group_code : (item.type === 'matrix' ? 'matrix_' + item.question.question_code : item.question.question_code)">
        <GroupedQuestionCard
          v-if="item.type === 'group'"
          :group="item"
          :responses="s.responses"
          :validationErrors="s.validationErrors"
          :notApplicable="item.questions && item.questions.every(q => !s.isQuestionVisible(q))"
          @update-response="s.setResponse"
          @answered="s.onQuestionAnswered($event)"
        />
        <MatrixQuestionCard
          v-else-if="item.type === 'matrix'"
          :id="'qc_' + item.question.question_code"
          :question="item.question"
          :modelValue="s.responses[item.question.question_code]"
          @update:modelValue="s.setResponse(item.question.question_code, $event)"
          :errorMessage="s.validationErrors[item.question.question_code]"
          :notApplicable="!s.isQuestionVisible(item.question)"
          @answered="s.onQuestionAnswered(item.question)"
          @next="s.onQuestionAnswered(item.question)"
        />
        <QuestionCard
          v-else
          :id="'qc_' + item.question.question_code"
          :question="item.question"
          :modelValue="s.responses[item.question.question_code]"
          @update:modelValue="s.setResponse(item.question.question_code, $event)"
          :errorMessage="s.validationErrors[item.question.question_code]"
          :notApplicable="!s.isQuestionVisible(item.question)"
          @answered="s.onQuestionAnswered(item.question)"
          @next="s.onQuestionAnswered(item.question)"
          @capture-gps="s.captureGPS()"
        />
      </template>
    </SectionCard>

    <!-- Focus Mode / Auto Form Popup Modal -->
    <FocusModeModal
      :isOpen="s.isFocusMode"
      :questions="s.activeQuestions"
      :currentIndex="s.focusQuestionIndex"
      :responses="s.responses"
      :validationErrors="s.validationErrors"
      :autoAdvance="s.autoAdvance"
      :isFullForm="s.isFullForm"
      :sectionTitle="s.activeSection ? s.activeSection.section_title || s.activeSection.section_code : ''"
      @close="s.isFocusMode = false"
      @prev-question="s.focusQuestionIndex = Math.max(0, s.focusQuestionIndex - 1)"
      @next-question="s.focusQuestionIndex = Math.min(s.activeQuestions.length - 1, s.focusQuestionIndex + 1)"
      @finish-section="s.onFocusModeFinishSection()"
      @update-response="s.setResponse"
      @toggle-auto-advance="s.autoAdvance = !s.autoAdvance"
      @toggle-full-form="s.toggleFullForm()"
      @capture-gps="s.captureGPS()"
    />
  </div>
</template>

<script setup>
import SectionCard from "../components/survey/SectionCard.vue";
import QuestionCard from "../components/survey/QuestionCard.vue";
import GroupedQuestionCard from "../components/survey/GroupedQuestionCard.vue";
import MatrixQuestionCard from "../components/survey/MatrixQuestionCard.vue";
import FocusModeModal from "../components/survey/FocusModeModal.vue";
import { useSurveySession } from "../composables/useSurveyApp";

// every answer goes through s.setResponse, so the session owns the one write path (#46)
const s = useSurveySession();
</script>
