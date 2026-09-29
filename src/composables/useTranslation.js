import { ref, computed } from "vue";

const CORE_HINDI = {
  "Surveys": "सर्वेक्षण सूची",
  "Start Survey": "सर्वेक्षण शुरू करें",
  "Start Survey →": "सर्वेक्षण शुरू करें →",
  "Select an active field survey to begin recording responses.": "प्रतिक्रियाएं दर्ज करने के लिए सक्रिय सर्वेक्षण चुनें।",
  "Workspaces": "कार्यक्षेत्र",
  "All Workspaces": "सभी कार्यक्षेत्र",
  "Projects": "परियोजनाएं",
  "All Projects": "सभी परियोजनाएं",
  "Search surveys...": "सर्वेक्षण खोजें...",
  "Loading...": "लोड हो रहा है...",
  "Survey Submitted": "सर्वेक्षण सफलतापूर्वक दर्ज",
  "Response recorded successfully in offline queue.": "प्रतिक्रिया ऑफ़लाइन कतार में सफलतापूर्वक दर्ज कर ली गई है।",
  "New Response": "नया प्रपत्र भरें",
  "All Surveys": "सभी सर्वेक्षण",
  "Section": "अनुभाग",
  "of": "का",
  "Completed": "पूर्ण",
  "Previous": "पिछला",
  "Next": "अगला",
  "Save Offline": "ऑफ़लाइन सहेजें",
  "Submit Survey": "सर्वेक्षण जमा करें",
  "Submitting...": "जमा हो रहा है...",
  "Online": "ऑनलाइन",
  "Offline": "ऑफ़लाइन",
  "Offline Ready": "ऑफ़लाइन तैयार",
  "WAL Queue": "प्रतीक्षारत कतार",
  "Pending": "प्रतीक्षारत",
  "Survey Responses": "सर्वेक्षण प्रतिक्रियाएं",
  "Sync Now": "अभी सिंक करें",
  "Close": "बंद करें",
  "Exit Form": "प्रपत्र से बाहर निकलें",
  "Exit Survey?": "सर्वेक्षण से बाहर निकलें?",
  "Your responses are saved in offline drafts. Return to the survey list?": "आपकी प्रविष्टियां ड्राफ्ट में सुरक्षित हैं। क्या आप सर्वेक्षण सूची में जाना चाहते हैं?",
  "Stay": "यहीं रहें",
  "Exit": "बाहर निकलें",
  "Grid": "ग्रिड",
  "Dropdown": "ड्रॉपडाउन",
  "Choice Layout": "विकल्प लेआउट",
  "Direct Grid": "प्रत्यक्ष ग्रिड",
  "Search Dropdown": "खोज ड्रॉपडाउन",
  "This field is required": "यह फ़ील्ड अनिवार्य है",
  "Saved offline": "ऑफ़लाइन सुरक्षित किया गया",
  "No active surveys available.": "कोई सक्रिय सर्वेक्षण उपलब्ध नहीं है।",
  "Check your network connection or permissions.": "अपना नेटवर्क कनेक्शन या अनुमतियां जांचें।",
  "Text Size": "अक्षर आकार",
  "Sections": "अनुभाग",
  "Questions": "प्रश्न",
};

const initialLang = (typeof window !== "undefined" && localStorage.getItem("omniquery_lang")) || "hi";
const currentLang = ref(initialLang);

export function useTranslation() {
  function __(text) {
    if (!text) return "";
    if (currentLang.value === "en") return text;
    const globalDict = (typeof window !== "undefined" && window.__messages) || {};
    return globalDict[text] || CORE_HINDI[text] || text;
  }

  function toggleLanguage() {
    currentLang.value = currentLang.value === "hi" ? "en" : "hi";
    if (typeof window !== "undefined") {
      localStorage.setItem("omniquery_lang", currentLang.value);
      document.documentElement.lang = currentLang.value;
    }
  }

  function setLanguage(lang) {
    currentLang.value = lang === "en" ? "en" : "hi";
    if (typeof window !== "undefined") {
      localStorage.setItem("omniquery_lang", currentLang.value);
      document.documentElement.lang = currentLang.value;
    }
  }

  function getQuestionLabel(question) {
    if (!question) return "";
    if (currentLang.value === "hi" && question.label_hi) return question.label_hi;
    if (currentLang.value === "hi" && question.label_translated) return question.label_translated;
    const base = question.label || question.label_en || question.question_code || "";
    return __(base);
  }

  function getSectionTitle(section) {
    if (!section) return "";
    if (currentLang.value === "hi" && section.section_title_hi) return section.section_title_hi;
    if (currentLang.value === "hi" && section.section_title_translated) return section.section_title_translated;
    return __(section.section_title || "");
  }

  function getOptionLabel(option) {
    if (option === null || option === undefined) return "";
    return __(String(option));
  }

  return {
    __,
    currentLang,
    toggleLanguage,
    setLanguage,
    getQuestionLabel,
    getSectionTitle,
    getOptionLabel,
  };
}
