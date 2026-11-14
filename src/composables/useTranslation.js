import { ref, computed, watch } from "vue";

const CORE_HINDI = {
  "{0} surveys today": "आज {0} सर्वेक्षण",
  "1 survey today": "आज 1 सर्वेक्षण",
  "On this device": "इस डिवाइस पर",
  "{0} records": "{0} रिकॉर्ड",
  "1 record": "1 रिकॉर्ड",
  "{0} left for target": "लक्ष्य के लिए {0} शेष",
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
  "You are not assigned to a project yet. Ask your supervisor.": "आपको अभी किसी परियोजना में नहीं जोड़ा गया है। अपने पर्यवेक्षक से पूछें।",
  "Text Size": "अक्षर आकार",
  "Sections": "अनुभाग",
  "Questions": "प्रश्न",
  "My Account": "मेरा खाता",
  "My Account needs internet": "मेरा खाता खोलने के लिए इंटरनेट चाहिए",
  "Guest Surveyor": "अतिथि सर्वेक्षक",
};

const initialLang = (typeof window !== "undefined" && localStorage.getItem("omniquery_lang")) || "hi";
const currentLang = ref(initialLang);
// <html lang> names the language on screen, so screen readers pick the right voice (#45).
// The server renders it from the Frappe language for the loading screen; the PWA's languages are both left-to-right.
if (typeof document !== "undefined") {
  watch(
    currentLang,
    (lang) => {
      document.documentElement.lang = lang;
      document.documentElement.dir = "ltr";
    },
    { immediate: true, flush: "sync" }
  );
}

function fillPlaceholders(text, args) {
  if (!args) return text;
  return text.replace(/\{(\d+)\}/g, (match, i) => (args[i] === undefined ? match : String(args[i])));
}

export function useTranslation() {
  // same signature as Frappe's __(text, replace): "{0}" placeholders are filled from args
  function __(text, args) {
    if (!text) return "";
    return fillPlaceholders(translate(text), args);
  }

  function translate(text) {
    if (currentLang.value === "en") return text;
    const globalDict = (typeof window !== "undefined" && window.__messages) || {};
    return globalDict[text] || CORE_HINDI[text] || text;
  }

  function toggleLanguage() {
    currentLang.value = currentLang.value === "hi" ? "en" : "hi";
    if (typeof window !== "undefined") {
      localStorage.setItem("omniquery_lang", currentLang.value);
    }
  }

  function setLanguage(lang) {
    currentLang.value = lang === "en" ? "en" : "hi";
    if (typeof window !== "undefined") {
      localStorage.setItem("omniquery_lang", currentLang.value);
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
