import { ref, computed, watch } from "vue";

const CORE_HINDI = {
  // an OmniQuery Project's status, as the project page badge shows it (#16); "Completed" is below
  "Draft": "प्रारूप",
  "Active": "सक्रिय",
  "Archived": "संग्रहीत",
  "Back to Dashboard": "डैशबोर्ड पर वापस जाएँ",
  "Breakdown table": "विवरण तालिका",
  "Download for Offline": "ऑफ़लाइन के लिए डाउनलोड करें",
  "Field SOPs & Protocols": "फ़ील्ड SOP और प्रोटोकॉल",
  "Loaded survey": "सर्वेक्षण लोड हुआ",
  "No published surveys found for this project": "इस परियोजना के लिए कोई प्रकाशित सर्वेक्षण नहीं मिला",
  "Offline Mode": "ऑफ़लाइन मोड",
  "Please check with your field supervisor or reload your template list.": "कृपया अपने फ़ील्ड पर्यवेक्षक से पूछें या अपनी सर्वेक्षण सूची फिर से लोड करें।",
  "Pre-cache survey questions so you can fill it without internet": "सर्वेक्षण के प्रश्न पहले से सहेजें ताकि आप इसे बिना इंटरनेट के भर सकें",
  "Project Details": "परियोजना विवरण",
  "Q": "प्र",
  "Ready Offline": "ऑफ़लाइन तैयार",
  "Requires Internet to Download": "डाउनलोड के लिए इंटरनेट चाहिए",
  "Select a survey to start collecting field data": "फ़ील्ड डेटा एकत्र करना शुरू करने के लिए एक सर्वेक्षण चुनें",
  "Standard Field Investigator Protocol": "मानक फ़ील्ड अन्वेषक प्रोटोकॉल",
  "Standard Operating Procedures": "मानक संचालन प्रक्रियाएँ",
  "Supervisor Helpline": "पर्यवेक्षक हेल्पलाइन",
  "Survey": "सर्वेक्षण",
  "Survey questions and schema downloaded in device memory": "सर्वेक्षण के प्रश्न और ढाँचा डिवाइस में सहेजे गए",
  "Surveys Assigned": "सौंपे गए सर्वेक्षण",
  "Surveys in this Project": "इस परियोजना के सर्वेक्षण",
  "{0} surveys today": "आज {0} सर्वेक्षण",
  "1 survey today": "आज 1 सर्वेक्षण",
  "On this device": "इस डिवाइस पर",
  "{0} records": "{0} रिकॉर्ड",
  "1 record": "1 रिकॉर्ड",
  "{0} left for target": "लक्ष्य के लिए {0} शेष",
  "Surveys": "सर्वेक्षण सूची",
  "Start Survey": "सर्वेक्षण शुरू करें",
  // the draft card resumes, the catalog card starts anew (#18)
  "Resume Survey": "सर्वेक्षण जारी रखें",
  "Start New": "नया शुरू करें",
  "Required": "आवश्यक",
  "Start Survey →": "सर्वेक्षण शुरू करें →",
  "Select an active field survey to begin recording responses.": "प्रतिक्रियाएं दर्ज करने के लिए सक्रिय सर्वेक्षण चुनें।",
  "Workspaces": "कार्यक्षेत्र",
  "All Workspaces": "सभी कार्यक्षेत्र",
  "Projects": "परियोजनाएं",
  "All Projects": "सभी परियोजनाएं",
  "Search surveys...": "सर्वेक्षण खोजें...",
  "Search surveys": "सर्वेक्षण खोजें",
  "Clear search": "खोज साफ़ करें",
  "Project details": "प्रोजेक्ट विवरण",
  "Project details and training materials": "प्रोजेक्ट विवरण और प्रशिक्षण सामग्री",
  "Loading...": "लोड हो रहा है...",
  "Survey submitted": "सर्वेक्षण सफलतापूर्वक दर्ज",
  "Response recorded successfully in offline queue.": "प्रतिक्रिया ऑफ़लाइन कतार में सफलतापूर्वक दर्ज कर ली गई है।",
  "New response": "नया प्रपत्र भरें",
  "All surveys": "सभी सर्वेक्षण",
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
  "Waiting to upload": "अपलोड के लिए प्रतीक्षारत",
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
  "Choice layout": "विकल्प लेआउट",
  "Direct Grid": "प्रत्यक्ष ग्रिड",
  "Search Dropdown": "खोज ड्रॉपडाउन",
  "This field is required": "यह फ़ील्ड अनिवार्य है",
  // a Phone question (#22)
  "Phone": "फ़ोन नंबर",
  "Enter a 10-digit mobile number": "10 अंकों का मोबाइल नंबर दर्ज करें",
  "Enter 10-digit mobile number": "10 अंकों का मोबाइल नंबर दर्ज करें",
  // what an empty required question asks for (#23)
  "Choose {0}": "{0} चुनें",
  "Enter {0}": "{0} दर्ज करें",
  "Choose an answer": "एक उत्तर चुनें",
  "Enter an answer": "उत्तर दर्ज करें",
  "Capture the location": "लोकेशन दर्ज करें",
  "Saved offline": "ऑफ़लाइन सुरक्षित किया गया",
  "No active surveys available.": "कोई सक्रिय सर्वेक्षण उपलब्ध नहीं है।",
  "Check your network connection or permissions.": "अपना नेटवर्क कनेक्शन या अनुमतियां जांचें।",
  "You are not assigned to a project yet. Ask your supervisor.": "आपको अभी किसी परियोजना में नहीं जोड़ा गया है। अपने पर्यवेक्षक से पूछें।",
  "Text size": "अक्षर आकार",
  "Sections": "अनुभाग",
  "Questions": "प्रश्न",
  "My Account": "मेरा खाता",
  "My Account needs internet": "मेरा खाता खोलने के लिए इंटरनेट चाहिए",
  "Guest Surveyor": "अतिथि सर्वेक्षक",
  // #44 copy. Also in hi.po; the PWA reads only this table until it loads hi.po for its own language (ROADMAP)
  "Offline sync queue": "ऑफ़लाइन सिंक कतार",
  "{0} pending submissions saved on this device": "इस डिवाइस पर {0} प्रविष्टियाँ अपलोड के लिए सहेजी गई हैं",
  "These records are saved safely on this device. When you are online, tap Sync all records now to upload them.": "ये रिकॉर्ड इस डिवाइस पर सुरक्षित हैं। ऑनलाइन होने पर इन्हें अपलोड करने के लिए सभी रिकॉर्ड अभी सिंक करें दबाएँ।",
  "Sync all records now": "सभी रिकॉर्ड अभी सिंक करें",
  "{0} pending responses": "{0} प्रतिक्रियाएँ बाकी",
  "Fill again": "फिर से भरें",
  "Discard saved draft?": "सहेजा गया ड्राफ़्ट हटाएँ?",
  "This draft will be removed from this device. This cannot be undone.": "यह ड्राफ़्ट इस डिवाइस से हटा दिया जाएगा। इसे वापस नहीं लाया जा सकता।",
  "Discard draft": "ड्राफ़्ट हटाएँ",
  "Keep draft": "ड्राफ़्ट रखें",
  "Could not discard the draft: {0}": "ड्राफ़्ट नहीं हटाया जा सका: {0}",
  "Sync failed: {0}": "सिंक विफल: {0}",
  "Could not copy: {0}": "कॉपी नहीं हो सका: {0}",
  "Response code copied": "प्रतिक्रिया कोड कॉपी हो गया",
  "Not uploaded yet. The interview is kept on this device and will be sent later.": "अभी अपलोड नहीं हुआ। साक्षात्कार इस डिवाइस पर सुरक्षित है और बाद में भेजा जाएगा।",
  "Export failed: {0}": "निर्यात विफल: {0}",
  "CSV export failed: {0}": "CSV निर्यात विफल: {0}",
  "ZIP export failed: {0}": "ZIP निर्यात विफल: {0}",
  "Cleaned up {0} old synced responses to free local storage": "स्थानीय स्टोरेज खाली करने के लिए {0} पुरानी सिंक की गई प्रतिक्रियाएँ हटाई गईं",
  "This survey is not yet downloaded on your device. Please connect to the internet once to download it.": "यह सर्वेक्षण अभी आपके डिवाइस पर डाउनलोड नहीं हुआ है। इसे डाउनलोड करने के लिए एक बार इंटरनेट से जुड़ें।",
  "Survey synced to server successfully!": "सर्वेक्षण सर्वर पर सिंक हो गया!",
  "Return to Home": "होम पर लौटें",
  "Pending Offline Responses": "लंबित ऑफ़लाइन उत्तर",
  "Mute microphone": "माइक्रोफ़ोन म्यूट करें",
  "Unmute / record microphone": "माइक्रोफ़ोन चालू करें / रिकॉर्ड करें",
  "Microphone access is blocked": "माइक्रोफ़ोन की अनुमति बंद है",
  "Allow microphone access for this site in your browser settings, then tap the microphone again.": "ब्राउज़र की सेटिंग में इस साइट को माइक्रोफ़ोन की अनुमति दें, फिर माइक्रोफ़ोन दोबारा दबाएँ।",
  "Recording is not available": "रिकॉर्डिंग उपलब्ध नहीं है",
  "This browser cannot record audio. The survey still saves without a recording.": "यह ब्राउज़र ऑडियो रिकॉर्ड नहीं कर सकता। सर्वेक्षण बिना रिकॉर्डिंग के भी सहेजा जाएगा।",
  "No microphone found": "कोई माइक्रोफ़ोन नहीं मिला",
  "Connect a microphone, then tap the microphone again.": "माइक्रोफ़ोन जोड़ें, फिर माइक्रोफ़ोन दोबारा दबाएँ।",
  "Could not start the microphone": "माइक्रोफ़ोन चालू नहीं हो सका",
  "Another app may be using it. Close that app, then tap the microphone again.": "शायद कोई दूसरा ऐप इसका उपयोग कर रहा है। उस ऐप को बंद करें, फिर माइक्रोफ़ोन दोबारा दबाएँ।",
  "Dismiss": "हटाएँ",
  "Location access is blocked": "लोकेशन की अनुमति बंद है",
  "Allow location access for this site in your browser settings, then tap Retry GPS.": "ब्राउज़र की सेटिंग में इस साइट को लोकेशन की अनुमति दें, फिर जीपीएस पुनः प्रयास दबाएँ।",
  "Location unavailable": "लोकेशन उपलब्ध नहीं है",
  "Turn on location on this device, then tap Retry GPS.": "इस डिवाइस पर लोकेशन चालू करें, फिर जीपीएस पुनः प्रयास दबाएँ।",
  "Location timed out": "लोकेशन मिलने में समय समाप्त हो गया",
  "Move to an open spot or near a window, then tap Retry GPS.": "खुली जगह या खिड़की के पास जाएँ, फिर जीपीएस पुनः प्रयास दबाएँ।",
  "Location is not supported": "लोकेशन समर्थित नहीं है",
  "This browser cannot share a location. The interview still saves without one.": "यह ब्राउज़र लोकेशन साझा नहीं कर सकता। साक्षात्कार बिना लोकेशन के भी सहेजा जाएगा।",
  "Retry GPS": "जीपीएस पुनः प्रयास",
  "Capturing GPS...": "जीपीएस खोज रहे हैं...",
  "Close settings": "सेटिंग्स बंद करें",
  "Previous project": "पिछला प्रोजेक्ट",
  "Next project": "अगला प्रोजेक्ट",
  "Download all for offline": "ऑफ़लाइन के लिए सभी डाउनलोड करें",
  "Select options": "विकल्प चुनें",
  "Clear selection": "चयन साफ़ करें",
  "Decrease": "घटाएँ",
  "Increase": "बढ़ाएँ",
  "{0} of {1}": "{1} में से {0}",
  "Download all survey templates for this project so they can be filled offline": "इस प्रोजेक्ट के सभी सर्वे टेम्पलेट डाउनलोड करें ताकि उन्हें ऑफ़लाइन भरा जा सके",
  "Your account": "आपका खाता",
  "Language": "भाषा",
  "Theme": "थीम",
  "Light": "हल्की",
  "Dark": "गहरी",
  "System": "सिस्टम",
  "Done": "हो गया",
  "Session expired": "सत्र समाप्त हो गया",
  "Sign in again to upload 1 interview": "1 साक्षात्कार अपलोड करने के लिए फिर से साइन इन करें",
  "Sign in again to upload {0} interviews": "{0} साक्षात्कार अपलोड करने के लिए फिर से साइन इन करें",
  "Sign in": "साइन इन करें",
  "Interview not saved": "साक्षात्कार सहेजा नहीं गया",
  "The interview could not be saved on this device. Storage may be full. Please try again.": "साक्षात्कार इस डिवाइस पर सहेजा नहीं जा सका। स्टोरेज भर गया हो सकता है। कृपया फिर से प्रयास करें।",
  "Try again": "फिर से प्रयास करें",
  // a range question with no answer yet (#21)
  "Not answered": "उत्तर नहीं दिया गया",
  // src/utils/answerComparison.js, for a comparison rule with no message (#159)
  "This answer does not fit with an earlier answer": "यह उत्तर पहले दिए गए उत्तर से मेल नहीं खाता",
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

  // a question's description: the site's translation when the template has one, else through __()
  function getQuestionDescription(question) {
    if (question?.description_translated) return question.description_translated;
    return question?.description ? __(question.description) : "";
  }

  // an answer comparison's message (#159), picked as a question's label is; QuestionCard passes it
  // through __() as it does every error
  function getRuleMessage(rule) {
    const text = (key) => (typeof rule?.[key] === "string" ? rule[key] : "");
    if (currentLang.value === "hi") return text("message_hi") || text("message_translated") || text("message");
    return text("message");
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
    getQuestionDescription,
    getRuleMessage,
    getSectionTitle,
    getOptionLabel,
  };
}
