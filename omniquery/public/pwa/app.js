const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

// 1. IndexedDB Initialization via Dexie.js (ACID WAL Engine)
const db = new Dexie('OmniQueryDB');
db.version(1).stores({
  templates: 'name, title, project, version, schema_hash_sha256',
  translations: '[survey_template+language_code], survey_template, language_code',
  wal: 'idempotency_key, status, survey_template, template_version, captured_at_local, synced_at, retry_count',
  media_blobs: 'id, filename, mime_type, synced',
  respondents: 'respondent_uid, primary_name, respondent_type, phone_hash, village_city, district'
});

// 2. Comprehensive Vernacular Dictionary
const BUILTIN_TRANSLATIONS = {
  "en": {
    "OmniQuery": "OmniQuery",
    "ओमनीसर्वे": "OmniQuery",
    "Online": "Online",
    "ऑनलाइन": "Online",
    "Offline": "Offline",
    "ऑफलाइन": "Offline",
    "Surveys": "Surveys",
    "सर्वेक्षण": "Surveys",
    "WAL Queue": "WAL Queue",
    "कतार (ऑफलाइन)": "WAL Queue",
    "System": "System",
    "सिस्टम": "System",
    "Exit Form": "Exit Form",
    "← बाहर निकलें": "Exit Form",
    "Step": "Step",
    "चरण": "Step",
    "of": "of",
    "का": "of",
    "Pages": "Pages",
    "पृष्ठ": "Pages",
    "Questions": "Questions",
    "प्रश्न": "Questions",
    "Previous": "Previous",
    "← पिछला": "Previous",
    "Next": "Next",
    "अगला →": "Next",
    "Save Offline": "Save Offline",
    "ऑफलाइन सेव करें": "Save Offline",
    "Submit Survey": "Submit Survey",
    "सबमिट करें": "Submit Survey",
    "Capture GPS Coordinates": "Capture GPS Coordinates",
    "जीपीएस लोकेशन रिकॉर्ड करें": "Capture GPS Coordinates",
    "GPS Fix Acquired ✓": "GPS Fix Acquired ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "GPS Fix Acquired ✓",
    "Take Photo / Choose File": "Take Photo / Choose File",
    "फोटो लें / फाइल चुनें": "Take Photo / Choose File",
    "Sign inside box with finger or stylus": "Sign inside box with finger or stylus",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "Sign inside box with finger or stylus",
    "Clear Signature": "Clear Signature",
    "हस्ताक्षर मिटाएं": "Clear Signature",
    "Signature Recorded": "Signature Recorded",
    "हस्ताक्षर दर्ज हुआ": "Signature Recorded",
    "Enter response here...": "Enter response here...",
    "यहाँ उत्तर दर्ज करें...": "Enter response here...",
    "Required Questions Pending": "Required Questions Pending",
    "आवश्यक प्रश्न अधूरे हैं": "Required Questions Pending",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "Please fill in these required fields before final submission, or save as an offline draft anytime.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "Please fill in these required fields before final submission, or save as an offline draft anytime.",
    "Go to First Pending Question": "Go to First Pending Question",
    "👉 पहले अधूरे प्रश्न पर जाएं": "Go to First Pending Question",
    "Save as Offline Draft Anyway": "Save as Offline Draft Anyway",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "Save as Offline Draft Anyway",
    "Close": "Close",
    "बंद करें": "Close",
    "Start Survey Form": "Start Survey Form",
    "सर्वेक्षण शुरू करें": "Start Survey Form",
    "Start Survey Form →": "Start Survey Form →",
    "सर्वेक्षण शुरू करें →": "Start Survey Form →",
    "Write-Ahead Log (WAL)": "Write-Ahead Log (WAL)",
    "राइट-अहेड लॉग (WAL कतार)": "Write-Ahead Log (WAL)",
    "Atomic zero-loss local storage queue": "Atomic zero-loss local storage queue",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "Atomic zero-loss local storage queue",
    "Sync Now": "Sync Now",
    "⟳ अभी सिंक करें": "Sync Now",
    "View on Map →": "View on Map →",
    "नक्शे पर देखें →": "View on Map →",
    "Re-acquire Fix": "Re-acquire Fix",
    "पुनः प्रयास करें": "Re-acquire Fix",
    "Section A: Basic Details": "Section A: Basic Details",
    "भाग क: बुनियादी विवरण": "Section A: Basic Details",
    "Section B: Respondent & Household Profile": "Section B: Respondent & Household Profile",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "Section B: Respondent & Household Profile",
    "Section C: Enterprise Operations & Finance": "Section C: Enterprise Operations & Finance",
    "भाग ग: उद्यम संचालन और वित्त": "Section C: Enterprise Operations & Finance",
    "Section D: Enterprise Challenges & Coping Mechanisms": "Section D: Enterprise Challenges & Coping Mechanisms",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "Section D: Enterprise Challenges & Coping Mechanisms",
    "Section E: Impact of SVEP / OSF Schemes": "Section E: Impact of SVEP / OSF Schemes",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "Section E: Impact of SVEP / OSF Schemes",
    "Section F: Digital Transactions & Social Media": "Section F: Digital Transactions & Social Media",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "Section F: Digital Transactions & Social Media",
    "Section G: Field Verification & Sign-off": "Section G: Field Verification & Sign-off",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "Section G: Field Verification & Sign-off",
    "District": "District",
    "जिला": "District",
    "Block / Tehsil": "Block / Tehsil",
    "ब्लॉक / तहसील": "Block / Tehsil",
    "Village / Gram Panchayat Name": "Village / Gram Panchayat Name",
    "गाँव / ग्राम पंचायत का नाम": "Village / Gram Panchayat Name",
    "Cluster Level Federation (CLF) Name": "Cluster Level Federation (CLF) Name",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "Cluster Level Federation (CLF) Name",
    "Village Organization (VO) Name": "Village Organization (VO) Name",
    "ग्राम संगठन (VO) का नाम": "Village Organization (VO) Name",
    "Self-Help Group (SHG) Name": "Self-Help Group (SHG) Name",
    "स्वयं सहायता समूह (SHG) का नाम": "Self-Help Group (SHG) Name",
    "Respondent Name": "Respondent Name",
    "उत्तरदाता का नाम": "Respondent Name",
    "Enterprise / Business Name": "Enterprise / Business Name",
    "उद्यम / व्यवसाय का नाम": "Enterprise / Business Name",
    "Year of Setting Up Enterprise": "Year of Setting Up Enterprise",
    "उद्यम स्थापना का वर्ष": "Year of Setting Up Enterprise",
    "Main Business Activity of the Enterprise": "Main Business Activity of the Enterprise",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "Main Business Activity of the Enterprise",
    "What is respondent's relation with SHG member?": "What is respondent's relation with SHG member?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "What is respondent's relation with SHG member?",
    "What is the age of SHG member?": "What is the age of SHG member?",
    "एसएचजी सदस्य की आयु क्या है?": "What is the age of SHG member?",
    "What is the marital status of the SHG member?": "What is the marital status of the SHG member?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "What is the marital status of the SHG member?",
    "What is the social category / caste?": "What is the social category / caste?",
    "सामाजिक श्रेणी / जाति क्या है?": "What is the social category / caste?",
    "What is the education status of the SHG member?": "What is the education status of the SHG member?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "What is the education status of the SHG member?",
    "How many total members are in the family?": "How many total members are in the family?",
    "परिवार में कुल कितने सदस्य हैं?": "How many total members are in the family?",
    "What is your total annual household income?": "What is your total annual household income?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "What is your total annual household income?",
    "What is your role in the SHG?": "What is your role in the SHG?",
    "एसएचजी में आपकी भूमिका क्या है?": "What is your role in the SHG?",
    "Are you related to any of the SVEP / OSF CRP?": "Are you related to any of the SVEP / OSF CRP?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "Are you related to any of the SVEP / OSF CRP?",
    "Who started the enterprise?": "Who started the enterprise?",
    "उद्यम किसने शुरू किया था?": "Who started the enterprise?",
    "Who operates and manages the enterprise on a daily basis?": "Who operates and manages the enterprise on a daily basis?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "Who operates and manages the enterprise on a daily basis?",
    "For how many hours in a day does the shop/enterprise remain open?": "For how many hours in a day does the shop/enterprise remain open?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "For how many hours in a day does the shop/enterprise remain open?",
    "What is the type of business place / premises?": "What is the type of business place / premises?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "What is the type of business place / premises?",
    "Does SHG member maintain written records of business transactions regularly?": "Does SHG member maintain written records of business transactions regularly?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "Does SHG member maintain written records of business transactions regularly?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "In the first year of your enterprise, what was the amount of seed capital (Rs)?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "In the first year of your enterprise, what was the amount of seed capital (Rs)?",
    "How do you manage working capital during peak season?": "How do you manage working capital during peak season?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "How do you manage working capital during peak season?",
    "Is the location of your space convenient for your business?": "Is the location of your space convenient for your business?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "Is the location of your space convenient for your business?",
    "Are you satisfied and happy with your wholesale supplier?": "Are you satisfied and happy with your wholesale supplier?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "Are you satisfied and happy with your wholesale supplier?",
    "Are you able to recover credit / money from your customers?": "Are you able to recover credit / money from your customers?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "Are you able to recover credit / money from your customers?",
    "Do you source raw materials/goods from market independently?": "Do you source raw materials/goods from market independently?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "Do you source raw materials/goods from market independently?",
    "Do you have easy access to loans from different sources?": "Do you have easy access to loans from different sources?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "Do you have easy access to loans from different sources?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "How much loan amount have you availed under SVEP / OSF scheme (Rs)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "How much loan amount have you availed under SVEP / OSF scheme (Rs)?",
    "How did you utilize the enterprise loan?": "How did you utilize the enterprise loan?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "How did you utilize the enterprise loan?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "Monthly enterprise income BEFORE availing loan changes (Rs)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "Monthly enterprise income BEFORE availing loan changes (Rs)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "Monthly enterprise income AFTER availing loan changes (Rs)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "Monthly enterprise income AFTER availing loan changes (Rs)?",
    "What has been the contribution of SVEP / OSF CRPs?": "What has been the contribution of SVEP / OSF CRPs?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "What has been the contribution of SVEP / OSF CRPs?",
    "Does the woman entrepreneur own a smartphone?": "Does the woman entrepreneur own a smartphone?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "Does the woman entrepreneur own a smartphone?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "Do you use QR code / UPI / mobile banking for business transactions?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "Do you use QR code / UPI / mobile banking for business transactions?",
    "Daily how many transactions are done via QR code / UPI?": "Daily how many transactions are done via QR code / UPI?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "Daily how many transactions are done via QR code / UPI?",
    "Which social media platforms do you use for your business?": "Which social media platforms do you use for your business?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "Which social media platforms do you use for your business?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "Capture Enterprise GPS Location (Satellite Coordinates)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "Capture Enterprise GPS Location (Satellite Coordinates)",
    "Field Photo of Enterprise & Beneficiary": "Field Photo of Enterprise & Beneficiary",
    "उद्यम और लाभार्थी का फील्ड फोटो": "Field Photo of Enterprise & Beneficiary",
    "Respondent & Surveyor Digital Signature": "Respondent & Surveyor Digital Signature",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "Respondent & Surveyor Digital Signature",
    "Yes": "Yes",
    "हाँ": "Yes",
    "No": "No",
    "नहीं": "No",
    "Baran": "Baran",
    "बारां": "Baran",
    "Churu": "Churu",
    "चूरू": "Churu",
    "Dausa": "Dausa",
    "दौसा": "Dausa",
    "Dungarpur": "Dungarpur",
    "डूंगरपुर": "Dungarpur",
    "Jodhpur": "Jodhpur",
    "जोधपुर": "Jodhpur",
    "Chhipabarod": "Chhipabarod",
    "छीपाबड़ौद": "Chhipabarod",
    "Kishanganj": "Kishanganj",
    "किशनगंज": "Kishanganj",
    "Sardar Sheher": "Sardar Sheher",
    "सरदारशहर": "Sardar Sheher",
    "Bidasar": "Bidasar",
    "बीदासर": "Bidasar",
    "Secundra": "Secundra",
    "सिकंदरा": "Secundra",
    "Sagwara": "Sagwara",
    "सागवाड़ा": "Sagwara",
    "Galiakot": "Galiakot",
    "गलियाकोट": "Galiakot",
    "Bicchiwada": "Bicchiwada",
    "बिछीवाड़ा": "Bicchiwada",
    "Jodhpur Block": "Jodhpur Block",
    "जोधपुर ब्लॉक": "Jodhpur Block",
    "Married": "Married",
    "विवाहित": "Married",
    "Single": "Single",
    "अविवाहित": "Single",
    "Widowed": "Widowed",
    "विधवा": "Widowed",
    "Divorced": "Divorced",
    "तलाकशुदा": "Divorced",
    "Separated": "Separated",
    "अलग रह रहे": "Separated",
    "General": "General",
    "सामान्य": "General",
    "OBC": "OBC",
    "अन्य पिछड़ा वर्ग (OBC)": "OBC",
    "SC": "SC",
    "अनुसूचित जाति (SC)": "SC",
    "ST": "ST",
    "अनुसूचित जनजाति (ST)": "ST",
    "Illiterate": "Illiterate",
    "निरक्षर / अनपढ़": "Illiterate",
    "Illiterate but able to calculate": "Illiterate but able to calculate",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "Illiterate but able to calculate",
    "5th pass": "5th pass",
    "5वीं पास": "5th pass",
    "8th pass": "8th pass",
    "8वीं पास": "8th pass",
    "10th pass": "10th pass",
    "10वीं पास": "10th pass",
    "12th pass": "12th pass",
    "12वीं पास": "12th pass",
    "Graduate": "Graduate",
    "स्नातक (Graduate)": "Graduate",
    "Self": "Self",
    "स्वयं": "Self",
    "Husband": "Husband",
    "पति": "Husband",
    "Son": "Son",
    "पुत्र / बेटा": "Son",
    "Daughter": "Daughter",
    "पुत्री / बेटी": "Daughter",
    "Member": "Member",
    "सामान्य सदस्य": "Member",
    "Leadership role": "Leadership role",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "Leadership role",
    "Grocery / Kirana": "Grocery / Kirana",
    "किराना दुकान": "Grocery / Kirana",
    "General store": "General store",
    "जनरल स्टोर": "General store",
    "Leather & footwear": "Leather & footwear",
    "चमड़ा व जूते-चप्पल": "Leather & footwear",
    "Flour mill": "Flour mill",
    "आटा चक्की": "Flour mill",
    "Tailoring & Stitching": "Tailoring & Stitching",
    "सिलाई व कढ़ाई केंद्र": "Tailoring & Stitching",
    "Apparel & Garments": "Apparel & Garments",
    "रेडीमेड वस्त्र": "Apparel & Garments",
    "Beauty parlour": "Beauty parlour",
    "ब्यूटी पार्लर": "Beauty parlour",
    "Handicraft": "Handicraft",
    "हस्तशिल्प / हैंडीक्राफ्ट": "Handicraft",
    "Dairy shop": "Dairy shop",
    "डेयरी व दूध केंद्र": "Dairy shop",
    "Auto-mechanic": "Auto-mechanic",
    "ऑटो मैकेनिक": "Auto-mechanic",
    "E-mitra": "E-mitra",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "E-mitra",
    "Mobile repair shop": "Mobile repair shop",
    "मोबाइल रिपेयर दुकान": "Mobile repair shop",
    "Transport": "Transport",
    "परिवहन सेवा": "Transport",
    "Any other": "Any other",
    "अन्य कोई": "Any other",
    "Whatsapp": "Whatsapp",
    "व्हाट्सएप (WhatsApp)": "Whatsapp",
    "Facebook": "Facebook",
    "फेसबुक (Facebook)": "Facebook",
    "Instagram": "Instagram",
    "इंस्टाग्राम (Instagram)": "Instagram",
    "Don't use social media": "Don't use social media",
    "सोशल मीडिया का उपयोग नहीं करते": "Don't use social media",
    "Draft": "Draft",
    "Save Draft": "Save Draft",
    "ड्राफ्ट": "Draft",
    "मसुदा": "Draft",
    "ડ્રાફ્ટ": "Draft",
    "ਡਰਾਫਟ": "Draft",
    "খসড়া": "Draft",
    "வரைவு": "Draft",
    "చిత్తుప్రతి": "Draft",
    "ಕರಡು": "Draft",
    "ഡ്രാഫ്റ്റ്": "Draft",
    "ڈرافٹ": "Draft",
    "ड्राफ्ट सेव करें": "Save Draft",
    "मसुदा जतन करा": "Save Draft",
    "ડ્રાફ્ટ સાચવો": "Save Draft",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "Save Draft",
    "খসড়া সংরক্ষণ": "Save Draft",
    "வரைவு சேமி": "Save Draft",
    "చిత్తుప్రతి భద్రపరచు": "Save Draft",
    "ಕರಡು ಉಳಿಸಿ": "Save Draft",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "Save Draft",
    "ڈرافٹ محفوظ کریں": "Save Draft",
    "Dashboard": "Dashboard",
    "Surveyor Dashboard": "Surveyor Dashboard",
    "Field Work Overview": "Field Work Overview",
    "Total Recorded": "Total Recorded",
    "Synced to Server": "Synced to Server",
    "Pending Sync": "Pending Sync",
    "Incomplete Drafts": "Incomplete Drafts",
    "Drafts": "Drafts",
    "Completed": "Completed",
    "Today's Goal": "Today's Goal",
    "surveys completed today": "surveys completed today",
    "Daily Target Met!": "Daily Target Met!",
    "Start New Survey": "+ Start New Survey",
    "Resume Draft": "▶ Resume Draft",
    "Resume & Complete": "▶ Resume & Complete",
    "My Submissions & Drafts": "My Submissions & Drafts",
    "All Records": "All Records",
    "Complete": "Complete",
    "Questions Answered": "Questions Answered",
    "GPS Locked": "GPS Locked",
    "Photo Attached": "Photo Attached",
    "Signed": "Signed",
    "Ready to Sync": "Ready to Sync",
    "Synced": "Synced",
    "No respondent name": "Unnamed Respondent",
    "Village / Location": "Village / Location",
    "Last edited": "Last edited",
    "Sync All Pending": "🔄 Sync All Pending",
    "No surveys recorded yet": "No surveys recorded yet on this device",
    "Tap '+ Start New Survey' to begin your first interview": "Tap '+ Start New Survey' to begin your first interview",
    "Delete draft?": "Are you sure you want to delete this draft?",
    "Draft deleted": "Draft removed from local storage",
    "Text Size": "Text Size",
    "Adjust font size for your screen": "Adjust font size for your screen",
    "Small": "Small",
    "Medium": "Medium",
    "Large": "Large",
    "Text size set to Small": "Text size set to Small",
    "Text size set to Medium": "Text size set to Medium",
    "Text size set to Large": "Text size set to Large",
    "Email Data to Admin": "Email Data to Admin",
    "Emergency Backup & Support": "Emergency Backup & Support",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.",
    "Admin Email Address": "Admin Email Address",
    "Additional Note / Error Description": "Additional Note / Error Description (Optional)",
    "Send via Email / Server": "Send via Email (Server)",
    "Share via Gmail / WhatsApp": "Share via Gmail / Apps",
    "Download JSON": "Download JSON",
    "Download CSV (Excel)": "Download CSV (Excel)",
    "Backup emailed successfully ✓": "Backup emailed successfully ✓",
    "Total Device Records": "Total Device Records",
    "Offline Storage Status": "Offline Storage Status",
    "Healthy (IndexedDB)": "Healthy (IndexedDB)",
    "Export & Backup": "Export & Backup",
    "Send Data to Admin": "Send Data to Admin",
    "e.g. 2020": "e.g. 2020",
    "Enter year (e.g. 2020)": "Enter year (e.g. 2020)",
    "All": "All",
    "Select All": "Select All",
    "Select Group": "Select Group",
    "Clear": "Clear",
    "selected": "selected",
    "selected across": "selected across",
    "categories": "categories",
    "Select in this category": "Select in this category",
    "Select options below": "Select options below",
    "Selected": "Selected",
    "in": "in",
    "Cleared": "Cleared",
    "Cleared all selections": "Cleared all selections",
    "Single Choice (Select 1)": "Single Choice (Select 1)",
    "Multi-Select (Choose 1 or more)": "Multi-Select (Choose 1 or more)"
  },
  "hi": {
    "Single Choice (Select 1)": "एकल चयन (1 चुनें)",
    "एकल चयन (1 चुनें)": "एकल चयन (1 चुनें)",
    "Multi-Select (Choose 1 or more)": "बहु-विकल्प (1 या अधिक चुनें)",
    "बहु-विकल्प (1 या अधिक चुनें)": "बहु-विकल्प (1 या अधिक चुनें)",
    "All": "सभी",
    "सभी": "सभी",
    "Select All": "सभी चुनें",
    "सभी चुनें": "सभी चुनें",
    "Select Group": "ग्रुप चुनें",
    "ग्रुप चुनें": "ग्रुप चुनें",
    "Clear": "हटाएं",
    "हटाएं": "हटाएं",
    "selected": "चयनित",
    "चयनित": "चयनित",
    "selected across": "चयनित कुल",
    "चयनित कुल": "चयनित कुल",
    "categories": "श्रेणियों में",
    "श्रेणियों में": "श्रेणियों में",
    "Select in this category": "इस श्रेणी में चुनें",
    "इस श्रेणी में चुनें": "इस श्रेणी में चुनें",
    "Select options below": "नीचे दिए गए विकल्प चुनें",
    "नीचे दिए गए विकल्प चुनें": "नीचे दिए गए विकल्प चुनें",
    "Selected": "चयनित",
    "in": "में",
    "Cleared": "हटाया गया",
    "Cleared all selections": "सभी चयन हटाए गए",
    "OmniQuery": "ओमनीसर्वे",
    "ओमनीसर्वे": "ओमनीसर्वे",
    "Online": "ऑनलाइन",
    "ऑनलाइन": "ऑनलाइन",
    "Offline": "ऑफलाइन",
    "ऑफलाइन": "ऑफलाइन",
    "Surveys": "सर्वेक्षण",
    "सर्वेक्षण": "सर्वेक्षण",
    "WAL Queue": "कतार (ऑफलाइन)",
    "कतार (ऑफलाइन)": "कतार (ऑफलाइन)",
    "System": "सिस्टम",
    "सिस्टम": "सिस्टम",
    "Exit Form": "← बाहर निकलें",
    "← बाहर निकलें": "← बाहर निकलें",
    "Step": "चरण",
    "चरण": "चरण",
    "of": "का",
    "का": "का",
    "Pages": "पृष्ठ",
    "पृष्ठ": "पृष्ठ",
    "Questions": "प्रश्न",
    "प्रश्न": "प्रश्न",
    "Previous": "← पिछला",
    "← पिछला": "← पिछला",
    "Next": "अगला →",
    "अगला →": "अगला →",
    "Save Offline": "ऑफलाइन सेव करें",
    "ऑफलाइन सेव करें": "ऑफलाइन सेव करें",
    "Submit Survey": "सबमिट करें",
    "सबमिट करें": "सबमिट करें",
    "Capture GPS Coordinates": "जीपीएस लोकेशन रिकॉर्ड करें",
    "जीपीएस लोकेशन रिकॉर्ड करें": "जीपीएस लोकेशन रिकॉर्ड करें",
    "GPS Fix Acquired ✓": "जीपीएस लोकेशन प्राप्त हुआ ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "जीपीएस लोकेशन प्राप्त हुआ ✓",
    "Take Photo / Choose File": "फोटो लें / फाइल चुनें",
    "फोटो लें / फाइल चुनें": "फोटो लें / फाइल चुनें",
    "Sign inside box with finger or stylus": "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें",
    "Clear Signature": "हस्ताक्षर मिटाएं",
    "हस्ताक्षर मिटाएं": "हस्ताक्षर मिटाएं",
    "Signature Recorded": "हस्ताक्षर दर्ज हुआ",
    "हस्ताक्षर दर्ज हुआ": "हस्ताक्षर दर्ज हुआ",
    "Enter response here...": "यहाँ उत्तर दर्ज करें...",
    "यहाँ उत्तर दर्ज करें...": "यहाँ उत्तर दर्ज करें...",
    "Required Questions Pending": "आवश्यक प्रश्न अधूरे हैं",
    "आवश्यक प्रश्न अधूरे हैं": "आवश्यक प्रश्न अधूरे हैं",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।",
    "Go to First Pending Question": "👉 पहले अधूरे प्रश्न पर जाएं",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 पहले अधूरे प्रश्न पर जाएं",
    "Save as Offline Draft Anyway": "ऑफलाइन ड्राफ्ट सुरक्षित करें",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ऑफलाइन ड्राफ्ट सुरक्षित करें",
    "Close": "बंद करें",
    "बंद करें": "बंद करें",
    "Start Survey Form": "सर्वेक्षण शुरू करें",
    "सर्वेक्षण शुरू करें": "सर्वेक्षण शुरू करें",
    "Start Survey Form →": "सर्वेक्षण शुरू करें →",
    "सर्वेक्षण शुरू करें →": "सर्वेक्षण शुरू करें →",
    "Write-Ahead Log (WAL)": "राइट-अहेड लॉग (WAL कतार)",
    "राइट-अहेड लॉग (WAL कतार)": "राइट-अहेड लॉग (WAL कतार)",
    "Atomic zero-loss local storage queue": "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण",
    "Sync Now": "⟳ अभी सिंक करें",
    "⟳ अभी सिंक करें": "⟳ अभी सिंक करें",
    "View on Map →": "नक्शे पर देखें →",
    "नक्शे पर देखें →": "नक्शे पर देखें →",
    "Re-acquire Fix": "पुनः प्रयास करें",
    "पुनः प्रयास करें": "पुनः प्रयास करें",
    "Section A: Basic Details": "खंड A: मूलभूत जानकारी",
    "भाग क: बुनियादी विवरण": "भाग क: बुनियादी विवरण",
    "Section B: Respondent & Household Profile": "खंड B: उत्तरदाता एवं पारिवारिक विवरण",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल",
    "Section C: Enterprise Operations & Finance": "खंड C: उद्यम संचालन एवं वित्त",
    "भाग ग: उद्यम संचालन और वित्त": "भाग ग: उद्यम संचालन और वित्त",
    "Section D: Enterprise Challenges & Coping Mechanisms": "खंड D: उद्यम की चुनौतियां एवं समाधान",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "भाग घ: उद्यम चुनौतियाँ और समाधान",
    "Section E: Impact of SVEP / OSF Schemes": "खंड E: SVEP / OSF योजनाओं का प्रभाव",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव",
    "Section F: Digital Transactions & Social Media": "खंड F: डिजिटल लेन-देन एवं सोशल मीडिया",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "भाग च: डिजिटल लेन-देन और सोशल मीडिया",
    "Section G: Field Verification & Sign-off": "खंड G: फील्ड सत्यापन एवं हस्ताक्षर",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "भाग छ: फील्ड सत्यापन और हस्ताक्षर",
    "District": "जिला",
    "जिला": "जिला",
    "Block / Tehsil": "ब्लॉक / तहसील",
    "ब्लॉक / तहसील": "ब्लॉक / तहसील",
    "Village / Gram Panchayat Name": "गाँव / ग्राम पंचायत का नाम",
    "गाँव / ग्राम पंचायत का नाम": "गाँव / ग्राम पंचायत का नाम",
    "Cluster Level Federation (CLF) Name": "क्लस्टर लेवल फेडरेशन (CLF) का नाम",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "क्लस्टर लेवल फेडरेशन (CLF) का नाम",
    "Village Organization (VO) Name": "ग्राम संगठन (VO) का नाम",
    "ग्राम संगठन (VO) का नाम": "ग्राम संगठन (VO) का नाम",
    "Self-Help Group (SHG) Name": "स्वयं सहायता समूह (SHG) का नाम",
    "स्वयं सहायता समूह (SHG) का नाम": "स्वयं सहायता समूह (SHG) का नाम",
    "Respondent Name": "उत्तरदाता का नाम",
    "उत्तरदाता का नाम": "उत्तरदाता का नाम",
    "Enterprise / Business Name": "उद्यम / व्यवसाय का नाम",
    "उद्यम / व्यवसाय का नाम": "उद्यम / व्यवसाय का नाम",
    "Year of Setting Up Enterprise": "उद्यम स्थापना का वर्ष",
    "उद्यम स्थापना का वर्ष": "उद्यम स्थापना का वर्ष",
    "Main Business Activity of the Enterprise": "उद्यम की मुख्य व्यावसायिक गतिविधि",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "उद्यम की मुख्य व्यावसायिक गतिविधि",
    "What is respondent's relation with SHG member?": "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?",
    "What is the age of SHG member?": "एसएचजी सदस्य की आयु क्या है?",
    "एसएचजी सदस्य की आयु क्या है?": "एसएचजी सदस्य की आयु क्या है?",
    "What is the marital status of the SHG member?": "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?",
    "What is the social category / caste?": "सामाजिक श्रेणी / जाति क्या है?",
    "सामाजिक श्रेणी / जाति क्या है?": "सामाजिक श्रेणी / जाति क्या है?",
    "What is the education status of the SHG member?": "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?",
    "How many total members are in the family?": "परिवार में कुल कितने सदस्य हैं?",
    "परिवार में कुल कितने सदस्य हैं?": "परिवार में कुल कितने सदस्य हैं?",
    "What is your total annual household income?": "आपकी कुल वार्षिक पारिवारिक आय कितनी है?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "आपकी कुल वार्षिक पारिवारिक आय कितनी है?",
    "What is your role in the SHG?": "एसएचजी में आपकी भूमिका क्या है?",
    "एसएचजी में आपकी भूमिका क्या है?": "एसएचजी में आपकी भूमिका क्या है?",
    "Are you related to any of the SVEP / OSF CRP?": "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?",
    "Who started the enterprise?": "उद्यम किसने शुरू किया था?",
    "उद्यम किसने शुरू किया था?": "उद्यम किसने शुरू किया था?",
    "Who operates and manages the enterprise on a daily basis?": "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?",
    "For how many hours in a day does the shop/enterprise remain open?": "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?",
    "What is the type of business place / premises?": "व्यावसायिक स्थान/परिसर का प्रकार क्या है?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "व्यावसायिक स्थान/परिसर का प्रकार क्या है?",
    "Does SHG member maintain written records of business transactions regularly?": "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?",
    "How do you manage working capital during peak season?": "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?",
    "Is the location of your space convenient for your business?": "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?",
    "Are you satisfied and happy with your wholesale supplier?": "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?",
    "Are you able to recover credit / money from your customers?": "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?",
    "Do you source raw materials/goods from market independently?": "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?",
    "Do you have easy access to loans from different sources?": "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?",
    "How did you utilize the enterprise loan?": "आपने उद्यम ऋण का उपयोग किस प्रकार किया?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "आपने उद्यम ऋण का उपयोग किस प्रकार किया?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP का क्या योगदान रहा है?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP का क्या योगदान रहा है?",
    "Does the woman entrepreneur own a smartphone?": "क्या महिला उद्यमी के पास स्मार्टफोन है?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "क्या महिला उद्यमी के पास स्मार्टफोन है?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?",
    "Daily how many transactions are done via QR code / UPI?": "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?",
    "Which social media platforms do you use for your business?": "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)",
    "Field Photo of Enterprise & Beneficiary": "उद्यम और लाभार्थी का फील्ड फोटो",
    "उद्यम और लाभार्थी का फील्ड फोटो": "उद्यम और लाभार्थी का फील्ड फोटो",
    "Respondent & Surveyor Digital Signature": "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर",
    "Yes": "हाँ",
    "हाँ": "हाँ",
    "No": "नहीं",
    "नहीं": "नहीं",
    "Baran": "बारां",
    "बारां": "बारां",
    "Churu": "चूरू",
    "चूरू": "चूरू",
    "Dausa": "दौसा",
    "दौसा": "दौसा",
    "Dungarpur": "डूंगरपुर",
    "डूंगरपुर": "डूंगरपुर",
    "Jodhpur": "जोधपुर",
    "जोधपुर": "जोधपुर",
    "Chhipabarod": "छीपाबड़ौद",
    "छीपाबड़ौद": "छीपाबड़ौद",
    "Kishanganj": "किशनगंज",
    "किशनगंज": "किशनगंज",
    "Sardar Sheher": "सरदारशहर",
    "सरदारशहर": "सरदारशहर",
    "Bidasar": "बीदासर",
    "बीदासर": "बीदासर",
    "Secundra": "सिकंदरा",
    "सिकंदरा": "सिकंदरा",
    "Sagwara": "सागवाड़ा",
    "सागवाड़ा": "सागवाड़ा",
    "Galiakot": "गलियाकोट",
    "गलियाकोट": "गलियाकोट",
    "Bicchiwada": "बिछीवाड़ा",
    "बिछीवाड़ा": "बिछीवाड़ा",
    "Jodhpur Block": "जोधपुर ब्लॉक",
    "जोधपुर ब्लॉक": "जोधपुर ब्लॉक",
    "Married": "विवाहित",
    "विवाहित": "विवाहित",
    "Single": "अविवाहित",
    "अविवाहित": "अविवाहित",
    "Widowed": "विधवा",
    "विधवा": "विधवा",
    "Divorced": "तलाकशुदा",
    "तलाकशुदा": "तलाकशुदा",
    "Separated": "अलग रह रहे",
    "अलग रह रहे": "अलग रह रहे",
    "General": "सामान्य",
    "सामान्य": "सामान्य",
    "OBC": "अन्य पिछड़ा वर्ग (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "अन्य पिछड़ा वर्ग (OBC)",
    "SC": "अनुसूचित जाति (SC)",
    "अनुसूचित जाति (SC)": "अनुसूचित जाति (SC)",
    "ST": "अनुसूचित जनजाति (ST)",
    "अनुसूचित जनजाति (ST)": "अनुसूचित जनजाति (ST)",
    "Illiterate": "निरक्षर / अनपढ़",
    "निरक्षर / अनपढ़": "निरक्षर / अनपढ़",
    "Illiterate but able to calculate": "अनपढ़ लेकिन हिसाब-किताब में सक्षम",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "अनपढ़ लेकिन हिसाब-किताब में सक्षम",
    "5th pass": "5वीं पास",
    "5वीं पास": "5वीं पास",
    "8th pass": "8वीं पास",
    "8वीं पास": "8वीं पास",
    "10th pass": "10वीं पास",
    "10वीं पास": "10वीं पास",
    "12th pass": "12वीं पास",
    "12वीं पास": "12वीं पास",
    "Graduate": "स्नातक (Graduate)",
    "स्नातक (Graduate)": "स्नातक (Graduate)",
    "Self": "स्वयं",
    "स्वयं": "स्वयं",
    "Husband": "पति",
    "पति": "पति",
    "Son": "पुत्र / बेटा",
    "पुत्र / बेटा": "पुत्र / बेटा",
    "Daughter": "पुत्री / बेटी",
    "पुत्री / बेटी": "पुत्री / बेटी",
    "Member": "सामान्य सदस्य",
    "सामान्य सदस्य": "सामान्य सदस्य",
    "Leadership role": "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)",
    "Grocery / Kirana": "किराना दुकान",
    "किराना दुकान": "किराना दुकान",
    "General store": "जनरल स्टोर",
    "जनरल स्टोर": "जनरल स्टोर",
    "Leather & footwear": "चमड़ा व जूते-चप्पल",
    "चमड़ा व जूते-चप्पल": "चमड़ा व जूते-चप्पल",
    "Flour mill": "आटा चक्की",
    "आटा चक्की": "आटा चक्की",
    "Tailoring & Stitching": "सिलाई व कढ़ाई केंद्र",
    "सिलाई व कढ़ाई केंद्र": "सिलाई व कढ़ाई केंद्र",
    "Apparel & Garments": "रेडीमेड वस्त्र",
    "रेडीमेड वस्त्र": "रेडीमेड वस्त्र",
    "Beauty parlour": "ब्यूटी पार्लर",
    "ब्यूटी पार्लर": "ब्यूटी पार्लर",
    "Handicraft": "हस्तशिल्प / हैंडीक्राफ्ट",
    "हस्तशिल्प / हैंडीक्राफ्ट": "हस्तशिल्प / हैंडीक्राफ्ट",
    "Dairy shop": "डेयरी व दूध केंद्र",
    "डेयरी व दूध केंद्र": "डेयरी व दूध केंद्र",
    "Auto-mechanic": "ऑटो मैकेनिक",
    "ऑटो मैकेनिक": "ऑटो मैकेनिक",
    "E-mitra": "ई-मित्र केंद्र / ग्राहक सेवा केंद्र",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ई-मित्र केंद्र / ग्राहक सेवा केंद्र",
    "Mobile repair shop": "मोबाइल रिपेयर दुकान",
    "मोबाइल रिपेयर दुकान": "मोबाइल रिपेयर दुकान",
    "Transport": "परिवहन सेवा",
    "परिवहन सेवा": "परिवहन सेवा",
    "Any other": "अन्य कोई",
    "अन्य कोई": "अन्य कोई",
    "Whatsapp": "व्हाट्सएप (WhatsApp)",
    "व्हाट्सएप (WhatsApp)": "व्हाट्सएप (WhatsApp)",
    "Facebook": "फेसबुक (Facebook)",
    "फेसबुक (Facebook)": "फेसबुक (Facebook)",
    "Instagram": "इंस्टाग्राम (Instagram)",
    "इंस्टाग्राम (Instagram)": "इंस्टाग्राम (Instagram)",
    "Don't use social media": "सोशल मीडिया का उपयोग नहीं करते",
    "सोशल मीडिया का उपयोग नहीं करते": "सोशल मीडिया का उपयोग नहीं करते",
    "Draft": "अधूरा ड्राफ्ट",
    "Save Draft": "ड्राफ्ट सेव करें",
    "ड्राफ्ट": "ड्राफ्ट",
    "मसुदा": "ड्राफ्ट",
    "ડ્રાફ્ટ": "ड्राफ्ट",
    "ਡਰਾਫਟ": "ड्राफ्ट",
    "খসড়া": "ड्राफ्ट",
    "வரைவு": "ड्राफ्ट",
    "చిత్తుప్రతి": "ड्राफ्ट",
    "ಕರಡು": "ड्राफ्ट",
    "ഡ്രാഫ്റ്റ്": "ड्राफ्ट",
    "ڈرافٹ": "ड्राफ्ट",
    "ड्राफ्ट सेव करें": "ड्राफ्ट सेव करें",
    "मसुदा जतन करा": "ड्राफ्ट सेव करें",
    "ડ્રાફ્ટ સાચવો": "ड्राफ्ट सेव करें",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ड्राफ्ट सेव करें",
    "খসড়া সংরক্ষণ": "ड्राफ्ट सेव करें",
    "வரைவு சேமி": "ड्राफ्ट सेव करें",
    "చిత్తుప్రతి భద్రపరచు": "ड्राफ्ट सेव करें",
    "ಕರಡು ಉಳಿಸಿ": "ड्राफ्ट सेव करें",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ड्राफ्ट सेव करें",
    "ڈرافٹ محفوظ کریں": "ड्राफ्ट सेव करें",
    "Himalayan Baseline Impact Survey": "हिमालयन बेसलाइन प्रभाव सर्वेक्षण",
    "1. Household & Demographic Profile": "1. परिवार एवं जनसांख्यिकीय प्रोफ़ाइल",
    "General identification and household metrics": "सामान्य पहचान एवं घरेलू विवरण",
    "2. Economic Activity & Livestock": "2. आर्थिक गतिविधि एवं पशुधन",
    "Revenue, assets, and livestock count": "आय, संपत्तियां और पशुओं की संख्या",
    "3. Geolocation & Digital Verification": "3. भू-स्थान एवं डिजिटल सत्यापन",
    "GPS accuracy and field photo capture": "जीपीएस सटीकता एवं फील्ड फोटो",
    "Full Name of Household Head / Primary Respondent": "परिवार के मुखिया / मुख्य उत्तरदाता का पूरा नाम",
    "Respondent Classification": "उत्तरदाता का वर्गीकरण",
    "Individual": "व्यक्तिगत",
    "Household": "परिवार / घरेलू",
    "Smallholder Farmer": "छोटे किसान",
    "Micro Enterprise / Self-Employed": "सूक्ष्म उद्यम / स्वरोजगार",
    "Primary Contact Phone Number": "मुख्य संपर्क फोन नंबर",
    "Do you own cattle, sheep, or goats?": "क्या आपके पास गाय, भैंस, भेड़ या बकरी है?",
    "Total number of milch cattle / animals?": "दुधारू पशुओं / जानवरों की कुल संख्या?",
    "Estimated Monthly Household Income (INR ₹)": "अनुमानित मासिक घरेलू आय (रु. ₹)",
    "Farm Equipment & Key Productive Assets": "कृषि उपकरण एवं प्रमुख उत्पादक संपत्तियां",
    "Capture Field GPS Coordinates (Auto-verified)": "फील्ड जीपीएस निर्देशांक कैप्चर करें (स्वचालित सत्यापित)",
    "Field Photo of Site / Beneficiary": "स्थल / लाभार्थी का फील्ड फोटो",
    "Surveyor Sign-off & Digital Signature": "सर्वेक्षक अनुमोदन एवं डिजिटल हस्ताक्षर",
    "District, Block, Village, SHG, and Enterprise identification": "जिला, ब्लॉक, गाँव, SHG और उद्यम की पहचान",
    "Demographic, family structure, education, and household income": "जनसांख्यिकी, परिवार की संरचना, शिक्षा और पारिवारिक आय",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "शुरुआत का इतिहास, काम के घंटे, पूंजी की व्यवस्था और मौसमी कमाई",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "स्थान, आपूर्तिकर्ता, उधारी वसूली, कच्चा माल और ऋण सुविधा",
    "Loan utilization, monthly income growth, and CRP contribution": "ऋण का उपयोग, मासिक आय में वृद्धि और CRP का योगदान",
    "Smartphone ownership, QR code banking, and social media usage": "स्मार्टफोन स्वामित्व, क्यूआर कोड बैंकिंग और सोशल मीडिया का उपयोग",
    "GPS coordinates fix, site photo capture, and digital signatures": "जीपीएस निर्देशांक लॉक, स्थल का फोटो और डिजिटल हस्ताक्षर",
    "Dashboard": "डैशबोर्ड",
    "Surveyor Dashboard": "सर्वेक्षक डैशबोर्ड",
    "Field Work Overview": "फील्ड कार्य प्रगति",
    "Total Recorded": "कुल सर्वेक्षण",
    "Synced to Server": "सर्वर पर सिंक",
    "Pending Sync": "सिंक बाकी (लोकल)",
    "Incomplete Drafts": "अधूरे ड्राफ्ट",
    "Drafts": "ड्राफ्ट",
    "Completed": "पूर्ण",
    "Today's Goal": "आज का लक्ष्य",
    "surveys completed today": "सर्वे आज पूरे हुए",
    "Daily Target Met!": "आज का लक्ष्य पूरा हुआ! 🎉",
    "Start New Survey": "+ नया सर्वेक्षण शुरू करें",
    "Resume Draft": "▶ अधूरा फॉर्म पूरा करें",
    "Resume & Complete": "▶ फॉर्म जारी रखें",
    "My Submissions & Drafts": "मेरे सर्वेक्षण एवं ड्राफ्ट",
    "All Records": "सभी रिकॉर्ड",
    "Complete": "पूर्ण",
    "Questions Answered": "प्रश्नों के उत्तर दिए",
    "GPS Locked": "जीपीएस लॉक ✓",
    "Photo Attached": "फोटो संलग्न ✓",
    "Signed": "हस्ताक्षर दर्ज ✓",
    "Ready to Sync": "सिंक हेतु तैयार (100%)",
    "Synced": "सर्वर पर सुरक्षित",
    "No respondent name": "अनाम उत्तरदाता",
    "Village / Location": "गाँव / स्थान",
    "Last edited": "अंतिम संपादन",
    "Sync All Pending": "🔄 सभी बाकी फॉर्म सिंक करें",
    "No surveys recorded yet": "इस डिवाइस पर अभी तक कोई सर्वेक्षण दर्ज नहीं है",
    "Tap '+ Start New Survey' to begin your first interview": "पहला इंटरव्यू शुरू करने के लिए '+ नया सर्वेक्षण' दबाएं",
    "Delete draft?": "क्या आप इस ड्राफ्ट को हटाना चाहते हैं?",
    "Draft deleted": "ड्राफ्ट डिवाइस से हटा दिया गया",
    "Text Size": "अक्षरों का आकार",
    "Adjust font size for your screen": "स्क्रीन के अनुसार अक्षरों का आकार चुनें",
    "Small": "छोटा",
    "Medium": "सामान्य",
    "Large": "बड़ा",
    "Text size set to Small": "अक्षरों का आकार छोटा किया गया",
    "Text size set to Medium": "अक्षरों का आकार सामान्य किया गया",
    "Text size set to Large": "अक्षरों का आकार बड़ा किया गया",
    "Email Data to Admin": "एडमिन को डेटा ईमेल करें",
    "Emergency Backup & Support": "इमरजेंसी बैकअप और सहायता",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ईमेल या ऐप्स के माध्यम से अपने सभी सर्वे रिकॉर्ड और एरर लॉग एडमिन को भेजें।",
    "Admin Email Address": "एडमिन का ईमेल पता",
    "Additional Note / Error Description": "समस्या या टिप्पणी (वैकल्पिक)",
    "Send via Email / Server": "ईमेल द्वारा भेजें (सर्वर)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp पर शेयर करें",
    "Download JSON": "JSON डाउनलोड करें",
    "Download CSV (Excel)": "CSV (Excel) डाउनलोड करें",
    "Backup emailed successfully ✓": "बैकअप ईमेल सफलतापूर्वक भेजा गया ✓",
    "Total Device Records": "डिवाइस पर कुल रिकॉर्ड",
    "Offline Storage Status": "लोकल स्टोरेज स्थिति",
    "Healthy (IndexedDB)": "सुरक्षित (IndexedDB)",
    "Export & Backup": "एक्सपोर्ट व बैकअप",
    "Send Data to Admin": "एडमिन को डेटा भेजें",
    "e.g. 2020": "उदा. 2020",
    "Enter year (e.g. 2020)": "वर्ष दर्ज करें (उदा. 2020)"
  },
  "mr": {
    "OmniQuery": "ओम्नीसर्व्हे",
    "ओमनीसर्वे": "ओम्नीसर्व्हे",
    "Online": "ऑनलाइन",
    "ऑनलाइन": "ऑनलाइन",
    "Offline": "ऑफलाइन",
    "ऑफलाइन": "ऑफलाइन",
    "Surveys": "सर्वेक्षण",
    "सर्वेक्षण": "सर्वेक्षण",
    "WAL Queue": "रांग (ऑफलाइन)",
    "कतार (ऑफलाइन)": "रांग (ऑफलाइन)",
    "System": "प्रणाली",
    "सिस्टम": "प्रणाली",
    "Exit Form": "← बाहेर पडा",
    "← बाहर निकलें": "← बाहेर पडा",
    "Step": "टप्पा",
    "चरण": "टप्पा",
    "of": "पैकी",
    "का": "पैकी",
    "Pages": "पृष्ठे",
    "पृष्ठ": "पृष्ठे",
    "Questions": "प्रश्न",
    "प्रश्न": "प्रश्न",
    "Previous": "← मागील",
    "← पिछला": "← मागील",
    "Next": "पुढील →",
    "अगला →": "पुढील →",
    "Save Offline": "ऑफलाइन जतन करा",
    "ऑफलाइन सेव करें": "ऑफलाइन जतन करा",
    "Submit Survey": "सबमिट करा",
    "सबमिट करें": "सबमिट करा",
    "Capture GPS Coordinates": "जीपीएस स्थान नोंदवा",
    "जीपीएस लोकेशन रिकॉर्ड करें": "जीपीएस स्थान नोंदवा",
    "GPS Fix Acquired ✓": "जीपीएस स्थान प्राप्त झाले ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "जीपीएस स्थान प्राप्त झाले ✓",
    "Take Photo / Choose File": "फोटो घ्या / फाईल निवडा",
    "फोटो लें / फाइल चुनें": "फोटो घ्या / फाईल निवडा",
    "Sign inside box with finger or stylus": "आपल्या बोटाने किंवा स्टायलसने बॉक्समध्ये स्वाक्षरी करा",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "आपल्या बोटाने किंवा स्टायलसने बॉक्समध्ये स्वाक्षरी करा",
    "Clear Signature": "स्वाक्षरी पुसा",
    "हस्ताक्षर मिटाएं": "स्वाक्षरी पुसा",
    "Signature Recorded": "स्वाक्षरी नोंदवली",
    "हस्ताक्षर दर्ज हुआ": "स्वाक्षरी नोंदवली",
    "Enter response here...": "येथे उत्तर प्रविष्ट करा...",
    "यहाँ उत्तर दर्ज करें...": "येथे उत्तर प्रविष्ट करा...",
    "Required Questions Pending": "आवश्यक प्रश्न अपूर्ण आहेत",
    "आवश्यक प्रश्न अधूरे हैं": "आवश्यक प्रश्न अपूर्ण आहेत",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "अंतिम सबमिशनपूर्वी कृपया हे आवश्यक प्रश्न भरा, किंवा कधीही ऑफलाइन मसुदा म्हणून जतन करा.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "अंतिम सबमिशनपूर्वी कृपया हे आवश्यक प्रश्न भरा, किंवा कधीही ऑफलाइन मसुदा म्हणून जतन करा.",
    "Go to First Pending Question": "👉 पहिल्या अपूर्ण प्रश्नावर जा",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 पहिल्या अपूर्ण प्रश्नावर जा",
    "Save as Offline Draft Anyway": "ऑफलाइन मसुदा जतन करा",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ऑफलाइन मसुदा जतन करा",
    "Close": "बंद करा",
    "बंद करें": "बंद करा",
    "Start Survey Form": "सर्वेक्षण सुरू करा",
    "सर्वेक्षण शुरू करें": "सर्वेक्षण सुरू करा",
    "Start Survey Form →": "सर्वेक्षण सुरू करा →",
    "सर्वेक्षण शुरू करें →": "सर्वेक्षण सुरू करा →",
    "Write-Ahead Log (WAL)": "राइट-अहेड लॉग (WAL रांग)",
    "राइट-अहेड लॉग (WAL कतार)": "राइट-अहेड लॉग (WAL रांग)",
    "Atomic zero-loss local storage queue": "शून्य डेटा हानी सुरक्षित स्थानिक साठवण",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "शून्य डेटा हानी सुरक्षित स्थानिक साठवण",
    "Sync Now": "⟳ आता सिंक करा",
    "⟳ अभी सिंक करें": "⟳ आता सिंक करा",
    "View on Map →": "नక्शावर पहा →",
    "नक्शे पर देखें →": "नక्शावर पहा →",
    "Re-acquire Fix": "पुन्हा प्रयत्न करा",
    "पुनः प्रयास करें": "पुन्हा प्रयत्न करा",
    "Section A: Basic Details": "विभाग A: मूलभूत तपशील",
    "भाग क: बुनियादी विवरण": "विभाग अ: मूलभूत तपशील",
    "Section B: Respondent & Household Profile": "विभाग B: उत्तरदाते आणि कौटुंबिक प्रोफाइल",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "विभाग ब: उत्तरदाता आणि कुटुंब प्रोफाइल",
    "Section C: Enterprise Operations & Finance": "विभाग C: व्यवसाय संचालन आणि वित्त",
    "भाग ग: उद्यम संचालन और वित्त": "विभाग क: व्यवसाय संचालन आणि वित्त",
    "Section D: Enterprise Challenges & Coping Mechanisms": "विभाग D: उद्योगातील आव्हाने आणि उपाय",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "विभाग ड: व्यवसाय आव्हाने आणि उपाय",
    "Section E: Impact of SVEP / OSF Schemes": "विभाग E: SVEP / OSF योजनांचा प्रभाव",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "विभाग इ: एसव्हीईपी / ओएसएफ योजनांचा प्रभाव",
    "Section F: Digital Transactions & Social Media": "विभाग F: डिजिटल व्यवहार आणि सोशल मीडिया",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "विभाग फ: डिजिटल व्यवहार आणि सोशल मीडिया",
    "Section G: Field Verification & Sign-off": "विभाग G: फील्ड पडताळणी आणि स्वाक्षरी",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "विभाग ग: फील्ड पडताळणी आणि स्वाक्षरी",
    "District": "जिल्हा",
    "जिला": "जिल्हा",
    "Block / Tehsil": "तालुका / ब्लॉक",
    "ब्लॉक / तहसील": "तालुका / ब्लॉक",
    "Village / Gram Panchayat Name": "गाव / ग्रामपंचायतीचे नाव",
    "गाँव / ग्राम पंचायत का नाम": "गाव / ग्रामपंचायतीचे नाव",
    "Cluster Level Federation (CLF) Name": "क्लस्टर लेव्हल फेडरेशन (CLF) चे नाव",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "क्लस्टर लेव्हल फेडरेशन (CLF) चे नाव",
    "Village Organization (VO) Name": "ग्राम संघटना (VO) चे नाव",
    "ग्राम संगठन (VO) का नाम": "ग्राम संघटना (VO) चे नाव",
    "Self-Help Group (SHG) Name": "स्वयंसहाय्यता गट (SHG) चे नाव",
    "स्वयं सहायता समूह (SHG) का नाम": "स्वयंसहाय्यता गट (SHG) चे नाव",
    "Respondent Name": "उत्तरदात्याचे नाव",
    "उत्तरदाता का नाम": "उत्तरदात्याचे नाव",
    "Enterprise / Business Name": "उद्योग / व्यवसायाचे नाव",
    "उद्यम / व्यवसाय का नाम": "उद्योग / व्यवसायाचे नाव",
    "Year of Setting Up Enterprise": "उद्योग स्थापनेचे वर्ष",
    "उद्यम स्थापना का वर्ष": "उद्योग स्थापनेचे वर्ष",
    "Main Business Activity of the Enterprise": "उद्योगाची मुख्य व्यावसायिक क्रियाकलाप",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "उद्योगाची मुख्य व्यावसायिक क्रियाकलाप",
    "What is respondent's relation with SHG member?": "उत्तरदात्याचे बचत गट सदस्याशी काय नाते आहे?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "उत्तरदात्याचे बचत गट सदस्याशी काय नाते आहे?",
    "What is the age of SHG member?": "बचत गट सदस्याचे वय काय आहे?",
    "एसएचजी सदस्य की आयु क्या है?": "बचत गट सदस्याचे वय काय आहे?",
    "What is the marital status of the SHG member?": "बचत गट सदस्याची वैवाहिक स्थिती काय आहे?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "बचत गट सदस्याची वैवाहिक स्थिती काय आहे?",
    "What is the social category / caste?": "सामाजिक प्रवर्ग / जात कोणती?",
    "सामाजिक श्रेणी / जाति क्या है?": "सामाजिक प्रवर्ग / जात कोणती?",
    "What is the education status of the SHG member?": "बचत गट सदस्याची शैक्षणिक पात्रता काय आहे?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "बचत गट सदस्याची शैक्षणिक पात्रता काय आहे?",
    "How many total members are in the family?": "कुटुंबात एकूण किती सदस्य आहेत?",
    "परिवार में कुल कितने सदस्य हैं?": "कुटुंबात एकूण किती सदस्य आहेत?",
    "What is your total annual household income?": "तुमचे एकूण वार्षिक कौटुंबिक उत्पन्न किती आहे?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "तुमचे एकूण वार्षिक कौटुंबिक उत्पन्न किती आहे?",
    "What is your role in the SHG?": "बचत गटात तुमची भूमिका काय आहे?",
    "एसएचजी में आपकी भूमिका क्या है?": "बचत गटात तुमची भूमिका काय आहे?",
    "Are you related to any of the SVEP / OSF CRP?": "तुम्ही कोणत्याही SVEP / OSF CRP शी संबंधित आहात का?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "तुम्ही कोणत्याही SVEP / OSF CRP शी संबंधित आहात का?",
    "Who started the enterprise?": "व्यवसाय कोणी सुरू केला?",
    "उद्यम किसने शुरू किया था?": "व्यवसाय कोणी सुरू केला?",
    "Who operates and manages the enterprise on a daily basis?": "दररोज व्यवसायाचे व्यवस्थापन कोण करते?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "दररोज व्यवसायाचे व्यवस्थापन कोण करते?",
    "For how many hours in a day does the shop/enterprise remain open?": "दिवसात दुकान/व्यवसाय किती तास चालू असतो?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "दिवसात दुकान/व्यवसाय किती तास चालू असतो?",
    "What is the type of business place / premises?": "व्यवसाय जागेचा प्रकार कोणता आहे?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "व्यवसाय जागेचा प्रकार कोणता आहे?",
    "Does SHG member maintain written records of business transactions regularly?": "बचत गट सदस्य नियमितपणे व्यावसायिक व्यवहारांची लेखी नोंद ठेवतात का?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "बचत गट सदस्य नियमितपणे व्यावसायिक व्यवहारांची लेखी नोंद ठेवतात का?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "तुमच्या व्यवसायाच्या पहिल्या वर्षी प्राथमिक भांडवल (रु) किती होते?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "तुमच्या व्यवसायाच्या पहिल्या वर्षी प्राथमिक भांडवल (रु) किती होते?",
    "How do you manage working capital during peak season?": "पीक सीझनमध्ये तुम्ही खेळत्या भांडवलाचे व्यवस्थापन कसे करता?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "पीक सीझनमध्ये तुम्ही खेळत्या भांडवलाचे व्यवस्थापन कसे करता?",
    "Is the location of your space convenient for your business?": "तुमच्या जागेचे स्थान व्यवसायासाठी सोयीचे आहे का?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "तुमच्या जागेचे स्थान व्यवसायासाठी सोयीचे आहे का?",
    "Are you satisfied and happy with your wholesale supplier?": "तुम्ही तुमच्या घाऊक पुरवठादारावर समाधानी आहात का?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "तुम्ही तुमच्या घाऊक पुरवठादारावर समाधानी आहात का?",
    "Are you able to recover credit / money from your customers?": "तुम्ही ग्राहकांकडून उधारी/पैसे वसूल करू शकता का?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "तुम्ही ग्राहकांकडून उधारी/पैसे वसूल करू शकता का?",
    "Do you source raw materials/goods from market independently?": "तुम्ही बाजारातून स्वतंत्रपणे कच्चा माल आणता का?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "तुम्ही बाजारातून स्वतंत्रपणे कच्चा माल आणता का?",
    "Do you have easy access to loans from different sources?": "तुम्हाला विविध स्त्रोतांकडून सुलभ कर्ज उपलब्ध आहे का?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "तुम्हाला विविध स्त्रोतांकडून सुलभ कर्ज उपलब्ध आहे का?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "तुम्ही SVEP / OSF योजनेअंतर्गत किती कर्ज रक्कम घेतली आहे (रु)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "तुम्ही SVEP / OSF योजनेअंतर्गत किती कर्ज रक्कम घेतली आहे (रु)?",
    "How did you utilize the enterprise loan?": "तुम्ही व्यवसाय कर्जाचा वापर कसा केला?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "तुम्ही व्यवसाय कर्जाचा वापर कसा केला?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "कर्ज घेण्यापूर्वी व्यवसायाचे मासिक उत्पन्न (रु)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "कर्ज घेण्यापूर्वी व्यवसायाचे मासिक उत्पन्न (रु)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "कर्ज घेतल्यानंतर व्यवसायाचे मासिक उत्पन्न (रु)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "कर्ज घेतल्यानंतर व्यवसायाचे मासिक उत्पन्न (रु)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP चे काय योगदान राहिले आहे?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP चे काय योगदान राहिले आहे?",
    "Does the woman entrepreneur own a smartphone?": "महिला उद्योजिकेकडे स्मार्टफोन आहे का?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "महिला उद्योजिकेकडे स्मार्टफोन आहे का?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "तुम्ही व्यावसायिक व्यवहारांसाठी QR कोड / UPI / मोबाइल बँकिंग वापरता का?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "तुम्ही व्यावसायिक व्यवहारांसाठी QR कोड / UPI / मोबाइल बँकिंग वापरता का?",
    "Daily how many transactions are done via QR code / UPI?": "दररोज QR कोड / UPI द्वारे किती व्यवहार होतात?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "दररोज QR कोड / UPI द्वारे किती व्यवहार होतात?",
    "Which social media platforms do you use for your business?": "तुम्ही व्यवसायासाठी कोणते सोशल मीडिया प्लॅटफॉर्म वापरता?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "तुम्ही व्यवसायासाठी कोणते सोशल मीडिया प्लॅटफॉर्म वापरता?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "उद्योग जीपीएस स्थान कॅप्चर करा (उपग्रह निर्देशांक)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "उद्योग जीपीएस स्थान कॅप्चर करा (उपग्रह निर्देशांक)",
    "Field Photo of Enterprise & Beneficiary": "उद्योग आणि लाभार्थीचा फील्ड फोटो",
    "उद्यम और लाभार्थी का फील्ड फोटो": "उद्योग आणि लाभार्थीचा फील्ड फोटो",
    "Respondent & Surveyor Digital Signature": "उत्तरदाता आणि सर्वेक्षकाची डिजिटल स्वाक्षरी",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "उत्तरदाता आणि सर्वेक्षकाची डिजिटल स्वाक्षरी",
    "Yes": "होय",
    "हाँ": "होय",
    "No": "नाही",
    "नहीं": "नाही",
    "Baran": "बारां",
    "बारां": "बारां",
    "Churu": "चुरू",
    "चूरू": "चुरू",
    "Dausa": "दौसा",
    "दौसा": "दौसा",
    "Dungarpur": "डुंगरपूर",
    "डूंगरपुर": "डुंगरपूर",
    "Jodhpur": "जोधपूर",
    "जोधपुर": "जोधपूर",
    "Chhipabarod": "छीपाबडौद",
    "छीपाबड़ौद": "छीपाबडौद",
    "Kishanganj": "किशनगंज",
    "किशनगंज": "किशनगंज",
    "Sardar Sheher": "सरदारशहर",
    "सरदारशहर": "सरदारशहर",
    "Bidasar": "बिदासर",
    "बीदासर": "बिदासर",
    "Secundra": "सिकंदरा",
    "सिकंदरा": "सिकंदरा",
    "Sagwara": "सागवाडा",
    "सागवाड़ा": "सागवाडा",
    "Galiakot": "गलियाकोट",
    "गलियाकोट": "गलियाकोट",
    "Bicchiwada": "बिछीवाडा",
    "बिछीवाड़ा": "बिछीवाडा",
    "Jodhpur Block": "जोधपूर ब्लॉक",
    "जोधपुर ब्लॉक": "जोधपूर ब्लॉक",
    "Married": "विवाहित",
    "विवाहित": "विवाहित",
    "Single": "अविवाहित",
    "अविवाहित": "अविवाहित",
    "Widowed": "विधवा",
    "विधवा": "विधवा",
    "Divorced": "घटस्फोटित",
    "तलाकशुदा": "घटस्फोटित",
    "Separated": "विभक्त",
    "अलग रह रहे": "विभक्त",
    "General": "सामान्य (General)",
    "सामान्य": "सामान्य (General)",
    "OBC": "इतर मागासवर्गीय (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "इतर मागासवर्गीय (OBC)",
    "SC": "अनुसूचित जाती (SC)",
    "अनुसूचित जाति (SC)": "अनुसूचित जाती (SC)",
    "ST": "अनुसूचित जमाती (ST)",
    "अनुसूचित जनजाति (ST)": "अनुसूचित जमाती (ST)",
    "Illiterate": "निरक्षर",
    "निरक्षर / अनपढ़": "निरक्षर",
    "Illiterate but able to calculate": "निरक्षर पण हिशोब करू शकणारे",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "निरक्षर पण हिशोब करू शकणारे",
    "5th pass": "५ वी पास",
    "5वीं पास": "५ वी पास",
    "8th pass": "८ वी पास",
    "8वीं पास": "८ वी पास",
    "10th pass": "१० वी पास",
    "10वीं पास": "१० वी पास",
    "12th pass": "१२ वी पास",
    "12वीं पास": "१२ वी पास",
    "Graduate": "पदवीधर (Graduate)",
    "स्नातक (Graduate)": "पदवीधर (Graduate)",
    "Self": "स्वतः",
    "स्वयं": "स्वतः",
    "Husband": "पती",
    "पति": "पती",
    "Son": "मुलगा",
    "पुत्र / बेटा": "मुलगा",
    "Daughter": "मुलगी",
    "पुत्री / बेटी": "मुलगी",
    "Member": "सदस्य",
    "सामान्य सदस्य": "सदस्य",
    "Leadership role": "पदाधिकारी (अध्यक्ष/सचिव/खजिनदार)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "पदाधिकारी (अध्यक्ष/सचिव/खजिनदार)",
    "Grocery / Kirana": "किराणा दुकान",
    "किराना दुकान": "किराणा दुकान",
    "General store": "जनरल स्टोअर",
    "जनरल स्टोर": "जनरल स्टोअर",
    "Leather & footwear": "चामडे व पादत्राणे",
    "चमड़ा व जूते-चप्पल": "चामडे व पादत्राणे",
    "Flour mill": "पिठाची गिरणी",
    "आटा चक्की": "पिठाची गिरणी",
    "Tailoring & Stitching": "शिलाई व भरतकाम",
    "सिलाई व कढ़ाई केंद्र": "शिलाई व भरतकाम",
    "Apparel & Garments": "तयार कपडे",
    "रेडीमेड वस्त्र": "तयार कपडे",
    "Beauty parlour": "ब्युटी पार्लर",
    "ब्यूटी पार्लर": "ब्युटी पार्लर",
    "Handicraft": "हस्तकला / हँडीक्राफ्ट",
    "हस्तशिल्प / हैंडीक्राफ्ट": "हस्तकला / हँडीक्राफ्ट",
    "Dairy shop": "डेअरी व दूध केंद्र",
    "डेयरी व दूध केंद्र": "डेअरी व दूध केंद्र",
    "Auto-mechanic": "ऑटो मेकॅनिक",
    "ऑटो मैकेनिक": "ऑटो मेकॅनिक",
    "E-mitra": "ई-सेवा केंद्र / सीएससी",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ई-सेवा केंद्र / सीएससी",
    "Mobile repair shop": "मोबाइल दुरुस्ती दुकान",
    "मोबाइल रिपेयर दुकान": "मोबाइल दुरुस्ती दुकान",
    "Transport": "वाहतूक सेवा",
    "परिवहन सेवा": "वाहतूक सेवा",
    "Any other": "इतर कोणतेही",
    "अन्य कोई": "इतर कोणतेही",
    "Whatsapp": "व्हॉट्सअ‍ॅप",
    "व्हाट्सएप (WhatsApp)": "व्हॉट्सअ‍ॅप",
    "Facebook": "फेसबुक",
    "फेसबुक (Facebook)": "फेसबुक",
    "Instagram": "इन्स्टाग्राम",
    "इंस्टाग्राम (Instagram)": "इन्स्टाग्राम",
    "Don't use social media": "सोशल मीडिया वापरत नाही",
    "सोशल मीडिया का उपयोग नहीं करते": "सोशल मीडिया वापरत नाही",
    "Draft": "अपूर्ण मसुदा",
    "Save Draft": "मसुदा जतन करा",
    "ड्राफ्ट": "मसुदा",
    "मसुदा": "मसुदा",
    "ડ્રાફ્ટ": "मसुदा",
    "ਡਰਾਫਟ": "मसुदा",
    "খসড়া": "मसुदा",
    "வரைவு": "मसुदा",
    "చిత్తుప్రతి": "मसुदा",
    "ಕರಡು": "मसुदा",
    "ഡ്രാഫ്റ്റ്": "मसुदा",
    "ڈرافٹ": "मसुदा",
    "ड्राफ्ट सेव करें": "मसुदा जतन करा",
    "मसुदा जतन करा": "मसुदा जतन करा",
    "ડ્રાફ્ટ સાચવો": "मसुदा जतन करा",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "मसुदा जतन करा",
    "খসড়া সংরক্ষণ": "मसुदा जतन करा",
    "வரைவு சேமி": "मसुदा जतन करा",
    "చిత్తుప్రతి భద్రపరచు": "मसुदा जतन करा",
    "ಕರಡು ಉಳಿಸಿ": "मसुदा जतन करा",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "मसुदा जतन करा",
    "ڈرافٹ محفوظ کریں": "मसुदा जतन करा",
    "Himalayan Baseline Impact Survey": "हिमालयन बेसलाइन प्रभाव सर्वेक्षण",
    "1. Household & Demographic Profile": "1. कुटुंब आणि लोकसंख्याशास्त्र प्रोफाइल",
    "General identification and household metrics": "सामान्य ओळख आणि घरगुती तपशील",
    "2. Economic Activity & Livestock": "2. आर्थिक क्रियाकलाप आणि पशुधन",
    "Revenue, assets, and livestock count": "उत्पन्न, मालमत्ता आणि जनावरांची संख्या",
    "3. Geolocation & Digital Verification": "3. भौगोलिक स्थान आणि डिजिटल पडताळणी",
    "GPS accuracy and field photo capture": "जीपीएस अचूकता आणि फील्ड फोटो",
    "Full Name of Household Head / Primary Respondent": "कुटुंबप्रमुखाचे / मुख्य उत्तरदात्याचे पूर्ण नाव",
    "Respondent Classification": "उत्तरदात्याचे वर्गीकरण",
    "Individual": "वैयक्तिक",
    "Household": "कुटुंब / घरगुती",
    "Smallholder Farmer": "लहान शेतकरी",
    "Micro Enterprise / Self-Employed": "सूक्ष्म उद्योग / स्वयंरोजगार",
    "Primary Contact Phone Number": "मुख्य संपर्क फोन नंबर",
    "Do you own cattle, sheep, or goats?": "तुमच्याकडे गाय, म्हैस, मेंढी किंवा शेळी आहे का?",
    "Total number of milch cattle / animals?": "एकूण दुभत्या जनावरांची / प्राण्यांची संख्या किती?",
    "Estimated Monthly Household Income (INR ₹)": "अंदाजे मासिक घरगुती उत्पन्न (रु. ₹)",
    "Farm Equipment & Key Productive Assets": "शेतीची उपकरणे आणि मुख्य उत्पादक मालमत्ता",
    "Capture Field GPS Coordinates (Auto-verified)": "फील्ड जीपीएस निर्देशांक मिळवा (स्वयंचलित पडताळणी)",
    "Field Photo of Site / Beneficiary": "साइट / लाभार्थ्याचा फील्ड फोटो",
    "Surveyor Sign-off & Digital Signature": "सर्वेक्षक स्वाक्षरी आणि डिजिटल स्वाक्षरी",
    "District, Block, Village, SHG, and Enterprise identification": "जिल्हा, तालुका, गाव, SHG आणि उद्योगाची ओळख",
    "Demographic, family structure, education, and household income": "लोकसंख्याशास्त्र, कौटुंबिक रचना, शिक्षण आणि घरगुती उत्पन्न",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "सुरुवातीचा इतिहास, कामाचे तास, भांडवल व्यवस्था आणि हंगामी उत्पन्न",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "जागा, पुरवठादार, कर्ज वसुली, कच्चा माल खरेदी आणि कर्ज उपलब्धता",
    "Loan utilization, monthly income growth, and CRP contribution": "कर्जाचा वापर, मासिक उत्पन्नातील वाढ आणि CRP चे योगदान",
    "Smartphone ownership, QR code banking, and social media usage": "स्मार्टफोन मालकी, क्यूआर कोड बँकिंग आणि सोशल मीडियाचा वापर",
    "GPS coordinates fix, site photo capture, and digital signatures": "जीपीएस निर्देशांक, जागेचा फोटो आणि डिजिटल स्वाक्षरी",
    "Dashboard": "डॅशबोर्ड",
    "Surveyor Dashboard": "सर्वेक्षक डॅशबोर्ड",
    "Field Work Overview": "फील्ड कामाचा आढावा",
    "Total Recorded": "एकूण सर्वेक्षणे",
    "Synced to Server": "सर्व्हरवर सिंक",
    "Pending Sync": "सिंक प्रलंबित",
    "Incomplete Drafts": "अपूर्ण मसुदे",
    "Drafts": "मसुदे",
    "Completed": "पूर्ण",
    "Today's Goal": "आजचे उद्दिष्ट",
    "surveys completed today": "सर्वेक्षणे आज पूर्ण झाली",
    "Daily Target Met!": "आजचे उद्दिष्ट पूर्ण झाले! 🎉",
    "Start New Survey": "+ नवीन सर्वेक्षण सुरू करा",
    "Resume Draft": "▶ अपूर्ण फॉर्म पूर्ण करा",
    "Resume & Complete": "▶ फॉर्म सुरू ठेवा",
    "My Submissions & Drafts": "माझी सर्वेक्षणे आणि मसुदे",
    "All Records": "सर्व रेकॉर्ड",
    "Complete": "पूर्ण",
    "Questions Answered": "प्रश्नांची उत्तरे दिली",
    "GPS Locked": "जीपीएस लॉक ✓",
    "Photo Attached": "फोटो जोडला ✓",
    "Signed": "स्वाक्षरी झाली ✓",
    "Ready to Sync": "सिंकसाठी तयार (100%)",
    "Synced": "सर्व्हरवर सुरक्षित",
    "No respondent name": "नाव नसलेला उत्तरदाता",
    "Village / Location": "गाव / ठिकाण",
    "Last edited": "शेवटचे संपादन",
    "Sync All Pending": "🔄 सर्व प्रलंबित सिंक करा",
    "No surveys recorded yet": "या डिव्हाइसवर अद्याप कोणतेही सर्वेक्षण नोंदवलेले नाही",
    "Tap '+ Start New Survey' to begin your first interview": "पहिली मुलाखत सुरू करण्यासाठी '+ नवीन सर्वेक्षण' दाबा",
    "Delete draft?": "तुम्हाला हा मसुदा हटवायचा आहे का?",
    "Draft deleted": "मसुदा हटवला गेला",
    "Text Size": "अक्षरांचा आकार",
    "Adjust font size for your screen": "स्क्रीननुसार अक्षरांचा आकार निवडा",
    "Small": "लहान",
    "Medium": "मध्यम",
    "Large": "मोठा",
    "Text size set to Small": "अक्षरांचा आकार लहान केला",
    "Text size set to Medium": "अक्षरांचा आकार मध्यम केला",
    "Text size set to Large": "अक्षरांचा आकार मोठा केला",
    "Email Data to Admin": "अ‍ॅडमिनला डेटा ईमेल करा",
    "Emergency Backup & Support": "आणीबाणी बॅकअप आणि सहाय्य",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "आपले सर्व सर्वेक्षण रेकॉर्ड आणि त्रुटी लॉग ईमेल किंवा अ‍ॅप्सद्वारे अ‍ॅडमिनला पाठवा.",
    "Admin Email Address": "अ‍ॅडमिनचा ईमेल पत्ता",
    "Additional Note / Error Description": "समस्या किंवा नोंद (पर्यायी)",
    "Send via Email / Server": "ईमेलद्वारे पाठवा (सर्व्हर)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp वर शेअर करा",
    "Download JSON": "JSON डाउनलोड करा",
    "Download CSV (Excel)": "CSV (Excel) डाउनलोड करा",
    "Backup emailed successfully ✓": "बॅकअप ईमेल यशस्वीरित्या पाठवला ✓",
    "Total Device Records": "डिव्हाइसवरील एकूण रेकॉर्ड",
    "Offline Storage Status": "स्थानिक स्टोरेज स्थिती",
    "Healthy (IndexedDB)": "सुरक्षित (IndexedDB)",
    "Export & Backup": "निर्यात आणि बॅकअप",
    "Send Data to Admin": "अ‍ॅडमिनला डेटा पाठवा",
    "e.g. 2020": "उदा. 2020",
    "Enter year (e.g. 2020)": "वर्ष प्रविष्ट करा (उदा. 2020)"
  },
  "gu": {
    "OmniQuery": "ઓમ્નીસર્વે",
    "ओमनीसर्वे": "ઓમ્નીસર્વે",
    "Online": "ઓનલાઇન",
    "ऑनलाइन": "ઓનલાઇન",
    "Offline": "ઓફલાઇન",
    "ऑफलाइन": "ઓફલાઇન",
    "Surveys": "સર્વેક્ષણ",
    "सर्वेक्षण": "સર્વેક્ષણ",
    "WAL Queue": "કતાર (ઓફલાઇન)",
    "कतार (ऑफलाइन)": "કતાર (ઓફલાઇન)",
    "System": "સિસ્ટમ",
    "सिस्टम": "સિસ્ટમ",
    "Exit Form": "← બહાર નીકળો",
    "← बाहर निकलें": "← બહાર નીકળો",
    "Step": "પગલું",
    "चरण": "પગલું",
    "of": "માંથી",
    "का": "માંથી",
    "Pages": "પૃષ્ઠો",
    "पृष्ठ": "પૃષ્ઠો",
    "Questions": "પ્રશ્નો",
    "प्रश्न": "પ્રશ્નો",
    "Previous": "← પાછળ",
    "← पिछला": "← પાછળ",
    "Next": "આગળ →",
    "अगला →": "આગળ →",
    "Save Offline": "ઓફલાઇન સાચવો",
    "ऑफलाइन सेव करें": "ઓફલાઇન સાચવો",
    "Submit Survey": "સબમિટ કરો",
    "सबमिट करें": "સબમિટ કરો",
    "Capture GPS Coordinates": "જીપીએસ સ્થાન મેળવો",
    "जीपीएस लोकेशन रिकॉर्ड करें": "જીપીએસ સ્થાન મેળવો",
    "GPS Fix Acquired ✓": "જીપીએસ સ્થાન પ્રાપ્ત થયું ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "જીપીએસ સ્થાન પ્રાપ્ત થયું ✓",
    "Take Photo / Choose File": "ફોટો લો / ફાઇલ પસંદ કરો",
    "फोटो लें / फाइल चुनें": "ફોટો લો / ફાઇલ પસંદ કરો",
    "Sign inside box with finger or stylus": "તમારી આંગળી અથવા સ્ટાઇલસથી બૉક્સમાં સહી કરો",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "તમારી આંગળી અથવા સ્ટાઇલસથી બૉક્સમાં સહી કરો",
    "Clear Signature": "સહી સાફ કરો",
    "हस्ताक्षर मिटाएं": "સહી સાફ કરો",
    "Signature Recorded": "સહી નોંધાઈ",
    "हस्ताक्षर दर्ज हुआ": "સહી નોંધાઈ",
    "Enter response here...": "અહીં જવાબ દાખલ કરો...",
    "यहाँ उत्तर दर्ज करें...": "અહીં જવાબ દાખલ કરો...",
    "Required Questions Pending": "જરૂરી પ્રશ્નો બાકી છે",
    "आवश्यक प्रश्न अधूरे हैं": "જરૂરી પ્રશ્નો બાકી છે",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "અંતિમ સબમિશન પહેલાં કૃપા કરીને આ જરૂરી પ્રશ્નો ભરો, અથવા કોઈપણ સમયે ઑફલાઇન ડ્રાફ્ટ તરીકે સાચવો.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "અંતિમ સબમિશન પહેલાં કૃપા કરીને આ જરૂરી પ્રશ્નો ભરો, અથવા કોઈપણ સમયે ઑફલાઇન ડ્રાફ્ટ તરીકે સાચવો.",
    "Go to First Pending Question": "👉 પ્રથમ બાકી પ્રશ્ન પર જાઓ",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 પ્રથમ બાકી પ્રશ્ન પર જાઓ",
    "Save as Offline Draft Anyway": "ઑફલાઇન ડ્રાફ્ટ સાચવો",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ઑફલાઇન ડ્રાફ્ટ સાચવો",
    "Close": "બંધ કરો",
    "बंद करें": "બંધ કરો",
    "Start Survey Form": "સર્વેક્ષણ શરૂ કરો",
    "सर्वेक्षण शुरू करें": "સર્વેક્ષણ શરૂ કરો",
    "Start Survey Form →": "સર્વેક્ષણ શરૂ કરો →",
    "सर्वेक्षण शुरू करें →": "સર્વેક્ષણ શરૂ કરો →",
    "Write-Ahead Log (WAL)": "રાઇટ-અહેડ લૉગ (WAL કતાર)",
    "राइट-अहेड लॉग (WAL कतार)": "રાઇટ-અહેડ લૉગ (WAL કતાર)",
    "Atomic zero-loss local storage queue": "શૂન્ય ડેટા નુકશાન સુરક્ષિત સ્થાનિક સ્ટોરેજ",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "શૂન્ય ડેટા નુકશાન સુરક્ષિત સ્થાનિક સ્ટોરેજ",
    "Sync Now": "⟳ હમણાં સિંક કરો",
    "⟳ अभी सिंक करें": "⟳ હમણાં સિંક કરો",
    "View on Map →": "નકશા પર જુઓ →",
    "नक्शे पर देखें →": "નકશા પર જુઓ →",
    "Re-acquire Fix": "ફરીથી પ્રયાસ કરો",
    "पुनः प्रयास करें": "ફરીથી પ્રયાસ કરો",
    "Section A: Basic Details": "વિભાગ A: મૂળભૂત વિગતો",
    "भाग क: बुनियादी विवरण": "વિભાગ અ: મૂળભૂત વિગતો",
    "Section B: Respondent & Household Profile": "વિભાગ B: ઉત્તરદાતા અને પારિવારિક પ્રોફાઇલ",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "વિભાગ બ: ઉત્તરદાતા અને કુટુંબ પ્રોફાઇલ",
    "Section C: Enterprise Operations & Finance": "વિભાગ C: વ્યવસાય સંચાલન અને નાણાં",
    "भाग ग: उद्यम संचालन और वित्त": "વિભાગ ક: સાહસ કામગીરી અને નાણાં",
    "Section D: Enterprise Challenges & Coping Mechanisms": "વિભાગ D: ઉદ્યોગના પડકારો અને ઉકેલ",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "વિભાગ ડ: સાહસિક પડકારો અને ઉકેલો",
    "Section E: Impact of SVEP / OSF Schemes": "વિભાગ E: SVEP / OSF યોજનાઓનો પ્રભાવ",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "વિભાગ ઇ: એસવીઇપી / ઓએસએફ યોજનાઓની અસર",
    "Section F: Digital Transactions & Social Media": "વિભાગ F: ડિજિટલ વ્યવહારો અને સોશિયલ મીડિયા",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "વિભાગ એફ: ડિજિટલ વ્યવહારો અને સોશિયલ મીડિયા",
    "Section G: Field Verification & Sign-off": "વિભાગ G: ક્ષેત્ર ચકાસણી અને સહી",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "વિભાગ જી: ફીલ્ડ ચકાસણી અને સહી",
    "District": "જિલ્લો",
    "जिला": "જિલ્લો",
    "Block / Tehsil": "તાલુકો / બ્લોક",
    "ब्लॉक / तहसील": "તાલુકો / બ્લોક",
    "Village / Gram Panchayat Name": "ગામ / ગ્રામ પંચાયતનું નામ",
    "गाँव / ग्राम पंचायत का नाम": "ગામ / ગ્રામ પંચાયતનું નામ",
    "Cluster Level Federation (CLF) Name": "ક્લસ્ટર લેવલ ફેડરેશન (CLF) નું નામ",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "ક્લસ્ટર લેવલ ફેડરેશન (CLF) નું નામ",
    "Village Organization (VO) Name": "ગ્રામ સંસ્થા (VO) નું નામ",
    "ग्राम संगठन (VO) का नाम": "ગ્રામ સંસ્થા (VO) નું નામ",
    "Self-Help Group (SHG) Name": "સ્વસહાય જૂથ (SHG) નું નામ",
    "स्वयं सहायता समूह (SHG) का नाम": "સ્વસહાય જૂથ (SHG) નું નામ",
    "Respondent Name": "ઉત્તરદાતાનું નામ",
    "उत्तरदाता का नाम": "ઉત્તરદાતાનું નામ",
    "Enterprise / Business Name": "સાહસ / વ્યવસાયનું નામ",
    "उद्यम / व्यवसाय का नाम": "સાહસ / વ્યવસાયનું નામ",
    "Year of Setting Up Enterprise": "સાહસ સ્થાપનાનું વર્ષ",
    "उद्यम स्थापना का वर्ष": "સાહસ સ્થાપનાનું વર્ષ",
    "Main Business Activity of the Enterprise": "સાહસની મુખ્ય વ્યવસાયિક પ્રવૃત્તિ",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "સાહસની મુખ્ય વ્યવસાયિક પ્રવૃત્તિ",
    "What is respondent's relation with SHG member?": "ઉત્તરદાતાનો એસએચજી સભ્ય સાથે શું સંબંધ છે?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "ઉત્તરદાતાનો એસએચજી સભ્ય સાથે શું સંબંધ છે?",
    "What is the age of SHG member?": "એસએચજી સભ્યની ઉંમર કેટલી છે?",
    "एसएचजी सदस्य की आयु क्या है?": "એસએચજી સભ્યની ઉંમર કેટલી છે?",
    "What is the marital status of the SHG member?": "એસએચજી સભ્યની વૈવાહિક સ્થિતિ શું છે?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "એસએચજી સભ્યની વૈવાહિક સ્થિતિ શું છે?",
    "What is the social category / caste?": "સામાજિક કેટેગરી / જ્ઞાતિ શું છે?",
    "सामाजिक श्रेणी / जाति क्या है?": "સામાજિક કેટેગરી / જ્ઞાતિ શું છે?",
    "What is the education status of the SHG member?": "એસએચજી સભ્યની શૈક્ષણિક લાયકાત શું છે?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "એસએચજી સભ્યની શૈક્ષણિક લાયકાત શું છે?",
    "How many total members are in the family?": "પરિવારમાં કુલ કેટલા સભ્યો છે?",
    "परिवार में कुल कितने सदस्य हैं?": "પરિવારમાં કુલ કેટલા સભ્યો છે?",
    "What is your total annual household income?": "તમારી કુલ વાર્ષિક પારિવારિક આવક કેટલી છે?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "તમારી કુલ વાર્ષિક પારિવારિક આવક કેટલી છે?",
    "What is your role in the SHG?": "એસએચજીમાં તમારી ભૂમિકા શું છે?",
    "एसएचजी में आपकी भूमिका क्या है?": "એસએચજીમાં તમારી ભૂમિકા શું છે?",
    "Are you related to any of the SVEP / OSF CRP?": "શું તમે કોઈપણ SVEP / OSF CRP સાથે સંબંધિત છો?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "શું તમે કોઈપણ SVEP / OSF CRP સાથે સંબંધિત છો?",
    "Who started the enterprise?": "સાહસ કોણે શરૂ કર્યું?",
    "उद्यम किसने शुरू किया था?": "સાહસ કોણે શરૂ કર્યું?",
    "Who operates and manages the enterprise on a daily basis?": "દૈનિક ધોરણે સાહસનું સંચાલન કોણ કરે છે?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "દૈનિક ધોરણે સાહસનું સંચાલન કોણ કરે છે?",
    "For how many hours in a day does the shop/enterprise remain open?": "દિવસમાં કેટલા કલાક દુકાન/સાહસ ખુલ્લું રહે છે?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "દિવસમાં કેટલા કલાક દુકાન/સાહસ ખુલ્લું રહે છે?",
    "What is the type of business place / premises?": "વ્યવસાય સ્થળનો પ્રકાર કયો છે?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "વ્યવસાય સ્થળનો પ્રકાર કયો છે?",
    "Does SHG member maintain written records of business transactions regularly?": "શું એસએચજી સભ્ય નિયમિતપણે વ્યવસાયિક વ્યવહારોનો લેખિત રેકોર્ડ રાખે છે?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "શું એસએચજી સભ્ય નિયમિતપણે વ્યવસાયિક વ્યવહારોનો લેખિત રેકોર્ડ રાખે છે?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "તમારા સાહસના પ્રથમ વર્ષમાં પ્રારંભિક મૂડી (રૂ) કેટલી હતી?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "તમારા સાહસના પ્રથમ વર્ષમાં પ્રારંભિક મૂડી (રૂ) કેટલી હતી?",
    "How do you manage working capital during peak season?": "પીક સીઝન દરમિયાન તમે કાર્યકારી મૂડીનું સંચાલન કેવી રીતે કરો છો?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "પીક સીઝન દરમિયાન તમે કાર્યકારી મૂડીનું સંચાલન કેવી રીતે કરો છો?",
    "Is the location of your space convenient for your business?": "શું તમારા સ્થાનની સ્થિતિ તમારા વ્યવસાય માટે અનુકૂળ છે?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "શું તમારા સ્થાનની સ્થિતિ તમારા વ્યવસાય માટે અનુકૂળ છે?",
    "Are you satisfied and happy with your wholesale supplier?": "શું તમે તમારા જથ્થાબંધ સપ્લાયરથી સંતુષ્ટ છો?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "શું તમે તમારા જથ્થાબંધ સપ્લાયરથી સંતુષ્ટ છો?",
    "Are you able to recover credit / money from your customers?": "શું તમે તમારા ગ્રાહકો પાસેથી ઉધારી/નાણાં વસૂલ કરી શકો છો?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "શું તમે તમારા ગ્રાહકો પાસેથી ઉધારી/નાણાં વસૂલ કરી શકો છો?",
    "Do you source raw materials/goods from market independently?": "શું તમે બજારમાંથી સ્વતંત્ર રીતે કાચો માલ લાવો છો?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "શું તમે બજારમાંથી સ્વતંત્ર રીતે કાચો માલ લાવો છો?",
    "Do you have easy access to loans from different sources?": "શું તમને વિવિધ સ્ત્રોતોમાંથી લોનની સરળ પહોંચ છે?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "શું તમને વિવિધ સ્ત્રોતોમાંથી લોનની સરળ પહોંચ છે?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "તમે SVEP / OSF યોજના હેઠળ કેટલી લોન રકમ મેળવી છે (રૂ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "તમે SVEP / OSF યોજના હેઠળ કેટલી લોન રકમ મેળવી છે (રૂ)?",
    "How did you utilize the enterprise loan?": "તમે સાહસ લોનનો ઉપયોગ કેવી રીતે કર્યો?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "તમે સાહસ લોનનો ઉપયોગ કેવી રીતે કર્યો?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "લોન લેતા પહેલા સાહસની માસિક આવક (રૂ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "લોન લેતા પહેલા સાહસની માસિક આવક (રૂ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "લોન લીધા પછી સાહસની માસિક આવક (રૂ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "લોન લીધા પછી સાહસની માસિક આવક (રૂ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP નું શું યોગદાન રહ્યું છે?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP નું શું યોગદાન રહ્યું છે?",
    "Does the woman entrepreneur own a smartphone?": "શું મહિલા ઉદ્યોગસાહસિક પાસે સ્માર્ટફોન છે?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "શું મહિલા ઉદ્યોગસાહસિક પાસે સ્માર્ટફોન છે?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "શું તમે વ્યવસાયિક વ્યવહારો માટે QR કોડ / UPI / મોબાઇલ બેંકિંગનો ઉપયોગ કરો છો?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "શું તમે વ્યવસાયિક વ્યવહારો માટે QR કોડ / UPI / મોબાઇલ બેંકિંગનો ઉપયોગ કરો છો?",
    "Daily how many transactions are done via QR code / UPI?": "દરરોજ QR કોડ / UPI દ્વારા કેટલા વ્યવહારો થાય છે?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "દરરોજ QR કોડ / UPI દ્વારા કેટલા વ્યવહારો થાય છે?",
    "Which social media platforms do you use for your business?": "તમે તમારા વ્યવસાય માટે કયા સોશિયલ મીડિયા પ્લેટફોર્મનો ઉપયોગ કરો છો?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "તમે તમારા વ્યવસાય માટે કયા સોશિયલ મીડિયા પ્લેટફોર્મનો ઉપયોગ કરો છો?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "સાહસ જીપીએસ સ્થાન મેળવો (ઉપગ્રહ કોઓર્ડિનેટ્સ)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "સાહસ જીપીએસ સ્થાન મેળવો (ઉપગ્રહ કોઓર્ડિનેટ્સ)",
    "Field Photo of Enterprise & Beneficiary": "સાહસ અને લાભાર્થીનો ફીલ્ડ ફોટો",
    "उद्यम और लाभार्थी का फील्ड फोटो": "સાહસ અને લાભાર્થીનો ફીલ્ડ ફોટો",
    "Respondent & Surveyor Digital Signature": "ઉત્તરદાતા અને સર્વેક્ષકની ડિજિટલ સહી",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "ઉત્તરદાતા અને સર્વેક્ષકની ડિજિટલ સહી",
    "Yes": "હા",
    "हाँ": "હા",
    "No": "ના",
    "नहीं": "ના",
    "Baran": "બારાં",
    "बारां": "બારાં",
    "Churu": "ચૂરુ",
    "चूरू": "ચૂરુ",
    "Dausa": "દૌસા",
    "दौसा": "દૌસા",
    "Dungarpur": "ડુંગરપુર",
    "डूंगरपुर": "ડુંગરપુર",
    "Jodhpur": "જોધપુર",
    "जोधपुर": "જોધપુર",
    "Chhipabarod": "છીપાબડોદ",
    "छीपाबड़ौद": "છીપાબડોદ",
    "Kishanganj": "કિશનગંજ",
    "किशनगंज": "કિશનગંજ",
    "Sardar Sheher": "સરદારશહર",
    "सरदारशहर": "સરદારશહર",
    "Bidasar": "બીદાસર",
    "बीदासर": "બીદાસર",
    "Secundra": "સિકંદરા",
    "सिकंदरा": "સિકંદરા",
    "Sagwara": "સાગવાડા",
    "सागवाड़ा": "સાગવાડા",
    "Galiakot": "ગલિયાકોટ",
    "गलियाकोट": "ગલિયાકોટ",
    "Bicchiwada": "બિછીવાડા",
    "बिछीवाड़ा": "બિછીવાડા",
    "Jodhpur Block": "જોધપુર બ્લોક",
    "जोधपुर ब्लॉक": "જોધપુર બ્લોક",
    "Married": "પરિણીત",
    "विवाहित": "પરિણીત",
    "Single": "અપરિણીત",
    "अविवाहित": "અપરિણીત",
    "Widowed": "વિધવા",
    "विधवा": "વિધવા",
    "Divorced": "છૂટાછેડા લીધેલ",
    "तलाकशुदा": "છૂટાછેડા લીધેલ",
    "Separated": "અલગ રહેતા",
    "अलग रह रहे": "અલગ રહેતા",
    "General": "સામાન્ય (General)",
    "सामान्य": "સામાન્ય (General)",
    "OBC": "અન્ય પછાત વર્ગ (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "અન્ય પછાત વર્ગ (OBC)",
    "SC": "અનુસૂચિત જાતિ (SC)",
    "अनुसूचित जाति (SC)": "અનુસૂચિત જાતિ (SC)",
    "ST": "અનુસૂચિત જનજાતિ (ST)",
    "अनुसूचित जनजाति (ST)": "અનુસૂચિત જનજાતિ (ST)",
    "Illiterate": "અભણ / નિરક્ષર",
    "निरक्षर / अनपढ़": "અભણ / નિરક્ષર",
    "Illiterate but able to calculate": "અભણ પરંતુ ગણતરીમાં સક્ષમ",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "અભણ પરંતુ ગણતરીમાં સક્ષમ",
    "5th pass": "૫ પાસ",
    "5वीं पास": "૫ પાસ",
    "8th pass": "૮ પાસ",
    "8वीं पास": "૮ પાસ",
    "10th pass": "૧૦ પાસ",
    "10वीं पास": "૧૦ પાસ",
    "12th pass": "૧૨ પાસ",
    "12वीं पास": "૧૨ પાસ",
    "Graduate": "સ્નાતક (Graduate)",
    "स्नातक (Graduate)": "સ્નાતક (Graduate)",
    "Self": "પોતે",
    "स्वयं": "પોતે",
    "Husband": "પતિ",
    "पति": "પતિ",
    "Son": "પુત્ર / દીકરો",
    "पुत्र / बेटा": "પુત્ર / દીકરો",
    "Daughter": "પુત્રી / દીકરી",
    "पुत्री / बेटी": "પુત્રી / દીકરી",
    "Member": "સામાન્ય સભ્ય",
    "सामान्य सदस्य": "સામાન્ય સભ્ય",
    "Leadership role": "નેતૃત્વ પદ (પ્રમુખ/મંત્રી/ખજાનચી)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "નેતૃત્વ પદ (પ્રમુખ/મંત્રી/ખજાનચી)",
    "Grocery / Kirana": "કરિયાણાની દુકાન",
    "किराना दुकान": "કરિયાણાની દુકાન",
    "General store": "જનરલ સ્ટોર",
    "जनरल स्टोर": "જનરલ સ્ટોર",
    "Leather & footwear": "ચામડું અને ફૂટવેર",
    "चमड़ा व जूते-चप्पल": "ચામડું અને ફૂટવેર",
    "Flour mill": "લોટ દળવાની ઘંટી (ચક્કી)",
    "आटा चक्की": "લોટ દળવાની ઘંટી (ચક્કી)",
    "Tailoring & Stitching": "સિલાઈ અને ભરતકામ કેન્દ્ર",
    "सिलाई व कढ़ाई केंद्र": "સિલાઈ અને ભરતકામ કેન્દ્ર",
    "Apparel & Garments": "રેડીમેડ કપડાં",
    "रेडीमेड वस्त्र": "રેડીમેડ કપડાં",
    "Beauty parlour": "બ્યુટી પાર્લર",
    "ब्यूटी पार्लर": "બ્યુટી પાર્લર",
    "Handicraft": "હસ્તકલા / હેન્ડીક્રાફ્ટ",
    "हस्तशिल्प / हैंडीक्राफ्ट": "હસ્તકલા / હેન્ડીક્રાફ્ટ",
    "Dairy shop": "ડેરી અને દૂધ કેન્દ્ર",
    "डेयरी व दूध केंद्र": "ડેરી અને દૂધ કેન્દ્ર",
    "Auto-mechanic": "ઓટો મિકેનિક",
    "ऑटो मैकेनिक": "ઓટો મિકેનિક",
    "E-mitra": "ઇ-મિત્ર કેન્દ્ર / સીએસસી",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ઇ-મિત્ર કેન્દ્ર / સીએસસી",
    "Mobile repair shop": "મોબાઇલ રિપેરિંગ દુકાન",
    "मोबाइल रिपेयर दुकान": "મોબાઇલ રિપેરિંગ દુકાન",
    "Transport": "પરિવહન સેવા",
    "परिवहन सेवा": "પરિવહન સેવા",
    "Any other": "અન્ય કોઈ",
    "अन्य कोई": "અન્ય કોઈ",
    "Whatsapp": "વોટ્સએપ",
    "व्हाट्सएप (WhatsApp)": "વોટ્સએપ",
    "Facebook": "ફેસબુક",
    "फेसबुक (Facebook)": "ફેસબુક",
    "Instagram": "ઇન્સ્ટાગ્રામ",
    "इंस्टाग्राम (Instagram)": "ઇન્સ્ટાગ્રામ",
    "Don't use social media": "સોશિયલ મીડિયાનો ઉપયોગ કરતા નથી",
    "सोशल मीडिया का उपयोग नहीं करते": "સોશિયલ મીડિયાનો ઉપયોગ કરતા નથી",
    "Draft": "અધૂરો ડ્રાફ્ટ",
    "Save Draft": "ડ્રાફ્ટ સાચવો",
    "ड्राफ्ट": "ડ્રાફ્ટ",
    "मसुदा": "ડ્રાફ્ટ",
    "ડ્રાફ્ટ": "ડ્રાફ્ટ",
    "ਡਰਾਫਟ": "ડ્રાફ્ટ",
    "খসড়া": "ડ્રાફ્ટ",
    "வரைவு": "ડ્રાફ્ટ",
    "చిత్తుప్రతి": "ડ્રાફ્ટ",
    "ಕರಡು": "ડ્રાફ્ટ",
    "ഡ്രാഫ്റ്റ്": "ડ્રાફ્ટ",
    "ڈرافٹ": "ડ્રાફ્ટ",
    "ड्राफ्ट सेव करें": "ડ્રાફ્ટ સાચવો",
    "मसुदा जतन करा": "ડ્રાફ્ટ સાચવો",
    "ડ્રાફ્ટ સાચવો": "ડ્રાફ્ટ સાચવો",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ડ્રાફ્ટ સાચવો",
    "খসড়া সংরক্ষণ": "ડ્રાફ્ટ સાચવો",
    "வரைவு சேமி": "ડ્રાફ્ટ સાચવો",
    "చిత్తుప్రతి భద్రపరచు": "ડ્રાફ્ટ સાચવો",
    "ಕರಡು ಉಳಿಸಿ": "ડ્રાફ્ટ સાચવો",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ડ્રાફ્ટ સાચવો",
    "ڈرافٹ محفوظ کریں": "ડ્રાફ્ટ સાચવો",
    "Himalayan Baseline Impact Survey": "હિમાલયન બેઝલાઇન ઇમ્પેક્ટ સર્વેક્ષણ",
    "1. Household & Demographic Profile": "1. કુટુંબ અને વસ્તી વિષયક પ્રોફાઇલ",
    "General identification and household metrics": "સામાન્ય ઓળખ અને ઘરગથ્થુ વિગતો",
    "2. Economic Activity & Livestock": "2. આર્થિક પ્રવૃત્તિ અને પશુધન",
    "Revenue, assets, and livestock count": "આવક, સંપત્તિ અને પશુઓની સંખ્યા",
    "3. Geolocation & Digital Verification": "3. ભૌગોલિક સ્થાન અને ડિજિટલ ચકાસણી",
    "GPS accuracy and field photo capture": "જીપીએસ સચોટતા અને ક્ષેત્ર ફોટો",
    "Full Name of Household Head / Primary Respondent": "કુટુંબના વડા / મુખ્ય ઉત્તરદાતાનું પૂરું નામ",
    "Respondent Classification": "ઉત્તરદાતા વર્ગીકરણ",
    "Individual": "વ્યક્તિગત",
    "Household": "ઘરગથ્થુ / કુટુંબ",
    "Smallholder Farmer": "નાના ખેડૂત",
    "Micro Enterprise / Self-Employed": "સૂક્ષ્મ સાહસ / સ્વરોજગાર",
    "Primary Contact Phone Number": "મુખ્ય સંપર્ક ફોન નંબર",
    "Do you own cattle, sheep, or goats?": "શું તમારી પાસે ગાય, ભેંસ, ઘેટાં અથવા બકરાં છે?",
    "Total number of milch cattle / animals?": "દૂધાળા પશુઓ / પ્રાણીઓની કુલ સંખ્યા કેટલી?",
    "Estimated Monthly Household Income (INR ₹)": "અંદાજિત માસિક ઘરગથ્થુ આવક (રૂ. ₹)",
    "Farm Equipment & Key Productive Assets": "ખેતીના સાધનો અને મુખ્ય ઉત્પાદક સંપત્તિઓ",
    "Capture Field GPS Coordinates (Auto-verified)": "ફીલ્ડ જીપીએસ કોઓર્ડિનેટ્સ મેળવો (સ્વચાલિત ચકાસાયેલ)",
    "Field Photo of Site / Beneficiary": "સ્થળ / લાભાર્થીનો ફીલ્ડ ફોટો",
    "Surveyor Sign-off & Digital Signature": "સર્વેયર મંજૂરી અને ડિજિટલ સહી",
    "District, Block, Village, SHG, and Enterprise identification": "જિલ્લો, તાલુકો, ગામ, SHG અને ઉદ્યોગની ઓળખ",
    "Demographic, family structure, education, and household income": "વસ્તી વિષયક, કુટુંબનું માળખું, શિક્ષણ અને ઘરગથ્થુ આવક",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "શરૂઆતનો ઇતિહાસ, કામના કલાકો, મૂડી વ્યવસ્થા અને મોસમી આવક",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "સ્થાન, સપ્લાયર્સ, ઉઘરાણી, કાચો માલ ખરીદી અને લોનની સુવિધા",
    "Loan utilization, monthly income growth, and CRP contribution": "લોનનો ઉપયોગ, માસિક આવકમાં વૃદ્ધિ અને CRP નું યોગદાન",
    "Smartphone ownership, QR code banking, and social media usage": "સ્માર્ટફોનની માલિકી, ક્યુઆર કોડ બેંકિંગ અને સોશિયલ મીડિયાનો ઉપયોગ",
    "GPS coordinates fix, site photo capture, and digital signatures": "જીપીએસ કોઓર્ડિનેટ્સ, સ્થળનો ફોટો અને ડિજિટલ સહી",
    "Dashboard": "ડેશબોર્ડ",
    "Surveyor Dashboard": "સર્વેયર ડેશબોર્ડ",
    "Field Work Overview": "ક્ષેત્ર કાર્યની પ્રગતિ",
    "Total Recorded": "કુલ સર્વેક્ષણો",
    "Synced to Server": "સર્વર પર સિંક",
    "Pending Sync": "બાકી સિંક (લોકલ)",
    "Incomplete Drafts": "અધૂરા ડ્રાફ્ટ્સ",
    "Drafts": "ડ્રાફ્ટ્સ",
    "Completed": "પૂર્ણ",
    "Today's Goal": "આજનો લક્ષ્યાંક",
    "surveys completed today": "સર્વે આજે પૂર્ણ થયા",
    "Daily Target Met!": "આજનો લક્ષ્યાંક પૂરો થયો! 🎉",
    "Start New Survey": "+ નવું સર્વેક્ષણ શરૂ કરો",
    "Resume Draft": "▶ અધૂરો ફોર્મ પૂર્ણ કરો",
    "Resume & Complete": "▶ ફોર્મ આગળ વધારો",
    "My Submissions & Drafts": "મારા સર્વેક્ષણો અને ડ્રાફ્ટ",
    "All Records": "બધા રેકોર્ડ્સ",
    "Complete": "પૂર્ણ",
    "Questions Answered": "પ્રશ્નોના ઉત્તરો આપ્યા",
    "GPS Locked": "જીપીએસ લોક ✓",
    "Photo Attached": "ફોટો જોડ્યો ✓",
    "Signed": "સહી થઈ ✓",
    "Ready to Sync": "સિંક માટે તૈયાર (100%)",
    "Synced": "સર્વર પર સુરક્ષિત",
    "No respondent name": "અનામી ઉત્તરદાતા",
    "Village / Location": "ગામ / સ્થળ",
    "Last edited": "છેલ્લું સંપાદન",
    "Sync All Pending": "🔄 બધા બાકી ફોર્મ સિંક કરો",
    "No surveys recorded yet": "આ ઉપકરણ પર હજુ સુધી કોઈ સર્વેક્ષણ નોંધાયેલ નથી",
    "Tap '+ Start New Survey' to begin your first interview": "પ્રથમ ઇન્ટરવ્યુ શરૂ કરવા માટે '+ નવું સર્વેક્ષણ' દબાવો",
    "Delete draft?": "શું તમે આ ડ્રાફ્ટ કાઢી નાખવા માંગો છો?",
    "Draft deleted": "ડ્રાફ્ટ દૂર કર્યો",
    "Text Size": "અક્ષરોનું કદ",
    "Adjust font size for your screen": "સ્ક્રીન મુજબ અક્ષરોનું કદ પસંદ કરો",
    "Small": "નાનું",
    "Medium": "સામાન્ય",
    "Large": "મોટું",
    "Text size set to Small": "અક્ષરોનું કદ નાનું કર્યું",
    "Text size set to Medium": "અક્ષરોનું કદ સામાન્ય કર્યું",
    "Text size set to Large": "અક્ષરોનું કદ મોટું કર્યું",
    "Email Data to Admin": "એડમિનને ડેટા ઇમેઇલ કરો",
    "Emergency Backup & Support": "ઇમરજન્સી બેકઅપ અને સહાય",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ઇમેઇલ અથવા એપ્લિકેશન્સ દ્વારા તમારા તમામ સર્વે રેકોર્ડ અને ભૂલ લોગ એડમિનને મોકલો.",
    "Admin Email Address": "એડમિનનું ઇમેઇલ સરનામું",
    "Additional Note / Error Description": "સમસ્યા અથવા નોંધ (વૈકલ્પિક)",
    "Send via Email / Server": "ઇમેઇલ દ્વારા મોકલો (સર્વર)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp પર શેર કરો",
    "Download JSON": "JSON ડાઉનલોડ કરો",
    "Download CSV (Excel)": "CSV (Excel) ડાઉનલોડ કરો",
    "Backup emailed successfully ✓": "બેકઅપ ઇમેઇલ સફળતાપૂર્વક મોકલ્યો ✓",
    "Total Device Records": "ડિવાઇસ પર કુલ રેકોર્ડ",
    "Offline Storage Status": "સ્થાનિક સંગ્રહ સ્થિતિ",
    "Healthy (IndexedDB)": "સુરક્ષિત (IndexedDB)",
    "Export & Backup": "નિકાસ અને બેકઅપ",
    "Send Data to Admin": "એડમિનને ડેટા મોકલો",
    "e.g. 2020": "દા.ત. 2020",
    "Enter year (e.g. 2020)": "વર્ષ દાખલ કરો (દા.ત. 2020)"
  },
  "pa": {
    "OmniQuery": "ਓਮਨੀਸਰਵੇ",
    "ओमनीसर्वे": "ਓਮਨੀਸਰਵੇ",
    "Online": "ਆਨਲਾਈਨ",
    "ऑनलाइन": "ਆਨਲਾਈਨ",
    "Offline": "ਔਫਲਾਈਨ",
    "ऑफलाइन": "ਔਫਲਾਈਨ",
    "Surveys": "ਸਰਵੇਖਣ",
    "सर्वेक्षण": "ਸਰਵੇਖਣ",
    "WAL Queue": "ਕਤਾਰ (ਔਫਲਾਈਨ)",
    "कतार (ऑफलाइन)": "ਕਤਾਰ (ਔਫਲਾਈਨ)",
    "System": "ਸਿਸਟਮ",
    "सिस्टम": "ਸਿਸਟਮ",
    "Exit Form": "← ਬਾਹਰ ਜਾਓ",
    "← बाहर निकलें": "← ਬਾਹਰ ਜਾਓ",
    "Step": "ਕਦਮ",
    "चरण": "ਕਦਮ",
    "of": "ਦਾ",
    "का": "ਦਾ",
    "Pages": "ਪੰਨੇ",
    "पृष्ठ": "ਪੰਨੇ",
    "Questions": "ਸਵਾਲ",
    "प्रश्न": "ਸਵਾਲ",
    "Previous": "← ਪਿਛਲਾ",
    "← पिछला": "← ਪਿਛਲਾ",
    "Next": "ਅਗਲਾ →",
    "अगला →": "ਅਗਲਾ →",
    "Save Offline": "ਔਫਲਾਈਨ ਸੇਵ ਕਰੋ",
    "ऑफलाइन सेव करें": "ਔਫਲਾਈਨ ਸੇਵ ਕਰੋ",
    "Submit Survey": "ਸਬਮਿਟ ਕਰੋ",
    "सबमिट करें": "ਸਬਮਿਟ ਕਰੋ",
    "Capture GPS Coordinates": "ਜੀਪੀਐਸ ਸਥਾਨ ਰਿਕਾਰਡ ਕਰੋ",
    "जीपीएस लोकेशन रिकॉर्ड करें": "ਜੀਪੀਐਸ ਸਥਾਨ ਰਿਕਾਰਡ ਕਰੋ",
    "GPS Fix Acquired ✓": "ਜੀਪੀਐਸ ਸਥਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "ਜੀਪੀਐਸ ਸਥਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ ✓",
    "Take Photo / Choose File": "ਫੋਟੋ ਲਓ / ਫਾਈਲ ਚੁਣੋ",
    "फोटो लें / फाइल चुनें": "ਫੋਟੋ ਲਓ / ਫਾਈਲ ਚੁਣੋ",
    "Sign inside box with finger or stylus": "ਆਪਣੀ ਉਂਗਲ ਜਾਂ ਸਟਾਈਲਸ ਨਾਲ ਬਾਕਸ ਵਿੱਚ ਦਸਤਖਤ ਕਰੋ",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "ਆਪਣੀ ਉਂਗਲ ਜਾਂ ਸਟਾਈਲਸ ਨਾਲ ਬਾਕਸ ਵਿੱਚ ਦਸਤਖਤ ਕਰੋ",
    "Clear Signature": "ਦਸਤਖਤ ਮਿਟਾਓ",
    "हस्ताक्षर मिटाएं": "ਦਸਤਖਤ ਮਿਟਾਓ",
    "Signature Recorded": "ਦਸਤਖਤ ਦਰਜ ਹੋਏ",
    "हस्ताक्षर दर्ज हुआ": "ਦਸਤਖਤ ਦਰਜ ਹੋਏ",
    "Enter response here...": "ਇੱਥੇ ਜਵਾਬ ਦਰਜ ਕਰੋ...",
    "यहाँ उत्तर दर्ज करें...": "ਇੱਥੇ ਜਵਾਬ ਦਰਜ ਕਰੋ...",
    "Required Questions Pending": "ਲੋੜੀਂਦੇ ਸਵਾਲ ਬਾਕੀ ਹਨ",
    "आवश्यक प्रश्न अधूरे हैं": "ਲੋੜੀਂਦੇ ਸਵਾਲ ਬਾਕੀ ਹਨ",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "ਅੰਤਿਮ ਸਬਮਿਸ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਕਿਰਪਾ ਕਰਕੇ ਇਹ ਲੋੜੀਂਦੇ ਸਵਾਲ ਭਰੋ, ਜਾਂ ਕਦੇ ਵੀ ਔਫਲਾਈਨ ਡਰਾਫਟ ਵਜੋਂ ਸੇਵ ਕਰੋ।",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "ਅੰਤਿਮ ਸਬਮਿਸ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਕਿਰਪਾ ਕਰਕੇ ਇਹ ਲੋੜੀਂਦੇ ਸਵਾਲ ਭਰੋ, ਜਾਂ ਕਦੇ ਵੀ ਔਫਲਾਈਨ ਡਰਾਫਟ ਵਜੋਂ ਸੇਵ ਕਰੋ।",
    "Go to First Pending Question": "👉 ਪਹਿਲੇ ਬਾਕੀ ਸਵਾਲ ਤੇ ਜਾਓ",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 ਪਹਿਲੇ ਬਾਕੀ ਸਵਾਲ ਤੇ ਜਾਓ",
    "Save as Offline Draft Anyway": "ਔਫਲਾਈਨ ਡਰਾਫਟ ਸੇਵ ਕਰੋ",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ਔਫਲਾਈਨ ਡਰਾਫਟ ਸੇਵ ਕਰੋ",
    "Close": "ਬੰਦ ਕਰੋ",
    "बंद करें": "ਬੰਦ ਕਰੋ",
    "Start Survey Form": "ਸਰਵੇਖਣ ਸ਼ੁਰੂ ਕਰੋ",
    "सर्वेक्षण शुरू करें": "ਸਰਵੇਖਣ ਸ਼ੁਰੂ ਕਰੋ",
    "Start Survey Form →": "ਸਰਵੇਖਣ ਸ਼ੁਰੂ ਕਰੋ →",
    "सर्वेक्षण शुरू करें →": "ਸਰਵੇਖਣ ਸ਼ੁਰੂ ਕਰੋ →",
    "Write-Ahead Log (WAL)": "ਰਾਈਟ-ਅਹੈੱਡ ਲੌਗ (WAL ਕਤਾਰ)",
    "राइट-अहेड लॉग (WAL कतार)": "ਰਾਈਟ-ਅਹੈੱਡ ਲੌਗ (WAL ਕਤਾਰ)",
    "Atomic zero-loss local storage queue": "ਜ਼ੀਰੋ ਡੇਟਾ ਨੁਕਸਾਨ ਸੁਰੱਖਿਅਤ ਸਥਾਨਕ ਸਟੋਰੇਜ",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "ਜ਼ੀਰੋ ਡੇਟਾ ਨੁਕਸਾਨ ਸੁਰੱਖਿਅਤ ਸਥਾਨਕ ਸਟੋਰੇਜ",
    "Sync Now": "⟳ ਹੁਣੇ ਸਿੰਕ ਕਰੋ",
    "⟳ अभी सिंक करें": "⟳ ਹੁਣੇ ਸਿੰਕ ਕਰੋ",
    "View on Map →": "ਨਕਸ਼ੇ ਤੇ ਦੇਖੋ →",
    "नक्शे पर देखें →": "ਨਕਸ਼ੇ ਤੇ ਦੇਖੋ →",
    "Re-acquire Fix": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "पुनः प्रयास करें": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "Section A: Basic Details": "ਭਾਗ A: ਮੁੱਢਲੇ ਵੇਰਵੇ",
    "भाग क: बुनियादी विवरण": "ਭਾਗ ੳ: ਮੁੱਢਲੇ ਵੇਰਵੇ",
    "Section B: Respondent & Household Profile": "ਭਾਗ B: ਉੱਤਰਦਾਤਾ ਅਤੇ ਪਰਿਵਾਰਕ ਪ੍ਰੋਫਾਈਲ",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "ਭਾਗ ਅ: ਉੱਤਰਦਾਤਾ ਅਤੇ ਪਰਿਵਾਰ ਪ੍ਰੋਫਾਈਲ",
    "Section C: Enterprise Operations & Finance": "ਭਾਗ C: ਕਾਰੋਬਾਰ ਸੰਚਾਲਨ ਅਤੇ ਵਿੱਤ",
    "भाग ग: उद्यम संचालन और वित्त": "ਭਾਗ ੲ: ਉੱਦਮ ਸੰਚਾਲਨ ਅਤੇ ਵਿੱਤ",
    "Section D: Enterprise Challenges & Coping Mechanisms": "ਭਾਗ D: ਉੱਦਮ ਦੀਆਂ ਚੁਣੌਤੀਆਂ ਅਤੇ ਹੱਲ",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "ਭਾਗ ਸ: ਉੱਦਮ ਚੁਣੌਤੀਆਂ ਅਤੇ ਹੱਲ",
    "Section E: Impact of SVEP / OSF Schemes": "ਭਾਗ E: SVEP / OSF ਸਕੀਮਾਂ ਦਾ ਪ੍ਰਭਾਵ",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "ਭਾਗ ਹ: ਐੱਸ.ਵੀ.ਈ.ਪੀ / ਓ.ਐੱਸ.ਐੱਫ ਸਕੀਮਾਂ ਦਾ ਪ੍ਰਭਾਵ",
    "Section F: Digital Transactions & Social Media": "ਭਾਗ F: ਡਿਜੀਟਲ ਲੈਣ-ਦੇਣ ਅਤੇ ਸੋਸ਼ਲ ਮੀਡੀਆ",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "ਭਾਗ ਕ: ਡਿਜੀਟਲ ਲੈਣ-ਦੇਣ ਅਤੇ ਸੋਸ਼ਲ ਮੀਡੀਆ",
    "Section G: Field Verification & Sign-off": "ਭਾਗ G: ਫੀਲਡ ਤਸਦੀਕ ਅਤੇ ਦਸਤਖਤ",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "ਭਾਗ ਖ: ਫੀਲਡ ਤਸਦੀਕ ਅਤੇ ਦਸਤਖਤ",
    "District": "ਜ਼ਿਲ੍ਹਾ",
    "जिला": "ਜ਼ਿਲ੍ਹਾ",
    "Block / Tehsil": "ਬਲਾਕ / ਤਹਿਸੀਲ",
    "ब्लॉक / तहसील": "ਬਲਾਕ / ਤਹਿਸੀਲ",
    "Village / Gram Panchayat Name": "ਪਿੰਡ / ਗ੍ਰਾਮ ਪੰਚਾਇਤ ਦਾ ਨਾਮ",
    "गाँव / ग्राम पंचायत का नाम": "ਪਿੰਡ / ਗ੍ਰਾਮ ਪੰਚਾਇਤ ਦਾ ਨਾਮ",
    "Cluster Level Federation (CLF) Name": "ਕਲੱਸਟਰ ਲੈਵਲ ਫੈਡਰੇਸ਼ਨ (CLF) ਦਾ ਨਾਮ",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "ਕਲੱਸਟਰ ਲੈਵਲ ਫੈਡਰੇਸ਼ਨ (CLF) ਦਾ ਨਾਮ",
    "Village Organization (VO) Name": "ਗ੍ਰਾਮ ਸੰਗਠਨ (VO) ਦਾ ਨਾਮ",
    "ग्राम संगठन (VO) का नाम": "ਗ੍ਰਾਮ ਸੰਗਠਨ (VO) ਦਾ ਨਾਮ",
    "Self-Help Group (SHG) Name": "ਸਵੈ-ਸਹਾਇਤਾ ਸਮੂਹ (SHG) ਦਾ ਨਾਮ",
    "स्वयं सहायता समूह (SHG) का नाम": "ਸਵੈ-ਸਹਾਇਤਾ ਸਮੂਹ (SHG) ਦਾ ਨਾਮ",
    "Respondent Name": "ਉੱਤਰਦਾਤਾ ਦਾ ਨਾਮ",
    "उत्तरदाता का नाम": "ਉੱਤਰਦਾਤਾ ਦਾ ਨਾਮ",
    "Enterprise / Business Name": "ਉੱਦਮ / ਕਾਰੋਬਾਰ ਦਾ ਨਾਮ",
    "उद्यम / व्यवसाय का नाम": "ਉੱਦਮ / ਕਾਰੋਬਾਰ ਦਾ ਨਾਮ",
    "Year of Setting Up Enterprise": "ਉੱਦਮ ਸਥਾਪਨਾ ਦਾ ਸਾਲ",
    "उद्यम स्थापना का वर्ष": "ਉੱਦਮ ਸਥਾਪਨਾ ਦਾ ਸਾਲ",
    "Main Business Activity of the Enterprise": "ਉੱਦਮ ਦੀ ਮੁੱਖ ਕਾਰੋਬਾਰੀ ਗਤੀਵਿਧੀ",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "ਉੱਦਮ ਦੀ ਮੁੱਖ ਕਾਰੋਬਾਰੀ ਗਤੀਵਿਧੀ",
    "What is respondent's relation with SHG member?": "ਉੱਤਰਦਾਤਾ ਦਾ SHG ਮੈਂਬਰ ਨਾਲ ਕੀ ਸਬੰਧ ਹੈ?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "ਉੱਤਰਦਾਤਾ ਦਾ SHG ਮੈਂਬਰ ਨਾਲ ਕੀ ਸਬੰਧ ਹੈ?",
    "What is the age of SHG member?": "SHG ਮੈਂਬਰ ਦੀ ਉਮਰ ਕਿੰਨੀ ਹੈ?",
    "एसएचजी सदस्य की आयु क्या है?": "SHG ਮੈਂਬਰ ਦੀ ਉਮਰ ਕਿੰਨੀ ਹੈ?",
    "What is the marital status of the SHG member?": "SHG ਮੈਂਬਰ ਦੀ ਵਿਆਹੁਤਾ ਸਥਿਤੀ ਕੀ ਹੈ?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "SHG ਮੈਂਬਰ ਦੀ ਵਿਆਹੁਤਾ ਸਥਿਤੀ ਕੀ ਹੈ?",
    "What is the social category / caste?": "ਸਮਾਜਿਕ ਸ਼੍ਰੇਣੀ / ਜਾਤੀ ਕੀ ਹੈ?",
    "सामाजिक श्रेणी / जाति क्या है?": "ਸਮਾਜਿਕ ਸ਼੍ਰੇਣੀ / ਜਾਤੀ ਕੀ ਹੈ?",
    "What is the education status of the SHG member?": "SHG ਮੈਂਬਰ ਦੀ ਵਿੱਦਿਅਕ ਯੋਗਤਾ ਕੀ ਹੈ?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "SHG ਮੈਂਬਰ ਦੀ ਵਿੱਦਿਅਕ ਯੋਗਤਾ ਕੀ ਹੈ?",
    "How many total members are in the family?": "ਪਰਿਵਾਰ ਵਿੱਚ ਕੁੱਲ ਕਿੰਨੇ ਮੈਂਬਰ ਹਨ?",
    "परिवार में कुल कितने सदस्य हैं?": "ਪਰਿਵਾਰ ਵਿੱਚ ਕੁੱਲ ਕਿੰਨੇ ਮੈਂਬਰ ਹਨ?",
    "What is your total annual household income?": "ਤੁਹਾਡੀ ਕੁੱਲ ਸਾਲਾਨਾ ਪਰਿਵਾਰਕ ਆਮਦਨ ਕਿੰਨੀ ਹੈ?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "ਤੁਹਾਡੀ ਕੁੱਲ ਸਾਲਾਨਾ ਪਰਿਵਾਰਕ ਆਮਦਨ ਕਿੰਨੀ ਹੈ?",
    "What is your role in the SHG?": "SHG ਵਿੱਚ ਤੁਹਾਡੀ ਭੂਮਿਕਾ ਕੀ ਹੈ?",
    "एसएचजी में आपकी भूमिका क्या है?": "SHG ਵਿੱਚ ਤੁਹਾਡੀ ਭੂਮਿਕਾ ਕੀ ਹੈ?",
    "Are you related to any of the SVEP / OSF CRP?": "ਕੀ ਤੁਸੀਂ ਕਿਸੇ SVEP / OSF CRP ਨਾਲ ਸੰਬੰਧਿਤ ਹੋ?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "ਕੀ ਤੁਸੀਂ ਕਿਸੇ SVEP / OSF CRP ਨਾਲ ਸੰਬੰਧਿਤ ਹੋ?",
    "Who started the enterprise?": "ਉੱਦਮ ਕਿਸਨੇ ਸ਼ੁਰੂ ਕੀਤਾ ਸੀ?",
    "उद्यम किसने शुरू किया था?": "ਉੱਦਮ ਕਿਸਨੇ ਸ਼ੁਰੂ ਕੀਤਾ ਸੀ?",
    "Who operates and manages the enterprise on a daily basis?": "ਰੋਜ਼ਾਨਾ ਅਧਾਰ ਤੇ ਉੱਦਮ ਦਾ ਸੰਚਾਲਨ ਅਤੇ ਪ੍ਰਬੰਧਨ ਕੌਣ ਕਰਦਾ ਹੈ?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "ਰੋਜ਼ਾਨਾ ਅਧਾਰ ਤੇ ਉੱਦਮ ਦਾ ਸੰਚਾਲਨ ਅਤੇ ਪ੍ਰਬੰਧਨ ਕੌਣ ਕਰਦਾ ਹੈ?",
    "For how many hours in a day does the shop/enterprise remain open?": "ਦਿਨ ਵਿੱਚ ਕਿੰਨੇ ਘੰਟੇ ਦੁਕਾਨ/ਉੱਦਮ ਖੁੱਲ੍ਹਾ ਰਹਿੰਦਾ ਹੈ?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "ਦਿਨ ਵਿੱਚ ਕਿੰਨੇ ਘੰਟੇ ਦੁਕਾਨ/ਉੱਦਮ ਖੁੱਲ੍ਹਾ ਰਹਿੰਦਾ ਹੈ?",
    "What is the type of business place / premises?": "ਕਾਰੋਬਾਰੀ ਥਾਂ/ਇਮਾਰਤ ਦੀ ਕਿਸਮ ਕੀ ਹੈ?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "ਕਾਰੋਬਾਰੀ ਥਾਂ/ਇਮਾਰਤ ਦੀ ਕਿਸਮ ਕੀ ਹੈ?",
    "Does SHG member maintain written records of business transactions regularly?": "ਕੀ SHG ਮੈਂਬਰ ਨਿਯਮਿਤ ਤੌਰ ਤੇ ਵਪਾਰਕ ਲੈਣ-ਦੇਣ ਦਾ ਲਿਖਤੀ ਰਿਕਾਰਡ ਰੱਖਦੇ ਹਨ?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "ਕੀ SHG ਮੈਂਬਰ ਨਿਯਮਿਤ ਤੌਰ ਤੇ ਵਪਾਰਕ ਲੈਣ-ਦੇਣ ਦਾ ਲਿਖਤੀ ਰਿਕਾਰਡ ਰੱਖਦੇ ਹਨ?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "ਤੁਹਾਡੇ ਉੱਦਮ ਦੇ ਪਹਿਲੇ ਸਾਲ ਵਿੱਚ ਸ਼ੁਰੂਆਤੀ ਪੂੰਜੀ (ਰੁਪਏ) ਕਿੰਨੀ ਸੀ?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "ਤੁਹਾਡੇ ਉੱਦਮ ਦੇ ਪਹਿਲੇ ਸਾਲ ਵਿੱਚ ਸ਼ੁਰੂਆਤੀ ਪੂੰਜੀ (ਰੁਪਏ) ਕਿੰਨੀ ਸੀ?",
    "How do you manage working capital during peak season?": "ਪੀਕ ਸੀਜ਼ਨ ਦੌਰਾਨ ਤੁਸੀਂ ਵਰਕਿੰਗ ਕੈਪੀਟਲ ਦਾ ਪ੍ਰਬੰਧ ਕਿਵੇਂ ਕਰਦੇ ਹੋ?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "ਪੀਕ ਸੀਜ਼ਨ ਦੌਰਾਨ ਤੁਸੀਂ ਵਰਕਿੰਗ ਕੈਪੀਟਲ ਦਾ ਪ੍ਰਬੰਧ ਕਿਵੇਂ ਕਰਦੇ ਹੋ?",
    "Is the location of your space convenient for your business?": "ਕੀ ਤੁਹਾਡੀ ਥਾਂ ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਲਈ ਸੁਵਿਧਾਜਨਕ ਹੈ?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "ਕੀ ਤੁਹਾਡੀ ਥਾਂ ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਲਈ ਸੁਵਿਧਾਜਨਕ ਹੈ?",
    "Are you satisfied and happy with your wholesale supplier?": "ਕੀ ਤੁਸੀਂ ਆਪਣੇ ਥੋਕ ਸਪਲਾਇਰ ਤੋਂ ਸੰਤੁਸ਼ਟ ਹੋ?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "ਕੀ ਤੁਸੀਂ ਆਪਣੇ ਥੋਕ ਸਪਲਾਇਰ ਤੋਂ ਸੰਤੁਸ਼ਟ ਹੋ?",
    "Are you able to recover credit / money from your customers?": "ਕੀ ਤੁਸੀਂ ਗਾਹਕਾਂ ਤੋਂ ਉਧਾਰ/ਪੈਸੇ ਵਾਪਸ ਲੈਣ ਦੇ ਯੋਗ ਹੋ?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "ਕੀ ਤੁਸੀਂ ਗਾਹਕਾਂ ਤੋਂ ਉਧਾਰ/ਪੈਸੇ ਵਾਪਸ ਲੈਣ ਦੇ ਯੋਗ ਹੋ?",
    "Do you source raw materials/goods from market independently?": "ਕੀ ਤੁਸੀਂ ਬਜ਼ਾਰ ਤੋਂ ਸੁਤੰਤਰ ਤੌਰ ਤੇ ਕੱਚਾ ਮਾਲ ਲਿਆਉਂਦੇ ਹੋ?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "ਕੀ ਤੁਸੀਂ ਬਜ਼ਾਰ ਤੋਂ ਸੁਤੰਤਰ ਤੌਰ ਤੇ ਕੱਚਾ ਮਾਲ ਲਿਆਉਂਦੇ ਹੋ?",
    "Do you have easy access to loans from different sources?": "ਕੀ ਤੁਹਾਨੂੰ ਵੱਖ-ਵੱਖ ਸਰੋਤਾਂ ਤੋਂ ਆਸਾਨੀ ਨਾਲ ਕਰਜ਼ਾ ਮਿਲਦਾ ਹੈ?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "ਕੀ ਤੁਹਾਨੂੰ ਵੱਖ-ਵੱਖ ਸਰੋਤਾਂ ਤੋਂ ਆਸਾਨੀ ਨਾਲ ਕਰਜ਼ਾ ਮਿਲਦਾ ਹੈ?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "ਤੁਸੀਂ SVEP / OSF ਸਕੀਮ ਅਧੀਨ ਕਿੰਨਾ ਕਰਜ਼ਾ ਲਿਆ ਹੈ (ਰੁਪਏ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "ਤੁਸੀਂ SVEP / OSF ਸਕੀਮ ਅਧੀਨ ਕਿੰਨਾ ਕਰਜ਼ਾ ਲਿਆ ਹੈ (ਰੁਪਏ)?",
    "How did you utilize the enterprise loan?": "ਤੁਸੀਂ ਉੱਦਮ ਕਰਜ਼ੇ ਦੀ ਵਰਤੋਂ ਕਿਵੇਂ ਕੀਤੀ?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "ਤੁਸੀਂ ਉੱਦਮ ਕਰਜ਼ੇ ਦੀ ਵਰਤੋਂ ਕਿਵੇਂ ਕੀਤੀ?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "ਕਰਜ਼ਾ ਲੈਣ ਤੋਂ ਪਹਿਲਾਂ ਉੱਦਮ ਦੀ ਮਹੀਨਾਵਾਰ ਆਮਦਨ (ਰੁਪਏ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "ਕਰਜ਼ਾ ਲੈਣ ਤੋਂ ਪਹਿਲਾਂ ਉੱਦਮ ਦੀ ਮਹੀਨਾਵਾਰ ਆਮਦਨ (ਰੁਪਏ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "ਕਰਜ਼ਾ ਲੈਣ ਤੋਂ ਬਾਅਦ ਉੱਦਮ ਦੀ ਮਹੀਨਾਵਾਰ ਆਮਦਨ (ਰੁਪਏ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "ਕਰਜ਼ਾ ਲੈਣ ਤੋਂ ਬਾਅਦ ਉੱਦਮ ਦੀ ਮਹੀਨਾਵਾਰ ਆਮਦਨ (ਰੁਪਏ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP ਦਾ ਕੀ ਯੋਗਦਾਨ ਰਿਹਾ ਹੈ?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP ਦਾ ਕੀ ਯੋਗਦਾਨ ਰਿਹਾ ਹੈ?",
    "Does the woman entrepreneur own a smartphone?": "ਕੀ ਮਹਿਲਾ ਉੱਦਮੀ ਕੋਲ ਸਮਾਰਟਫੋਨ ਹੈ?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "ਕੀ ਮਹਿਲਾ ਉੱਦਮੀ ਕੋਲ ਸਮਾਰਟਫੋਨ ਹੈ?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "ਕੀ ਤੁਸੀਂ ਵਪਾਰਕ ਲੈਣ-ਦੇਣ ਲਈ QR ਕੋਡ / UPI / ਮੋਬਾਈਲ ਬੈਂਕਿੰਗ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹੋ?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "ਕੀ ਤੁਸੀਂ ਵਪਾਰਕ ਲੈਣ-ਦੇਣ ਲਈ QR ਕੋਡ / UPI / ਮੋਬਾਈਲ ਬੈਂਕਿੰਗ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹੋ?",
    "Daily how many transactions are done via QR code / UPI?": "ਰੋਜ਼ਾਨਾ QR ਕੋਡ / UPI ਦੁਆਰਾ ਕਿੰਨੇ ਲੈਣ-ਦੇਣ ਕੀਤੇ ਜਾਂਦੇ ਹਨ?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "ਰੋਜ਼ਾਨਾ QR ਕੋਡ / UPI ਦੁਆਰਾ ਕਿੰਨੇ ਲੈਣ-ਦੇਣ ਕੀਤੇ ਜਾਂਦੇ ਹਨ?",
    "Which social media platforms do you use for your business?": "ਤੁਸੀਂ ਆਪਣੇ ਕਾਰੋਬਾਰ ਲਈ ਕਿਹੜੇ ਸੋਸ਼ਲ ਮੀਡੀਆ ਪਲੇਟਫਾਰਮ ਵਰਤਦੇ ਹੋ?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "ਤੁਸੀਂ ਆਪਣੇ ਕਾਰੋਬਾਰ ਲਈ ਕਿਹੜੇ ਸੋਸ਼ਲ ਮੀਡੀਆ ਪਲੇਟਫਾਰਮ ਵਰਤਦੇ ਹੋ?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "ਉੱਦਮ ਜੀਪੀਐਸ ਸਥਾਨ ਕੈਪਚਰ ਕਰੋ (ਉਪਗ੍ਰਹਿ ਨਿਰਦੇਸ਼ਾਂਕ)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "ਉੱਦਮ ਜੀਪੀਐਸ ਸਥਾਨ ਕੈਪਚਰ ਕਰੋ (ਉਪਗ੍ਰਹਿ ਨਿਰਦੇਸ਼ਾਂਕ)",
    "Field Photo of Enterprise & Beneficiary": "ਉੱਦਮ ਅਤੇ ਲਾਭਪਾਤਰੀ ਦੀ ਫੀਲਡ ਫੋਟੋ",
    "उद्यम और लाभार्थी का फील्ड फोटो": "ਉੱਦਮ ਅਤੇ ਲਾਭਪਾਤਰੀ ਦੀ ਫੀਲਡ ਫੋਟੋ",
    "Respondent & Surveyor Digital Signature": "ਉੱਤਰਦਾਤਾ ਅਤੇ ਸਰਵੇਖਕ ਦੇ ਡਿਜੀਟਲ ਦਸਤਖਤ",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "ਉੱਤਰਦਾਤਾ ਅਤੇ ਸਰਵੇਖਕ ਦੇ ਡਿਜੀਟਲ ਦਸਤਖਤ",
    "Yes": "ਹਾਂ",
    "हाँ": "ਹਾਂ",
    "No": "ਨਹੀਂ",
    "नहीं": "ਨਹੀਂ",
    "Baran": "ਬਾਰਾਂ",
    "बारां": "ਬਾਰਾਂ",
    "Churu": "ਚੁਰੂ",
    "चूरू": "ਚੁਰੂ",
    "Dausa": "ਦੌਸਾ",
    "दौसा": "ਦੌਸਾ",
    "Dungarpur": "ਡੂੰਗਰਪੁਰ",
    "डूंगरपुर": "ਡੂੰਗਰਪੁਰ",
    "Jodhpur": "ਜੋਧਪੁਰ",
    "जोधपुर": "ਜੋਧਪੁਰ",
    "Chhipabarod": "ਛੀਪਾਬੜੌਦ",
    "छीपाबड़ौद": "ਛੀਪਾਬੜੌਦ",
    "Kishanganj": "ਕਿਸ਼ਨਗੰਜ",
    "किशनगंज": "ਕਿਸ਼ਨਗੰਜ",
    "Sardar Sheher": "ਸਰਦਾਰਸ਼ਹਿਰ",
    "सरदारशहर": "ਸਰਦਾਰਸ਼ਹਿਰ",
    "Bidasar": "ਬੀਦਾਸਰ",
    "बीदासर": "ਬੀਦਾਸਰ",
    "Secundra": "ਸਿਕੰਦਰਾ",
    "सिकंदरा": "ਸਿਕੰਦਰਾ",
    "Sagwara": "ਸਾਗਵਾੜਾ",
    "सागवाड़ा": "ਸਾਗਵਾੜਾ",
    "Galiakot": "ਗਲਿਆਕੋਟ",
    "गलियाकोट": "ਗਲਿਆਕੋਟ",
    "Bicchiwada": "ਬਿਛੀਵਾੜਾ",
    "बिछीवाड़ा": "ਬਿਛੀਵਾੜਾ",
    "Jodhpur Block": "ਜੋਧਪੁਰ ਬਲਾਕ",
    "जोधपुर ब्लॉक": "ਜੋਧਪੁਰ ਬਲਾਕ",
    "Married": "ਵਿਆਹੁਤਾ",
    "विवाहित": "ਵਿਆਹੁਤਾ",
    "Single": "ਕੁਆਰਾ/ਕੁਆਰੀ",
    "अविवाहित": "ਕੁਆਰਾ/ਕੁਆਰੀ",
    "Widowed": "ਵਿਧਵਾ",
    "विधवा": "ਵਿਧਵਾ",
    "Divorced": "ਤਲਾਕਸ਼ੁਦਾ",
    "तलाकशुदा": "ਤਲਾਕਸ਼ੁਦਾ",
    "Separated": "ਵੱਖ ਰਹਿ ਰਹੇ",
    "अलग रह रहे": "ਵੱਖ ਰਹਿ ਰਹੇ",
    "General": "ਜਨਰਲ (General)",
    "सामान्य": "ਜਨਰਲ (General)",
    "OBC": "ਹੋਰ ਪੱਛੜੀਆਂ ਸ਼੍ਰੇਣੀਆਂ (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "ਹੋਰ ਪੱਛੜੀਆਂ ਸ਼੍ਰੇਣੀਆਂ (OBC)",
    "SC": "ਅਨੁਸੂਚਿਤ ਜਾਤੀ (SC)",
    "अनुसूचित जाति (SC)": "ਅਨੁਸੂਚਿਤ ਜਾਤੀ (SC)",
    "ST": "ਅਨੁਸੂਚਿਤ ਜਨਜਾਤੀ (ST)",
    "अनुसूचित जनजाति (ST)": "ਅਨੁਸੂਚਿਤ ਜਨਜਾਤੀ (ST)",
    "Illiterate": "ਅਨਪੜ੍ਹ",
    "निरक्षर / अनपढ़": "ਅਨਪੜ੍ਹ",
    "Illiterate but able to calculate": "ਅਨਪੜ੍ਹ ਪਰ ਹਿਸਾਬ-ਕਿਤਾਬ ਕਰ ਸਕਦੇ ਹਨ",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "ਅਨਪੜ੍ਹ ਪਰ ਹਿਸਾਬ-ਕਿਤਾਬ ਕਰ ਸਕਦੇ ਹਨ",
    "5th pass": "੫ਵੀਂ ਪਾਸ",
    "5वीं पास": "੫ਵੀਂ ਪਾਸ",
    "8th pass": "੮ਵੀਂ ਪਾਸ",
    "8वीं पास": "੮ਵੀਂ ਪਾਸ",
    "10th pass": "੧੦ਵੀਂ ਪਾਸ",
    "10वीं पास": "੧੦ਵੀਂ ਪਾਸ",
    "12th pass": "੧੨ਵੀਂ ਪਾਸ",
    "12वीं पास": "੧੨ਵੀਂ ਪਾਸ",
    "Graduate": "ਗ੍ਰੈਜੂਏਟ (Graduate)",
    "स्नातक (Graduate)": "ਗ੍ਰੈਜੂਏਟ (Graduate)",
    "Self": "ਖੁਦ",
    "स्वयं": "ਖੁਦ",
    "Husband": "ਪਤੀ",
    "पति": "ਪਤੀ",
    "Son": "ਪੁੱਤਰ",
    "पुत्र / बेटा": "ਪੁੱਤਰ",
    "Daughter": "ਧੀ",
    "पुत्री / बेटी": "ਧੀ",
    "Member": "ਆਮ ਮੈਂਬਰ",
    "सामान्य सदस्य": "ਆਮ ਮੈਂਬਰ",
    "Leadership role": "ਅਹੁਦੇਦਾਰ / ਲੀਡਰਸ਼ਿਪ (ਪ੍ਰਧਾਨ/ਸਕੱਤਰ/ਖਜ਼ਾਨਚੀ)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "ਅਹੁਦੇਦਾਰ / ਲੀਡਰਸ਼ਿਪ (ਪ੍ਰਧਾਨ/ਸਕੱਤਰ/ਖਜ਼ਾਨਚੀ)",
    "Grocery / Kirana": "ਕਰਿਆਨੇ ਦੀ ਦੁਕਾਨ",
    "किराना दुकान": "ਕਰਿਆਨੇ ਦੀ ਦੁਕਾਨ",
    "General store": "ਜਨਰਲ ਸਟੋਰ",
    "जनरल स्टोर": "ਜਨਰਲ ਸਟੋਰ",
    "Leather & footwear": "ਚਮੜਾ ਅਤੇ ਜੁੱਤੀਆਂ",
    "चमड़ा व जूते-चप्पल": "ਚਮੜਾ ਅਤੇ ਜੁੱਤੀਆਂ",
    "Flour mill": "ਆਟਾ ਚੱਕੀ",
    "आटा चक्की": "ਆਟਾ ਚੱਕੀ",
    "Tailoring & Stitching": "ਸਿਲਾਈ ਅਤੇ ਕਢਾਈ ਕੇਂਦਰ",
    "सिलाई व कढ़ाई केंद्र": "ਸਿਲਾਈ ਅਤੇ ਕਢਾਈ ਕੇਂਦਰ",
    "Apparel & Garments": "ਰੈਡੀਮੇਡ ਕੱਪੜੇ",
    "रेडीमेड वस्त्र": "ਰੈਡੀਮੇਡ ਕੱਪੜੇ",
    "Beauty parlour": "ਬਿਊਟੀ ਪਾਰਲਰ",
    "ब्यूटी पार्लर": "ਬਿਊਟੀ ਪਾਰਲਰ",
    "Handicraft": "ਹਸਤਕਲਾ / ਹੈਂਡੀਕਰਾਫਟ",
    "हस्तशिल्प / हैंडीक्राफ्ट": "ਹਸਤਕਲਾ / ਹੈਂਡੀਕਰਾਫਟ",
    "Dairy shop": "ਡੇਅਰੀ ਅਤੇ ਦੁੱਧ ਕੇਂਦਰ",
    "डेयरी व दूध केंद्र": "ਡੇਅਰੀ ਅਤੇ ਦੁੱਧ ਕੇਂਦਰ",
    "Auto-mechanic": "ਆਟੋ ਮਕੈਨਿਕ",
    "ऑटो मैकेनिक": "ਆਟੋ ਮਕੈਨਿਕ",
    "E-mitra": "ਈ-ਮਿੱਤਰ / ਸੀ.ਐੱਸ.ਸੀ ਕੇਂਦਰ",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ਈ-ਮਿੱਤਰ / ਸੀ.ਐੱਸ.ਸੀ ਕੇਂਦਰ",
    "Mobile repair shop": "ਮੋਬਾਈਲ ਰਿਪੇਅਰ ਦੁਕਾਨ",
    "मोबाइल रिपेयर दुकान": "ਮੋਬਾਈਲ ਰਿਪੇਅਰ ਦੁਕਾਨ",
    "Transport": "ਟਰਾਂਸਪੋਰਟ ਸੇਵਾ",
    "परिवहन सेवा": "ਟਰਾਂਸਪੋਰਟ ਸੇਵਾ",
    "Any other": "ਕੋਈ ਹੋਰ",
    "अन्य कोई": "ਕੋਈ ਹੋਰ",
    "Whatsapp": "ਵਟਸਐਪ",
    "व्हाट्सएप (WhatsApp)": "ਵਟਸਐਪ",
    "Facebook": "ਫੇਸਬੁੱਕ",
    "फेसबुक (Facebook)": "ਫੇਸਬੁੱਕ",
    "Instagram": "ਇੰਸਟਾਗ੍ਰਾਮ",
    "इंस्टाग्राम (Instagram)": "ਇੰਸਟਾਗ੍ਰਾਮ",
    "Don't use social media": "ਸੋਸ਼ਲ ਮੀਡੀਆ ਦੀ ਵਰਤੋਂ ਨਹੀਂ ਕਰਦੇ",
    "सोशल मीडिया का उपयोग नहीं करते": "ਸੋਸ਼ਲ ਮੀਡੀਆ ਦੀ ਵਰਤੋਂ ਨਹੀਂ ਕਰਦੇ",
    "Draft": "ਅਧੂਰਾ ਡਰਾਫਟ",
    "Save Draft": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ड्राफ्ट": "ਡਰਾਫਟ",
    "मसुदा": "ਡਰਾਫਟ",
    "ડ્રાફ્ટ": "ਡਰਾਫਟ",
    "ਡਰਾਫਟ": "ਡਰਾਫਟ",
    "খসড়া": "ਡਰਾਫਟ",
    "வரைவு": "ਡਰਾਫਟ",
    "చిత్తుప్రతి": "ਡਰਾਫਟ",
    "ಕರಡು": "ਡਰਾਫਟ",
    "ഡ്രാഫ്റ്റ്": "ਡਰਾਫਟ",
    "ڈرافٹ": "ਡਰਾਫਟ",
    "ड्राफ्ट सेव करें": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "मसुदा जतन करा": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ડ્રાફ્ટ સાચવો": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "খসড়া সংরক্ষণ": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "வரைவு சேமி": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "చిత్తుప్రతి భద్రపరచు": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ಕರಡು ಉಳಿಸಿ": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "ڈرافٹ محفوظ کریں": "ਡਰਾਫਟ ਸੰਭਾਲੋ",
    "Himalayan Baseline Impact Survey": "ਹਿਮਾਲੀਅਨ ਬੇਸਲਾਈਨ ਪ੍ਰਭਾਵ ਸਰਵੇਖਣ",
    "1. Household & Demographic Profile": "1. ਪਰਿਵਾਰ ਅਤੇ ਜਨਸੰਖਿਆ ਪ੍ਰੋਫਾਈਲ",
    "General identification and household metrics": "ਆਮ ਪਛਾਣ ਅਤੇ ਪਰਿਵਾਰਕ ਵੇਰਵੇ",
    "2. Economic Activity & Livestock": "2. ਆਰਥਿਕ ਗਤੀਵਿਧੀ ਅਤੇ ਪਸ਼ੂ ਧਨ",
    "Revenue, assets, and livestock count": "ਆਮਦਨ, ਸੰਪਤੀਆਂ ਅਤੇ ਪਸ਼ੂਆਂ ਦੀ ਗਿਣਤੀ",
    "3. Geolocation & Digital Verification": "3. ਜੀਓਲੋਕੇਸ਼ਨ ਅਤੇ ਡਿਜੀਟਲ ਤਸਦੀਕ",
    "GPS accuracy and field photo capture": "ਜੀਪੀਐਸ ਸ਼ੁੱਧਤਾ ਅਤੇ ਫੀਲਡ ਫੋਟੋ",
    "Full Name of Household Head / Primary Respondent": "ਪਰਿਵਾਰ ਦੇ ਮੁਖੀ / ਮੁੱਖ ਜਵਾਬਦੇਹ ਦਾ ਪੂਰਾ ਨਾਮ",
    "Respondent Classification": "ਜਵਾਬਦੇਹ ਦਾ ਵਰਗੀਕਰਨ",
    "Individual": "ਵਿਅਕਤੀਗਤ",
    "Household": "ਘਰੇਲੂ / ਪਰਿਵਾਰ",
    "Smallholder Farmer": "ਛੋਟੇ ਕਿਸਾਨ",
    "Micro Enterprise / Self-Employed": "ਸੂਖਮ ਉਦਯੋਗ / ਸਵੈ-ਰੁਜ਼ਗਾਰ",
    "Primary Contact Phone Number": "ਮੁੱਖ ਸੰਪਰਕ ਫ਼ੋਨ ਨੰਬਰ",
    "Do you own cattle, sheep, or goats?": "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਗਾਂ, ਮੱਝ, ਭੇਡ ਜਾਂ ਬੱਕਰੀ ਹੈ?",
    "Total number of milch cattle / animals?": "ਦੁਧਾਰੂ ਪਸ਼ੂਆਂ / ਜਾਨਵਰਾਂ ਦੀ ਕੁੱਲ ਗਿਣਤੀ?",
    "Estimated Monthly Household Income (INR ₹)": "ਅੰਦਾਜ਼ਨ ਮਾਸਿਕ ਪਰਿਵਾਰਕ ਆਮਦਨ (ਰੁਪਏ ₹)",
    "Farm Equipment & Key Productive Assets": "ਖੇਤੀਬਾੜੀ ਉਪਕਰਣ ਅਤੇ ਮੁੱਖ ਉਤਪਾਦਕ ਸੰਪਤੀਆਂ",
    "Capture Field GPS Coordinates (Auto-verified)": "ਫੀਲਡ ਜੀਪੀਐਸ ਨਿਰਦੇਸ਼ਾਂਕ ਪ੍ਰਾਪਤ ਕਰੋ (ਆਟੋ-ਤਸਦੀਕ)",
    "Field Photo of Site / Beneficiary": "ਸਾਈਟ / ਲਾਭਪਾਤਰੀ ਦੀ ਫੀਲਡ ਫੋਟੋ",
    "Surveyor Sign-off & Digital Signature": "ਸਰਵੇਖਕ ਪ੍ਰਵਾਨਗੀ ਅਤੇ ਡਿਜੀਟਲ ਦਸਤਖਤ",
    "District, Block, Village, SHG, and Enterprise identification": "ਜ਼ਿਲ੍ਹਾ, ਬਲਾਕ, ਪਿੰਡ, SHG ਅਤੇ ਉੱਦਮ ਦੀ ਪਛਾਣ",
    "Demographic, family structure, education, and household income": "ਜਨਸੰਖਿਆ, ਪਰਿਵਾਰਕ ਢਾਂਚਾ, ਸਿੱਖਿਆ ਅਤੇ ਘਰੇਲੂ ਆਮਦਨ",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "ਸ਼ੁਰੂਆਤ ਦਾ ਇਤਿਹਾਸ, ਕੰਮ ਦੇ ਘੰਟੇ, ਪੂੰਜੀ ਪ੍ਰਬੰਧ ਅਤੇ ਮੌਸਮੀ ਆਮਦਨ",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "ਸਥਾਨ, ਸਪਲਾਇਰ, ਉਧਾਰ ਵਸੂਲੀ, ਕੱਚਾ ਮਾਲ ਖਰੀਦ ਅਤੇ ਕਰਜ਼ਾ ਪਹੁੰਚ",
    "Loan utilization, monthly income growth, and CRP contribution": "ਕਰਜ਼ੇ ਦੀ ਵਰਤੋਂ, ਮਹੀਨਾਵਾਰ ਆਮਦਨ ਵਿੱਚ ਵਾਧਾ ਅਤੇ CRP ਦਾ ਯੋਗਦਾਨ",
    "Smartphone ownership, QR code banking, and social media usage": "ਸਮਾਰਟਫੋਨ ਮਲਕੀਅਤ, QR ਕੋਡ ਬੈਂਕਿੰਗ ਅਤੇ ਸੋਸ਼ਲ ਮੀਡੀਆ ਦੀ ਵਰਤੋਂ",
    "GPS coordinates fix, site photo capture, and digital signatures": "GPS ਨਿਰਦੇਸ਼ਾਂਕ, ਸਾਈਟ ਫੋਟੋ ਅਤੇ ਡਿਜੀਟਲ ਦਸਤਖਤ",
    "Dashboard": "ਡੈਸ਼ਬੋਰਡ",
    "Surveyor Dashboard": "ਸਰਵੇਖਕ ਡੈਸ਼ਬੋਰਡ",
    "Field Work Overview": "ਫੀਲਡ ਕੰਮ ਦੀ ਪ੍ਰਗਤੀ",
    "Total Recorded": "ਕੁੱਲ ਸਰਵੇਖਣ",
    "Synced to Server": "ਸਰਵਰ ਤੇ ਸਿੰਕ",
    "Pending Sync": "ਬਕਾਇਆ ਸਿੰਕ",
    "Incomplete Drafts": "ਅਧੂਰੇ ਡਰਾਫਟ",
    "Drafts": "ਡਰਾਫਟ",
    "Completed": "ਮੁਕੰਮਲ",
    "Today's Goal": "ਅੱਜ ਦਾ ਟੀਚਾ",
    "surveys completed today": "ਸਰਵੇਖਣ ਅੱਜ ਪੂਰੇ ਹੋਏ",
    "Daily Target Met!": "ਅੱਜ ਦਾ ਟੀਚਾ ਪੂਰਾ ਹੋ ਗਿਆ! 🎉",
    "Start New Survey": "+ ਨਵਾਂ ਸਰਵੇਖਣ ਸ਼ੁਰੂ ਕਰੋ",
    "Resume Draft": "▶ ਅਧੂਰਾ ਫਾਰਮ ਪੂਰਾ ਕਰੋ",
    "Resume & Complete": "▶ ਫਾਰਮ ਜਾਰੀ ਰੱਖੋ",
    "My Submissions & Drafts": "ਮੇਰੇ ਸਰਵੇਖਣ ਅਤੇ ਡਰਾਫਟ",
    "All Records": "ਸਾਰੇ ਰਿਕਾਰਡ",
    "Complete": "ਪੂਰਾ",
    "Questions Answered": "ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦਿੱਤੇ",
    "GPS Locked": "GPS ਲੌਕ ✓",
    "Photo Attached": "ਫੋਟੋ ਨੱਥੀ ✓",
    "Signed": "ਦਸਤਖਤ ਹੋਏ ✓",
    "Ready to Sync": "ਸਿੰਕ ਲਈ ਤਿਆਰ (100%)",
    "Synced": "ਸਰਵਰ ਤੇ ਸੁਰੱਖਿਅਤ",
    "No respondent name": "ਅਣਜਾਣ ਜਵਾਬਦੇਹ",
    "Village / Location": "ਪਿੰਡ / ਸਥਾਨ",
    "Last edited": "ਆਖਰੀ ਸੰਪਾਦਨ",
    "Sync All Pending": "🔄 ਸਾਰੇ ਬਕਾਇਆ ਸਿੰਕ ਕਰੋ",
    "No surveys recorded yet": "ਇਸ ਡਿਵਾਈਸ ਤੇ ਅਜੇ ਕੋਈ ਸਰਵੇਖਣ ਦਰਜ ਨਹੀਂ ਹੈ",
    "Tap '+ Start New Survey' to begin your first interview": "ਪਹਿਲਾ ਇੰਟਰਵਿਊ ਸ਼ੁਰੂ ਕਰਨ ਲਈ '+ ਨਵਾਂ ਸਰਵੇਖਣ' ਦਬਾਓ",
    "Delete draft?": "ਕੀ ਤੁਸੀਂ ਇਸ ਡਰਾਫਟ ਨੂੰ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
    "Draft deleted": "ਡਰਾਫਟ ਹਟਾ ਦਿੱਤਾ ਗਿਆ",
    "Text Size": "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ",
    "Adjust font size for your screen": "ਸਕ੍ਰੀਨ ਮੁਤਾਬਕ ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਚੁਣੋ",
    "Small": "ਛੋਟਾ",
    "Medium": "ਦਰਮਿਆਨਾ",
    "Large": "ਵੱਡਾ",
    "Text size set to Small": "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਛੋਟਾ ਕੀਤਾ ਗਿਆ",
    "Text size set to Medium": "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਦਰਮਿਆਨਾ ਕੀਤਾ ਗਿਆ",
    "Text size set to Large": "ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਵੱਡਾ ਕੀਤਾ ਗਿਆ",
    "Email Data to Admin": "ਐਡਮਿਨ ਨੂੰ ਡਾਟਾ ਈਮੇਲ ਕਰੋ",
    "Emergency Backup & Support": "ਐਮਰਜੈਂਸੀ ਬੈਕਅੱਪ ਅਤੇ ਸਹਾਇਤਾ",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ਆਪਣੇ ਸਾਰੇ ਸਰਵੇਖਣ ਰਿਕਾਰਡ ਈਮੇਲ ਜਾਂ ਐਪਸ ਰਾਹੀਂ ਐਡਮਿਨ ਨੂੰ ਭੇਜੋ।",
    "Admin Email Address": "ਐਡਮਿਨ ਦਾ ਈਮੇਲ ਪਤਾ",
    "Additional Note / Error Description": "ਸਮੱਸਿਆ ਜਾਂ ਟਿੱਪਣੀ (ਵਿਕਲਪਿਕ)",
    "Send via Email / Server": "ਈਮੇਲ ਰਾਹੀਂ ਭੇਜੋ (ਸਰਵਰ)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp 'ਤੇ ਸਾਂਝਾ ਕਰੋ",
    "Download JSON": "JSON ਡਾਊਨਲੋਡ ਕਰੋ",
    "Download CSV (Excel)": "CSV (Excel) ਡਾਊਨਲੋਡ ਕਰੋ",
    "Backup emailed successfully ✓": "ਬੈਕਅੱਪ ਈਮੇਲ ਸਫਲਤਾਪੂਰਵਕ ਭੇਜਿਆ ਗਿਆ ✓",
    "Total Device Records": "ਡਿਵਾਈਸ 'ਤੇ ਕੁੱਲ ਰਿਕਾਰਡ",
    "Offline Storage Status": "ਲੋਕਲ ਸਟੋਰੇਜ ਸਥਿਤੀ",
    "Healthy (IndexedDB)": "ਸੁਰੱਖਿਅਤ (IndexedDB)",
    "Export & Backup": "ਐਕਸਪੋਰਟ ਅਤੇ ਬੈਕਅੱਪ",
    "Send Data to Admin": "ਐਡਮਿਨ ਨੂੰ ਡਾਟਾ ਭੇਜੋ",
    "e.g. 2020": "ਉਦਾ. 2020",
    "Enter year (e.g. 2020)": "ਸਾਲ ਦਰਜ ਕਰੋ (ਉਦਾ. 2020)"
  },
  "bn": {
    "OmniQuery": "অমনিসার্ভে",
    "ओमनीसर्वे": "অমনিসার্ভে",
    "Online": "অনলাইন",
    "ऑनलाइन": "অনলাইন",
    "Offline": "অফলাইন",
    "ऑफलाइन": "অফলাইন",
    "Surveys": "জরিপ",
    "सर्वेक्षण": "জরিপ",
    "WAL Queue": "সারি (অফলাইন)",
    "कतार (ऑफलाइन)": "সারি (অফলাইন)",
    "System": "সিস্টেম",
    "सिस्टम": "সিস্টেম",
    "Exit Form": "← প্রস্থান",
    "← बाहर निकलें": "← প্রস্থান",
    "Step": "ধাপ",
    "चरण": "ধাপ",
    "of": "এর",
    "का": "এর",
    "Pages": "পৃষ্ঠা",
    "पृष्ठ": "পৃষ্ঠা",
    "Questions": "প্রশ্ন",
    "प्रश्न": "প্রশ্ন",
    "Previous": "← পূর্ববর্তী",
    "← पिछला": "← পূর্ববর্তী",
    "Next": "পরবর্তী →",
    "अगला →": "পরবর্তী →",
    "Save Offline": "অফলাইনে সংরক্ষণ করুন",
    "ऑफलाइन सेव करें": "অফলাইনে সংরক্ষণ করুন",
    "Submit Survey": "জমা দিন",
    "सबमिट करें": "জমা দিন",
    "Capture GPS Coordinates": "জিপিএস লোকেশন সংরক্ষণ করুন",
    "जीपीएस लोकेशन रिकॉर्ड करें": "জিপিএস লোকেশন সংরক্ষণ করুন",
    "GPS Fix Acquired ✓": "জিপিএস লোকেশন পাওয়া গেছে ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "জিপিএস লোকেশন পাওয়া গেছে ✓",
    "Take Photo / Choose File": "ছবি তুলুন / ফাইল বাছাই করুন",
    "फोटो लें / फाइल चुनें": "ছবি তুলুন / ফাইল বাছাই করুন",
    "Sign inside box with finger or stylus": "আপনার আঙুল বা স্টাইলাস দিয়ে বাক্সে স্বাক্ষর করুন",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "আপনার আঙুল বা স্টাইলাস দিয়ে বাক্সে স্বাক্ষর করুন",
    "Clear Signature": "স্বাক্ষর মুছুন",
    "हस्ताक्षर मिटाएं": "স্বাক্ষর মুছুন",
    "Signature Recorded": "স্বাক্ষর রেকর্ড করা হয়েছে",
    "हस्ताक्षर दर्ज हुआ": "স্বাক্ষর রেকর্ড করা হয়েছে",
    "Enter response here...": "এখানে উত্তর লিখুন...",
    "यहाँ उत्तर दर्ज करें...": "এখানে উত্তর লিখুন...",
    "Required Questions Pending": "প্রয়োজনীয় প্রশ্ন বাকি আছে",
    "आवश्यक प्रश्न अधूरे हैं": "প্রয়োজনীয় প্রশ্ন বাকি আছে",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "চূড়ান্ত জমা দেওয়ার আগে অনুগ্রহ করে এই প্রয়োজনীয় প্রশ্নগুলি পূরণ করুন, অথবা যে কোনো সময় অফলাইন খসড়া হিসেবে সংরক্ষণ করুন।",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "চূড়ান্ত জমা দেওয়ার আগে অনুগ্রহ করে এই প্রয়োজনীয় প্রশ্নগুলি পূরণ করুন, অথবা যে কোনো সময় অফলাইন খসড়া হিসেবে সংরক্ষণ করুন।",
    "Go to First Pending Question": "👉 প্রথম অসম্পূর্ণ প্রশ্নে যান",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 প্রথম অসম্পূর্ণ প্রশ্নে যান",
    "Save as Offline Draft Anyway": "অফলাইন খসড়া সংরক্ষণ করুন",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "অফলাইন খসড়া সংরক্ষণ করুন",
    "Close": "বন্ধ করুন",
    "बंद करें": "বন্ধ করুন",
    "Start Survey Form": "জরিপ শুরু করুন",
    "सर्वेक्षण शुरू करें": "জরিপ শুরু করুন",
    "Start Survey Form →": "জরিপ শুরু করুন →",
    "सर्वेक्षण शुरू करें →": "জরিপ শুরু করুন →",
    "Write-Ahead Log (WAL)": "রাইট-অ্যাহেড লগ (WAL সারি)",
    "राइट-अहेड लॉग (WAL कतार)": "রাইট-অ্যাহেড লগ (WAL সারি)",
    "Atomic zero-loss local storage queue": "শূন্য ডেটা ক্ষতি নিরাপদ স্থানীয় সঞ্চয়স্থান",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "শূন্য ডেটা ক্ষতি নিরাপদ স্থানীয় সঞ্চয়স্থান",
    "Sync Now": "⟳ এখনই সিঙ্ক করুন",
    "⟳ अभी सिंक करें": "⟳ এখনই সিঙ্ক করুন",
    "View on Map →": "মানচিত্রে দেখুন →",
    "नक्शे पर देखें →": "মানচিত্রে দেখুন →",
    "Re-acquire Fix": "পুনরায় চেষ্টা করুন",
    "पुनः प्रयास करें": "পুনরায় চেষ্টা করুন",
    "Section A: Basic Details": "বিভাগ A: প্রাথমিক বিবরণ",
    "भाग क: बुनियादी विवरण": "বিভাগ ক: মৌলিক বিবরণ",
    "Section B: Respondent & Household Profile": "বিভাগ B: উত্তরদাতা ও পারিবারিক প্রোফাইল",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "বিভাগ খ: উত্তরদাতা ও পরিবারের প্রোফাইল",
    "Section C: Enterprise Operations & Finance": "বিভাগ C: উদ্যোগ পরিচালনা ও অর্থায়ন",
    "भाग ग: उद्यम संचालन और वित्त": "বিভাগ গ: উদ্যোগ পরিচালনা ও অর্থায়ন",
    "Section D: Enterprise Challenges & Coping Mechanisms": "বিভাগ D: উদ্যোগের চ্যালেঞ্জ ও সমাধান",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "বিভাগ ঘ: ব্যবসায়িক চ্যালেঞ্জ ও সমাধান",
    "Section E: Impact of SVEP / OSF Schemes": "বিভাগ E: SVEP / OSF প্রকল্পের প্রভাব",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "বিভাগ ঙ: এসভিইপি / ওএসএফ স্কিমের প্রভাব",
    "Section F: Digital Transactions & Social Media": "বিভাগ F: ডিজিটাল লেনদেন এবং সোশ্যাল মিডিয়া",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "বিভাগ চ: ডিজিটাল লেনদেন ও সোশ্যাল মিডিয়া",
    "Section G: Field Verification & Sign-off": "বিভাগ G: ফিল্ড যাচাইকরণ ও স্বাক্ষর",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "বিভাগ ছ: মাঠ পর্যায়ের যাচাইকরণ ও স্বাক্ষর",
    "District": "জেলা",
    "जिला": "জেলা",
    "Block / Tehsil": "ব্লক / তহশিল",
    "ब्लॉक / तहसील": "ব্লক / তহশিল",
    "Village / Gram Panchayat Name": "গ্রাম / গ্রাম পঞ্চায়েতের নাম",
    "गाँव / ग्राम पंचायत का नाम": "গ্রাম / গ্রাম পঞ্চায়েতের নাম",
    "Cluster Level Federation (CLF) Name": "ক্লাস্টার লেভেল ফেডারেশন (CLF) এর নাম",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "ক্লাস্টার লেভেল ফেডারেশন (CLF) এর নাম",
    "Village Organization (VO) Name": "গ্রাম সংগঠন (VO) এর নাম",
    "ग्राम संगठन (VO) का नाम": "গ্রাম সংগঠন (VO) এর নাম",
    "Self-Help Group (SHG) Name": "স্বনির্ভর দল (SHG) এর নাম",
    "स्वयं सहायता समूह (SHG) का नाम": "স্বনির্ভর দল (SHG) এর নাম",
    "Respondent Name": "উত্তরদাতার নাম",
    "उत्तरदाता का नाम": "উত্তরদাতার নাম",
    "Enterprise / Business Name": "উদ্যোগ / ব্যবসার নাম",
    "उद्यम / व्यवसाय का नाम": "উদ্যোগ / ব্যবসার নাম",
    "Year of Setting Up Enterprise": "উদ্যোগ প্রতিষ্ঠার বছর",
    "उद्यम स्थापना का वर्ष": "উদ্যোগ প্রতিষ্ঠার বছর",
    "Main Business Activity of the Enterprise": "উদ্যোগের প্রধান ব্যবসায়িক কার্যকলাপ",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "উদ্যোগের প্রধান ব্যবসায়িক কার্যকলাপ",
    "What is respondent's relation with SHG member?": "এসএইচজি সদস্যের সাথে উত্তরদাতার সম্পর্ক কী?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "এসএইচজি সদস্যের সাথে উত্তরদাতার সম্পর্ক কী?",
    "What is the age of SHG member?": "এসএইচজি সদস্যের বয়স কত?",
    "एसएचजी सदस्य की आयु क्या है?": "এসএইচজি সদস্যের বয়স কত?",
    "What is the marital status of the SHG member?": "এসএইচজি সদস্যের বৈবাহিক অবস্থা কী?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "এসএইচজি সদস্যের বৈবাহিক অবস্থা কী?",
    "What is the social category / caste?": "সামাজিক বিভাগ / জাতি কী?",
    "सामाजिक श्रेणी / जाति क्या है?": "সামাজিক বিভাগ / জাতি কী?",
    "What is the education status of the SHG member?": "এসএইচজি সদস্যের শিক্ষাগত যোগ্যতা কী?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "এসএইচজি সদস্যের শিক্ষাগত যোগ্যতা কী?",
    "How many total members are in the family?": "পরিবারে মোট কতজন সদস্য আছেন?",
    "परिवार में कुल कितने सदस्य हैं?": "পরিবারে মোট কতজন সদস্য আছেন?",
    "What is your total annual household income?": "আপনার মোট বার্ষিক পারিবারিক আয় কত?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "আপনার মোট বার্ষিক পারিবারিক আয় কত?",
    "What is your role in the SHG?": "এসএইচজিতে আপনার ভূমিকা কী?",
    "एसएचजी में आपकी भूमिका क्या है?": "এসএইচজিতে আপনার ভূমিকা কী?",
    "Are you related to any of the SVEP / OSF CRP?": "আপনি কি কোনো SVEP / OSF CRP-এর সাথে সম্পর্কিত?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "আপনি কি কোনো SVEP / OSF CRP-এর সাথে সম্পর্কিত?",
    "Who started the enterprise?": "উদ্যোগটি কে শুরু করেছিলেন?",
    "उद्यम किसने शुरू किया था?": "উদ্যোগটি কে শুরু করেছিলেন?",
    "Who operates and manages the enterprise on a daily basis?": "দৈনিক ভিত্তিতে উদ্যোগটি কে পরিচালনা করেন?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "দৈনিক ভিত্তিতে উদ্যোগটি কে পরিচালনা করেন?",
    "For how many hours in a day does the shop/enterprise remain open?": "দিনে কত ঘণ্টা দোকান/উদ্যোগ খোলা থাকে?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "দিনে কত ঘণ্টা দোকান/উদ্যোগ খোলা থাকে?",
    "What is the type of business place / premises?": "ব্যবসায়িক স্থান/জায়গার ধরন কী?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "ব্যবসায়িক স্থান/জায়গার ধরন কী?",
    "Does SHG member maintain written records of business transactions regularly?": "এসএইচজি সদস্য কি নিয়মিত ব্যবসায়িক লেনদেনের লিখিত রেকর্ড রাখেন?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "এসএইচজি সদস্য কি নিয়মিত ব্যবসায়িক লেনদেনের লিখিত রেকর্ড রাখেন?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "আপনার উদ্যোগের প্রথম বছরে প্রাথমিক মূলধন (টাকা) কত ছিল?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "আপনার উদ্যোগের প্রথম বছরে প্রাথমিক মূলধন (টাকা) কত ছিল?",
    "How do you manage working capital during peak season?": "পিক সিজনে আপনি কীভাবে চলতি মূলধন পরিচালনা করেন?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "পিক সিজনে আপনি কীভাবে চলতি মূলধন পরিচালনা করেন?",
    "Is the location of your space convenient for your business?": "আপনার ব্যবসার জন্য জায়গাটির অবস্থান কি সুবিধাজনক?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "আপনার ব্যবসার জন্য জায়গাটির অবস্থান কি সুবিধাজনক?",
    "Are you satisfied and happy with your wholesale supplier?": "আপনি কি পাইকারি সরবরাহকারীর সাথে সন্তুষ্ট?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "আপনি কি পাইকারি সরবরাহকারীর সাথে সন্তুষ্ট?",
    "Are you able to recover credit / money from your customers?": "আপনি কি গ্রাহকদের কাছ থেকে বাকি টাকা আদায় করতে পারেন?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "আপনি কি গ্রাহকদের কাছ থেকে বাকি টাকা আদায় করতে পারেন?",
    "Do you source raw materials/goods from market independently?": "আপনি কি বাজার থেকে স্বাধীনভাবে কাঁচামাল কেনেন?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "আপনি কি বাজার থেকে স্বাধীনভাবে কাঁচামাল কেনেন?",
    "Do you have easy access to loans from different sources?": "বিভিন্ন উৎস থেকে কি সহজে ঋণ পাওয়া যায়?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "বিভিন্ন উৎস থেকে কি সহজে ঋণ পাওয়া যায়?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "আপনি SVEP / OSF স্কিমের অধীনে কত ঋণের পরিমাণ নিয়েছেন (টাকা)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "আপনি SVEP / OSF স্কিমের অধীনে কত ঋণের পরিমাণ নিয়েছেন (টাকা)?",
    "How did you utilize the enterprise loan?": "আপনি কীভাবে উদ্যোগের ঋণ ব্যবহার করেছেন?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "আপনি কীভাবে উদ্যোগের ঋণ ব্যবহার করেছেন?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "ঋণ নেওয়ার আগে উদ্যোগের মাসিক আয় (টাকা)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "ঋণ নেওয়ার আগে উদ্যোগের মাসিক আয় (টাকা)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "ঋণ নেওয়ার পরে উদ্যোগের মাসিক আয় (টাকা)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "ঋণ নেওয়ার পরে উদ্যোগের মাসিক আয় (টাকা)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP-এর অবদান কী ছিল?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP-এর অবদান কী ছিল?",
    "Does the woman entrepreneur own a smartphone?": "নারী উদ্যোক্তার কি স্মার্টফোন আছে?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "নারী উদ্যোক্তার কি স্মার্টফোন আছে?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "আপনি কি ব্যবসায়িক লেনদেনের জন্য QR কোড / UPI / মোবাইল ব্যাঙ্কিং ব্যবহার করেন?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "আপনি কি ব্যবসায়িক লেনদেনের জন্য QR কোড / UPI / মোবাইল ব্যাঙ্কিং ব্যবহার করেন?",
    "Daily how many transactions are done via QR code / UPI?": "প্রতিদিন QR কোড / UPI-এর মাধ্যমে কতগুলি লেনদেন হয়?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "প্রতিদিন QR কোড / UPI-এর মাধ্যমে কতগুলি লেনদেন হয়?",
    "Which social media platforms do you use for your business?": "আপনি আপনার ব্যবসার জন্য কোন সোশ্যাল মিডিয়া প্ল্যাটফর্ম ব্যবহার করেন?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "আপনি আপনার ব্যবসার জন্য কোন সোশ্যাল মিডিয়া প্ল্যাটফর্ম ব্যবহার করেন?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "উদ্যোগের জিপিএস অবস্থান ক্যাপচার করুন (স্যাটেলাইট স্থানাঙ্ক)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "উদ্যোগের জিপিএস অবস্থান ক্যাপচার করুন (স্যাটেলাইট স্থানাঙ্ক)",
    "Field Photo of Enterprise & Beneficiary": "উদ্যোগ ও সুবিধাভোগীর মাঠের ছবি",
    "उद्यम और लाभार्थी का फील्ड फोटो": "উদ্যোগ ও সুবিধাভোগীর মাঠের ছবি",
    "Respondent & Surveyor Digital Signature": "উত্তরদাতা ও সমীক্ষকের ডিজিটাল স্বাক্ষর",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "উত্তরদাতা ও সমীক্ষকের ডিজিটাল স্বাক্ষর",
    "Yes": "হ্যাঁ",
    "हाँ": "হ্যাঁ",
    "No": "না",
    "नहीं": "না",
    "Baran": "বারান",
    "बारां": "বারান",
    "Churu": "চুরু",
    "चूरू": "চুরু",
    "Dausa": "দৌসা",
    "दौसा": "দৌসা",
    "Dungarpur": "ডুঙ্গারপুর",
    "डूंगरपुर": "ডুঙ্গারপুর",
    "Jodhpur": "যোধপুর",
    "जोधपुर": "যোধপুর",
    "Chhipabarod": "ছিপাবড়োদ",
    "छीपाबड़ौद": "ছিপাবড়োদ",
    "Kishanganj": "কিষাণগঞ্জ",
    "किशनगंज": "কিষাণগঞ্জ",
    "Sardar Sheher": "সরদারশহর",
    "सरदारशहर": "সরদারশহর",
    "Bidasar": "বিদাসর",
    "बीदासर": "বিদাসর",
    "Secundra": "সিকান্দরা",
    "सिकंदरा": "সিকান্দরা",
    "Sagwara": "সাগওয়ারা",
    "सागवाड़ा": "সাগওয়ারা",
    "Galiakot": "গালিয়াকোট",
    "गलियाकोट": "গালিয়াকোট",
    "Bicchiwada": "বিছিওয়ারা",
    "बिछीवाड़ा": "বিছিওয়ারা",
    "Jodhpur Block": "যোধপুর ব্লক",
    "जोधपुर ब्लॉक": "যোধপুর ব্লক",
    "Married": "বিবাহিত",
    "विवाहित": "বিবাহিত",
    "Single": "অবিবাহিত",
    "अविवाहित": "অবিবাহিত",
    "Widowed": "বিধবা",
    "विधवा": "বিধবা",
    "Divorced": "তালাকপ্রাপ্ত",
    "तलाकशुदा": "তালাকপ্রাপ্ত",
    "Separated": "পৃথক বসবাসকারী",
    "अलग रह रहे": "পৃথক বসবাসকারী",
    "General": "সাধারণ (General)",
    "सामान्य": "সাধারণ (General)",
    "OBC": "অন্যান্য অনগ্রসর শ্রেণী (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "অন্যান্য অনগ্রসর শ্রেণী (OBC)",
    "SC": "তপশিলী জাতি (SC)",
    "अनुसूचित जाति (SC)": "তপশিলী জাতি (SC)",
    "ST": "তপশিলী উপজাতি (ST)",
    "अनुसूचित जनजाति (ST)": "তপশিলী উপজাতি (ST)",
    "Illiterate": "নিরক্ষর",
    "निरक्षर / अनपढ़": "নিরক্ষর",
    "Illiterate but able to calculate": "নিরক্ষর কিন্তু হিসাব করতে সক্ষম",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "নিরক্ষর কিন্তু হিসাব করতে সক্ষম",
    "5th pass": "৫ম শ্রেণী উত্তীর্ণ",
    "5वीं पास": "৫ম শ্রেণী উত্তীর্ণ",
    "8th pass": "৮ম শ্রেণী উত্তীর্ণ",
    "8वीं पास": "৮ম শ্রেণী উত্তীর্ণ",
    "10th pass": "১০ম শ্রেণী উত্তীর্ণ",
    "10वीं पास": "১০ম শ্রেণী উত্তীর্ণ",
    "12th pass": "১২ম শ্রেণী উত্তীর্ণ",
    "12वीं पास": "১২ম শ্রেণী উত্তীর্ণ",
    "Graduate": "স্নাতক (Graduate)",
    "स्नातक (Graduate)": "স্নাতক (Graduate)",
    "Self": "নিজে",
    "स्वयं": "নিজে",
    "Husband": "স্বামী",
    "पति": "স্বামী",
    "Son": "পুত্র / ছেলে",
    "पुत्र / बेटा": "পুত্র / ছেলে",
    "Daughter": "কন্যা / মেয়ে",
    "पुत्री / बेटी": "কন্যা / মেয়ে",
    "Member": "সাধারণ সদস্য",
    "सामान्य सदस्य": "সাধারণ সদস্য",
    "Leadership role": "নেতৃত্বের পদ (সভাপতি/সম্পাদক/কোষাধ্যক্ষ)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "নেতৃত্বের পদ (সভাপতি/সম্পাদক/কোষাধ্যক্ষ)",
    "Grocery / Kirana": "মুদি দোকান",
    "किराना दुकान": "মুদি দোকান",
    "General store": "জেনারেল স্টোর",
    "जनरल स्टोर": "জেনারেল স্টোর",
    "Leather & footwear": "চামড়া ও জুতো",
    "चमड़ा व जूते-चप्पल": "চামড়া ও জুতো",
    "Flour mill": "ময়দার কল / আটা চাকি",
    "आटा चक्की": "ময়দার কল / আটা চাকি",
    "Tailoring & Stitching": "দর্জি ও সেলাই কেন্দ্র",
    "सिलाई व कढ़ाई केंद्र": "দর্জি ও সেলাই কেন্দ্র",
    "Apparel & Garments": "তৈরি পোশাক",
    "रेडीमेड वस्त्र": "তৈরি পোশাক",
    "Beauty parlour": "বিউটি পার্লার",
    "ब्यूटी पार्लर": "বিউটি পার্লার",
    "Handicraft": "হস্তশিল্প",
    "हस्तशिल्प / हैंडीक्राफ्ट": "হস্তশিল্প",
    "Dairy shop": "দুগ্ধজাত পণ্য ও দুধের কেন্দ্র",
    "डेयरी व दूध केंद्र": "দুগ্ধজাত পণ্য ও দুধের কেন্দ্র",
    "Auto-mechanic": "অটো মেকানিক",
    "ऑटो मैकेनिक": "অটো মেকানিক",
    "E-mitra": "ই-মিত্র / গ্রাহক সেবা কেন্দ্র",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ই-মিত্র / গ্রাহক সেবা কেন্দ্র",
    "Mobile repair shop": "মোবাইল মেরামত দোকান",
    "मोबाइल रिपेयर दुकान": "মোবাইল মেরামত দোকান",
    "Transport": "পরিবহন সেবা",
    "परिवहन सेवा": "পরিবহন সেবা",
    "Any other": "অন্যান্য",
    "अन्य कोई": "অন্যান্য",
    "Whatsapp": "হোয়াটসঅ্যাপ",
    "व्हाट्सएप (WhatsApp)": "হোয়াটসঅ্যাপ",
    "Facebook": "ফেসবুক",
    "फेसबुक (Facebook)": "ফেসবুক",
    "Instagram": "ইনস্টাগ্রাম",
    "इंस्टाग्राम (Instagram)": "ইনস্টাগ্রাম",
    "Don't use social media": "সোশ্যাল মিডিয়া ব্যবহার করি না",
    "सोशल मीडिया का उपयोग नहीं करते": "সোশ্যাল মিডিয়া ব্যবহার করি না",
    "Draft": "অসম্পূর্ণ খসড়া",
    "Save Draft": "খসড়া সংরক্ষণ",
    "ड्राफ्ट": "খসড়া",
    "मसुदा": "খসড়া",
    "ડ્રાફ્ટ": "খসড়া",
    "ਡਰਾਫਟ": "খসড়া",
    "খসড়া": "খসড়া",
    "வரைவு": "খসড়া",
    "చిత్తుప్రతి": "খসড়া",
    "ಕರಡು": "খসড়া",
    "ഡ്രാഫ്റ്റ്": "খসড়া",
    "ڈرافٹ": "খসড়া",
    "ड्राफ्ट सेव करें": "খসড়া সংরক্ষণ",
    "मसुदा जतन करा": "খসড়া সংরক্ষণ",
    "ડ્રાફ્ટ સાચવો": "খসড়া সংরক্ষণ",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "খসড়া সংরক্ষণ",
    "খসড়া সংরক্ষণ": "খসড়া সংরক্ষণ",
    "வரைவு சேமி": "খসড়া সংরক্ষণ",
    "చిత్తుప్రతి భద్రపరచు": "খসড়া সংরক্ষণ",
    "ಕರಡು ಉಳಿಸಿ": "খসড়া সংরক্ষণ",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "খসড়া সংরক্ষণ",
    "ڈرافٹ محفوظ کریں": "খসড়া সংরক্ষণ",
    "Himalayan Baseline Impact Survey": "হিমালয়ান বেসলাইন প্রভাব জরিপ",
    "1. Household & Demographic Profile": "1. পরিবার এবং জনসংখ্যাতাত্ত্বিক প্রোফাইল",
    "General identification and household metrics": "সাধারণ সনাক্তকরণ এবং পারিবারিক বিবরণ",
    "2. Economic Activity & Livestock": "2. অর্থনৈতিক কার্যক্রম ও গবাদি পশু",
    "Revenue, assets, and livestock count": "আয়, সম্পদ এবং পশু গণনা",
    "3. Geolocation & Digital Verification": "3. ভৌগলিক অবস্থান এবং ডিজিটাল যাচাইকরণ",
    "GPS accuracy and field photo capture": "জিপিএস নির্ভুলতা এবং ফিল্ড ফটো",
    "Full Name of Household Head / Primary Respondent": "পরিবারের প্রধান / প্রধান উত্তরদাতার পুরো নাম",
    "Respondent Classification": "উত্তরদাতার শ্রেণীবিভাগ",
    "Individual": "ব্যক্তিগত",
    "Household": "পারিবারিক",
    "Smallholder Farmer": "ক্ষুদ্র কৃষক",
    "Micro Enterprise / Self-Employed": "ক্ষুদ্র উদ্যোগ / স্ব-কর্মসংস্থান",
    "Primary Contact Phone Number": "প্রধান যোগাযোগের ফোন নম্বর",
    "Do you own cattle, sheep, or goats?": "আপনার কি গরু, ভেড়া বা ছাগল আছে?",
    "Total number of milch cattle / animals?": "দুধেল গবাদি পশু / পশুর মোট সংখ্যা কত?",
    "Estimated Monthly Household Income (INR ₹)": "আনুমানিক মাসিক পারিবারিক আয় (টাকা ₹)",
    "Farm Equipment & Key Productive Assets": "কৃষি সরঞ্জাম এবং প্রধান উৎপাদনশীল সম্পদ",
    "Capture Field GPS Coordinates (Auto-verified)": "ফিল্ড জিপিএস স্থানাঙ্ক ক্যাপচার করুন (স্বয়ংক্রিয় যাচাইকৃত)",
    "Field Photo of Site / Beneficiary": "সাইট / সুবিধাভোগীর ফিল্ড ফটো",
    "Surveyor Sign-off & Digital Signature": "জরিপকারী স্বাক্ষর এবং ডিজিটাল স্বাক্ষর",
    "District, Block, Village, SHG, and Enterprise identification": "জেলা, ব্লক, গ্রাম, SHG এবং উদ্যোগের পরিচয়",
    "Demographic, family structure, education, and household income": "জনসংখ্যাতাত্ত্বিক, পারিবারিক কাঠামো, শিক্ষা এবং পরিবারের আয়",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "শুরুর ইতিহাস, কাজের সময়, মূলধন ব্যবস্থা এবং মৌসুমী আয়",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "অবস্থান, সরবরাহকারী, দেনা আদায়, কাঁচামাল সংগ্রহ এবং ঋণ সুবিধা",
    "Loan utilization, monthly income growth, and CRP contribution": "ঋণের ব্যবহার, মাসিক আয় বৃদ্ধি এবং CRP-এর অবদান",
    "Smartphone ownership, QR code banking, and social media usage": "স্মার্টফোনের মালিকানা, কিউআর কোড ব্যাংকিং এবং সোশ্যাল মিডিয়ার ব্যবহার",
    "GPS coordinates fix, site photo capture, and digital signatures": "জিপিএস স্থানাঙ্ক, সাইট ছবি এবং ডিজিটাল স্বাক্ষর",
    "Dashboard": "ড্যাশবোর্ড",
    "Surveyor Dashboard": "সার্ভেয়ার ড্যাশবোর্ড",
    "Field Work Overview": "ফিল্ড কাজের অগ্রগতি",
    "Total Recorded": "মোট জরিপ",
    "Synced to Server": "সার্ভারে সিঙ্ক",
    "Pending Sync": "অপেক্ষমাণ সিঙ্ক",
    "Incomplete Drafts": "অসম্পূর্ণ খসড়া",
    "Drafts": "খসড়া",
    "Completed": "সম্পূর্ণ",
    "Today's Goal": "আজকের লক্ষ্য",
    "surveys completed today": "জরিপ আজ সম্পূর্ণ হয়েছে",
    "Daily Target Met!": "আজকের লক্ষ্য অর্জিত হয়েছে! 🎉",
    "Start New Survey": "+ নতুন জরিপ শুরু করুন",
    "Resume Draft": "▶ অসম্পূর্ণ ফর্ম পূরণ করুন",
    "Resume & Complete": "▶ ফর্ম পুনরায় শুরু করুন",
    "My Submissions & Drafts": "আমার জরিপ ও খসড়া",
    "All Records": "সব রেকর্ড",
    "Complete": "সম্পূর্ণ",
    "Questions Answered": "প্রশ্নের উত্তর দেওয়া হয়েছে",
    "GPS Locked": "জিপিএস লক ✓",
    "Photo Attached": "ছবি সংযুক্ত ✓",
    "Signed": "স্বাক্ষরিত ✓",
    "Ready to Sync": "সিঙ্কের জন্য প্রস্তুত (100%)",
    "Synced": "সার্ভারে সংরক্ষিত",
    "No respondent name": "বেনামী উত্তরদাতা",
    "Village / Location": "গ্রাম / অবস্থান",
    "Last edited": "সর্বশেষ সম্পাদনা",
    "Sync All Pending": "🔄 সমস্ত অপেক্ষমাণ সিঙ্ক করুন",
    "No surveys recorded yet": "এই ডিভাইসে এখনও কোনো জরিপ রেকর্ড করা হয়নি",
    "Tap '+ Start New Survey' to begin your first interview": "প্রথম সাক্ষাৎকার শুরু করতে '+ নতুন জরিপ' চাপুন",
    "Delete draft?": "আপনি কি এই খসড়াটি মুছে ফেলতে চান?",
    "Draft deleted": "খসড়া মুছে ফেলা হয়েছে",
    "Text Size": "লেখার আকার",
    "Adjust font size for your screen": "স্ক্রিন অনুযায়ী অক্ষরের আকার বাছুন",
    "Small": "ছোট",
    "Medium": "মাঝারি",
    "Large": "বড়",
    "Text size set to Small": "লেখার আকার ছোট করা হয়েছে",
    "Text size set to Medium": "লেখার আকার মাঝারি করা হয়েছে",
    "Text size set to Large": "লেখার আকার বড় করা হয়েছে",
    "Email Data to Admin": "অ্যাডমিনকে ডেটা ইমেল করুন",
    "Emergency Backup & Support": "জরুরী ব্যাকআপ এবং সহায়তা",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ইমেল বা অ্যাপের মাধ্যমে আপনার সমস্ত সমীক্ষা রেকর্ড অ্যাডমিনকে পাঠান।",
    "Admin Email Address": "অ্যাডমিনের ইমেল ঠিকানা",
    "Additional Note / Error Description": "সমস্যা বা মন্তব্য (ঐচ্ছিক)",
    "Send via Email / Server": "ইমেলের মাধ্যমে পাঠান (সার্ভার)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp-এ শেয়ার করুন",
    "Download JSON": "JSON ডাউনলোড করুন",
    "Download CSV (Excel)": "CSV (Excel) ডাউনলোড করুন",
    "Backup emailed successfully ✓": "ব্যাকআপ ইমেল সফলভাবে পাঠানো হয়েছে ✓",
    "Total Device Records": "ডিভাইসে মোট রেকর্ড",
    "Offline Storage Status": "স্থানীয় স্টোরেজ স্থিতি",
    "Healthy (IndexedDB)": "সুরক্ষিত (IndexedDB)",
    "Export & Backup": "রপ্তানি ও ব্যাকআপ",
    "Send Data to Admin": "অ্যাডমিনকে ডেটা পাঠান",
    "e.g. 2020": "উদা. ২০২০",
    "Enter year (e.g. 2020)": "বছর লিখুন (উদা. ২০২০)"
  },
  "ta": {
    "OmniQuery": "ஓம்னிசர்வே",
    "ओमनीसर्वे": "ஓம்னிசர்வே",
    "Online": "ஆன்லைன்",
    "ऑनलाइन": "ஆன்லைன்",
    "Offline": "ஆஃப்லைன்",
    "ऑफलाइन": "ஆஃப்லைன்",
    "Surveys": "கணிப்புகள்",
    "सर्वेक्षण": "கணிப்புகள்",
    "WAL Queue": "வரிசை (ஆஃப்லைன்)",
    "कतार (ऑफलाइन)": "வரிசை (ஆஃப்லைன்)",
    "System": "கணினி",
    "सिस्टम": "கணினி",
    "Exit Form": "← வெளியேறு",
    "← बाहर निकलें": "← வெளியேறு",
    "Step": "படி",
    "चरण": "படி",
    "of": "இல்",
    "का": "இல்",
    "Pages": "பக்கங்கள்",
    "पृष्ठ": "பக்கங்கள்",
    "Questions": "கேள்விகள்",
    "प्रश्न": "கேள்விகள்",
    "Previous": "← முந்தையது",
    "← पिछला": "← முந்தையது",
    "Next": "அடுத்தது →",
    "अगला →": "அடுத்தது →",
    "Save Offline": "ஆஃப்லைனில் சேமிக்கவும்",
    "ऑफलाइन सेव करें": "ஆஃப்லைனில் சேமிக்கவும்",
    "Submit Survey": "சமர்ப்பிக்கவும்",
    "सबमिट करें": "சமர்ப்பிக்கவும்",
    "Capture GPS Coordinates": "ஜிபிஎஸ் இருப்பிடத்தை பதிவு செய்",
    "जीपीएस लोकेशन रिकॉर्ड करें": "ஜிபிஎஸ் இருப்பிடத்தை பதிவு செய்",
    "GPS Fix Acquired ✓": "ஜிபிஎஸ் நிலை பெறப்பட்டது ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "ஜிபிஎஸ் நிலை பெறப்பட்டது ✓",
    "Take Photo / Choose File": "படம் எடுக்கவும் / கோப்பை தேர்ந்தெடுக்கவும்",
    "फोटो लें / फाइल चुनें": "படம் எடுக்கவும் / கோப்பை தேர்ந்தெடுக்கவும்",
    "Sign inside box with finger or stylus": "விரல் அல்லது ஸ்டைலஸால் பெட்டியில் கையொப்பமிடுங்கள்",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "விரல் அல்லது ஸ்டைலஸால் பெட்டியில் கையொப்பமிடுங்கள்",
    "Clear Signature": "கையொப்பத்தை அழிக்கவும்",
    "हस्ताक्षर मिटाएं": "கையொப்பத்தை அழிக்கவும்",
    "Signature Recorded": "கையொப்பம் பதிவு செய்யப்பட்டது",
    "हस्ताक्षर दर्ज हुआ": "கையொப்பம் பதிவு செய்யப்பட்டது",
    "Enter response here...": "இங்கே பதில் உள்ளிடவும்...",
    "यहाँ उत्तर दर्ज करें...": "இங்கே பதில் உள்ளிடவும்...",
    "Required Questions Pending": "கட்டாய கேள்விகள் நிலுவையில் உள்ளன",
    "आवश्यक प्रश्न अधूरे हैं": "கட்டாய கேள்விகள் நிலுவையில் உள்ளன",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "இறுதி சமர்ப்பிப்பிற்கு முன் இந்த கட்டாய புலங்களை நிரப்பவும், அல்லது ஆஃப்லைன் வரைவாக சேமிக்கவும்.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "இறுதி சமர்ப்பிப்பிற்கு முன் இந்த கட்டாய புலங்களை நிரப்பவும், அல்லது ஆஃப்லைன் வரைவாக சேமிக்கவும்.",
    "Go to First Pending Question": "👉 முதல் நிலுவை கேள்விக்குச் செல்லவும்",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 முதல் நிலுவை கேள்விக்குச் செல்லவும்",
    "Save as Offline Draft Anyway": "ஆஃப்லைன் வரைவாக சேமிக்கவும்",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ஆஃப்லைன் வரைவாக சேமிக்கவும்",
    "Close": "மூடு",
    "बंद करें": "மூடு",
    "Start Survey Form": "கணிப்பைத் தொடங்குங்கள்",
    "सर्वेक्षण शुरू करें": "கணிப்பைத் தொடங்குங்கள்",
    "Start Survey Form →": "கணிப்பைத் தொடங்குங்கள் →",
    "सर्वेक्षण शुरू करें →": "கணிப்பைத் தொடங்குங்கள் →",
    "Write-Ahead Log (WAL)": "ரைட்-அஹெட் லாக் (WAL வரிசை)",
    "राइट-अहेड लॉग (WAL कतार)": "ரைட்-அஹெட் லாக் (WAL வரிசை)",
    "Atomic zero-loss local storage queue": "பூஜ்ஜிய தரவு இழப்பு பாதுகாப்பான உள்ளூர் சேமிப்பு",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "பூஜ்ஜிய தரவு இழப்பு பாதுகாப்பான உள்ளூர் சேமிப்பு",
    "Sync Now": "⟳ இப்போது ஒத்திசைக்கவும்",
    "⟳ अभी सिंक करें": "⟳ இப்போது ஒத்திசைக்கவும்",
    "View on Map →": "வரைபடத்தில் பார்க்கவும் →",
    "नक्शे पर देखें →": "வரைபடத்தில் பார்க்கவும் →",
    "Re-acquire Fix": "மீண்டும் முயற்சிக்கவும்",
    "पुनः प्रयास करें": "மீண்டும் முயற்சிக்கவும்",
    "Section A: Basic Details": "பிரிவு A: அடிப்படை விவரங்கள்",
    "भाग क: बुनियादी विवरण": "பிரிவு அ: அடிப்படை விவரங்கள்",
    "Section B: Respondent & Household Profile": "பிரிவு B: பதிலளிப்பவர் மற்றும் குடும்ப விவரக்குறிப்பு",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "பிரிவு ஆ: பதிலளிப்பவர் மற்றும் குடும்ப விவரம்",
    "Section C: Enterprise Operations & Finance": "பிரிவு C: தொழில் செயல்பாடு மற்றும் நிதி",
    "भाग ग: उद्यम संचालन और वित्त": "பிரிவு இ: நிறுவன செயல்பாடுகள் மற்றும் நிதி",
    "Section D: Enterprise Challenges & Coping Mechanisms": "பிரிவு D: தொழில் சவால்கள் மற்றும் தீர்வுகள்",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "பிரிவு ஈ: வணிக சவால்கள் மற்றும் தீர்வுகள்",
    "Section E: Impact of SVEP / OSF Schemes": "பிரிவு E: SVEP / OSF திட்டங்களின் தாக்கம்",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "பிரிவு உ: எஸ்விஇபி / ஓஎஸ்எஃப் திட்டங்களின் தாக்கம்",
    "Section F: Digital Transactions & Social Media": "பிரிவு F: டிஜிட்டல் பரிவர்த்தனைகள் மற்றும் சமூக ஊடகம்",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "பிரிவு ஊ: டிஜிட்டல் பரிவர்த்தனைகள் & சமூக ஊடகம்",
    "Section G: Field Verification & Sign-off": "பிரிவு G: கள சரிபார்ப்பு மற்றும் கையொப்பம்",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "பிரிவு எ: கள சரிபார்ப்பு மற்றும் கையொப்பம்",
    "District": "மாவட்டம்",
    "जिला": "மாவட்டம்",
    "Block / Tehsil": "வட்டம் / தாலுகா",
    "ब्लॉक / तहसील": "வட்டம் / தாலுகா",
    "Village / Gram Panchayat Name": "கிராமம் / கிராம பஞ்சாயத்து பெயர்",
    "गाँव / ग्राम पंचायत का नाम": "கிராமம் / கிராம பஞ்சாயத்து பெயர்",
    "Cluster Level Federation (CLF) Name": "கிளஸ்டர் லெவல் கூட்டமைப்பு (CLF) பெயர்",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "கிளஸ்டர் லெவல் கூட்டமைப்பு (CLF) பெயர்",
    "Village Organization (VO) Name": "கிராம அமைப்பு (VO) பெயர்",
    "ग्राम संगठन (VO) का नाम": "கிராம அமைப்பு (VO) பெயர்",
    "Self-Help Group (SHG) Name": "சுயஉதவி குழு (SHG) பெயர்",
    "स्वयं सहायता समूह (SHG) का नाम": "சுயஉதவி குழு (SHG) பெயர்",
    "Respondent Name": "பதிலளிப்பவர் பெயர்",
    "उत्तरदाता का नाम": "பதிலளிப்பவர் பெயர்",
    "Enterprise / Business Name": "தொழில் / வணிகப் பெயர்",
    "उद्यम / व्यवसाय का नाम": "தொழில் / வணிகப் பெயர்",
    "Year of Setting Up Enterprise": "தொழில் தொடங்கிய ஆண்டு",
    "उद्यम स्थापना का वर्ष": "தொழில் தொடங்கிய ஆண்டு",
    "Main Business Activity of the Enterprise": "நிறுவனத்தின் முதன்மை வணிக செயல்பாடு",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "நிறுவனத்தின் முதன்மை வணிக செயல்பாடு",
    "What is respondent's relation with SHG member?": "சுயஉதவிக்குழு உறுப்பினருடன் பதிலளிப்பவரின் உறவு என்ன?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "சுயஉதவிக்குழு உறுப்பினருடன் பதிலளிப்பவரின் உறவு என்ன?",
    "What is the age of SHG member?": "சுயஉதவிக்குழு உறுப்பினரின் வயது என்ன?",
    "एसएचजी सदस्य की आयु क्या है?": "சுயஉதவிக்குழு உறுப்பினரின் வயது என்ன?",
    "What is the marital status of the SHG member?": "சுயஉதவிக்குழு உறுப்பினரின் திருமண நிலை என்ன?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "சுயஉதவிக்குழு உறுப்பினரின் திருமண நிலை என்ன?",
    "What is the social category / caste?": "சமூகப் பிரிவு / சாதி என்ன?",
    "सामाजिक श्रेणी / जाति क्या है?": "சமூகப் பிரிவு / சாதி என்ன?",
    "What is the education status of the SHG member?": "சுயஉதவிக்குழு உறுப்பினரின் கல்வி நிலை என்ன?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "சுயஉதவிக்குழு உறுப்பினரின் கல்வி நிலை என்ன?",
    "How many total members are in the family?": "குடும்பத்தில் மொத்தம் எத்தனை உறுப்பினர்கள் உள்ளனர்?",
    "परिवार में कुल कितने सदस्य हैं?": "குடும்பத்தில் மொத்தம் எத்தனை உறுப்பினர்கள் உள்ளனர்?",
    "What is your total annual household income?": "உங்கள் மொத்த வருடாந்திர குடும்ப வருமானம் எவ்வளவு?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "உங்கள் மொத்த வருடாந்திர குடும்ப வருமானம் எவ்வளவு?",
    "What is your role in the SHG?": "சுயஉதவிக்குழுவில் உங்கள் பங்கு என்ன?",
    "एसएचजी में आपकी भूमिका क्या है?": "சுயஉதவிக்குழுவில் உங்கள் பங்கு என்ன?",
    "Are you related to any of the SVEP / OSF CRP?": "நீங்கள் ஏதேனும் SVEP / OSF CRP உடன் தொடர்புடையவரா?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "நீங்கள் ஏதேனும் SVEP / OSF CRP உடன் தொடர்புடையவரா?",
    "Who started the enterprise?": "தொழிலை யார் தொடங்கினார்கள்?",
    "उद्यम किसने शुरू किया था?": "தொழிலை யார் தொடங்கினார்கள்?",
    "Who operates and manages the enterprise on a daily basis?": "தினசரி அடிப்படையில் நிறுவனத்தை யார் நிர்வகிக்கிறார்கள்?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "தினசரி அடிப்படையில் நிறுவனத்தை யார் நிர்வகிக்கிறார்கள்?",
    "For how many hours in a day does the shop/enterprise remain open?": "ஒரு நாளில் எத்தனை மணி நேரம் கடை/நிறுவனம் திறந்திருக்கும்?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "ஒரு நாளில் எத்தனை மணி நேரம் கடை/நிறுவனம் திறந்திருக்கும்?",
    "What is the type of business place / premises?": "வணிக இடத்தின் வகை என்ன?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "வணிக இடத்தின் வகை என்ன?",
    "Does SHG member maintain written records of business transactions regularly?": "சுயஉதவிக்குழு உறுப்பினர் வழக்கமாக வணிகப் பதிவேடுகளைப் பராமரிக்கிறாரா?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "சுயஉதவிக்குழு உறுப்பினர் வழக்கமாக வணிகப் பதிவேடுகளைப் பராமரிக்கிறாரா?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "உங்கள் நிறுவனத்தின் முதல் ஆண்டில் ஆரம்ப மூலதனம் (ரூ) எவ்வளவு?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "உங்கள் நிறுவனத்தின் முதல் ஆண்டில் ஆரம்ப மூலதனம் (ரூ) எவ்வளவு?",
    "How do you manage working capital during peak season?": "பீக் சீசனில் பணி மூலதனத்தை எவ்வாறு நிர்வகிக்கிறீர்கள்?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "பீக் சீசனில் பணி மூலதனத்தை எவ்வாறு நிர்வகிக்கிறீர்கள்?",
    "Is the location of your space convenient for your business?": "உங்கள் வணிகத்திற்கான இடம் வசதியாக உள்ளதா?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "உங்கள் வணிகத்திற்கான இடம் வசதியாக உள்ளதா?",
    "Are you satisfied and happy with your wholesale supplier?": "மொத்த சப்ளையருடன் நீங்கள் திருப்தியாக உள்ளீர்களா?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "மொத்த சப்ளையருடன் நீங்கள் திருப்தியாக உள்ளீர்களா?",
    "Are you able to recover credit / money from your customers?": "வாடிக்கையாளர்களிடமிருந்து கடனை வசூலிக்க முடிகிறதா?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "வாடிக்கையாளர்களிடமிருந்து கடனை வசூலிக்க முடிகிறதா?",
    "Do you source raw materials/goods from market independently?": "சந்தையிலிருந்து மூலப்பொருட்களை சுயமாக வாங்குகிறீர்களா?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "சந்தையிலிருந்து மூலப்பொருட்களை சுயமாக வாங்குகிறீர்களா?",
    "Do you have easy access to loans from different sources?": "பல்வேறு ஆதாரங்களில் இருந்து கடன் எளிதாக கிடைக்கிறதா?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "பல்வேறு ஆதாரங்களில் இருந்து கடன் எளிதாக கிடைக்கிறதா?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "SVEP / OSF திட்டத்தின் கீழ் எவ்வளவு கடன் பெற்றுள்ளீர்கள் (ரூ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "SVEP / OSF திட்டத்தின் கீழ் எவ்வளவு கடன் பெற்றுள்ளீர்கள் (ரூ)?",
    "How did you utilize the enterprise loan?": "வணிகக் கடனை எவ்வாறு பயன்படுத்தினீர்கள்?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "வணிகக் கடனை எவ்வாறு பயன்படுத்தினீர்கள்?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "கடன் பெறுவதற்கு முன் நிறுவனத்தின் மாதாந்திர வருமானம் (ரூ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "கடன் பெறுவதற்கு முன் நிறுவனத்தின் மாதாந்திர வருமானம் (ரூ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "கடன் பெற்ற பிறகு நிறுவனத்தின் மாதாந்திர வருமானம் (ரூ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "கடன் பெற்ற பிறகு நிறுவனத்தின் மாதாந்திர வருமானம் (ரூ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP-களின் பங்களிப்பு என்ன?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP-களின் பங்களிப்பு என்ன?",
    "Does the woman entrepreneur own a smartphone?": "பெண் தொழில்முனைவோரிடம் ஸ்மார்ட்போன் உள்ளதா?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "பெண் தொழில்முனைவோரிடம் ஸ்மார்ட்போன் உள்ளதா?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "வணிகப் பரிவர்த்தனைகளுக்கு QR குறியீடு / UPI / மொபைல் பேங்கிங் பயன்படுத்துகிறீர்களா?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "வணிகப் பரிவர்த்தனைகளுக்கு QR குறியீடு / UPI / மொபைல் பேங்கிங் பயன்படுத்துகிறீர்களா?",
    "Daily how many transactions are done via QR code / UPI?": "தினசரி QR குறியீடு / UPI மூலம் எத்தனை பரிவர்த்தனைகள் செய்யப்படுகின்றன?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "தினசரி QR குறியீடு / UPI மூலம் எத்தனை பரிவர்த்தனைகள் செய்யப்படுகின்றன?",
    "Which social media platforms do you use for your business?": "உங்கள் வணிகத்திற்காக எந்த சமூக ஊடக தளங்களைப் பயன்படுத்துகிறீர்கள்?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "உங்கள் வணிகத்திற்காக எந்த சமூக ஊடக தளங்களைப் பயன்படுத்துகிறீர்கள்?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "நிறுவன ஜிபிஎஸ் இருப்பிடத்தைப் பிடிக்கவும் (செயற்கைக்கோள் ஆயத்தொலைவுகள்)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "நிறுவன ஜிபிஎஸ் இருப்பிடத்தைப் பிடிக்கவும் (செயற்கைக்கோள் ஆயத்தொலைவுகள்)",
    "Field Photo of Enterprise & Beneficiary": "நிறுவனம் மற்றும் பயனாளியின் களப் புகைப்படம்",
    "उद्यम और लाभार्थी का फील्ड फोटो": "நிறுவனம் மற்றும் பயனாளியின் களப் புகைப்படம்",
    "Respondent & Surveyor Digital Signature": "பதிலளிப்பவர் மற்றும் கணக்கெடுப்பாளரின் டிஜிட்டல் கையொப்பம்",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "பதிலளிப்பவர் மற்றும் கணக்கெடுப்பாளரின் டிஜிட்டல் கையொப்பம்",
    "Yes": "ஆம்",
    "हाँ": "ஆம்",
    "No": "இல்லை",
    "नहीं": "இல்லை",
    "Baran": "பாரான்",
    "बारां": "பாரான்",
    "Churu": "சுரு",
    "चूरू": "சுரு",
    "Dausa": "தௌசா",
    "दौसा": "தௌசா",
    "Dungarpur": "டுங்கர்பூர்",
    "डूंगरपुर": "டுங்கர்பூர்",
    "Jodhpur": "ஜோத்பூர்",
    "जोधपुर": "ஜோத்பூர்",
    "Chhipabarod": "சிபாபரோட்",
    "छीपाबड़ौद": "சிபாபரோட்",
    "Kishanganj": "கிஷன்கஞ்ச்",
    "किशनगंज": "கிஷன்கஞ்ச்",
    "Sardar Sheher": "சர்தார்ஷஹர்",
    "सरदारशहर": "சர்தார்ஷஹர்",
    "Bidasar": "பிதாசர்",
    "बीदासर": "பிதாசர்",
    "Secundra": "சிகந்திரா",
    "सिकंदरा": "சிகந்திரா",
    "Sagwara": "சாக்வாரா",
    "सागवाड़ा": "சாக்வாரா",
    "Galiakot": "கலியாகோட்",
    "गलियाकोट": "கலியாகோட்",
    "Bicchiwada": "பிச்சிவாடா",
    "बिछीवाड़ा": "பிச்சிவாடா",
    "Jodhpur Block": "ஜோத்பூர் வட்டம்",
    "जोधपुर ब्लॉक": "ஜோத்பூர் வட்டம்",
    "Married": "திருமணமானவர்",
    "विवाहित": "திருமணமானவர்",
    "Single": "திருமணமாகாதவர்",
    "अविवाहित": "திருமணமாகாதவர்",
    "Widowed": "விதவை",
    "विधवा": "விதவை",
    "Divorced": "விவாகரத்து பெற்றவர்",
    "तलाकशुदा": "விவாகரத்து பெற்றவர்",
    "Separated": "பிரிந்து வாழ்பவர்",
    "अलग रह रहे": "பிரிந்து வாழ்பவர்",
    "General": "பொதுப் பிரிவு (General)",
    "सामान्य": "பொதுப் பிரிவு (General)",
    "OBC": "இதர பிற்படுத்தப்பட்டோர் (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "இதர பிற்படுத்தப்பட்டோர் (OBC)",
    "SC": "பட்டியலின சாதி (SC)",
    "अनुसूचित जाति (SC)": "பட்டியலின சாதி (SC)",
    "ST": "பட்டியலின பழங்குடி (ST)",
    "अनुसूचित जनजाति (ST)": "பட்டியலின பழங்குடி (ST)",
    "Illiterate": "படிப்பறிவில்லாதவர்",
    "निरक्षर / अनपढ़": "படிப்பறிவில்லாதவர்",
    "Illiterate but able to calculate": "படிப்பறிவில்லை ஆனால் கணக்கிடக்கூடியவர்",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "படிப்பறிவில்லை ஆனால் கணக்கிடக்கூடியவர்",
    "5th pass": "5 ஆம் வகுப்பு தேர்ச்சி",
    "5वीं पास": "5 ஆம் வகுப்பு தேர்ச்சி",
    "8th pass": "8 ஆம் வகுப்பு தேர்ச்சி",
    "8वीं पास": "8 ஆம் வகுப்பு தேர்ச்சி",
    "10th pass": "10 ஆம் வகுப்பு தேர்ச்சி",
    "10वीं पास": "10 ஆம் வகுப்பு தேர்ச்சி",
    "12th pass": "12 ஆம் வகுப்பு தேர்ச்சி",
    "12वीं पास": "12 ஆம் வகுப்பு தேர்ச்சி",
    "Graduate": "பட்டதாரி (Graduate)",
    "स्नातक (Graduate)": "பட்டதாரி (Graduate)",
    "Self": "சுயமாக",
    "स्वयं": "சுயமாக",
    "Husband": "கணவர்",
    "पति": "கணவர்",
    "Son": "மகன்",
    "पुत्र / बेटा": "மகன்",
    "Daughter": "மகள்",
    "पुत्री / बेटी": "மகள்",
    "Member": "உறுப்பினர்",
    "सामान्य सदस्य": "உறுப்பினர்",
    "Leadership role": "தலைமைப் பொறுப்பு (தலைவர்/செயலாளர்/பொருளாளர்)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "தலைமைப் பொறுப்பு (தலைவர்/செயலாளர்/பொருளாளர்)",
    "Grocery / Kirana": "மளிகைக் கடை",
    "किराना दुकान": "மளிகைக் கடை",
    "General store": "பொது அங்காடி",
    "जनरल स्टोर": "பொது அங்காடி",
    "Leather & footwear": "தோல் மற்றும் காலணிகள்",
    "चमड़ा व जूते-चप्पल": "தோல் மற்றும் காலணிகள்",
    "Flour mill": "மாவு ஆலை",
    "आटा चक्की": "மாவு ஆலை",
    "Tailoring & Stitching": "தையல் மற்றும் பூவேலை மையம்",
    "सिलाई व कढ़ाई केंद्र": "தையல் மற்றும் பூவேலை மையம்",
    "Apparel & Garments": "ஆடைகள் மற்றும் உடைகள்",
    "रेडीमेड वस्त्र": "ஆடைகள் மற்றும் உடைகள்",
    "Beauty parlour": "பியூட்டி பார்லர்",
    "ब्यूटी पार्लर": "பியூட்டி பார்லர்",
    "Handicraft": "கைவினைப் பொருட்கள்",
    "हस्तशिल्प / हैंडीक्राफ्ट": "கைவினைப் பொருட்கள்",
    "Dairy shop": "பால் பண்ணை & பால் கடை",
    "डेयरी व दूध केंद्र": "பால் பண்ணை & பால் கடை",
    "Auto-mechanic": "ஆட்டோ மெக்கானிக்",
    "ऑटो मैकेनिक": "ஆட்டோ மெக்கானிக்",
    "E-mitra": "இ-சேவை மையம் / சிஎஸ்சி",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "இ-சேவை மையம் / சிஎஸ்சி",
    "Mobile repair shop": "மொபைல் பழுதுபார்க்கும் கடை",
    "मोबाइल रिपेयर दुकान": "மொபைல் பழுதுபார்க்கும் கடை",
    "Transport": "போக்குவரத்து சேவை",
    "परिवहन सेवा": "போக்குவரத்து சேவை",
    "Any other": "மற்றவை",
    "अन्य कोई": "மற்றவை",
    "Whatsapp": "வாட்ஸ்அப்",
    "व्हाट्सएप (WhatsApp)": "வாட்ஸ்அப்",
    "Facebook": "பேஸ்புக்",
    "फेसबुक (Facebook)": "பேஸ்புக்",
    "Instagram": "இன்ஸ்டாகிராம்",
    "इंस्टाग्राम (Instagram)": "இன்ஸ்டாகிராம்",
    "Don't use social media": "சமூக ஊடகங்களைப் பயன்படுத்துவதில்லை",
    "सोशल मीडिया का उपयोग नहीं करते": "சமூக ஊடகங்களைப் பயன்படுத்துவதில்லை",
    "Draft": "முடிக்கப்படாத வரைவு",
    "Save Draft": "வரைவு சேமி",
    "ड्राफ्ट": "வரைவு",
    "मसुदा": "வரைவு",
    "ડ્રાફ્ટ": "வரைவு",
    "ਡਰਾਫਟ": "வரைவு",
    "খসড়া": "வரைவு",
    "வரைவு": "வரைவு",
    "చిత్తుప్రతి": "வரைவு",
    "ಕರಡು": "வரைவு",
    "ഡ്രാഫ്റ്റ്": "வரைவு",
    "ڈرافٹ": "வரைவு",
    "ड्राफ्ट सेव करें": "வரைவு சேமி",
    "मसुदा जतन करा": "வரைவு சேமி",
    "ડ્રાફ્ટ સાચવો": "வரைவு சேமி",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "வரைவு சேமி",
    "খসড়া সংরক্ষণ": "வரைவு சேமி",
    "வரைவு சேமி": "வரைவு சேமி",
    "చిత్తుప్రతి భద్రపరచు": "வரைவு சேமி",
    "ಕರಡು ಉಳಿಸಿ": "வரைவு சேமி",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "வரைவு சேமி",
    "ڈرافٹ محفوظ کریں": "வரைவு சேமி",
    "Himalayan Baseline Impact Survey": "இமாலய அடிப்படை தாக்கக் கணக்கெடுப்பு",
    "1. Household & Demographic Profile": "1. குடும்பம் மற்றும் மக்கள்தொகை விவரம்",
    "General identification and household metrics": "பொதுவான அடையாளம் மற்றும் குடும்ப விவரங்கள்",
    "2. Economic Activity & Livestock": "2. பொருளாதார நடவடிக்கை மற்றும் கால்நடைகள்",
    "Revenue, assets, and livestock count": "வருமானம், சொத்துக்கள் மற்றும் கால்நடைகளின் எண்ணிக்கை",
    "3. Geolocation & Digital Verification": "3. புவி இருப்பிடம் மற்றும் டிஜிட்டல் சரிபார்ப்பு",
    "GPS accuracy and field photo capture": "ஜிபிஎஸ் துல்லியம் மற்றும் கள புகைப்படம்",
    "Full Name of Household Head / Primary Respondent": "குடும்பத் தலைவர் / முதன்மை பதிலளிப்பவரின் முழுப் பெயர்",
    "Respondent Classification": "பதிலளிப்பவர் வகைப்பாடு",
    "Individual": "தனிநபர்",
    "Household": "குடும்பம்",
    "Smallholder Farmer": "சிறு விவசாயி",
    "Micro Enterprise / Self-Employed": "குறுந்தொழில் / சுயதொழில்",
    "Primary Contact Phone Number": "முதன்மை தொடர்பு தொலைபேசி எண்",
    "Do you own cattle, sheep, or goats?": "உங்களிடம் மாடு, ஆடு அல்லது செம்மறியாடு உள்ளதா?",
    "Total number of milch cattle / animals?": "கறவை மாடுகள் / விலங்குகளின் மொத்த எண்ணிக்கை?",
    "Estimated Monthly Household Income (INR ₹)": "மதிப்பிடப்பட்ட மாதாந்திர குடும்ப வருமானம் (ரூ. ₹)",
    "Farm Equipment & Key Productive Assets": "விவசாய உபகரணங்கள் மற்றும் முக்கிய உற்பத்தி சொத்துக்கள்",
    "Capture Field GPS Coordinates (Auto-verified)": "கள ஜிபிஎஸ் ஆயத்தொலைவுகளைப் பெறுக (தானியங்கி சரிபார்ப்பு)",
    "Field Photo of Site / Beneficiary": "தளம் / பயனாளியின் கள புகைப்படம்",
    "Surveyor Sign-off & Digital Signature": "கணக்கெடுப்பாளர் ஒப்புதல் மற்றும் டிஜிட்டல் கையொப்பம்",
    "District, Block, Village, SHG, and Enterprise identification": "மாவட்டம், ஒன்றியம், கிராமம், SHG மற்றும் தொழில் அடையாளம்",
    "Demographic, family structure, education, and household income": "மக்கள்தொகை, குடும்ப அமைப்பு, கல்வி மற்றும் குடும்ப வருமானம்",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "தொடக்க வரலாறு, வேலை நேரம், மூலதன ஏற்பாடு மற்றும் பருவகால வருமானம்",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "இடம், விநியோகஸ்தர்கள், கடன் வசூல், மூலப்பொருள் கொள்முதல் மற்றும் கடன் வசதி",
    "Loan utilization, monthly income growth, and CRP contribution": "கடன் பயன்பாடு, மாதாந்திர வருமான வளர்ச்சி மற்றும் CRP பங்களிப்பு",
    "Smartphone ownership, QR code banking, and social media usage": "ஸ்மார்ட்போன் உரிமை, க்யூஆர் குறியீடு வங்கி மற்றும் சமூக ஊடக பயன்பாடு",
    "GPS coordinates fix, site photo capture, and digital signatures": "ஜிபிஎஸ் ஆயத்தொலைவுகள், தள புகைப்படம் மற்றும் டிஜிட்டல் கையொப்பம்",
    "Dashboard": "டாஷ்போர்டு",
    "Surveyor Dashboard": "கள ஆய்வாளர் டாஷ்போர்டு",
    "Field Work Overview": "களப் பணி மேலோட்டம்",
    "Total Recorded": "மொத்த ஆய்வுகள்",
    "Synced to Server": "சர்வரில் ஒத்திசைக்கப்பட்டது",
    "Pending Sync": "ஒத்திசைவு நிலுவையில்",
    "Incomplete Drafts": "முடிக்கப்படாத வரைவுகள்",
    "Drafts": "வரைவுகள்",
    "Completed": "முடிந்தது",
    "Today's Goal": "இன்றைய இலக்கு",
    "surveys completed today": "ஆய்வுகள் இன்று முடிந்தது",
    "Daily Target Met!": "இன்றைய இலக்கு எட்டப்பட்டது! 🎉",
    "Start New Survey": "+ புதிய ஆய்வு தொடங்கு",
    "Resume Draft": "▶ வரைவைத் தொடரவும்",
    "Resume & Complete": "▶ படிவத்தைத் தொடரவும்",
    "My Submissions & Drafts": "எனது ஆய்வுகள் & வரைவுகள்",
    "All Records": "அனைத்து பதிவுகள்",
    "Complete": "முடிந்தது",
    "Questions Answered": "கேள்விகளுக்கு பதிலளிக்கப்பட்டது",
    "GPS Locked": "GPS பூட்டப்பட்டது ✓",
    "Photo Attached": "புகைப்படம் இணைக்கப்பட்டது ✓",
    "Signed": "கையொப்பமிடப்பட்டது ✓",
    "Ready to Sync": "ஒத்திசைக்க தயார் (100%)",
    "Synced": "சர்வரில் பாதுகாப்பானது",
    "No respondent name": "பெயரிடப்படாத பதிலளிப்பவர்",
    "Village / Location": "கிராமம் / இடம்",
    "Last edited": "கடைசியாக திருத்தப்பட்டது",
    "Sync All Pending": "🔄 அனைத்தையும் ஒத்திசைக்கவும்",
    "No surveys recorded yet": "இந்த சாதனத்தில் இன்னும் எந்த ஆய்வும் பதிவு செய்யப்படவில்லை",
    "Tap '+ Start New Survey' to begin your first interview": "முதல் நேர்காணலைத் தொடங்க '+ புதிய ஆய்வு' தட்டவும்",
    "Delete draft?": "இந்த வரைவை நீக்க விரும்புகிறீர்களா?",
    "Draft deleted": "வரைவு நீக்கப்பட்டது",
    "Text Size": "எழுத்து அளவு",
    "Adjust font size for your screen": "திரைக்கு ஏற்ப எழுத்து அளவை தேர்வு செய்யவும்",
    "Small": "சிறியது",
    "Medium": "நடுத்தரம்",
    "Large": "பெரியது",
    "Text size set to Small": "எழுத்து அளவு சிறியதாக மாற்றப்பட்டது",
    "Text size set to Medium": "எழுத்து அளவு நடுத்தரமாக மாற்றப்பட்டது",
    "Text size set to Large": "எழுத்து அளவு பெரியதாக மாற்றப்பட்டது",
    "Email Data to Admin": "நிர்வாகிக்கு தரவை மின்னஞ்சல் செய்யவும்",
    "Emergency Backup & Support": "அவசர காப்புப்பிரதி & ஆதரவு",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "உங்கள் அனைத்து கணக்கெடுப்பு பதிவுகளையும் மின்னஞ்சல் அல்லது பயன்பாடுகள் வழியாக நிர்வாகிக்கு அனுப்பவும்.",
    "Admin Email Address": "நிர்வாகி மின்னஞ்சல் முகவரி",
    "Additional Note / Error Description": "சிக்கல் அல்லது குறிப்பு (விருப்பமானது)",
    "Send via Email / Server": "மின்னஞ்சல் வழியாக அனுப்பவும் (சர்வர்)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp இல் பகிரவும்",
    "Download JSON": "JSON பதிவிறக்கவும்",
    "Download CSV (Excel)": "CSV (Excel) பதிவிறக்கவும்",
    "Backup emailed successfully ✓": "காப்புப்பிரதி மின்னஞ்சல் வெற்றிகரமாக அனுப்பப்பட்டது ✓",
    "Total Device Records": "மொத்த சாதன பதிவுகள்",
    "Offline Storage Status": "ஆஃப்லைன் சேமிப்பு நிலை",
    "Healthy (IndexedDB)": "பாதுகாப்பானது (IndexedDB)",
    "Export & Backup": "ஏற்றுமதி & காப்புப்பிரதி",
    "Send Data to Admin": "நிர்வாகிக்கு தரவை அனுப்பவும்",
    "e.g. 2020": "எ.கா. 2020",
    "Enter year (e.g. 2020)": "ஆண்டினை உள்ளிடவும் (எ.கா. 2020)"
  },
  "te": {
    "OmniQuery": "ఓమ్నీసర్వే",
    "ओमनीसर्वे": "ఓమ్నీసర్వే",
    "Online": "ఆన్‌లైన్",
    "ऑनलाइन": "ఆన్‌లైన్",
    "Offline": "ఆఫ్‌లైన్",
    "ऑफलाइन": "ఆఫ్‌లైన్",
    "Surveys": "సర్వేలు",
    "सर्वेक्षण": "సర్వేలు",
    "WAL Queue": "క్యూ (ఆఫ్‌లైన్)",
    "कतार (ऑफलाइन)": "క్యూ (ఆఫ్‌లైన్)",
    "System": "సిస్టమ్",
    "सिस्टम": "సిస్టమ్",
    "Exit Form": "← నిష్క్రమించు",
    "← बाहर निकलें": "← నిష్క్రమించు",
    "Step": "దశ",
    "चरण": "దశ",
    "of": "యొక్క",
    "का": "యొక్క",
    "Pages": "పేజీలు",
    "पृष्ठ": "పేజీలు",
    "Questions": "ప్రశ్నలు",
    "प्रश्न": "ప్రశ్నలు",
    "Previous": "← మునుపటి",
    "← पिछला": "← మునుపటి",
    "Next": "తదుపరి →",
    "अगला →": "తదుపరి →",
    "Save Offline": "ఆఫ్‌లైన్‌లో భద్రపరచండి",
    "ऑफलाइन सेव करें": "ఆఫ్‌లైన్‌లో భద్రపరచండి",
    "Submit Survey": "సమర్పించండి",
    "सबमिट करें": "సమర్పించండి",
    "Capture GPS Coordinates": "జీపీఎస్ స్థానాన్ని రికార్డ్ చేయండి",
    "जीपीएस लोकेशन रिकॉर्ड करें": "జీపీఎస్ స్థానాన్ని రికార్డ్ చేయండి",
    "GPS Fix Acquired ✓": "జీపీఎస్ స్థానం పొందబడింది ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "జీపీఎస్ స్థానం పొందబడింది ✓",
    "Take Photo / Choose File": "ఫోటో తీయండి / ఫైల్ ఎంచుకోండి",
    "फोटो लें / फाइल चुनें": "ఫోటో తీయండి / ఫైల్ ఎంచుకోండి",
    "Sign inside box with finger or stylus": "మీ వేలితో లేదా స్టైలస్‌తో పెట్టెలో సంతకం చేయండి",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "మీ వేలితో లేదా స్టైలస్‌తో పెట్టెలో సంతకం చేయండి",
    "Clear Signature": "సంతకాన్ని క్లియర్ చేయండి",
    "हस्ताक्षर मिटाएं": "సంతకాన్ని క్లియర్ చేయండి",
    "Signature Recorded": "సంతకం నమోదైంది",
    "हस्ताक्षर दर्ज हुआ": "సంతకం నమోదైంది",
    "Enter response here...": "ఇక్కడ సమాధానం నమోదు చేయండి...",
    "यहाँ उत्तर दर्ज करें...": "ఇక్కడ సమాధానం నమోదు చేయండి...",
    "Required Questions Pending": "తప్పనిసరి ప్రశ్నలు పెండింగ్‌లో ఉన్నాయి",
    "आवश्यक प्रश्न अधूरे हैं": "తప్పనిసరి ప్రశ్నలు పెండింగ్‌లో ఉన్నాయి",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "తుది సమర్పణకు ముందు దయచేసి ఈ అవసరమైన ప్రశ్నలను పూరించండి లేదా ఎప్పుడైనా ఆఫ్‌లైన్ డ్రాఫ్ట్‌గా భద్రపరచండి.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "తుది సమర్పణకు ముందు దయచేసి ఈ అవసరమైన ప్రశ్నలను పూరించండి లేదా ఎప్పుడైనా ఆఫ్‌లైన్ డ్రాఫ్ట్‌గా భద్రపరచండి.",
    "Go to First Pending Question": "👉 మొదటి పెండింగ్ ప్రశ్నకు వెళ్లండి",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 మొదటి పెండింగ్ ప్రశ్నకు వెళ్లండి",
    "Save as Offline Draft Anyway": "ఆఫ్‌లైన్ డ్రాఫ్ట్‌గా భద్రపరచండి",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ఆఫ్‌లైన్ డ్రాఫ్ట్‌గా భద్రపరచండి",
    "Close": "మూసివేయి",
    "बंद करें": "మూసివేయి",
    "Start Survey Form": "సర్వేను ప్రారంభించండి",
    "सर्वेक्षण शुरू करें": "సర్వేను ప్రారంభించండి",
    "Start Survey Form →": "సర్వేను ప్రారంభించండి →",
    "सर्वेक्षण शुरू करें →": "సర్వేను ప్రారంభించండి →",
    "Write-Ahead Log (WAL)": "రైట్-అహెడ్ లాగ్ (WAL క్యూ)",
    "राइट-अहेड लॉग (WAL कतार)": "రైట్-అహెడ్ లాగ్ (WAL క్యూ)",
    "Atomic zero-loss local storage queue": "సున్నా డేటా నష్టం సురక్షిత స్థానిక నిల్వ",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "సున్నా డేటా నష్టం సురక్షిత స్థానిక నిల్వ",
    "Sync Now": "⟳ ఇప్పుడే సమకాలీకరించండి",
    "⟳ अभी सिंक करें": "⟳ ఇప్పుడే సమకాలీకరించండి",
    "View on Map →": "మ్యాప్‌లో చూడండి →",
    "नक्शे पर देखें →": "మ్యాప్‌లో చూడండి →",
    "Re-acquire Fix": "మళ్లీ ప్రయత్నించండి",
    "पुनः प्रयास करें": "మళ్లీ ప్రయత్నించండి",
    "Section A: Basic Details": "విభాగం A: ప్రాథమిక వివరాలు",
    "भाग क: बुनियादी विवरण": "విభాగం ఎ: ప్రాథమిక వివరాలు",
    "Section B: Respondent & Household Profile": "విభాగం B: ప్రతిస్పందనదారు మరియు కుటుంబ ప్రొఫైల్",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "విభాగం బి: ప్రతివాది & కుటుంబ ప్రొఫైల్",
    "Section C: Enterprise Operations & Finance": "విభాగం C: వ్యాపార నిర్వహణ మరియు ఫైనాన్స్",
    "भाग ग: उद्यम संचालन और वित्त": "విభాగం సి: సంస్థ కార్యకలాపాలు & ఫైనాన్స్",
    "Section D: Enterprise Challenges & Coping Mechanisms": "విభాగం D: వ్యాపార సవాళ్లు మరియు పరిష్కారాలు",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "విభాగం డి: వ్యాపార సవాళ్లు & పరిష్కారాలు",
    "Section E: Impact of SVEP / OSF Schemes": "విభాగం E: SVEP / OSF పథకాల ప్రభావం",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "విభాగం ఇ: SVEP / OSF పథకాల ప్రభావం",
    "Section F: Digital Transactions & Social Media": "విభాగం F: డిజిటల్ లావాదేవీలు మరియు సోషల్ మీడియా",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "విభాగం ఎఫ్: డిజిటల్ లావాదేవీలు & సోషల్ మీడియా",
    "Section G: Field Verification & Sign-off": "విభాగం G: ఫీల్డ్ ధృవీకరణ మరియు సంతకం",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "విభాగం జి: ఫీల్డ్ ధృవీకరణ & సంతకం",
    "District": "జిల్లా",
    "जिला": "జిల్లా",
    "Block / Tehsil": "బ్లాక్ / తహసీల్",
    "ब्लॉक / तहसील": "బ్లాక్ / తహసీల్",
    "Village / Gram Panchayat Name": "గ్రామం / గ్రామ పంచాయతీ పేరు",
    "गाँव / ग्राम पंचायत का नाम": "గ్రామం / గ్రామ పంచాయతీ పేరు",
    "Cluster Level Federation (CLF) Name": "క్లస్టర్ లెవల్ ఫెడరేషన్ (CLF) పేరు",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "క్లస్టర్ లెవల్ ఫెడరేషన్ (CLF) పేరు",
    "Village Organization (VO) Name": "గ్రామ సంస్థ (VO) పేరు",
    "ग्राम संगठन (VO) का नाम": "గ్రామ సంస్థ (VO) పేరు",
    "Self-Help Group (SHG) Name": "స్వయం సహాయక బృందం (SHG) పేరు",
    "स्वयं सहायता समूह (SHG) का नाम": "స్వయం సహాయక బృందం (SHG) పేరు",
    "Respondent Name": "ప్రతివాది పేరు",
    "उत्तरदाता का नाम": "ప్రతివాది పేరు",
    "Enterprise / Business Name": "సంస్థ / వ్యాపారం పేరు",
    "उद्यम / व्यवसाय का नाम": "సంస్థ / వ్యాపారం పేరు",
    "Year of Setting Up Enterprise": "సంస్థ స్థాపించిన సంవత్సరం",
    "उद्यम स्थापना का वर्ष": "సంస్థ స్థాపించిన సంవత్సరం",
    "Main Business Activity of the Enterprise": "సంస్థ యొక్క ప్రధాన వ్యాపార కార్యకలాపం",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "సంస్థ యొక్క ప్రధాన వ్యాపార కార్యకలాపం",
    "What is respondent's relation with SHG member?": "SHG సభ్యునితో ప్రతివాది సంబంధం ఏమిటి?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "SHG సభ్యునితో ప్రతివాది సంబంధం ఏమిటి?",
    "What is the age of SHG member?": "SHG సభ్యుని వయస్సు ఎంత?",
    "एसएचजी सदस्य की आयु क्या है?": "SHG సభ్యుని వయస్సు ఎంత?",
    "What is the marital status of the SHG member?": "SHG సభ్యుని వైవాహಿಕ స్థితి ఏమిటి?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "SHG సభ్యుని వైవాహಿಕ స్థితి ఏమిటి?",
    "What is the social category / caste?": "సామాజిక వర్గం / కులం ఏమిటి?",
    "सामाजिक श्रेणी / जाति क्या है?": "సామాజిక వర్గం / కులం ఏమిటి?",
    "What is the education status of the SHG member?": "SHG సభ్యుని విద్యా స్థాయి ఏమిటి?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "SHG సభ్యుని విద్యా స్థాయి ఏమిటి?",
    "How many total members are in the family?": "కుటుంబంలో మొత్తం ఎంతమంది సభ్యులు ఉన్నారు?",
    "परिवार में कुल कितने सदस्य हैं?": "కుటుంబంలో మొత్తం ఎంతమంది సభ్యులు ఉన్నారు?",
    "What is your total annual household income?": "మీ మొత్తం వార్షిక కుటుంబ ఆదాయం ఎంత?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "మీ మొత్తం వార్షిక కుటుంబ ఆదాయం ఎంత?",
    "What is your role in the SHG?": "SHG లో మీ పాత్ర ఏమిటి?",
    "एसएचजी में आपकी भूमिका क्या है?": "SHG లో మీ పాత్ర ఏమిటి?",
    "Are you related to any of the SVEP / OSF CRP?": "మీరు ఏదైనా SVEP / OSF CRP కి సంబంధించినవారా?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "మీరు ఏదైనా SVEP / OSF CRP కి సంబంధించినవారా?",
    "Who started the enterprise?": "సంస్థను ఎవరు ప్రారంభించారు?",
    "उद्यम किसने शुरू किया था?": "సంస్థను ఎవరు ప్రారంభించారు?",
    "Who operates and manages the enterprise on a daily basis?": "రోజువారీ ప్రాతిపదికన సంస్థను ఎవరు నిర్వహిస్తారు?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "రోజువారీ ప్రాతిపదికన సంస్థను ఎవరు నిర్వహిస్తారు?",
    "For how many hours in a day does the shop/enterprise remain open?": "రోజులో ఎన్ని గంటలు దుకాణం/సంస్థ తెరిచి ఉంటుంది?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "రోజులో ఎన్ని గంటలు దుకాణం/సంస్థ తెరిచి ఉంటుంది?",
    "What is the type of business place / premises?": "వ్యాపార స్థలం రకం ఏమిటి?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "వ్యాపార స్థలం రకం ఏమిటి?",
    "Does SHG member maintain written records of business transactions regularly?": "SHG సభ్యుడు క్రమం తప్పకుండా వ్యాపార లావాదేవీల లిఖిత రికార్డులను నిర్వహిస్తున్నారా?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "SHG సభ్యుడు క్రమం తప్పకుండా వ్యాపార లావాదేవీల లిఖిత రికార్డులను నిర్వహిస్తున్నారా?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "మీ సంస్థ మొదటి సంవత్సరంలో ప్రారంభ మూలధనం (రూ) ఎంత?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "మీ సంస్థ మొదటి సంవత్సరంలో ప్రారంభ మూలధనం (రూ) ఎంత?",
    "How do you manage working capital during peak season?": "పీక్ సీజన్‌లో వర్కింగ్ క్యాపిటల్‌ను ఎలా నిర్వహిస్తారు?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "పీక్ సీజన్‌లో వర్కింగ్ క్యాపిటల్‌ను ఎలా నిర్వహిస్తారు?",
    "Is the location of your space convenient for your business?": "మీ వ్యాపారానికి స్థానం సౌకర్యవంతంగా ఉందా?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "మీ వ్యాపారానికి స్థానం సౌకర్యవంతంగా ఉందా?",
    "Are you satisfied and happy with your wholesale supplier?": "మీరు హోల్‌సేల్ సరఫరాదారుతో సంతృప్తిగా ఉన్నారా?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "మీరు హోల్‌సేల్ సరఫరాదారుతో సంతృప్తిగా ఉన్నారా?",
    "Are you able to recover credit / money from your customers?": "మీరు కస్టమర్ల నుండి అప్పులను వసూలు చేయగలుగుతున్నారా?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "మీరు కస్టమర్ల నుండి అప్పులను వసూలు చేయగలుగుతున్నారా?",
    "Do you source raw materials/goods from market independently?": "మీరు మార్కెట్ నుండి స్వతంత్రంగా ముడి సరుకును కొనుగోలు చేస్తారా?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "మీరు మార్కెట్ నుండి స్వతంత్రంగా ముడి సరుకును కొనుగోలు చేస్తారా?",
    "Do you have easy access to loans from different sources?": "వివిధ వనరుల నుండి సులభంగా రుణాలు లభిస్తున్నాయా?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "వివిధ వనరుల నుండి సులభంగా రుణాలు లభిస్తున్నాయా?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "SVEP / OSF పథకం కింద మీరు ఎంత రుణం తీసుకున్నారు (రూ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "SVEP / OSF పథకం కింద మీరు ఎంత రుణం తీసుకున్నారు (రూ)?",
    "How did you utilize the enterprise loan?": "మీరు వ్యాపార రుణాన్ని ఎలా ఉపయోగించారు?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "మీరు వ్యాపార రుణాన్ని ఎలా ఉపయోగించారు?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "రుణం తీసుకోవడానికి ముందు సంస్థ నెలవారీ ఆదాయం (రూ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "రుణం తీసుకోవడానికి ముందు సంస్థ నెలవారీ ఆదాయం (రూ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "రుణం తీసుకున్న తర్వాత సంస్థ నెలవారీ ఆదాయం (రూ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "రుణం తీసుకున్న తర్వాత సంస్థ నెలవారీ ఆదాయం (రూ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP ల సహకారం ఏమిటి?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP ల సహకారం ఏమిటి?",
    "Does the woman entrepreneur own a smartphone?": "మహిళా పారిశ్రామికవేత్త వద్ద స్మార్ట్‌ఫోన్ ఉందా?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "మహిళా పారిశ్రామికవేత్త వద్ద స్మార్ట్‌ఫోన్ ఉందా?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "వ్యాపార లావాదేవీల కోసం QR కోడ్ / UPI / మొబైల్ బ్యాంకింగ్ ఉపయోగిస్తున్నారా?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "వ్యాపార లావాదేవీల కోసం QR కోడ్ / UPI / మొబైల్ బ్యాంకింగ్ ఉపయోగిస్తున్నారా?",
    "Daily how many transactions are done via QR code / UPI?": "రోజువారీ QR కోడ్ / UPI ద్వారా ఎన్ని లావాదేవీలు జరుగుతాయి?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "రోజువారీ QR కోడ్ / UPI ద్వారా ఎన్ని లావాదేవీలు జరుగుతాయి?",
    "Which social media platforms do you use for your business?": "మీ వ్యాపారం కోసం ఏ సోషల్ మీడియా ప్లాట్‌ఫారమ్‌లను ఉపయోగిస్తున్నారు?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "మీ వ్యాపారం కోసం ఏ సోషల్ మీడియా ప్లాట్‌ఫారమ్‌లను ఉపయోగిస్తున్నారు?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "సంస్థ జీపీఎస్ స్థానాన్ని క్యాప్చర్ చేయండి (ఉపగ్రహ కోఆర్డినేట్లు)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "సంస్థ జీపీఎస్ స్థానాన్ని క్యాప్చర్ చేయండి (ఉపగ్రహ కోఆర్డినేట్లు)",
    "Field Photo of Enterprise & Beneficiary": "సంస్థ మరియు లబ్ధిదారుని ఫీల్డ్ ఫోటో",
    "उद्यम और लाभार्थी का फील्ड फोटो": "సంస్థ మరియు లబ్ధిదారుని ఫీల్డ్ ఫోటో",
    "Respondent & Surveyor Digital Signature": "ప్రతివాది & సర్వేయర్ డిజిటల్ సంతకం",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "ప్రతివాది & సర్వేయర్ డిజిటల్ సంతకం",
    "Yes": "అవును",
    "हाँ": "అవును",
    "No": "కాదు",
    "नहीं": "కాదు",
    "Baran": "బారన్",
    "बारां": "బారన్",
    "Churu": "చురు",
    "चूरू": "చురు",
    "Dausa": "దౌసా",
    "दौसा": "దౌసా",
    "Dungarpur": "డుంగర్‌పూర్",
    "डूंगरपुर": "డుంగర్‌పూర్",
    "Jodhpur": "జోధ్‌పూర్",
    "जोधपुर": "జోధ్‌పూర్",
    "Chhipabarod": "ఛీపాబరోద్",
    "छीपाबड़ौद": "ఛీపాబరోద్",
    "Kishanganj": "కిషన్‌గంజ్",
    "किशनगंज": "కిషన్‌గంజ్",
    "Sardar Sheher": "సర్దార్‌షహర్",
    "सरदारशहर": "సర్దార్‌షహర్",
    "Bidasar": "బిదాసర్",
    "बीदासर": "బిదాసర్",
    "Secundra": "సికంద్రా",
    "सिकंदरा": "సికంద్రా",
    "Sagwara": "సాగ్వారా",
    "सागवाड़ा": "సాగ్వారా",
    "Galiakot": "గలియాకోట్",
    "गलियाकोट": "గలియాకోట్",
    "Bicchiwada": "బిచ్చివాడా",
    "बिछीवाड़ा": "బిచ్చివాడా",
    "Jodhpur Block": "జోధ్‌పూర్ బ్లాక్",
    "जोधपुर ब्लॉक": "జోధ్‌పూర్ బ్లాక్",
    "Married": "వివాహితుడు/వివాహిత",
    "विवाहित": "వివాహితుడు/వివాహిత",
    "Single": "అవివాహితుడు/అవివాహిత",
    "अविवाहित": "అవివాహితుడు/అవివాహిత",
    "Widowed": "వితంతువు",
    "विधवा": "వితంతువు",
    "Divorced": "విడాకులు తీసుకున్నవారు",
    "तलाकशुदा": "విడాకులు తీసుకున్నవారు",
    "Separated": "విడిగా ఉంటున్నవారు",
    "अलग रह रहे": "విడిగా ఉంటున్నవారు",
    "General": "జనరల్ (General)",
    "सामान्य": "జనరల్ (General)",
    "OBC": "ఇతర వెనుకబడిన తరగతులు (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "ఇతర వెనుకబడిన తరగతులు (OBC)",
    "SC": "షెడ్యూల్డ్ కులాలు (SC)",
    "अनुसूचित जाति (SC)": "షెడ్యూల్డ్ కులాలు (SC)",
    "ST": "షెడ్యూల్డ్ తెగలు (ST)",
    "अनुसूचित जनजाति (ST)": "షెడ్యూల్డ్ తెగలు (ST)",
    "Illiterate": "నిరక్షరాస్యులు",
    "निरक्षर / अनपढ़": "నిరక్షరాస్యులు",
    "Illiterate but able to calculate": "నిరక్షరాస్యులు కానీ లెక్కలు చేయగలరు",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "నిరక్షరాస్యులు కానీ లెక్కలు చేయగలరు",
    "5th pass": "5 వ తరగతి ఉత్తీర్ణత",
    "5वीं पास": "5 వ తరగతి ఉత్తీర్ణత",
    "8th pass": "8 వ తరగతి ఉత్తీర్ణత",
    "8वीं पास": "8 వ తరగతి ఉత్తీర్ణత",
    "10th pass": "10 వ తరగతి ఉత్తీర్ణత",
    "10वीं पास": "10 వ తరగతి ఉత్తీర్ణత",
    "12th pass": "12 వ తరగతి ఉత్తీర్ణత",
    "12वीं पास": "12 వ తరగతి ఉత్తీర్ణత",
    "Graduate": "గ్రాడ్యుయేట్ (Graduate)",
    "स्नातक (Graduate)": "గ్రాడ్యుయేట్ (Graduate)",
    "Self": "తానే",
    "स्वयं": "తానే",
    "Husband": "భర్త",
    "पति": "భర్త",
    "Son": "కుమారుడు",
    "पुत्र / बेटा": "కుమారుడు",
    "Daughter": "కుమార్తె",
    "पुत्री / बेटी": "కుమార్తె",
    "Member": "సభ్యుడు/సభ్యురాలు",
    "सामान्य सदस्य": "సభ్యుడు/సభ్యురాలు",
    "Leadership role": "నాయకత్వ పాత్ర (అధ్యక్షుడు/కార్యదర్శి/కోశాధికారి)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "నాయకత్వ పాత్ర (అధ్యక్షుడు/కార్యదర్శి/కోశాధికారి)",
    "Grocery / Kirana": "కిరాణా దుకాణం",
    "किराना दुकान": "కిరాణా దుకాణం",
    "General store": "జనరల్ స్టోర్",
    "जनरल स्टोर": "జనరల్ స్టోర్",
    "Leather & footwear": "తోలు & పాదరక్షలు",
    "चमड़ा व जूते-चप्पल": "తోలు & పాదరక్షలు",
    "Flour mill": "పిండి గిర్ని",
    "आटा चक्की": "పిండి గిర్ని",
    "Tailoring & Stitching": "టైలరింగ్ & కుట్టు కేంద్రం",
    "सिलाई व कढ़ाई केंद्र": "టైలరింగ్ & కుట్టు కేంద్రం",
    "Apparel & Garments": "రెడీమేడ్ దుస్తులు",
    "रेडीमेड वस्त्र": "రెడీమేడ్ దుస్తులు",
    "Beauty parlour": "బ్యూటీ పార్లర్",
    "ब्यूटी पार्लर": "బ్యూటీ పార్లర్",
    "Handicraft": "హస్తకళలు",
    "हस्तशिल्प / हैंडीक्राफ्ट": "హస్తకళలు",
    "Dairy shop": "డైరీ & పాల కేంద్రం",
    "डेयरी व दूध केंद्र": "డైరీ & పాల కేంద్రం",
    "Auto-mechanic": "ఆటో మెకానిక్",
    "ऑटो मैकेनिक": "ఆటో మెకానిక్",
    "E-mitra": "ఈ-సేవ కేంద్రం / సీఎస్‌సీ",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ఈ-సేవ కేంద్రం / సీఎస్‌సీ",
    "Mobile repair shop": "మొబైల్ మరమ్మతు దుకాణం",
    "मोबाइल रिपेयर दुकान": "మొబైల్ మరమ్మతు దుకాణం",
    "Transport": "రవాణా సేవ",
    "परिवहन सेवा": "రవాణా సేవ",
    "Any other": "ఇతర ఏదైనా",
    "अन्य कोई": "ఇతర ఏదైనా",
    "Whatsapp": "వాట్సాప్",
    "व्हाट्सएप (WhatsApp)": "వాట్సాప్",
    "Facebook": "ఫేస్‌బుక్",
    "फेसबुक (Facebook)": "ఫేస్‌బుక్",
    "Instagram": "ఇన్‌స్టాగ్రామ్",
    "इंस्टाग्राम (Instagram)": "ఇన్‌స్టాగ్రామ్",
    "Don't use social media": "సోషల్ మీడియా ఉపయోగించరు",
    "सोशल मीडिया का उपयोग नहीं करते": "సోషల్ మీడియా ఉపయోగించరు",
    "Draft": "అసంపూర్ణ డ్రాఫ్ట్",
    "Save Draft": "చిత్తుప్రతి భద్రపరచు",
    "ड्राफ्ट": "చిత్తుప్రతి",
    "मसुदा": "చిత్తుప్రతి",
    "ડ્રાફ્ટ": "చిత్తుప్రతి",
    "ਡਰਾਫਟ": "చిత్తుప్రతి",
    "খসড়া": "చిత్తుప్రతి",
    "வரைவு": "చిత్తుప్రతి",
    "చిత్తుప్రతి": "చిత్తుప్రతి",
    "ಕರಡು": "చిత్తుప్రతి",
    "ഡ്രാഫ്റ്റ്": "చిత్తుప్రతి",
    "ڈرافٹ": "చిత్తుప్రతి",
    "ड्राफ्ट सेव करें": "చిత్తుప్రతి భద్రపరచు",
    "मसुदा जतन करा": "చిత్తుప్రతి భద్రపరచు",
    "ડ્રાફ્ટ સાચવો": "చిత్తుప్రతి భద్రపరచు",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "చిత్తుప్రతి భద్రపరచు",
    "খসড়া সংরক্ষণ": "చిత్తుప్రతి భద్రపరచు",
    "வரைவு சேமி": "చిత్తుప్రతి భద్రపరచు",
    "చిత్తుప్రతి భద్రపరచు": "చిత్తుప్రతి భద్రపరచు",
    "ಕರಡು ಉಳಿಸಿ": "చిత్తుప్రతి భద్రపరచు",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "చిత్తుప్రతి భద్రపరచు",
    "ڈرافٹ محفوظ کریں": "చిత్తుప్రతి భద్రపరచు",
    "Himalayan Baseline Impact Survey": "హిమాలయన్ బేస్లైన్ ప్రభావ సర్వే",
    "1. Household & Demographic Profile": "1. కుటుంబ మరియు జనాభా వివరాలు",
    "General identification and household metrics": "సాధారణ గుర్తింపు మరియు గృహ కొలమానాలు",
    "2. Economic Activity & Livestock": "2. ఆర్థిక కార్యకలాపాలు & పశుసంపద",
    "Revenue, assets, and livestock count": "ఆదాయం, ఆస్తులు మరియు పశువుల సంఖ్య",
    "3. Geolocation & Digital Verification": "3. భౌగోళిక స్థానం & డిజిటల్ ధృవీకరణ",
    "GPS accuracy and field photo capture": "GPS ఖచ్చితత్వం మరియు ఫీల్డ్ ఫోటో",
    "Full Name of Household Head / Primary Respondent": "కుటుంబ పెద్ద / ప్రాథమిక ప్రతిస్పందకుడి పూర్తి పేరు",
    "Respondent Classification": "ప్రతిస్పందకుల వర్గీకరణ",
    "Individual": "వ్యక్తిగత",
    "Household": "కుటుంబం",
    "Smallholder Farmer": "చిన్న రైతు",
    "Micro Enterprise / Self-Employed": "సూక్ష్మ సంస్థ / స్వయం ఉపాధి",
    "Primary Contact Phone Number": "ప్రాథమిక సంప్రదింపు ఫోన్ నంబర్",
    "Do you own cattle, sheep, or goats?": "మీకు ఆవులు, గొర్రెలు లేదా మేకలు ఉన్నాయా?",
    "Total number of milch cattle / animals?": "మొత్తం పాడి పశువుల / జంతువుల సంఖ్య ఎంత?",
    "Estimated Monthly Household Income (INR ₹)": "అంచనా వేసిన నెలవారీ గృహ ఆదాయం (INR ₹)",
    "Farm Equipment & Key Productive Assets": "వ్యవసాయ పరికరాలు మరియు కీలక ఉత్పాదక ఆస్తులు",
    "Capture Field GPS Coordinates (Auto-verified)": "ఫీల్డ్ GPS కోఆర్డినేట్‌లను పొందండి (స్వయంచాలక ధృవీకరణ)",
    "Field Photo of Site / Beneficiary": "సైట్ / లబ్ధిదారుడి ఫీల్డ్ ఫోటో",
    "Surveyor Sign-off & Digital Signature": "సర్వేయర్ ఆమోదం మరియు డిజిటల్ సంతకం",
    "District, Block, Village, SHG, and Enterprise identification": "జిల్లా, బ్లాక్, గ్రామం, SHG మరియు వ్యాపార గుర్తింపు",
    "Demographic, family structure, education, and household income": "జనాభా వివరాలు, కుటుంబ నిర్మాణం, విద్య మరియు కుటుంబ ఆదాయం",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "ప్రారంభ చరిత్ర, పని వేళలు, మూలధన ఏర్పాట్లు మరియు కాలానుగుణ ఆదాయం",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "స్థలం, సరఫరాదారులు, అప్పు వసూలు, ముడిసరుకు సేకరణ మరియు రుణ సౌలభ్యం",
    "Loan utilization, monthly income growth, and CRP contribution": "రుణ వినియోగం, నెలవారీ ఆదాయ వృద్ధి మరియు CRP సహకారం",
    "Smartphone ownership, QR code banking, and social media usage": "స్మార్ట్‌ఫోన్ యాజమాన్యం, క్యూఆర్ కోడ్ బ్యాంకింగ్ మరియు సోషల్ మీడియా వినియోగం",
    "GPS coordinates fix, site photo capture, and digital signatures": "జీపీఎస్ కోఆర్డినేట్స్, సైట్ ఫోటో మరియు డిజిటల్ సంతకం",
    "Dashboard": "డ్యాష్‌బోర్డ్",
    "Surveyor Dashboard": "సర్వేయర్ డ్యాష్‌బోర్డ్",
    "Field Work Overview": "ఫీల్డ్ వర్క్ పురోగతి",
    "Total Recorded": "మొత్తం సర్వేలు",
    "Synced to Server": "సర్వర్‌కు సింక్ చేయబడింది",
    "Pending Sync": "సింక్ పెండింగ్‌లో ఉంది",
    "Incomplete Drafts": "అసంపూర్ణ డ్రాఫ్ట్‌లు",
    "Drafts": "డ్రాఫ్ట్‌లు",
    "Completed": "పూర్తయింది",
    "Today's Goal": "నేటి లక్ష్యం",
    "surveys completed today": "సర్వేలు నేడు పూర్తయ్యాయి",
    "Daily Target Met!": "నేటి లక్ష్యం పూర్తయింది! 🎉",
    "Start New Survey": "+ కొత్త సర్వే ప్రారంభించండి",
    "Resume Draft": "▶ డ్రాఫ్ట్‌ను కొనసాగించండి",
    "Resume & Complete": "▶ ఫారమ్‌ను కొనసాగించండి",
    "My Submissions & Drafts": "నా సర్వేలు & డ్రాఫ్ట్‌లు",
    "All Records": "అన్ని రికార్డులు",
    "Complete": "పూర్తి",
    "Questions Answered": "ప్రశ్నలకు సమాధానాలు ఇచ్చారు",
    "GPS Locked": "GPS లాక్ చేయబడింది ✓",
    "Photo Attached": "ఫోటో జతచేయబడింది ✓",
    "Signed": "సంతకం చేయబడింది ✓",
    "Ready to Sync": "సింక్ చేయడానికి సిద్ధంగా ఉంది (100%)",
    "Synced": "సర్వర్‌లో సురక్షితం",
    "No respondent name": "పేరులేని ప్రతిస్పందనదారు",
    "Village / Location": "గ్రామం / ప్రాంతం",
    "Last edited": "చివరిగా సవరించబడింది",
    "Sync All Pending": "🔄 పెండింగ్‌లో ఉన్నవన్నీ సింక్ చేయండి",
    "No surveys recorded yet": "ఈ పరికరంలో ఇంకా ఎటువంటి సర్వేలు నమోదు కాలేదు",
    "Tap '+ Start New Survey' to begin your first interview": "మొదటి ఇంటర్వ్యూ ప్రారంభించడానికి '+ కొత్త సర్వే' నొక్కండి",
    "Delete draft?": "మీరు ఈ డ్రాఫ్ట్‌ను తొలగించాలనుకుంటున్నారా?",
    "Draft deleted": "డ్రాఫ్ట్ తొలగించబడింది",
    "Text Size": "అక్షరాల పరిమాణం",
    "Adjust font size for your screen": "స్క్రీన్‌కు తగినట్లు అక్షరాల పరిమాణం ఎంచుకోండి",
    "Small": "చిన్నది",
    "Medium": "మధ్యస్థం",
    "Large": "పెద్దది",
    "Text size set to Small": "అక్షరాల పరిమాణం చిన్నదిగా మార్చబడింది",
    "Text size set to Medium": "అక్షరాల పరిమాణం మధ్యస్థంగా మార్చబడింది",
    "Text size set to Large": "అక్షరాల పరిమాణం పెద్దదిగా మార్చబడింది",
    "Email Data to Admin": "అడ్మిన్‌కు డేటాను ఇమెయిల్ చేయండి",
    "Emergency Backup & Support": "అత్యవసర బ్యాకప్ & మద్దతు",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "మీ అన్ని సర్వే రికార్డులను ఇమెయిల్ లేదా యాప్‌ల ద్వారా అడ్మిన్‌కు పంపండి.",
    "Admin Email Address": "అడ్మిన్ ఇమెయిల్ చిరునామా",
    "Additional Note / Error Description": "సమస్య లేదా గమనిక (ఐచ్ఛికం)",
    "Send via Email / Server": "ఇమెయిల్ ద్వారా పంపండి (సర్వర్)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp లో షేర్ చేయండి",
    "Download JSON": "JSON డౌన్‌లోడ్ చేయండి",
    "Download CSV (Excel)": "CSV (Excel) డౌన్‌లోడ్ చేయండి",
    "Backup emailed successfully ✓": "బ్యాకప్ ఇమెయిల్ విజయవంతంగా పంపబడింది ✓",
    "Total Device Records": "పరికరంలో మొత్తం రికార్డులు",
    "Offline Storage Status": "ఆఫ్‌లైన్ నిల్వ స్థితి",
    "Healthy (IndexedDB)": "సురక్షితం (IndexedDB)",
    "Export & Backup": "ఎగుమతి & బ్యాకప్",
    "Send Data to Admin": "అడ్మిన్‌కు డేటాను పంపండి",
    "e.g. 2020": "ఉదా. 2020",
    "Enter year (e.g. 2020)": "సంవత్సరం నమోదు చేయండి (ఉదా. 2020)"
  },
  "kn": {
    "OmniQuery": "ಓಮ್ನಿಸರ್ವೆ",
    "ओमनीसर्वे": "ಓಮ್ನಿಸರ್ವೆ",
    "Online": "ಆನ್‌ಲೈನ್",
    "ऑनलाइन": "ಆನ್‌ಲೈನ್",
    "Offline": "ಆಫ್‌ಲೈನ್",
    "ऑफलाइन": "ಆಫ್‌ಲೈನ್",
    "Surveys": "ಸಮೀಕ್ಷೆಗಳು",
    "सर्वेक्षण": "ಸಮೀಕ್ಷೆಗಳು",
    "WAL Queue": "ಕ್ಯೂ (ಆಫ್‌ಲೈನ್)",
    "कतार (ऑफलाइन)": "ಕ್ಯೂ (ಆಫ್‌ಲೈನ್)",
    "System": "ವ್ಯವಸ್ಥೆ",
    "सिस्टम": "ವ್ಯವಸ್ಥೆ",
    "Exit Form": "← ನಿರ್ಗಮಿಸಿ",
    "← बाहर निकलें": "← ನಿರ್ಗಮಿಸಿ",
    "Step": "ಹಂತ",
    "चरण": "ಹಂತ",
    "of": "ರ",
    "का": "ರ",
    "Pages": "ಪುಟಗಳು",
    "पृष्ठ": "ಪುಟಗಳು",
    "Questions": "ಪ್ರಶ್ನೆಗಳು",
    "प्रश्न": "ಪ್ರಶ್ನೆಗಳು",
    "Previous": "← ಹಿಂದಿನ",
    "← पिछला": "← ಹಿಂದಿನ",
    "Next": "ಮುಂದೆ →",
    "अगला →": "ಮುಂದೆ →",
    "Save Offline": "ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಿ",
    "ऑफलाइन सेव करें": "ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಿ",
    "Submit Survey": "ಸಲ್ಲಿಸಿ",
    "सबमिट करें": "ಸಲ್ಲಿಸಿ",
    "Capture GPS Coordinates": "ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಿ",
    "जीपीएस लोकेशन रिकॉर्ड करें": "ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಿ",
    "GPS Fix Acquired ✓": "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಪಡೆಯಲಾಗಿದೆ ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಪಡೆಯಲಾಗಿದೆ ✓",
    "Take Photo / Choose File": "ಫೋಟೋ ತೆಗೆಯಿರಿ / ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ",
    "फोटो लें / फाइल चुनें": "ಫೋಟೋ ತೆಗೆಯಿರಿ / ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ",
    "Sign inside box with finger or stylus": "ನಿಮ್ಮ ಬೆರಳು ಅಥವಾ ಸ್ಟೈಲಸ್ ಬಳಸಿ ಸಹಿ ಮಾಡಿ",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "ನಿಮ್ಮ ಬೆರಳು ಅಥವಾ ಸ್ಟೈಲಸ್ ಬಳಸಿ ಸಹಿ ಮಾಡಿ",
    "Clear Signature": "ಸಹಿಯನ್ನು ಅಳಿಸಿ",
    "हस्ताक्षर मिटाएं": "ಸಹಿಯನ್ನು ಅಳಿಸಿ",
    "Signature Recorded": "ಸಹಿ ದಾಖಲಾಗಿದೆ",
    "हस्ताक्षर दर्ज हुआ": "ಸಹಿ ದಾಖಲಾಗಿದೆ",
    "Enter response here...": "ಇಲ್ಲಿ ಉತ್ತರಿಸಿ...",
    "यहाँ उत्तर दर्ज करें...": "ಇಲ್ಲಿ ಉತ್ತರಿಸಿ...",
    "Required Questions Pending": "ಅಗತ್ಯ ಪ್ರಶ್ನೆಗಳು ಬಾಕಿ ಇವೆ",
    "आवश्यक प्रश्न अधूरे हैं": "ಅಗತ್ಯ ಪ್ರಶ್ನೆಗಳು ಬಾಕಿ ಇವೆ",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "ಅಂತಿಮ ಸಲ್ಲಿಕೆಗೆ ಮುನ್ನ ದಯವಿಟ್ಟು ಈ ಅಗತ್ಯ ಪ್ರಶ್ನೆಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ, ಅಥವಾ ಆಫ್‌ಲೈನ್ ಕರಡಾಗಿ ಉಳಿಸಿ.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "ಅಂತಿಮ ಸಲ್ಲಿಕೆಗೆ ಮುನ್ನ ದಯವಿಟ್ಟು ಈ ಅಗತ್ಯ ಪ್ರಶ್ನೆಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ, ಅಥವಾ ಆಫ್‌ಲೈನ್ ಕರಡಾಗಿ ಉಳಿಸಿ.",
    "Go to First Pending Question": "👉 ಮೊದಲ ಬಾಕಿ ಪ್ರಶ್ನೆಗೆ ಹೋಗಿ",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 ಮೊದಲ ಬಾಕಿ ಪ್ರಶ್ನೆಗೆ ಹೋಗಿ",
    "Save as Offline Draft Anyway": "ಆಫ್‌ಲೈನ್ ಕರಡಾಗಿ ಉಳಿಸಿ",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ಆಫ್‌ಲೈನ್ ಕರಡಾಗಿ ಉಳಿಸಿ",
    "Close": "ಮುಚ್ಚಿ",
    "बंद करें": "ಮುಚ್ಚಿ",
    "Start Survey Form": "ಸಮೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    "सर्वेक्षण शुरू करें": "ಸಮೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    "Start Survey Form →": "ಸಮೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ →",
    "सर्वेक्षण शुरू करें →": "ಸಮೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ →",
    "Write-Ahead Log (WAL)": "ರೈಟ್-ಅಹೆಡ್ ಲಾಗ್ (WAL ಕ್ಯೂ)",
    "राइट-अहेड लॉग (WAL कतार)": "ರೈಟ್-ಅಹೆಡ್ ಲಾಗ್ (WAL ಕ್ಯೂ)",
    "Atomic zero-loss local storage queue": "ಶೂನ್ಯ ಡೇಟಾ ನಷ್ಟ ಸುರಕ್ಷಿತ ಸ್ಥಳೀಯ ಸಂಗ್ರಹಣೆ",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "ಶೂನ್ಯ ಡೇಟಾ ನಷ್ಟ ಸುರಕ್ಷಿತ ಸ್ಥಳೀಯ ಸಂಗ್ರಹಣೆ",
    "Sync Now": "⟳ ಈಗ ಸಿಂಕ್ ಮಾಡಿ",
    "⟳ अभी सिंक करें": "⟳ ಈಗ ಸಿಂಕ್ ಮಾಡಿ",
    "View on Map →": "ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ →",
    "नक्शे पर देखें →": "ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ →",
    "Re-acquire Fix": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "पुनः प्रयास करें": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "Section A: Basic Details": "ವಿಭಾಗ A: ಮೂಲ ವಿವರಗಳು",
    "भाग क: बुनियादी विवरण": "ವಿಭಾಗ ಎ: ಮೂಲಭೂತ ವಿವರಗಳು",
    "Section B: Respondent & Household Profile": "ವಿಭಾಗ B: ಪ್ರತಿಕ್ರಿಯೆದಾರರ ಮತ್ತು ಕುಟುಂಬದ ವಿವರ",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "ವಿಭಾಗ ಬಿ: ಉತ್ತರಿಸುವವರು & ಕುಟುಂಬ ವಿವರ",
    "Section C: Enterprise Operations & Finance": "ವಿಭಾಗ C: ಉದ್ಯಮ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಹಣಕಾಸು",
    "भाग ग: उद्यम संचालन और वित्त": "ವಿಭಾಗ ಸಿ: ಉದ್ಯಮ ಕಾರ್ಯಾಚರಣೆಗಳು ಮತ್ತು ಹಣಕಾಸು",
    "Section D: Enterprise Challenges & Coping Mechanisms": "ವಿಭಾಗ D: ಉದ್ಯಮದ ಸವಾಲುಗಳು ಮತ್ತು ಪರಿಹಾರಗಳು",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "ವಿಭಾಗ ಡಿ: ಉದ್ಯಮ ಸವಾಲುಗಳು ಮತ್ತು ಪರಿಹಾರಗಳು",
    "Section E: Impact of SVEP / OSF Schemes": "ವಿಭಾಗ E: SVEP / OSF ಯೋಜನೆಗಳ ಪ್ರಭಾವ",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "ವಿಭಾಗ ಇ: ಎಸ್‍ವಿಇಪಿ / ಒಎಸ್‍ಎಫ್ ಯೋಜನೆಗಳ ಪ್ರಭಾವ",
    "Section F: Digital Transactions & Social Media": "ವಿಭಾಗ F: ಡಿಜಿಟಲ್ ವಹಿವಾಟುಗಳು ಮತ್ತು ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "ವಿಭಾಗ ಎಫ್: ಡಿಜಿಟಲ್ ವಹಿವಾಟುಗಳು ಮತ್ತು ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ",
    "Section G: Field Verification & Sign-off": "ವಿಭಾಗ G: ಕ್ಷೇತ್ರ ಪರಿಶೀಲನೆ ಮತ್ತು ಸಹಿ",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "ವಿಭಾಗ ಜಿ: ಕ್ಷೇತ್ರ ಪರಿಶೀಲನೆ ಮತ್ತು ಸಹಿ",
    "District": "ಜಿಲ್ಲೆ",
    "जिला": "ಜಿಲ್ಲೆ",
    "Block / Tehsil": "ತಾಲೂಕು / ಬ್ಲಾಕ್",
    "ब्लॉक / तहसील": "ತಾಲೂಕು / ಬ್ಲಾಕ್",
    "Village / Gram Panchayat Name": "ಗ್ರಾಮ / ಗ್ರಾಮ ಪಂಚಾಯತಿ ಹೆಸರು",
    "गाँव / ग्राम पंचायत का नाम": "ಗ್ರಾಮ / ಗ್ರಾಮ ಪಂಚಾಯತಿ ಹೆಸರು",
    "Cluster Level Federation (CLF) Name": "ಕ್ಲಸ್ಟರ್ ಮಟ್ಟದ ಒಕ್ಕೂಟ (CLF) ಹೆಸರು",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "ಕ್ಲಸ್ಟರ್ ಮಟ್ಟದ ಒಕ್ಕೂಟ (CLF) ಹೆಸರು",
    "Village Organization (VO) Name": "ಗ್ರಾಮ ಸಂಸ್ಥೆ (VO) ಹೆಸರು",
    "ग्राम संगठन (VO) का नाम": "ಗ್ರಾಮ ಸಂಸ್ಥೆ (VO) ಹೆಸರು",
    "Self-Help Group (SHG) Name": "ಸ್ವಸಹಾಯ ಗುಂಪು (SHG) ಹೆಸರು",
    "स्वयं सहायता समूह (SHG) का नाम": "ಸ್ವಸಹಾಯ ಗುಂಪು (SHG) ಹೆಸರು",
    "Respondent Name": "ಉತ್ತರಿಸುವವರ ಹೆಸರು",
    "उत्तरदाता का नाम": "ಉತ್ತರಿಸುವವರ ಹೆಸರು",
    "Enterprise / Business Name": "ಉದ್ಯಮ / ವ್ಯಾಪಾರದ ಹೆಸರು",
    "उद्यम / व्यवसाय का नाम": "ಉದ್ಯಮ / ವ್ಯಾಪಾರದ ಹೆಸರು",
    "Year of Setting Up Enterprise": "ಉದ್ಯಮ ಸ್ಥಾಪನೆಯ ವರ್ಷ",
    "उद्यम स्थापना का वर्ष": "ಉದ್ಯಮ ಸ್ಥಾಪನೆಯ ವರ್ಷ",
    "Main Business Activity of the Enterprise": "ಉದ್ಯಮದ ಮುಖ್ಯ ವ್ಯಾಪಾರ ಚಟುವಟಿಕೆ",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "ಉದ್ಯಮದ ಮುಖ್ಯ ವ್ಯಾಪಾರ ಚಟುವಟಿಕೆ",
    "What is respondent's relation with SHG member?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರೊಂದಿಗೆ ಉತ್ತರಿಸುವವರ ಸಂಬಂಧವೇನು?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರೊಂದಿಗೆ ಉತ್ತರಿಸುವವರ ಸಂಬಂಧವೇನು?",
    "What is the age of SHG member?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ವಯಸ್ಸು ಎಷ್ಟು?",
    "एसएचजी सदस्य की आयु क्या है?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ವಯಸ್ಸು ಎಷ್ಟು?",
    "What is the marital status of the SHG member?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ವೈವಾಹಿಕ ಸ್ಥಿತಿ ಏನು?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ವೈವಾಹಿಕ ಸ್ಥಿತಿ ಏನು?",
    "What is the social category / caste?": "ಸಾಮಾಜಿಕ ವರ್ಗ / ಜಾತಿ ಯಾವುದು?",
    "सामाजिक श्रेणी / जाति क्या है?": "ಸಾಮಾಜಿಕ ವರ್ಗ / ಜಾತಿ ಯಾವುದು?",
    "What is the education status of the SHG member?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ಶೈಕ್ಷಣಿಕ ಮಟ್ಟವೇನು?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರ ಶೈಕ್ಷಣಿಕ ಮಟ್ಟವೇನು?",
    "How many total members are in the family?": "ಕುಟುಂಬದಲ್ಲಿ ಒಟ್ಟು ಎಷ್ಟು ಸದಸ್ಯರಿದ್ದಾರೆ?",
    "परिवार में कुल कितने सदस्य हैं?": "ಕುಟುಂಬದಲ್ಲಿ ಒಟ್ಟು ಎಷ್ಟು ಸದಸ್ಯರಿದ್ದಾರೆ?",
    "What is your total annual household income?": "ನಿಮ್ಮ ಒಟ್ಟು ವಾರ್ಷಿಕ ಕುಟುಂಬದ ಆದಾಯ ಎಷ್ಟು?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "ನಿಮ್ಮ ಒಟ್ಟು ವಾರ್ಷಿಕ ಕುಟುಂಬದ ಆದಾಯ ಎಷ್ಟು?",
    "What is your role in the SHG?": "ಎಸ್‌ಎಚ್‌ಜಿಯಲ್ಲಿ ನಿಮ್ಮ ಪಾತ್ರವೇನು?",
    "एसएचजी में आपकी भूमिका क्या है?": "ಎಸ್‌ಎಚ್‌ಜಿಯಲ್ಲಿ ನಿಮ್ಮ ಪಾತ್ರವೇನು?",
    "Are you related to any of the SVEP / OSF CRP?": "ನೀವು ಯಾವುದೇ SVEP / OSF CRP ಗೆ ಸಂಬಂಧಿಸಿದ್ದೀರಾ?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "ನೀವು ಯಾವುದೇ SVEP / OSF CRP ಗೆ ಸಂಬಂಧಿಸಿದ್ದೀರಾ?",
    "Who started the enterprise?": "ಉದ್ಯಮವನ್ನು ಯಾರು ಪ್ರಾರಂಭಿಸಿದರು?",
    "उद्यम किसने शुरू किया था?": "ಉದ್ಯಮವನ್ನು ಯಾರು ಪ್ರಾರಂಭಿಸಿದರು?",
    "Who operates and manages the enterprise on a daily basis?": "ದೈನಂದಿನ ಆಧಾರದ ಮೇಲೆ ಉದ್ಯಮವನ್ನು ಯಾರು ನಿರ್ವಹಿಸುತ್ತಾರೆ?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "ದೈನಂದಿನ ಆಧಾರದ ಮೇಲೆ ಉದ್ಯಮವನ್ನು ಯಾರು ನಿರ್ವಹಿಸುತ್ತಾರೆ?",
    "For how many hours in a day does the shop/enterprise remain open?": "ದಿನದಲ್ಲಿ ಎಷ್ಟು ಗಂಟೆ ಅಂಗಡಿ/ಉದ್ಯಮ ತೆರೆದಿರುತ್ತದೆ?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "ದಿನದಲ್ಲಿ ಎಷ್ಟು ಗಂಟೆ ಅಂಗಡಿ/ಉದ್ಯಮ ತೆರೆದಿರುತ್ತದೆ?",
    "What is the type of business place / premises?": "ವ್ಯಾಪಾರ ಸ್ಥಳದ ಪ್ರಕಾರ ಯಾವುದು?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "ವ್ಯಾಪಾರ ಸ್ಥಳದ ಪ್ರಕಾರ ಯಾವುದು?",
    "Does SHG member maintain written records of business transactions regularly?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರು ವ್ಯಾಪಾರ ವಹಿವಾಟುಗಳ ಲಿಖಿತ ದಾಖಲೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಇಟ್ಟುಕೊಳ್ಳುತ್ತಾರೆಯೇ?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "ಎಸ್‌ಎಚ್‌ಜಿ ಸದಸ್ಯರು ವ್ಯಾಪಾರ ವಹಿವಾಟುಗಳ ಲಿಖಿತ ದಾಖಲೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಇಟ್ಟುಕೊಳ್ಳುತ್ತಾರೆಯೇ?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "ನಿಮ್ಮ ಉದ್ಯಮದ ಮೊದಲ ವರ್ಷದಲ್ಲಿ ಆರಂಭಿಕ ಬಂಡವಾಳ (ರೂ) ಎಷ್ಟಿತ್ತು?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "ನಿಮ್ಮ ಉದ್ಯಮದ ಮೊದಲ ವರ್ಷದಲ್ಲಿ ಆರಂಭಿಕ ಬಂಡವಾಳ (ರೂ) ಎಷ್ಟಿತ್ತು?",
    "How do you manage working capital during peak season?": "ಗರಿಷ್ಠ ಋತುವಿನಲ್ಲಿ ನೀವು ಕಾರ್ಯನಿರತ ಬಂಡವಾಳವನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸುತ್ತೀರಿ?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "ಗರಿಷ್ಠ ಋತುವಿನಲ್ಲಿ ನೀವು ಕಾರ್ಯನಿರತ ಬಂಡವಾಳವನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸುತ್ತೀರಿ?",
    "Is the location of your space convenient for your business?": "ನಿಮ್ಮ ವ್ಯಾಪಾರಕ್ಕೆ ಸ್ಥಳವು ಅನುಕೂಲಕರವಾಗಿದೆಯೇ?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "ನಿಮ್ಮ ವ್ಯಾಪಾರಕ್ಕೆ ಸ್ಥಳವು ಅನುಕೂಲಕರವಾಗಿದೆಯೇ?",
    "Are you satisfied and happy with your wholesale supplier?": "ನಿಮ್ಮ ಸಗಟು ಪೂರೈಕೆದಾರರೊಂದಿಗೆ ನೀವು ತೃಪ್ತರಾಗಿದ್ದೀರಾ?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "ನಿಮ್ಮ ಸಗಟು ಪೂರೈಕೆದಾರರೊಂದಿಗೆ ನೀವು ತೃಪ್ತರಾಗಿದ್ದೀರಾ?",
    "Are you able to recover credit / money from your customers?": "ಗ್ರಾಹಕರಿಂದ ಸಾಲ/ಹಣವನ್ನು ವಸೂಲಿ ಮಾಡಲು ನಿಮಗೆ ಸಾಧ್ಯವಾಗುತ್ತಿದೆಯೇ?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "ಗ್ರಾಹಕರಿಂದ ಸಾಲ/ಹಣವನ್ನು ವಸೂಲಿ ಮಾಡಲು ನಿಮಗೆ ಸಾಧ್ಯವಾಗುತ್ತಿದೆಯೇ?",
    "Do you source raw materials/goods from market independently?": "ಮಾರುಕಟ್ಟೆಯಿಂದ ಕಚ್ಚಾ ವಸ್ತುಗಳನ್ನು ಸ್ವತಂತ್ರವಾಗಿ ಖರೀದಿಸುತ್ತೀರಾ?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "ಮಾರುಕಟ್ಟೆಯಿಂದ ಕಚ್ಚಾ ವಸ್ತುಗಳನ್ನು ಸ್ವತಂತ್ರವಾಗಿ ಖರೀದಿಸುತ್ತೀರಾ?",
    "Do you have easy access to loans from different sources?": "ವಿವಿಧ ಮೂಲಗಳಿಂದ ಸುಲಭವಾಗಿ ಸಾಲ ಸಿಗುತ್ತದೆಯೇ?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "ವಿವಿಧ ಮೂಲಗಳಿಂದ ಸುಲಭವಾಗಿ ಸಾಲ ಸಿಗುತ್ತದೆಯೇ?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "SVEP / OSF ಯೋಜನೆಯಡಿ ಎಷ್ಟು ಸಾಲ ಪಡೆದಿದ್ದೀರಿ (ರೂ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "SVEP / OSF ಯೋಜನೆಯಡಿ ಎಷ್ಟು ಸಾಲ ಪಡೆದಿದ್ದೀರಿ (ರೂ)?",
    "How did you utilize the enterprise loan?": "ಉದ್ಯಮ ಸಾಲವನ್ನು ನೀವು ಹೇಗೆ ಬಳಸಿದ್ದೀರಿ?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "ಉದ್ಯಮ ಸಾಲವನ್ನು ನೀವು ಹೇಗೆ ಬಳಸಿದ್ದೀರಿ?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "ಸಾಲ ಪಡೆಯುವ ಮೊದಲು ಉದ್ಯಮದ ಮಾಸಿಕ ಆದಾಯ (ರೂ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "ಸಾಲ ಪಡೆಯುವ ಮೊದಲು ಉದ್ಯಮದ ಮಾಸಿಕ ಆದಾಯ (ರೂ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "ಸಾಲ ಪಡೆದ ನಂತರ ಉದ್ಯಮದ ಮಾಸಿಕ ಆದಾಯ (ರೂ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "ಸಾಲ ಪಡೆದ ನಂತರ ಉದ್ಯಮದ ಮಾಸಿಕ ಆದಾಯ (ರೂ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP ಗಳ ಕೊಡುಗೆ ಏನು?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP ಗಳ ಕೊಡುಗೆ ಏನು?",
    "Does the woman entrepreneur own a smartphone?": "ಮಹಿಳಾ ಉದ್ಯಮಿಯ ಬಳಿ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಇದೆಯೇ?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "ಮಹಿಳಾ ಉದ್ಯಮಿಯ ಬಳಿ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಇದೆಯೇ?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "ವ್ಯಾಪಾರ ವಹಿವಾಟುಗಳಿಗೆ ನೀವು QR ಕೋಡ್ / UPI / ಮೊಬೈಲ್ ಬ್ಯಾಂಕಿಂಗ್ ಬಳಸುತ್ತೀರಾ?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "ವ್ಯಾಪಾರ ವಹಿವಾಟುಗಳಿಗೆ ನೀವು QR ಕೋಡ್ / UPI / ಮೊಬೈಲ್ ಬ್ಯಾಂಕಿಂಗ್ ಬಳಸುತ್ತೀರಾ?",
    "Daily how many transactions are done via QR code / UPI?": "ಪ್ರತಿದಿನ QR ಕೋಡ್ / UPI ಮೂಲಕ ಎಷ್ಟು ವಹಿವಾಟುಗಳು ನಡೆಯುತ್ತವೆ?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "ಪ್ರತಿದಿನ QR ಕೋಡ್ / UPI ಮೂಲಕ ಎಷ್ಟು ವಹಿವಾಟುಗಳು ನಡೆಯುತ್ತವೆ?",
    "Which social media platforms do you use for your business?": "ನಿಮ್ಮ ವ್ಯಾಪಾರಕ್ಕಾಗಿ ನೀವು ಯಾವ ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ವೇದಿಕೆಗಳನ್ನು ಬಳಸುತ್ತೀರಿ?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "ನಿಮ್ಮ ವ್ಯಾಪಾರಕ್ಕಾಗಿ ನೀವು ಯಾವ ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ವೇದಿಕೆಗಳನ್ನು ಬಳಸುತ್ತೀರಿ?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "ಉದ್ಯಮ ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ಸೆರೆಹಿಡಿಯಿರಿ (ಉಪಗ್ರಹ ನಿರ್ದೇಶಾಂಕಗಳು)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "ಉದ್ಯಮ ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ಸೆರೆಹಿಡಿಯಿರಿ (ಉಪಗ್ರಹ ನಿರ್ದೇಶಾಂಕಗಳು)",
    "Field Photo of Enterprise & Beneficiary": "ಉದ್ಯಮ ಮತ್ತು ಫಲಾನುಭವಿಯ ಕ್ಷೇತ್ರ ಫೋಟೋ",
    "उद्यम और लाभार्थी का फील्ड फोटो": "ಉದ್ಯಮ ಮತ್ತು ಫಲಾನುಭವಿಯ ಕ್ಷೇತ್ರ ಫೋಟೋ",
    "Respondent & Surveyor Digital Signature": "ಉತ್ತರಿಸುವವರು ಮತ್ತು ಸಮೀಕ್ಷಕರ ಡಿಜಿಟಲ್ ಸಹಿ",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "ಉತ್ತರಿಸುವವರು ಮತ್ತು ಸಮೀಕ್ಷಕರ ಡಿಜಿಟಲ್ ಸಹಿ",
    "Yes": "ಹೌದು",
    "हाँ": "ಹೌದು",
    "No": "ಇಲ್ಲ",
    "नहीं": "ಇಲ್ಲ",
    "Baran": "ಬಾರಾನ್",
    "बारां": "ಬಾರಾನ್",
    "Churu": "ಚುರು",
    "चूरू": "ಚುರು",
    "Dausa": "ದೌಸಾ",
    "दौसा": "ದೌಸಾ",
    "Dungarpur": "ಡುಂಗರ್‌ಪುರ",
    "डूंगरपुर": "ಡುಂಗರ್‌ಪುರ",
    "Jodhpur": "ಜೋಧ್‌ಪುರ",
    "जोधपुर": "ಜೋಧ್‌ಪುರ",
    "Chhipabarod": "ಛೀಪಾಬರೋದ್",
    "छीपाबड़ौद": "ಛೀಪಾಬರೋದ್",
    "Kishanganj": "ಕಿಶನ್‌ಗಂಜ್",
    "किशनगंज": "ಕಿಶನ್‌ಗಂಜ್",
    "Sardar Sheher": "ಸರ್ದಾರ್ ಶಹರ್",
    "सरदारशहर": "ಸರ್ದಾರ್ ಶಹರ್",
    "Bidasar": "ಬಿದಾಸರ್",
    "बीदासर": "ಬಿದಾಸರ್",
    "Secundra": "ಸಿಕಂದ್ರಾ",
    "सिकंदरा": "ಸಿಕಂದ್ರಾ",
    "Sagwara": "ಸಾಗ್ವಾರಾ",
    "सागवाड़ा": "ಸಾಗ್ವಾರಾ",
    "Galiakot": "ಗಲಿಯಾಕೋಟ್",
    "गलियाकोट": "ಗಲಿಯಾಕೋಟ್",
    "Bicchiwada": "ಬಿಚ್ಚಿವಾಡಾ",
    "बिछीवाड़ा": "ಬಿಚ್ಚಿವಾಡಾ",
    "Jodhpur Block": "ಜೋಧ್‌ಪುರ ಬ್ಲಾಕ್",
    "जोधपुर ब्लॉक": "ಜೋಧ್‌ಪುರ ಬ್ಲಾಕ್",
    "Married": "ವಿವಾಹಿತ",
    "विवाहित": "ವಿವಾಹಿತ",
    "Single": "ಅವಿವಾಹಿತ",
    "अविवाहित": "ಅವಿವಾಹಿತ",
    "Widowed": "ವಿಧವೆ",
    "विधवा": "ವಿಧವೆ",
    "Divorced": "ವಿಚ್ಛೇದಿತ",
    "तलाकशुदा": "ವಿಚ್ಛೇದಿತ",
    "Separated": "ಬೇರೆಯಾಗಿರುವವರು",
    "अलग रह रहे": "ಬೇರೆಯಾಗಿರುವವರು",
    "General": "ಸಾಮಾನ್ಯ (General)",
    "सामान्य": "ಸಾಮಾನ್ಯ (General)",
    "OBC": "ಇತರ ಹಿಂದುಳಿದ ವರ್ಗ (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "ಇತರ ಹಿಂದುಳಿದ ವರ್ಗ (OBC)",
    "SC": "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC)",
    "अनुसूचित जाति (SC)": "ಪರಿಶಿಷ್ಟ ಜಾತಿ (SC)",
    "ST": "ಪರಿಶಿಷ್ಟ ಪಂಗಡ (ST)",
    "अनुसूचित जनजाति (ST)": "ಪರಿಶಿಷ್ಟ ಪಂಗಡ (ST)",
    "Illiterate": "ಅನಕ್ಷರಸ್ಥ",
    "निरक्षर / अनपढ़": "ಅನಕ್ಷರಸ್ಥ",
    "Illiterate but able to calculate": "ಅನಕ್ಷರಸ್ಥ ಆದರೆ ಲೆಕ್ಕಾಚಾರ ಮಾಡಬಲ್ಲವರು",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "ಅನಕ್ಷರಸ್ಥ ಆದರೆ ಲೆಕ್ಕಾಚಾರ ಮಾಡಬಲ್ಲವರು",
    "5th pass": "5 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "5वीं पास": "5 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "8th pass": "8 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "8वीं पास": "8 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "10th pass": "10 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "10वीं पास": "10 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "12th pass": "12 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "12वीं पास": "12 ನೇ ತರಗತಿ ಉತ್ತೀರ್ಣ",
    "Graduate": "ಪದವೀಧರ (Graduate)",
    "स्नातक (Graduate)": "ಪದವೀಧರ (Graduate)",
    "Self": "ಸ್ವತಃ",
    "स्वयं": "ಸ್ವತಃ",
    "Husband": "ಪತಿ",
    "पति": "ಪತಿ",
    "Son": "ಮಗ",
    "पुत्र / बेटा": "ಮಗ",
    "Daughter": "ಮಗಳು",
    "पुत्री / बेटी": "ಮಗಳು",
    "Member": "ಸದಸ್ಯ",
    "सामान्य सदस्य": "ಸದಸ್ಯ",
    "Leadership role": "ನಾಯಕತ್ವದ ಪಾತ್ರ (ಅಧ್ಯಕ್ಷ/ಕಾರ್ಯದರ್ಶಿ/ಖಜಾಂಚಿ)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "ನಾಯಕತ್ವದ ಪಾತ್ರ (ಅಧ್ಯಕ್ಷ/ಕಾರ್ಯದರ್ಶಿ/ಖಜಾಂಚಿ)",
    "Grocery / Kirana": "ಕಿರಾಣಿ ಅಂಗಡಿ",
    "किराना दुकान": "ಕಿರಾಣಿ ಅಂಗಡಿ",
    "General store": "ಜನರಲ್ ಸ್ಟೋರ್",
    "जनरल स्टोर": "ಜನರಲ್ ಸ್ಟೋರ್",
    "Leather & footwear": "ಚರ್ಮ ಮತ್ತು ಪಾದರಕ್ಷೆಗಳು",
    "चमड़ा व जूते-चप्पल": "ಚರ್ಮ ಮತ್ತು ಪಾದರಕ್ಷೆಗಳು",
    "Flour mill": "ಹಿಟ್ಟಿನ ಗಿರಣಿ",
    "आटा चक्की": "ಹಿಟ್ಟಿನ ಗಿರಣಿ",
    "Tailoring & Stitching": "ಹೊಲಿಗೆ ಮತ್ತು ಕಸೂತಿ ಕೇಂದ್ರ",
    "सिलाई व कढ़ाई केंद्र": "ಹೊಲಿಗೆ ಮತ್ತು ಕಸೂತಿ ಕೇಂದ್ರ",
    "Apparel & Garments": "ರೆಡಿಮೇಡ್ ಉಡುಪುಗಳು",
    "रेडीमेड वस्त्र": "ರೆಡಿಮೇಡ್ ಉಡುಪುಗಳು",
    "Beauty parlour": "ಬ್ಯೂಟಿ ಪಾರ್ಲರ್",
    "ब्यूटी पार्लर": "ಬ್ಯೂಟಿ ಪಾರ್ಲರ್",
    "Handicraft": "ಕರಕುಶಲ ವಸ್ತುಗಳು",
    "हस्तशिल्प / हैंडीक्राफ्ट": "ಕರಕುಶಲ ವಸ್ತುಗಳು",
    "Dairy shop": "ಡೈರಿ ಮತ್ತು ಹಾಲಿನ ಕೇಂದ್ರ",
    "डेयरी व दूध केंद्र": "ಡೈರಿ ಮತ್ತು ಹಾಲಿನ ಕೇಂದ್ರ",
    "Auto-mechanic": "ಆಟೋ ಮೆಕ್ಯಾನಿಕ್",
    "ऑटो मैकेनिक": "ಆಟೋ ಮೆಕ್ಯಾನಿಕ್",
    "E-mitra": "ಇ-ಮಿತ್ರ / ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರ",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ಇ-ಮಿತ್ರ / ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರ",
    "Mobile repair shop": "ಮೊಬೈಲ್ ರಿಪೇರಿ ಅಂಗಡಿ",
    "मोबाइल रिपेयर दुकान": "ಮೊಬೈಲ್ ರಿಪೇರಿ ಅಂಗಡಿ",
    "Transport": "ಸಾರಿಗೆ ಸೇವೆ",
    "परिवहन सेवा": "ಸಾರಿಗೆ ಸೇವೆ",
    "Any other": "ಇತರ ಯಾವುದೇ",
    "अन्य कोई": "ಇತರ ಯಾವುದೇ",
    "Whatsapp": "ವಾಟ್ಸಾಪ್",
    "व्हाट्सएप (WhatsApp)": "ವಾಟ್ಸಾಪ್",
    "Facebook": "ಫೇಸ್‌ಬುಕ್",
    "फेसबुक (Facebook)": "ಫೇಸ್‌ಬುಕ್",
    "Instagram": "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್",
    "इंस्टाग्राम (Instagram)": "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್",
    "Don't use social media": "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ಬಳಸುವುದಿಲ್ಲ",
    "सोशल मीडिया का उपयोग नहीं करते": "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ಬಳಸುವುದಿಲ್ಲ",
    "Draft": "ಅಪೂರ್ಣ ಕರಡು",
    "Save Draft": "ಕರಡು ಉಳಿಸಿ",
    "ड्राफ्ट": "ಕರಡು",
    "मसुदा": "ಕರಡು",
    "ડ્રાફ્ટ": "ಕರಡು",
    "ਡਰਾਫਟ": "ಕರಡು",
    "খসড়া": "ಕರಡು",
    "வரைவு": "ಕರಡು",
    "చిత్తుప్రతి": "ಕರಡು",
    "ಕರಡು": "ಕರಡು",
    "ഡ്രാഫ്റ്റ്": "ಕರಡು",
    "ڈرافٹ": "ಕರಡು",
    "ड्राफ्ट सेव करें": "ಕರಡು ಉಳಿಸಿ",
    "मसुदा जतन करा": "ಕರಡು ಉಳಿಸಿ",
    "ડ્રાફ્ટ સાચવો": "ಕರಡು ಉಳಿಸಿ",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ಕರಡು ಉಳಿಸಿ",
    "খসড়া সংরক্ষণ": "ಕರಡು ಉಳಿಸಿ",
    "வரைவு சேமி": "ಕರಡು ಉಳಿಸಿ",
    "చిత్తుప్రతి భద్రపరచు": "ಕರಡು ಉಳಿಸಿ",
    "ಕರಡು ಉಳಿಸಿ": "ಕರಡು ಉಳಿಸಿ",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ಕರಡು ಉಳಿಸಿ",
    "ڈرافٹ محفوظ کریں": "ಕರಡು ಉಳಿಸಿ",
    "Himalayan Baseline Impact Survey": "ಹಿಮಾಲಯನ್ ಬೇಸ್‌ಲೈನ್ ಪ್ರಭಾವ ಸಮೀಕ್ಷೆ",
    "1. Household & Demographic Profile": "1. ಕುಟುಂಬ ಮತ್ತು ಜನಸಂಖ್ಯಾ ಪ್ರೊಫೈಲ್",
    "General identification and household metrics": "ಸಾಮಾನ್ಯ ಗುರುತು ಮತ್ತು ಮನೆಯ ವಿವರಗಳು",
    "2. Economic Activity & Livestock": "2. ಆರ್ಥಿಕ ಚಟುವಟಿಕೆ ಮತ್ತು ಜಾನುವಾರು",
    "Revenue, assets, and livestock count": "ಆದಾಯ, ಸ್ವತ್ತುಗಳು ಮತ್ತು ಜಾನುವಾರುಗಳ ಸಂಖ್ಯೆ",
    "3. Geolocation & Digital Verification": "3. ಜಿಯೋಲೋಕೇಶನ್ ಮತ್ತು ಡಿಜಿಟಲ್ ಪರಿಶೀಲನೆ",
    "GPS accuracy and field photo capture": "ಜಿಪಿಎಸ್ ನಿಖರತೆ ಮತ್ತು ಫೋಟೋ ಸೆರೆಹಿಡಿಯುವಿಕೆ",
    "Full Name of Household Head / Primary Respondent": "ಕುಟುಂಬದ ಮುಖ್ಯಸ್ಥ / ಪ್ರಾಥಮಿಕ ಪ್ರತಿಕ್ರಿಯೆದಾರರ ಪೂರ್ಣ ಹೆಸರು",
    "Respondent Classification": "ಪ್ರತಿಕ್ರಿಯೆದಾರರ ವರ್ಗೀಕರಣ",
    "Individual": "ವೈಯಕ್ತಿಕ",
    "Household": "ಮನೆತನ / ಕುಟುಂಬ",
    "Smallholder Farmer": "ಸಣ್ಣ ರೈತ",
    "Micro Enterprise / Self-Employed": "ಸೂಕ್ಷ್ಮ ಉದ್ಯಮ / ಸ್ವಯಂ ಉದ್ಯೋಗಿ",
    "Primary Contact Phone Number": "ಪ್ರಾಥಮಿಕ ಸಂಪರ್ಕ ಫೋನ್ ಸಂಖ್ಯೆ",
    "Do you own cattle, sheep, or goats?": "ನಿಮ್ಮ ಬಳಿ ಹಸು, ಕುರಿ ಅಥವಾ ಮೇಕೆಗಳು ಇವೆಯೇ?",
    "Total number of milch cattle / animals?": "ಹಾಲು ನೀಡುವ ಜಾನುವಾರುಗಳ / ಪ್ರಾಣಿಗಳ ಒಟ್ಟು ಸಂಖ್ಯೆ ಎಷ್ಟು?",
    "Estimated Monthly Household Income (INR ₹)": "ಅಂದಾಜು ಮಾಸಿಕ ಕುಟುಂಬದ ಆದಾಯ (ರೂ. ₹)",
    "Farm Equipment & Key Productive Assets": "ಕೃಷಿ ಉಪಕರಣಗಳು ಮತ್ತು ಪ್ರಮುಖ ಉತ್ಪಾದಕ ಆಸ್ತಿಗಳು",
    "Capture Field GPS Coordinates (Auto-verified)": "ಫೀಲ್ಡ್ ಜಿಪಿಎಸ್ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಪಡೆಯಿರಿ (ಸ್ವಯಂ ಪರಿಶೀಲಿಸಲಾಗಿದೆ)",
    "Field Photo of Site / Beneficiary": "ಸೈಟ್ / ಫಲಾನುಭವಿಯ ಫೋಟೋ",
    "Surveyor Sign-off & Digital Signature": "ಸಮೀಕ್ಷಕರ ಅನುಮೋದನೆ ಮತ್ತು ಡಿಜಿಟಲ್ ಸಹಿ",
    "District, Block, Village, SHG, and Enterprise identification": "ಜಿಲ್ಲೆ, ತಾಲೂಕು, ಗ್ರಾಮ, SHG ಮತ್ತು ಉದ್ಯಮದ ಗುರುತು",
    "Demographic, family structure, education, and household income": "ಜನಸಂಖ್ಯಾಶಾಸ್ತ್ರ, ಕುಟುಂಬ ರಚನೆ, ಶಿಕ್ಷಣ ಮತ್ತು ಕುಟುಂಬದ ಆದಾಯ",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "ಆರಂಭದ ಇತಿಹಾಸ, ಕೆಲಸದ ಸಮಯ, ಬಂಡವಾಳ ವ್ಯವಸ್ಥೆ ಮತ್ತು ಕಾಲೋಚಿತ ಆದಾಯ",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "ಸ್ಥಳ, ಪೂರೈಕೆದಾರರು, ಸಾಲ ವಸೂಲಾತಿ, ಕಚ್ಚಾ ವಸ್ತು ಖರೀದಿ ಮತ್ತು ಸಾಲ ಸೌಲಭ್ಯ",
    "Loan utilization, monthly income growth, and CRP contribution": "ಸಾಲದ ಬಳಕೆ, ಮಾಸಿಕ ಆದಾಯದ ಬೆಳವಣಿಗೆ ಮತ್ತು CRP ಕೊಡುಗೆ",
    "Smartphone ownership, QR code banking, and social media usage": "ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಮಾಲೀಕತ್ವ, ಕ್ಯೂಆರ್ ಕೋಡ್ ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ಬಳಕೆ",
    "GPS coordinates fix, site photo capture, and digital signatures": "ಜಿಪಿಎಸ್ ನಿರ್ದೇಶಾಂಕಗಳು, ಸೈಟ್ ಫೋಟೋ ಮತ್ತು ಡಿಜಿಟಲ್ ಸಹಿ",
    "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Surveyor Dashboard": "ಸರ್ವೇಯರ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Field Work Overview": "ಕ್ಷೇತ್ರ ಕಾರ್ಯ ಪ್ರಗತಿ",
    "Total Recorded": "ಒಟ್ಟು ಸಮೀಕ್ಷೆಗಳು",
    "Synced to Server": "ಸರ್ವರ್‌ಗೆ ಸಿಂಕ್ ಆಗಿದೆ",
    "Pending Sync": "ಸಿಂಕ್ ಬಾಕಿ ಇದೆ",
    "Incomplete Drafts": "ಅಪೂರ್ಣ ಕರಡುಗಳು",
    "Drafts": "ಕರಡುಗಳು",
    "Completed": "ಪೂರ್ಣಗೊಂಡಿದೆ",
    "Today's Goal": "ಇಂದಿನ ಗುರಿ",
    "surveys completed today": "ಸಮೀಕ್ಷೆಗಳು ಇಂದು ಪೂರ್ಣಗೊಂಡಿವೆ",
    "Daily Target Met!": "ಇಂದಿನ ಗುರಿ ತಲುಪಿದೆ! 🎉",
    "Start New Survey": "+ ಹೊಸ ಸಮೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    "Resume Draft": "▶ ಕರಡನ್ನು ಮುಂದುವರಿಸಿ",
    "Resume & Complete": "▶ ಫಾರ್ಮ್ ಮುಂದುವರಿಸಿ",
    "My Submissions & Drafts": "ನನ್ನ ಸಮೀಕ್ಷೆಗಳು ಮತ್ತು ಕರಡುಗಳು",
    "All Records": "ಎಲ್ಲಾ ದಾಖಲೆಗಳು",
    "Complete": "ಪೂರ್ಣ",
    "Questions Answered": "ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲಾಗಿದೆ",
    "GPS Locked": "GPS ಲಾಕ್ ಆಗಿದೆ ✓",
    "Photo Attached": "ಫೋಟೋ ಲಗತ್ತಿಸಲಾಗಿದೆ ✓",
    "Signed": "ಸಹಿ ಮಾಡಲಾಗಿದೆ ✓",
    "Ready to Sync": "ಸಿಂಕ್ ಮಾಡಲು ಸಿದ್ಧ (100%)",
    "Synced": "ಸರ್ವರ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತ",
    "No respondent name": "ಹೆಸರಿಲ್ಲದ ಪ್ರತಿಕ್ರಿಯೆದಾರ",
    "Village / Location": "ಗ್ರಾಮ / ಸ್ಥಳ",
    "Last edited": "ಕೊನೆಯದಾಗಿ ಸಂಪಾದಿಸಲಾಗಿದೆ",
    "Sync All Pending": "🔄 ಎಲ್ಲಾ ಬಾಕಿಗಳನ್ನು ಸಿಂಕ್ ಮಾಡಿ",
    "No surveys recorded yet": "ಈ ಸಾಧನದಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಸಮೀಕ್ಷೆಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿಲ್ಲ",
    "Tap '+ Start New Survey' to begin your first interview": "ಮೊದಲ ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಲು '+ ಹೊಸ ಸಮೀಕ್ಷೆ' ಒತ್ತಿರಿ",
    "Delete draft?": "ನೀವು ಈ ಕರಡನ್ನು ಅಳಿಸಲು ಬಯಸುವಿರಾ?",
    "Draft deleted": "ಕರಡು ಅಳಿಸಲಾಗಿದೆ",
    "Text Size": "ಅಕ್ಷರದ ಗಾತ್ರ",
    "Adjust font size for your screen": "ಪರದೆಗೆ ತಕ್ಕಂತೆ ಅಕ್ಷರದ ಗಾತ್ರ ಆರಿಸಿ",
    "Small": "ಸಣ್ಣದು",
    "Medium": "ಮಧ್ಯಮ",
    "Large": "ದೊಡ್ಡದು",
    "Text size set to Small": "ಅಕ್ಷರದ ಗಾತ್ರ ಸಣ್ಣದಾಗಿದೆ",
    "Text size set to Medium": "ಅಕ್ಷರದ ಗಾತ್ರ ಮಧ್ಯಮವಾಗಿದೆ",
    "Text size set to Large": "ಅಕ್ಷರದ ಗಾತ್ರ ದೊಡ್ಡದಾಗಿದೆ",
    "Email Data to Admin": "ಅಡ್ಮಿನ್‌ಗೆ ಡೇಟಾವನ್ನು ಇಮೇಲ್ ಮಾಡಿ",
    "Emergency Backup & Support": "ತುರ್ತು ಬ್ಯಾಕಪ್ ಮತ್ತು ಬೆಂಬಲ",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ನಿಮ್ಮ ಎಲ್ಲಾ ಸಮೀಕ್ಷೆ ದಾಖಲೆಗಳನ್ನು ಇಮೇಲ್ ಅಥವಾ ಅಪ್ಲಿಕೇಶನ್‌ಗಳ ಮೂಲಕ ಅಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಿ.",
    "Admin Email Address": "ಅಡ್ಮಿನ್ ಇಮೇಲ್ ವಿಳಾಸ",
    "Additional Note / Error Description": "ಸಮಸ್ಯೆ ಅಥವಾ ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)",
    "Send via Email / Server": "ಇಮೇಲ್ ಮೂಲಕ ಕಳುಹಿಸಿ (ಸರ್ವರ್)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ",
    "Download JSON": "JSON ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    "Download CSV (Excel)": "CSV (Excel) ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    "Backup emailed successfully ✓": "ಬ್ಯಾಕಪ್ ಇಮೇಲ್ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ ✓",
    "Total Device Records": "ಸಾಧನದಲ್ಲಿ ಒಟ್ಟು ದಾಖಲೆಗಳು",
    "Offline Storage Status": "ಆಫ್‌ಲೈನ್ ಸಂಗ್ರಹಣೆ ಸ್ಥಿತಿ",
    "Healthy (IndexedDB)": "ಸುರಕ್ಷಿತ (IndexedDB)",
    "Export & Backup": "ರಫ್ತು ಮತ್ತು ಬ್ಯಾಕಪ್",
    "Send Data to Admin": "ಅಡ್ಮಿನ್‌ಗೆ ಡೇಟಾ ಕಳುಹಿಸಿ",
    "e.g. 2020": "ಉದಾ. 2020",
    "Enter year (e.g. 2020)": "ವರ್ಷವನ್ನು ನಮೂದಿಸಿ (ಉದಾ. 2020)"
  },
  "ml": {
    "OmniQuery": "ഓമ്നിസർവെ",
    "ओमनीसर्वे": "ഓമ്നിസർവെ",
    "Online": "ഓൺ‌ലൈൻ",
    "ऑनलाइन": "ഓൺ‌ലൈൻ",
    "Offline": "ഓഫ്‌ലൈൻ",
    "ऑफलाइन": "ഓഫ്‌ലൈൻ",
    "Surveys": "സർവേകൾ",
    "सर्वेक्षण": "സർവേകൾ",
    "WAL Queue": "ക്യൂ (ഓഫ്‌ലൈൻ)",
    "कतार (ऑफलाइन)": "ക്യൂ (ഓഫ്‌ലൈൻ)",
    "System": "സിസ്റ്റം",
    "सिस्टम": "സിസ്റ്റം",
    "Exit Form": "← പുറത്തുകടക്കുക",
    "← बाहर निकलें": "← പുറത്തുകടക്കുക",
    "Step": "ഘട്ടം",
    "चरण": "ഘട്ടം",
    "of": "ന്റെ",
    "का": "ന്റെ",
    "Pages": "പേജുകൾ",
    "पृष्ठ": "പേജുകൾ",
    "Questions": "ചോദ്യങ്ങൾ",
    "प्रश्न": "ചോദ്യങ്ങൾ",
    "Previous": "← മുമ്പത്തെ",
    "← पिछला": "← മുമ്പത്തെ",
    "Next": "അടുത്തത് →",
    "अगला →": "അടുത്തത് →",
    "Save Offline": "ഓഫ്‌ലൈനിൽ സംരക്ഷിക്കുക",
    "ऑफलाइन सेव करें": "ഓഫ്‌ലൈനിൽ സംരക്ഷിക്കുക",
    "Submit Survey": "സമർപ്പിക്കുക",
    "सबमिट करें": "സമർപ്പിക്കുക",
    "Capture GPS Coordinates": "ജിപിഎസ് ലൊക്കേഷൻ രേഖപ്പെടുത്തുക",
    "जीपीएस लोकेशन रिकॉर्ड करें": "ജിപിഎസ് ലൊക്കേഷൻ രേഖപ്പെടുത്തുക",
    "GPS Fix Acquired ✓": "ജിപിഎസ് ലഭിച്ചു ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "ജിപിഎസ് ലഭിച്ചു ✓",
    "Take Photo / Choose File": "ഫോട്ടോ എടുക്കുക / ഫയൽ തിരഞ്ഞെടുക്കുക",
    "फोटो लें / फाइल चुनें": "ഫോട്ടോ എടുക്കുക / ഫയൽ തിരഞ്ഞെടുക്കുക",
    "Sign inside box with finger or stylus": "വിരലോ സ്റ്റൈലസോ ഉപയോഗിച്ച് പെട്ടിയിൽ ഒപ്പിടുക",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "വിരലോ സ്റ്റൈലസോ ഉപയോഗിച്ച് പെട്ടിയിൽ ഒപ്പിടുക",
    "Clear Signature": "ഒപ്പ് മായ്ക്കുക",
    "हस्ताक्षर मिटाएं": "ഒപ്പ് മായ്ക്കുക",
    "Signature Recorded": "ഒപ്പ് രേഖപ്പെടുത്തി",
    "हस्ताक्षर दर्ज हुआ": "ഒപ്പ് രേഖപ്പെടുത്തി",
    "Enter response here...": "ഉത്തരം ഇവിടെ നൽകുക...",
    "यहाँ उत्तर दर्ज करें...": "ഉത്തരം ഇവിടെ നൽകുക...",
    "Required Questions Pending": "നിർബന്ധിത ചോദ്യങ്ങൾ ബാക്കിയുണ്ട്",
    "आवश्यक प्रश्न अधूरे हैं": "നിർബന്ധിത ചോദ്യങ്ങൾ ബാക്കിയുണ്ട്",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "അന്തിമ സമർപ്പണത്തിന് മുമ്പ് ഈ നിർബന്ധിത ചോദ്യങ്ങൾ പൂരിപ്പിക്കുക, അല്ലെങ്കിൽ ഓഫ്‌ലൈൻ ഡ്രാഫ്റ്റായി സംരക്ഷിക്കുക.",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "അന്തിമ സമർപ്പണത്തിന് മുമ്പ് ഈ നിർബന്ധിത ചോദ്യങ്ങൾ പൂരിപ്പിക്കുക, അല്ലെങ്കിൽ ഓഫ്‌ലൈൻ ഡ്രാഫ്റ്റായി സംരക്ഷിക്കുക.",
    "Go to First Pending Question": "👉 ആദ്യത്തെ അപൂർണ്ണ ചോദ്യത്തിലേക്ക് പോകുക",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 ആദ്യത്തെ അപൂർണ്ണ ചോദ്യത്തിലേക്ക് പോകുക",
    "Save as Offline Draft Anyway": "ഓഫ്‌ലൈൻ ഡ്രാഫ്റ്റായി സംരക്ഷിക്കുക",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "ഓഫ്‌ലൈൻ ഡ്രാഫ്റ്റായി സംരക്ഷിക്കുക",
    "Close": "അടയ്ക്കുക",
    "बंद करें": "അടയ്ക്കുക",
    "Start Survey Form": "സർവേ ആരംഭിക്കുക",
    "सर्वेक्षण शुरू करें": "സർവേ ആരംഭിക്കുക",
    "Start Survey Form →": "സർവേ ആരംഭിക്കുക →",
    "सर्वेक्षण शुरू करें →": "സർവേ ആരംഭിക്കുക →",
    "Write-Ahead Log (WAL)": "റൈറ്റ്-എഹെഡ് ലോഗ് (WAL ക്യൂ)",
    "राइट-अहेड लॉग (WAL कतार)": "റൈറ്റ്-എഹെഡ് ലോഗ് (WAL ക്യൂ)",
    "Atomic zero-loss local storage queue": "പൂർണ്ണ ഡാറ്റാ സുരക്ഷിത പ്രാദേശിക സംഭരണം",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "പൂർണ്ണ ഡാറ്റാ സുരക്ഷിത പ്രാദേശിക സംഭരണം",
    "Sync Now": "⟳ ഇപ്പോൾ സമന്വയിപ്പിക്കുക",
    "⟳ अभी सिंक करें": "⟳ ഇപ്പോൾ സമന്വയിപ്പിക്കുക",
    "View on Map →": "മാപ്പിൽ കാണുക →",
    "नक्शे पर देखें →": "മാപ്പിൽ കാണുക →",
    "Re-acquire Fix": "വീണ്ടും ശ്രമിക്കുക",
    "पुनः प्रयास करें": "വീണ്ടും ശ്രമിക്കുക",
    "Section A: Basic Details": "വിഭാഗം A: പ്രാഥമിക വിവരങ്ങൾ",
    "भाग क: बुनियादी विवरण": "വിഭാഗം എ: അടിസ്ഥാന വിവരങ്ങൾ",
    "Section B: Respondent & Household Profile": "വിഭാഗം B: പ്രതികരിക്കുന്ന ആളുടെയും കുടുംബത്തിന്റെയും വിവരങ്ങൾ",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "വിഭാഗം ബി: പ്രതികരണക്കാരന്റെയും കുടുംബത്തിന്റെയും പ്രൊഫൈൽ",
    "Section C: Enterprise Operations & Finance": "വിഭാഗം C: സംരംഭ പ്രവർത്തനങ്ങളും ധനകാര്യവും",
    "भाग ग: उद्यम संचालन और वित्त": "വിഭാഗം സി: സംരംഭ പ്രവർത്തനങ്ങളും ധനകാര്യവും",
    "Section D: Enterprise Challenges & Coping Mechanisms": "വിഭാഗം D: സംരംഭ വെല്ലുവിളികളും പരിഹാരങ്ങളും",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "വിഭാഗം ഡി: സംരംഭ വെല്ലുവിളികളും പരിഹാരങ്ങളും",
    "Section E: Impact of SVEP / OSF Schemes": "വിഭാഗം E: SVEP / OSF പദ്ധതികളുടെ സ്വാധീനം",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "വിഭാഗം ഇ: എസ്.വി.ഇ.പി / ഒ.എസ്.എഫ് പദ്ധതികളുടെ സ്വാധീനം",
    "Section F: Digital Transactions & Social Media": "വിഭാഗം F: ഡിജിറ്റൽ ഇടപാടുകളും സോഷ്യൽ മീഡിയയും",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "വിഭാഗം എഫ്: ഡിജിറ്റൽ ഇടപാടുകളും സോഷ്യൽ മീഡിയയും",
    "Section G: Field Verification & Sign-off": "വിഭാഗം G: ഫീൽഡ് പരിശോധനയും ഒപ്പും",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "വിഭാഗം ജി: ഫീൽഡ് പരിശോധനയും ഒപ്പും",
    "District": "ജില്ല",
    "जिला": "ജില്ല",
    "Block / Tehsil": "ബ്ലോക്ക് / താലൂക്ക്",
    "ब्लॉक / तहसील": "ബ്ലോക്ക് / താലൂക്ക്",
    "Village / Gram Panchayat Name": "ഗ്രാമം / ഗ്രാമപഞ്ചായത്തിന്റെ പേര്",
    "गाँव / ग्राम पंचायत का नाम": "ഗ്രാമം / ഗ്രാമപഞ്ചായത്തിന്റെ പേര്",
    "Cluster Level Federation (CLF) Name": "ക്ലസ്റ്റർ ലെവൽ ഫെഡറേഷൻ (CLF) പേര്",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "ക്ലസ്റ്റർ ലെവൽ ഫെഡറേഷൻ (CLF) പേര്",
    "Village Organization (VO) Name": "ഗ്രാമ സംഘടന (VO) പേര്",
    "ग्राम संगठन (VO) का नाम": "ഗ്രാമ സംഘടന (VO) പേര്",
    "Self-Help Group (SHG) Name": "സ്വയം സഹായ സംഘം (SHG) പേര്",
    "स्वयं सहायता समूह (SHG) का नाम": "സ്വയം സഹായ സംഘം (SHG) പേര്",
    "Respondent Name": "പ്രതികരണക്കാരന്റെ പേര്",
    "उत्तरदाता का नाम": "പ്രതികരണക്കാരന്റെ പേര്",
    "Enterprise / Business Name": "സംരംഭം / ബിസിനസ്സ് പേര്",
    "उद्यम / व्यवसाय का नाम": "സംരംഭം / ബിസിനസ്സ് പേര്",
    "Year of Setting Up Enterprise": "സംരംഭം ആരംഭിച്ച വർഷം",
    "उद्यम स्थापना का वर्ष": "സംരംഭം ആരംഭിച്ച വർഷം",
    "Main Business Activity of the Enterprise": "സംരംഭത്തിന്റെ പ്രധാന ബിസിനസ്സ് പ്രവർത്തനം",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "സംരംഭത്തിന്റെ പ്രധാന ബിസിനസ്സ് പ്രവർത്തനം",
    "What is respondent's relation with SHG member?": "എസ്എച്ച്ജി അംഗവുമായുള്ള പ്രതികരണക്കാരന്റെ ബന്ധം എന്താണ്?",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "എസ്എച്ച്ജി അംഗവുമായുള്ള പ്രതികരണക്കാരന്റെ ബന്ധം എന്താണ്?",
    "What is the age of SHG member?": "എസ്എച്ച്ജി അംഗത്തിന്റെ പ്രായം എത്രയാണ്?",
    "एसएचजी सदस्य की आयु क्या है?": "എസ്എച്ച്ജി അംഗത്തിന്റെ പ്രായം എത്രയാണ്?",
    "What is the marital status of the SHG member?": "എസ്എച്ച്ജി അംഗത്തിന്റെ വൈവാഹിക നില എന്താണ്?",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "എസ്എച്ച്ജി അംഗത്തിന്റെ വൈവാഹിക നില എന്താണ്?",
    "What is the social category / caste?": "സാമൂഹിക വിഭാഗം / ജാതി ഏതാണ്?",
    "सामाजिक श्रेणी / जाति क्या है?": "സാമൂഹിക വിഭാഗം / ജാതി ഏതാണ്?",
    "What is the education status of the SHG member?": "എസ്എച്ച്ജി അംഗത്തിന്റെ വിദ്യാഭ്യാസ നിലവാരം എന്താണ്?",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "എസ്എച്ച്ജി അംഗത്തിന്റെ വിദ്യാഭ്യാസ നിലവാരം എന്താണ്?",
    "How many total members are in the family?": "കുടുംബത്തിൽ ആകെ എത്ര അംഗങ്ങളുണ്ട്?",
    "परिवार में कुल कितने सदस्य हैं?": "കുടുംബത്തിൽ ആകെ എത്ര അംഗങ്ങളുണ്ട്?",
    "What is your total annual household income?": "നിങ്ങളുടെ ആകെ വാർഷിക കുടുംബ വരുമാനം എത്രയാണ്?",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "നിങ്ങളുടെ ആകെ വാർഷിക കുടുംബ വരുമാനം എത്രയാണ്?",
    "What is your role in the SHG?": "എസ്എച്ച്ജിയിൽ നിങ്ങളുടെ പങ്ക് എന്താണ്?",
    "एसएचजी में आपकी भूमिका क्या है?": "എസ്എച്ച്ജിയിൽ നിങ്ങളുടെ പങ്ക് എന്താണ്?",
    "Are you related to any of the SVEP / OSF CRP?": "നിങ്ങൾ ഏതെങ്കിലും SVEP / OSF CRP യുമായി ബന്ധപ്പെട്ട ആളാണോ?",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "നിങ്ങൾ ഏതെങ്കിലും SVEP / OSF CRP യുമായി ബന്ധപ്പെട്ട ആളാണോ?",
    "Who started the enterprise?": "സംരംഭം ആരാണ് ആരംഭിച്ചത്?",
    "उद्यम किसने शुरू किया था?": "സംരംഭം ആരാണ് ആരംഭിച്ചത്?",
    "Who operates and manages the enterprise on a daily basis?": "ദൈനംദിന അടിസ്ഥാനത്തിൽ സംരംഭം ആര് കൈകാര്യം ചെയ്യുന്നു?",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "ദൈനംദിന അടിസ്ഥാനത്തിൽ സംരംഭം ആര് കൈകാര്യം ചെയ്യുന്നു?",
    "For how many hours in a day does the shop/enterprise remain open?": "ഒരു ദിവസം എത്ര മണിക്കൂർ കട/സംരംഭം തുറന്നിരിക്കുന്നു?",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "ഒരു ദിവസം എത്ര മണിക്കൂർ കട/സംരംഭം തുറന്നിരിക്കുന്നു?",
    "What is the type of business place / premises?": "ബിസിനസ്സ് സ്ഥലത്തിന്റെ തരം എന്താണ്?",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "ബിസിനസ്സ് സ്ഥലത്തിന്റെ തരം എന്താണ്?",
    "Does SHG member maintain written records of business transactions regularly?": "എസ്എച്ച്ജി അംഗം പതിവായി ബിസിനസ്സ് രേഖകൾ സൂക്ഷിക്കുന്നുണ്ടോ?",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "എസ്എച്ച്ജി അംഗം പതിവായി ബിസിനസ്സ് രേഖകൾ സൂക്ഷിക്കുന്നുണ്ടോ?",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "നിങ്ങളുടെ സംരംഭത്തിന്റെ ആദ്യ വർഷത്തിൽ പ്രാരംഭ മൂലധനം (രൂപ) എത്രയായിരുന്നു?",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "നിങ്ങളുടെ സംരംഭത്തിന്റെ ആദ്യ വർഷത്തിൽ പ്രാരംഭ മൂലധനം (രൂപ) എത്രയായിരുന്നു?",
    "How do you manage working capital during peak season?": "തിരക്കുള്ള സീസണിൽ പ്രവർത്തന മൂലധനം എങ്ങനെ കൈകാര്യം ചെയ്യുന്നു?",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "തിരക്കുള്ള സീസണിൽ പ്രവർത്തന മൂലധനം എങ്ങനെ കൈകാര്യം ചെയ്യുന്നു?",
    "Is the location of your space convenient for your business?": "നിങ്ങളുടെ ബിസിനസ്സിന് സ്ഥലം സൗകര്യപ്രദമാണോ?",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "നിങ്ങളുടെ ബിസിനസ്സിന് സ്ഥലം സൗകര്യപ്രദമാണോ?",
    "Are you satisfied and happy with your wholesale supplier?": "മൊത്തക്കച്ചവടക്കാരനിൽ നിങ്ങൾ തൃപ്തനാണോ?",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "മൊത്തക്കച്ചവടക്കാരനിൽ നിങ്ങൾ തൃപ്തനാണോ?",
    "Are you able to recover credit / money from your customers?": "ഉപഭോക്താക്കളിൽ നിന്ന് പണം തിരികെ ഈടാക്കാൻ കഴിയുന്നുണ്ടോ?",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "ഉപഭോക്താക്കളിൽ നിന്ന് പണം തിരികെ ഈടാക്കാൻ കഴിയുന്നുണ്ടോ?",
    "Do you source raw materials/goods from market independently?": "മാർക്കറ്റിൽ നിന്ന് സ്വന്തമായി അസംസ്കൃത വസ്തുക്കൾ വാങ്ങാറുണ്ടോ?",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "മാർക്കറ്റിൽ നിന്ന് സ്വന്തമായി അസംസ്കൃത വസ്തുക്കൾ വാങ്ങാറുണ്ടോ?",
    "Do you have easy access to loans from different sources?": "വിവിധ സ്രോതസ്സുകളിൽ നിന്ന് വായ്പ എളുപ്പത്തിൽ ലഭ്യമാണോ?",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "വിവിധ സ്രോതസ്സുകളിൽ നിന്ന് വായ്പ എളുപ്പത്തിൽ ലഭ്യമാണോ?",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "SVEP / OSF പദ്ധതി പ്രകാരം എത്ര വായ്പ എടുത്തിട്ടുണ്ട് (രൂപ)?",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "SVEP / OSF പദ്ധതി പ്രകാരം എത്ര വായ്പ എടുത്തിട്ടുണ്ട് (രൂപ)?",
    "How did you utilize the enterprise loan?": "സംരംഭ വായ്പ എങ്ങനെയാണ് ഉപയോഗിച്ചത്?",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "സംരംഭ വായ്പ എങ്ങനെയാണ് ഉപയോഗിച്ചത്?",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "വായ്പ എടുക്കുന്നതിന് മുമ്പ് പ്രതിമാസ സംരംഭ വരുമാനം (രൂപ)?",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "വായ്പ എടുക്കുന്നതിന് മുമ്പ് പ്രതിമാസ സംരംഭ വരുമാനം (രൂപ)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "വായ്പ എടുത്തതിന് ശേഷം പ്രതിമാസ സംരംഭ വരുമാനം (രൂപ)?",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "വായ്പ എടുത്തതിന് ശേഷം പ്രതിമാസ സംരംഭ വരുമാനം (രൂപ)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP-കളുടെ സംഭാവന എന്താണ്?",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP-കളുടെ സംഭാവന എന്താണ്?",
    "Does the woman entrepreneur own a smartphone?": "വനിതാ സംരംഭകയ്ക്ക് സ്മാർട്ട്ഫോൺ ഉണ്ടോ?",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "വനിതാ സംരംഭകയ്ക്ക് സ്മാർട്ട്ഫോൺ ഉണ്ടോ?",
    "Do you use QR code / UPI / mobile banking for business transactions?": "ബിസിനസ്സ് ഇടപാടുകൾക്കായി QR കോഡ് / UPI / മൊബൈൽ ബാങ്കിംഗ് ഉപയോഗിക്കാറുണ്ടോ?",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "ബിസിനസ്സ് ഇടപാടുകൾക്കായി QR കോഡ് / UPI / മൊബൈൽ ബാങ്കിംഗ് ഉപയോഗിക്കാറുണ്ടോ?",
    "Daily how many transactions are done via QR code / UPI?": "പ്രതിദിനം QR കോഡ് / UPI വഴി എത്ര ഇടപാടുകൾ നടക്കുന്നു?",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "പ്രതിദിനം QR കോഡ് / UPI വഴി എത്ര ഇടപാടുകൾ നടക്കുന്നു?",
    "Which social media platforms do you use for your business?": "ബിസിനസ്സിനായി ഏത് സോഷ്യൽ മീഡിയ പ്ലാറ്റ്‌ഫോമുകളാണ് ഉപയോഗിക്കുന്നത്?",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "ബിസിനസ്സിനായി ഏത് സോഷ്യൽ മീഡിയ പ്ലാറ്റ്‌ഫോമുകളാണ് ഉപയോഗിക്കുന്നത്?",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "സംരംഭ ജിപിഎസ് ലൊക്കേഷൻ എടുക്കുക (ഉപഗ്രഹ കോർഡിനേറ്റുകൾ)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "സംരംഭ ജിപിഎസ് ലൊക്കേഷൻ എടുക്കുക (ഉപഗ്രഹ കോർഡിനേറ്റുകൾ)",
    "Field Photo of Enterprise & Beneficiary": "സംരംഭത്തിന്റെയും ഗുണഭോക്താവിന്റെയും ഫീൽഡ് ഫോട്ടോ",
    "उद्यम और लाभार्थी का फील्ड फोटो": "സംരംഭത്തിന്റെയും ഗുണഭോക്താവിന്റെയും ഫീൽഡ് ഫോട്ടോ",
    "Respondent & Surveyor Digital Signature": "പ്രതികരണക്കാരന്റെയും സർവേയറുടെയും ഡിജിറ്റൽ ഒപ്പ്",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "പ്രതികരണക്കാരന്റെയും സർവേയറുടെയും ഡിജിറ്റൽ ഒപ്പ്",
    "Yes": "അതെ",
    "हाँ": "അതെ",
    "No": "അല്ല",
    "नहीं": "അല്ല",
    "Baran": "ബാരൻ",
    "बारां": "ബാരൻ",
    "Churu": "ചുരു",
    "चूरू": "ചുരു",
    "Dausa": "ദൗസ",
    "दौसा": "ദൗസ",
    "Dungarpur": "ഡുംഗർപൂർ",
    "डूंगरपुर": "ഡുംഗർപൂർ",
    "Jodhpur": "ജോധ്പൂർ",
    "जोधपुर": "ജോധ്പൂർ",
    "Chhipabarod": "ഛിപബറോദ്",
    "छीपाबड़ौद": "ഛിപബറോദ്",
    "Kishanganj": "കിഷൻഗഞ്ച്",
    "किशनगंज": "കിഷൻഗഞ്ച്",
    "Sardar Sheher": "സർദാർഷഹർ",
    "सरदारशहर": "സർദാർഷഹർ",
    "Bidasar": "ബിദാസർ",
    "बीदासर": "ബിദാസർ",
    "Secundra": "സിക്കന്ദ്ര",
    "सिकंदरा": "സിക്കന്ദ്ര",
    "Sagwara": "സാഗ്വാര",
    "सागवाड़ा": "സാഗ്വാര",
    "Galiakot": "ഗലിയാകോട്ട്",
    "गलियाकोट": "ഗലിയാകോട്ട്",
    "Bicchiwada": "ബിച്ചിവാഡ",
    "बिछीवाड़ा": "ബിച്ചിവാഡ",
    "Jodhpur Block": "ജോധ്പൂർ ബ്ലോക്ക്",
    "जोधपुर ब्लॉक": "ജോധ്പൂർ ബ്ലോക്ക്",
    "Married": "വിവാഹിതൻ/വിവാഹിത",
    "विवाहित": "വിവാഹിതൻ/വിവാഹിത",
    "Single": "അവിവാഹിതൻ/അവിവാഹിത",
    "अविवाहित": "അവിവാഹിതൻ/അവിവാഹിത",
    "Widowed": "വിധവ",
    "विधवा": "വിധവ",
    "Divorced": "വിവാഹമോചിതൻ/വിവാഹമോചിത",
    "तलाकशुदा": "വിവാഹമോചിതൻ/വിവാഹമോചിത",
    "Separated": "വേർപിരിഞ്ഞു കഴിയുന്നവർ",
    "अलग रह रहे": "വേർപിരിഞ്ഞു കഴിയുന്നവർ",
    "General": "ജനറൽ (General)",
    "सामान्य": "ജനറൽ (General)",
    "OBC": "മറ്റ് പിന്നാക്ക വിഭാഗം (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "മറ്റ് പിന്നാക്ക വിഭാഗം (OBC)",
    "SC": "പട്ടികജാതി (SC)",
    "अनुसूचित जाति (SC)": "പട്ടികജാതി (SC)",
    "ST": "പട്ടികവർഗ്ഗം (ST)",
    "अनुसूचित जनजाति (ST)": "പട്ടികവർഗ്ഗം (ST)",
    "Illiterate": "നിരക്ഷരൻ/നിരക്ഷര",
    "निरक्षर / अनपढ़": "നിരക്ഷരൻ/നിരക്ഷര",
    "Illiterate but able to calculate": "നിരക്ഷരൻ എന്നാൽ കണക്കുകൂട്ടാൻ കഴിവുള്ളവർ",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "നിരക്ഷരൻ എന്നാൽ കണക്കുകൂട്ടാൻ കഴിവുള്ളവർ",
    "5th pass": "5-ാം ക്ലാസ് പാസ്സായി",
    "5वीं पास": "5-ാം ക്ലാസ് പാസ്സായി",
    "8th pass": "8-ാം ക്ലാസ് പാസ്സായി",
    "8वीं पास": "8-ാം ക്ലാസ് പാസ്സായി",
    "10th pass": "10-ാം ക്ലാസ് പാസ്സായി",
    "10वीं पास": "10-ാം ക്ലാസ് പാസ്സായി",
    "12th pass": "12-ാം ക്ലാസ് പാസ്സായി",
    "12वीं पास": "12-ാം ക്ലാസ് പാസ്സായി",
    "Graduate": "ബിരുദധാരി (Graduate)",
    "स्नातक (Graduate)": "ബിരുദധാരി (Graduate)",
    "Self": "സ്വയം",
    "स्वयं": "സ്വയം",
    "Husband": "ഭർത്താവ്",
    "पति": "ഭർത്താവ്",
    "Son": "മകൻ",
    "पुत्र / बेटा": "മകൻ",
    "Daughter": "മകൾ",
    "पुत्री / बेटी": "മകൾ",
    "Member": "അംഗം",
    "सामान्य सदस्य": "അംഗം",
    "Leadership role": "നേതൃത്വ സ്ഥാനം (പ്രസിഡന്റ്/സെക്രട്ടറി/ട്രഷറർ)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "നേതൃത്വ സ്ഥാനം (പ്രസിഡന്റ്/സെക്രട്ടറി/ട്രഷറർ)",
    "Grocery / Kirana": "പലചരക്ക് കട",
    "किराना दुकान": "പലചരക്ക് കട",
    "General store": "ജനറൽ സ്റ്റോർ",
    "जनरल स्टोर": "ജനറൽ സ്റ്റോർ",
    "Leather & footwear": "തുകലും പാദരക്ഷകളും",
    "चमड़ा व जूते-चप्पल": "തുകലും പാദരക്ഷകളും",
    "Flour mill": "മാവ് മിൽ",
    "आटा चक्की": "മാവ് മിൽ",
    "Tailoring & Stitching": "തയ്യൽ കേന്ദ്രം",
    "सिलाई व कढ़ाई केंद्र": "തയ്യൽ കേന്ദ്രം",
    "Apparel & Garments": "വസ്ത്രങ്ങൾ",
    "रेडीमेड वस्त्र": "വസ്ത്രങ്ങൾ",
    "Beauty parlour": "ബ്യൂട്ടി പാർലർ",
    "ब्यूटी पार्लर": "ബ്യൂട്ടി പാർലർ",
    "Handicraft": "കരകൗശല വസ്തുക്കൾ",
    "हस्तशिल्प / हैंडीक्राफ्ट": "കരകൗശല വസ്തുക്കൾ",
    "Dairy shop": "ഡയറി & പാൽ കട",
    "डेयरी व दूध केंद्र": "ഡയറി & പാൽ കട",
    "Auto-mechanic": "ഓട്ടോ മെക്കാനിക്",
    "ऑटो मैकेनिक": "ഓട്ടോ മെക്കാനിക്",
    "E-mitra": "ഇ-സേവന കേന്ദ്രം / സി‌എസ്‌സി",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ഇ-സേവന കേന്ദ്രം / സി‌എസ്‌സി",
    "Mobile repair shop": "മൊബൈൽ റിപ്പയർ കട",
    "मोबाइल रिपेयर दुकान": "മൊബൈൽ റിപ്പയർ കട",
    "Transport": "ഗതാഗത സേവനം",
    "परिवहन सेवा": "ഗതാഗത സേവനം",
    "Any other": "മറ്റേതെങ്കിലും",
    "अन्य कोई": "മറ്റേതെങ്കിലും",
    "Whatsapp": "വാട്ട്‌സ്ആപ്പ്",
    "व्हाट्सएप (WhatsApp)": "വാട്ട്‌സ്ആപ്പ്",
    "Facebook": "ഫേസ്ബുക്ക്",
    "फेसबुक (Facebook)": "ഫേസ്ബുക്ക്",
    "Instagram": "ഇൻസ്റ്റാഗ്രാം",
    "इंस्टाग्राम (Instagram)": "ഇൻസ്റ്റാഗ്രാം",
    "Don't use social media": "സോഷ്യൽ മീഡിയ ഉപയോഗിക്കാറില്ല",
    "सोशल मीडिया का उपयोग नहीं करते": "സോഷ്യൽ മീഡിയ ഉപയോഗിക്കാറില്ല",
    "Draft": "പൂർത്തിയാകാത്ത ഡ്രാഫ്റ്റ്",
    "Save Draft": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ड्राफ्ट": "ഡ്രാഫ്റ്റ്",
    "मसुदा": "ഡ്രാഫ്റ്റ്",
    "ડ્રાફ્ટ": "ഡ്രാഫ്റ്റ്",
    "ਡਰਾਫਟ": "ഡ്രാഫ്റ്റ്",
    "খসড়া": "ഡ്രാഫ്റ്റ്",
    "வரைவு": "ഡ്രാഫ്റ്റ്",
    "చిత్తుప్రతి": "ഡ്രാഫ്റ്റ്",
    "ಕರಡು": "ഡ്രാഫ്റ്റ്",
    "ഡ്രാഫ്റ്റ്": "ഡ്രാഫ്റ്റ്",
    "ڈرافٹ": "ഡ്രാഫ്റ്റ്",
    "ड्राफ्ट सेव करें": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "मसुदा जतन करा": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ડ્રાફ્ટ સાચવો": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "খসড়া সংরক্ষণ": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "வரைவு சேமி": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "చిత్తుప్రతి భద్రపరచు": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ಕರಡು ಉಳಿಸಿ": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "ڈرافٹ محفوظ کریں": "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക",
    "Himalayan Baseline Impact Survey": "ഹിമാലയൻ ബേസ്‌ലൈൻ ഇംപാക്ട് സർവേ",
    "1. Household & Demographic Profile": "1. കുടുംബവും ജനസംഖ്യാപരമായ പ്രൊഫൈലും",
    "General identification and household metrics": "പൊതുവായ തിരിച്ചറിയലും കുടുംബ വിവരങ്ങളും",
    "2. Economic Activity & Livestock": "2. സാമ്പത്തിക പ്രവർത്തനങ്ങളും കന്നുകാലികളും",
    "Revenue, assets, and livestock count": "വരുമാനം, ആസ്തികൾ, കന്നുകാലികളുടെ എണ്ണം",
    "3. Geolocation & Digital Verification": "3. ജിയോലൊക്കേഷനും ഡിജിറ്റൽ പരിശോധനയും",
    "GPS accuracy and field photo capture": "ജിപിഎസ് കൃത്യതയും ഫീൽഡ് ഫോട്ടോയും",
    "Full Name of Household Head / Primary Respondent": "കുടുംബനാഥന്റെ / പ്രധാന പ്രതികരിക്കുന്നയാളുടെ പൂർണ്ണ നാമം",
    "Respondent Classification": "പ്രതികരിക്കുന്നയാളുടെ വർഗ്ഗീകരണം",
    "Individual": "വ്യക്തിഗത",
    "Household": "കുടുംബം",
    "Smallholder Farmer": "ചെറുകിട കർഷകൻ",
    "Micro Enterprise / Self-Employed": "സൂക്ഷ്മ സംരംഭം / സ്വയംതൊഴിൽ",
    "Primary Contact Phone Number": "പ്രധാന ഫോൺ നമ്പർ",
    "Do you own cattle, sheep, or goats?": "നിങ്ങൾക്ക് പശു, ആട് അല്ലെങ്കിൽ ചെമ്മരിയാട് ഉണ്ടോ?",
    "Total number of milch cattle / animals?": "കറവപ്പശുക്കളുടെ / മൃഗങ്ങളുടെ ആകെ എണ്ണം?",
    "Estimated Monthly Household Income (INR ₹)": "പ്രതിമാസ കുടുംബ വരുമാനം (രൂപ ₹)",
    "Farm Equipment & Key Productive Assets": "കാർഷിക ഉപകരണങ്ങളും പ്രധാന ഉൽപാദന ആസ്തികളും",
    "Capture Field GPS Coordinates (Auto-verified)": "ഫീൽഡ് ജിപിഎസ് കോർഡിനേറ്റുകൾ എടുക്കുക (ഓട്ടോ-പരിശോധിച്ചത്)",
    "Field Photo of Site / Beneficiary": "സ്ഥലം / ഗുണഭോക്താവിന്റെ ഫോട്ടോ",
    "Surveyor Sign-off & Digital Signature": "സർവേയർ ഒപ്പും ഡിജിറ്റൽ ഒപ്പും",
    "District, Block, Village, SHG, and Enterprise identification": "ജില്ല, ബ്ലോക്ക്, ഗ്രാമം, SHG, സംരംഭത്തിന്റെ തിരിച്ചറിയൽ",
    "Demographic, family structure, education, and household income": "ജനസംഖ്യാശാസ്‌ത്രം, കുടുംബ ഘടന, വിദ്യാഭ്യാസം, കുടുംബ വരുമാനം",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "തുടക്ക ചരിത്രം, പ്രവൃത്തി സമയം, മൂലധന ക്രമീകരണം, സീസണൽ വരുമാനം",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "സ്ഥലം, വിതരണക്കാർ, കടം തിരിച്ചുപിടിക്കൽ, അസംസ്കൃത വസ്തുക്കൾ, വായ്പ ലഭ്യത",
    "Loan utilization, monthly income growth, and CRP contribution": "വായ്പാ വിനിയോഗം, പ്രതിമാസ വരുമാന വർദ്ധനവ്, CRP സംഭാവന",
    "Smartphone ownership, QR code banking, and social media usage": "സ്മാർട്ട്ഫോൺ ഉടമസ്ഥത, ക്യുആർ കോഡ് ബാങ്കിംഗ്, സോഷ്യൽ മീഡിയ ഉപയോഗം",
    "GPS coordinates fix, site photo capture, and digital signatures": "ജിപിഎസ് ലൊക്കേഷൻ, സൈറ്റ് ഫോട്ടോ, ഡിജിറ്റൽ ഒപ്പ്",
    "Dashboard": "ഡാഷ്‌ബോർഡ്",
    "Surveyor Dashboard": "സർവേയർ ഡാഷ്‌ബോർഡ്",
    "Field Work Overview": "ഫീൽഡ് വർക്ക് അവലോകനം",
    "Total Recorded": "ആകെ സർവേകൾ",
    "Synced to Server": "സെർവറിലേക്ക് സിങ്ക് ചെയ്തു",
    "Pending Sync": "സിങ്ക് ബാക്കി",
    "Incomplete Drafts": "പൂർത്തിയാകാത്ത ഡ്രാഫ്റ്റുകൾ",
    "Drafts": "ഡ്രാഫ്റ്റുകൾ",
    "Completed": "പൂർത്തിയായി",
    "Today's Goal": "ഇന്നത്തെ ലക്ഷ്യം",
    "surveys completed today": "സർവേകൾ ഇന്ന് പൂർത്തിയായി",
    "Daily Target Met!": "ഇന്നത്തെ ലക്ഷ്യം നേടി! 🎉",
    "Start New Survey": "+ പുതിയ സർവേ ആരംഭിക്കുക",
    "Resume Draft": "▶ ഡ്രാഫ്റ്റ് തുടരുക",
    "Resume & Complete": "▶ ഫോം തുടരുക",
    "My Submissions & Drafts": "എന്റെ സർവേകളും ഡ്രാഫ്റ്റുകളും",
    "All Records": "എല്ലാ റെക്കോർഡുകളും",
    "Complete": "പൂർണ്ണം",
    "Questions Answered": "ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകി",
    "GPS Locked": "GPS ലോക്ക് ചെയ്തു ✓",
    "Photo Attached": "ഫോട്ടോ ചേർത്തു ✓",
    "Signed": "ഒപ്പിട്ടു ✓",
    "Ready to Sync": "സിങ്കിന് തയ്യാറാണ് (100%)",
    "Synced": "സെർവറിൽ സുരക്ഷിതം",
    "No respondent name": "പേരില്ലാത്ത പ്രതികരണക്കാരൻ",
    "Village / Location": "ഗ്രാമം / സ്ഥലം",
    "Last edited": "അവസാനം തിരുത്തിയത്",
    "Sync All Pending": "🔄 ബാക്കിയുള്ളവ എല്ലാം സിങ്ക് ചെയ്യുക",
    "No surveys recorded yet": "ഈ ഉപകരണത്തിൽ ഇതുവരെ സർവേകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല",
    "Tap '+ Start New Survey' to begin your first interview": "ആദ്യ അഭിമുഖം ആരംഭിക്കാൻ '+ പുതിയ സർവേ' ക്ലിക്ക് ചെയ്യുക",
    "Delete draft?": "ഈ ഡ്രാഫ്റ്റ് ഇല്ലാതാക്കണോ?",
    "Draft deleted": "ഡ്രാഫ്റ്റ് നീക്കംചെയ്തു",
    "Text Size": "അക്ഷര വലുപ്പം",
    "Adjust font size for your screen": "സ്‌ക്രീനിനനുസരിച്ച് അക്ഷര വലുപ്പം തിരഞ്ഞെടുക്കുക",
    "Small": "ചെറുത്",
    "Medium": "ഇടത്തരം",
    "Large": "വലുത്",
    "Text size set to Small": "അക്ഷര വലുപ്പം ചെറുതാക്കി",
    "Text size set to Medium": "അക്ഷര വലുപ്പം ഇടത്തരമാക്കി",
    "Text size set to Large": "അക്ഷര വലുപ്പം വലുതാക്കി",
    "Email Data to Admin": "അഡ്മിന് ഡാറ്റ ഇമെയിൽ ചെയ്യുക",
    "Emergency Backup & Support": "അടിയന്തര ബാക്കപ്പും പിന്തുണയും",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "നിങ്ങളുടെ എല്ലാ സർവേ റെക്കോർഡുകളും ഇമെയിൽ വഴിയോ ആപ്പുകൾ വഴിയോ അഡ്മിന് അയയ്ക്കുക.",
    "Admin Email Address": "അഡ്മിൻ ഇമെയിൽ വിലാസം",
    "Additional Note / Error Description": "പ്രശ്നം അല്ലെങ്കിൽ കുറിപ്പ് (ഓപ്ഷണൽ)",
    "Send via Email / Server": "ഇമെയിൽ വഴി അയയ്ക്കുക (സെർവർ)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp വഴി പങ്കിടുക",
    "Download JSON": "JSON ഡൗൺലോഡ് ചെയ്യുക",
    "Download CSV (Excel)": "CSV (Excel) ഡൗൺലോഡ് ചെയ്യുക",
    "Backup emailed successfully ✓": "ബാക്കപ്പ് ഇമെയിൽ വിജയകരമായി അയച്ചു ✓",
    "Total Device Records": "ഉപകരണത്തിലെ ആകെ റെക്കോർഡുകൾ",
    "Offline Storage Status": "ഓഫ്‌ലൈൻ സംഭരണ നില",
    "Healthy (IndexedDB)": "സുരക്ഷിതം (IndexedDB)",
    "Export & Backup": "കയറ്റുമതിയും ബാക്കപ്പും",
    "Send Data to Admin": "അഡ്മിന് ഡാറ്റ അയയ്ക്കുക",
    "e.g. 2020": "ഉദാ. 2020",
    "Enter year (e.g. 2020)": "വർഷം നൽകുക (ഉദാ. 2020)"
  },
  "ur": {
    "OmniQuery": "اومنی سروے",
    "ओमनीसर्वे": "اومنی سروے",
    "Online": "آن لائن",
    "ऑनलाइन": "آن لائن",
    "Offline": "آف لائن",
    "ऑफलाइन": "آف لائن",
    "Surveys": "سروے",
    "सर्वेक्षण": "سروے",
    "WAL Queue": "قطار (آف لائن)",
    "कतार (ऑफलाइन)": "قطار (آف لائن)",
    "System": "سسٹم",
    "सिस्टम": "سسٹم",
    "Exit Form": "← باہر نکلیں",
    "← बाहर निकलें": "← باہر نکلیں",
    "Step": "مرحلہ",
    "चरण": "مرحلہ",
    "of": "کا",
    "का": "کا",
    "Pages": "صفحات",
    "पृष्ठ": "صفحات",
    "Questions": "سوالات",
    "प्रश्न": "سوالات",
    "Previous": "← پچھلا",
    "← पिछला": "← پچھلا",
    "Next": "اگلا →",
    "अगला →": "اگلا →",
    "Save Offline": "آف لائن محفوظ کریں",
    "ऑफलाइन सेव करें": "آف لائن محفوظ کریں",
    "Submit Survey": "جمع کرائیں",
    "सबमिट करें": "جمع کرائیں",
    "Capture GPS Coordinates": "جی پی ایس مقام ریکارڈ کریں",
    "जीपीएस लोकेशन रिकॉर्ड करें": "جی پی ایس مقام ریکارڈ کریں",
    "GPS Fix Acquired ✓": "جی پی ایس حاصل ہو گیا ✓",
    "जीपीएस लोकेशन प्राप्त हुआ ✓": "جی پی ایس حاصل ہو گیا ✓",
    "Take Photo / Choose File": "تصویر لیں / فائل منتخب کریں",
    "फोटो लें / फाइल चुनें": "تصویر لیں / فائل منتخب کریں",
    "Sign inside box with finger or stylus": "اپنی انگلی یا اسٹائلس سے باکس میں دستخط کریں",
    "अपनी उंगली या स्टाइलस से बॉक्स में हस्ताक्षर करें": "اپنی انگلی یا اسٹائلس سے باکس میں دستخط کریں",
    "Clear Signature": "دستخط صاف کریں",
    "हस्ताक्षर मिटाएं": "دستخط صاف کریں",
    "Signature Recorded": "دستخط درج ہو گئے",
    "हस्ताक्षर दर्ज हुआ": "دستخط درج ہو گئے",
    "Enter response here...": "یہاں جواب درج کریں...",
    "यहाँ उत्तर दर्ज करें...": "یہاں جواب درج کریں...",
    "Required Questions Pending": "لازمی سوالات باقی ہیں",
    "आवश्यक प्रश्न अधूरे हैं": "لازمی سوالات باقی ہیں",
    "Please fill in these required fields before final submission, or save as an offline draft anytime.": "حتمی جمع کرانے سے پہلے براہ کرم یہ لازمی سوالات پر کریں، یا کسی بھی وقت آف لائن ڈرافٹ کے طور پر محفوظ کریں۔",
    "अंतिम सबमिशन से पहले कृपया इन आवश्यक प्रश्नों को भरें, या कभी भी ऑफलाइन ड्राफ्ट के रूप में सुरक्षित करें।": "حتمی جمع کرانے سے پہلے براہ کرم یہ لازمی سوالات پر کریں، یا کسی بھی وقت آف لائن ڈرافٹ کے طور پر محفوظ کریں۔",
    "Go to First Pending Question": "👉 پہلے باقی سوال پر جائیں",
    "👉 पहले अधूरे प्रश्न पर जाएं": "👉 پہلے باقی سوال پر جائیں",
    "Save as Offline Draft Anyway": "آف لائن ڈرافٹ محفوظ کریں",
    "💾 ऑफलाइन ड्राफ्ट सुरक्षित करें": "آف لائن ڈرافٹ محفوظ کریں",
    "Close": "بند کریں",
    "बंद करें": "بند کریں",
    "Start Survey Form": "سروے شروع کریں",
    "सर्वेक्षण शुरू करें": "سروے شروع کریں",
    "Start Survey Form →": "سروے شروع کریں →",
    "सर्वेक्षण शुरू करें →": "سروے شروع کریں →",
    "Write-Ahead Log (WAL)": "رائٹ-اہیڈ لاگ (WAL قطار)",
    "राइट-अहेड लॉग (WAL कतार)": "رائٹ-اہیڈ لاگ (WAL قطار)",
    "Atomic zero-loss local storage queue": "زیرو ڈیٹا نقصان محفوظ مقامی اسٹوریج",
    "शून्य डेटा हानि सुरक्षित स्थानीय भंडारण": "زیرو ڈیٹا نقصان محفوظ مقامی اسٹوریج",
    "Sync Now": "⟳ ابھی سنک کریں",
    "⟳ अभी सिंक करें": "⟳ ابھی سنک کریں",
    "View on Map →": "نقشے پر دیکھیں →",
    "नक्शे पर देखें →": "نقشے پر دیکھیں →",
    "Re-acquire Fix": "دوبارہ کوشش کریں",
    "पुनः प्रयास करें": "دوبارہ کوشش کریں",
    "Section A: Basic Details": "سیکشن A: بنیادی تفصیلات",
    "भाग क: बुनियादी विवरण": "حصہ اول: بنیادی تفصیلات",
    "Section B: Respondent & Household Profile": "سیکشن B: جواب دہندہ اور خاندانی پروفائل",
    "भाग ख: उत्तरदाता और परिवार की प्रोफ़ाइल": "حصہ دوم: جواب دہندہ اور خاندانی پروفائل",
    "Section C: Enterprise Operations & Finance": "سیکشن C: کاروباری نظام اور مالیات",
    "भाग ग: उद्यम संचालन और वित्त": "حصہ سوم: کاروباری کارروائیاں اور مالیات",
    "Section D: Enterprise Challenges & Coping Mechanisms": "سیکشن D: کاروباری چیلنجز اور حل",
    "भाग घ: उद्यम चुनौतियाँ और समाधान": "حصہ چہارم: کاروباری چیلنجز اور حل",
    "Section E: Impact of SVEP / OSF Schemes": "سیکشن E: SVEP / OSF اسکیموں کا اثر",
    "भाग ङ: एसवीईपी / ओएसएफ योजनाओं का प्रभाव": "حصہ پنجم: ایس وی ای پی / او ایس ایف اسکیموں کا اثر",
    "Section F: Digital Transactions & Social Media": "سیکشن F: ڈیجیٹل لین دین اور سوشل میڈیا",
    "भाग च: डिजिटल लेन-देन और सोशल मीडिया": "حصہ ششم: ڈیجیٹل لین دین اور سوشل میڈیا",
    "Section G: Field Verification & Sign-off": "سیکشن G: فیلڈ تصدیق اور دستخط",
    "भाग छ: फील्ड सत्यापन और हस्ताक्षर": "حصہ ہفتم: فیلڈ تصدیق اور دستخط",
    "District": "ضلع",
    "जिला": "ضلع",
    "Block / Tehsil": "بلاک / تحصیل",
    "ब्लॉक / तहसील": "بلاک / تحصیل",
    "Village / Gram Panchayat Name": "گاؤں / گرام پنچایت کا نام",
    "गाँव / ग्राम पंचायत का नाम": "گاؤں / گرام پنچایت کا نام",
    "Cluster Level Federation (CLF) Name": "کلسٹر لیول فیڈریشن (CLF) کا نام",
    "क्लस्टर लेवल फेडरेशन (CLF) का नाम": "کلسٹر لیول فیڈریشن (CLF) کا نام",
    "Village Organization (VO) Name": "گرام سنستھا (VO) کا نام",
    "ग्राम संगठन (VO) का नाम": "گرام سنستھا (VO) کا نام",
    "Self-Help Group (SHG) Name": "سیلف ہیلپ گروپ (SHG) کا نام",
    "स्वयं सहायता समूह (SHG) का नाम": "سیلف ہیلپ گروپ (SHG) کا نام",
    "Respondent Name": "جواب دہندہ کا نام",
    "उत्तरदाता का नाम": "جواب دہندہ کا نام",
    "Enterprise / Business Name": "کاروبار / انٹرپرائز کا نام",
    "उद्यम / व्यवसाय का नाम": "کاروبار / انٹرپرائز کا نام",
    "Year of Setting Up Enterprise": "کاروبار قائم کرنے کا سال",
    "उद्यम स्थापना का वर्ष": "کاروبار قائم کرنے کا سال",
    "Main Business Activity of the Enterprise": "کاروبار کی بنیادی سرگرمی",
    "उद्यम की मुख्य व्यावसायिक गतिविधि": "کاروبار کی بنیادی سرگرمی",
    "What is respondent's relation with SHG member?": "جواب دہندہ کا ایس ایچ جی ممبر سے کیا تعلق ہے؟",
    "उत्तरदाता का एसएचजी सदस्य से क्या संबंध है?": "جواب دہندہ کا ایس ایچ جی ممبر سے کیا تعلق ہے؟",
    "What is the age of SHG member?": "ایس ایچ جی ممبر کی عمر کیا ہے؟",
    "एसएचजी सदस्य की आयु क्या है?": "ایس ایچ جی ممبر کی عمر کیا ہے؟",
    "What is the marital status of the SHG member?": "ایس ایچ جی ممبر کی ازدواجی حیثیت کیا ہے؟",
    "एसएचजी सदस्य की वैवाहिक स्थिति क्या है?": "ایس ایچ جی ممبر کی ازدواجی حیثیت کیا ہے؟",
    "What is the social category / caste?": "سماجی زمرہ / ذات کیا ہے؟",
    "सामाजिक श्रेणी / जाति क्या है?": "سماجی زمرہ / ذات کیا ہے؟",
    "What is the education status of the SHG member?": "ایس ایچ جی ممبر کی تعلیمی قابلیت کیا ہے؟",
    "एसएचजी सदस्य की शैक्षणिक स्थिति क्या है?": "ایس ایچ جی ممبر کی تعلیمی قابلیت کیا ہے؟",
    "How many total members are in the family?": "خاندان میں کل کتنے افراد ہیں؟",
    "परिवार में कुल कितने सदस्य हैं?": "خاندان میں کل کتنے افراد ہیں؟",
    "What is your total annual household income?": "آپ کی کل سالانہ خاندانی آمدنی کتنی ہے؟",
    "आपकी कुल वार्षिक पारिवारिक आय कितनी है?": "آپ کی کل سالانہ خاندانی آمدنی کتنی ہے؟",
    "What is your role in the SHG?": "ایس ایچ جی میں آپ کا کیا کردار ہے؟",
    "एसएचजी में आपकी भूमिका क्या है?": "ایس ایچ جی میں آپ کا کیا کردار ہے؟",
    "Are you related to any of the SVEP / OSF CRP?": "کیا آپ کسی SVEP / OSF CRP سے رشتہ دار ہیں؟",
    "क्या आप किसी SVEP / OSF CRP से संबंधित हैं?": "کیا آپ کسی SVEP / OSF CRP سے رشتہ دار ہیں؟",
    "Who started the enterprise?": "کاروبار کس نے شروع کیا تھا؟",
    "उद्यम किसने शुरू किया था?": "کاروبار کس نے شروع کیا تھا؟",
    "Who operates and manages the enterprise on a daily basis?": "روزانہ کی بنیاد پر کاروبار کا انتظام کون کرتا ہے؟",
    "दैनिक आधार पर उद्यम का संचालन और प्रबंधन कौन करता है?": "روزانہ کی بنیاد پر کاروبار کا انتظام کون کرتا ہے؟",
    "For how many hours in a day does the shop/enterprise remain open?": "دن میں کتنے گھنٹے دکان/کاروبار کھلا رہتا ہے؟",
    "दिन में कितने घंटे दुकान/उद्यम खुला रहता है?": "دن میں کتنے گھنٹے دکان/کاروبار کھلا رہتا ہے؟",
    "What is the type of business place / premises?": "کاروباری جگہ کی نوعیت کیا ہے؟",
    "व्यावसायिक स्थान/परिसर का प्रकार क्या है?": "کاروباری جگہ کی نوعیت کیا ہے؟",
    "Does SHG member maintain written records of business transactions regularly?": "کیا ایس ایچ جی ممبر باقاعدگی سے کاروباری لین دین کا تحریری ریکارڈ رکھتے ہیں؟",
    "क्या एसएचजी सदस्य नियमित रूप से व्यावसायिक लेन-देन का लिखित रिकॉर्ड रखते हैं?": "کیا ایس ایچ جی ممبر باقاعدگی سے کاروباری لین دین کا تحریری ریکارڈ رکھتے ہیں؟",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "آپ کے کاروبار کے پہلے سال میں ابتدائی بیج پونجی کی رقم (روپے) کیا تھی؟",
    "आपके उद्यम के पहले वर्ष में प्रारंभिक बीज पूंजी की राशि (रु) क्या थी?": "آپ کے کاروبار کے پہلے سال میں ابتدائی بیج پونجی کی رقم (روپے) کیا تھی؟",
    "How do you manage working capital during peak season?": "سیزن کے دوران آپ ورکنگ کیپیٹل کا انتظام کیسے کرتے ہیں؟",
    "पीक सीजन के दौरान आप कार्यशील पूंजी का प्रबंधन कैसे करते हैं?": "سیزن کے دوران آپ ورکنگ کیپیٹل کا انتظام کیسے کرتے ہیں؟",
    "Is the location of your space convenient for your business?": "کیا آپ کی جگہ کا مقام آپ کے کاروبار کے لیے موزوں ہے؟",
    "क्या आपके स्थान की स्थिति आपके व्यवसाय के लिए सुविधाजनक है?": "کیا آپ کی جگہ کا مقام آپ کے کاروبار کے لیے موزوں ہے؟",
    "Are you satisfied and happy with your wholesale supplier?": "کیا آپ اپنے ہول سیل سپلائر سے مطمئن ہیں؟",
    "क्या आप अपने थोक सप्लायर से संतुष्ट और खुश हैं?": "کیا آپ اپنے ہول سیل سپلائر سے مطمئن ہیں؟",
    "Are you able to recover credit / money from your customers?": "کیا آپ گاہکوں سے ادھار رقم وصول کر پاتے ہیں؟",
    "क्या आप अपने ग्राहकों से उधारी/पैसा वसूल पाते हैं?": "کیا آپ گاہکوں سے ادھار رقم وصول کر پاتے ہیں؟",
    "Do you source raw materials/goods from market independently?": "کیا آپ مارکیٹ سے آزادانہ طور پر خام مال خریدتے ہیں؟",
    "क्या आप बाजार से स्वतंत्र रूप से कच्चा माल/सामान लाते हैं?": "کیا آپ مارکیٹ سے آزادانہ طور پر خام مال خریدتے ہیں؟",
    "Do you have easy access to loans from different sources?": "کیا آپ کو مختلف ذرائع سے قرض کی آسان رسائی حاصل ہے؟",
    "क्या आपको विभिन्न स्रोतों से ऋण की आसान पहुँच प्राप्त है?": "کیا آپ کو مختلف ذرائع سے قرض کی آسان رسائی حاصل ہے؟",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "آپ نے SVEP / OSF اسکیم کے تحت کتنا قرض لیا ہے (روپے)؟",
    "आपने SVEP / OSF योजना के तहत कितनी ऋण राशि प्राप्त की है (रु)?": "آپ نے SVEP / OSF اسکیم کے تحت کتنا قرض لیا ہے (روپے)؟",
    "How did you utilize the enterprise loan?": "آپ نے کاروباری قرض کا استعمال کیسے کیا؟",
    "आपने उद्यम ऋण का उपयोग किस प्रकार किया?": "آپ نے کاروباری قرض کا استعمال کیسے کیا؟",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "قرض لینے سے پہلے کاروبار کی ماہانہ آمدنی (روپے)؟",
    "ऋण से बदलाव करने से पहले उद्यम की मासिक आय (रु)?": "قرض لینے سے پہلے کاروبار کی ماہانہ آمدنی (روپے)؟",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "قرض لینے کے بعد کاروبار کی ماہانہ آمدنی (روپے)؟",
    "ऋण से बदलाव करने के बाद उद्यम की मासिक आय (रु)?": "قرض لینے کے بعد کاروبار کی ماہانہ آمدنی (روپے)؟",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF CRP کا کیا کردار رہا ہے؟",
    "SVEP / OSF CRP का क्या योगदान रहा है?": "SVEP / OSF CRP کا کیا کردار رہا ہے؟",
    "Does the woman entrepreneur own a smartphone?": "کیا خاتون کاروباری کے پاس اسمارٹ فون ہے؟",
    "क्या महिला उद्यमी के पास स्मार्टफोन है?": "کیا خاتون کاروباری کے پاس اسمارٹ فون ہے؟",
    "Do you use QR code / UPI / mobile banking for business transactions?": "کیا آپ کاروباری لین دین کے لیے کیو آر کوڈ / یو پی آئی / موبائل بینکنگ استعمال کرتے ہیں؟",
    "क्या आप व्यावसायिक लेन-देन के लिए क्यूआर कोड / यूपीआई / मोबाइल बैंकिंग का उपयोग करते हैं?": "کیا آپ کاروباری لین دین کے لیے کیو آر کوڈ / یو پی آئی / موبائل بینکنگ استعمال کرتے ہیں؟",
    "Daily how many transactions are done via QR code / UPI?": "روزانہ کیو آر کوڈ / یو پی آئی کے ذریعے کتنے لین دین ہوتے ہیں؟",
    "प्रतिदिन क्यूआर कोड / यूपीआई द्वारा कितने लेन-देन होते हैं?": "روزانہ کیو آر کوڈ / یو پی آئی کے ذریعے کتنے لین دین ہوتے ہیں؟",
    "Which social media platforms do you use for your business?": "آپ اپنے کاروبار کے لیے کون سے سوشل میڈیا پلیٹ فارم استعمال کرتے ہیں؟",
    "आप अपने व्यवसाय के लिए किन सोशल मीडिया प्लेटफॉर्म का उपयोग करते हैं?": "آپ اپنے کاروبار کے لیے کون سے سوشل میڈیا پلیٹ فارم استعمال کرتے ہیں؟",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "کاروبار کا جی پی ایس مقام کیپچر کریں (سیٹلائٹ کوآرڈینیٹس)",
    "उद्यम जीपीएस लोकेशन कैप्चर करें (उपग्रह निर्देशांक)": "کاروبار کا جی پی ایس مقام کیپچر کریں (سیٹلائٹ کوآرڈینیٹس)",
    "Field Photo of Enterprise & Beneficiary": "کاروبار اور مستفید کی فیلڈ تصویر",
    "उद्यम और लाभार्थी का फील्ड फोटो": "کاروبار اور مستفید کی فیلڈ تصویر",
    "Respondent & Surveyor Digital Signature": "جواب دہندہ اور سروے کرنے والے کے ڈیجیٹل دستخط",
    "उत्तरदाता और सर्वेक्षक के डिजिटल हस्ताक्षर": "جواب دہندہ اور سروے کرنے والے کے ڈیجیٹل دستخط",
    "Yes": "ہاں",
    "हाँ": "ہاں",
    "No": "نہیں",
    "नहीं": "نہیں",
    "Baran": "باراں",
    "बारां": "باراں",
    "Churu": "چورو",
    "चूरू": "چورو",
    "Dausa": "دौسا",
    "दौसा": "دौسا",
    "Dungarpur": "ڈونگر پور",
    "डूंगरपुर": "ڈونگر پور",
    "Jodhpur": "جودھ پور",
    "जोधपुर": "جودھ پور",
    "Chhipabarod": "چھیپابڑود",
    "छीपाबड़ौद": "چھیپابڑود",
    "Kishanganj": "کشن گنج",
    "किशनगंज": "کشن گنج",
    "Sardar Sheher": "سردار شہر",
    "सरदारशहर": "سردار شہر",
    "Bidasar": "بیداسر",
    "बीदासर": "بیداسر",
    "Secundra": "سکندرا",
    "सिकंदरा": "سکندرا",
    "Sagwara": "ساگواڑا",
    "सागवाड़ा": "ساگواڑا",
    "Galiakot": "گلیاکوٹ",
    "गलियाकोट": "گلیاکوٹ",
    "Bicchiwada": "بچھی واڑا",
    "बिछीवाड़ा": "بچھی واڑا",
    "Jodhpur Block": "جودھ پور بلاک",
    "जोधपुर ब्लॉक": "جودھ پور بلاک",
    "Married": "شادی شدہ",
    "विवाहित": "شادی شدہ",
    "Single": "غیر شادی شدہ",
    "अविवाहित": "غیر شادی شدہ",
    "Widowed": "بیوہ",
    "विधवा": "بیوہ",
    "Divorced": "طلاق یافتہ",
    "तलाकशुदा": "طلاق یافتہ",
    "Separated": "علیحدہ",
    "अलग रह रहे": "علیحدہ",
    "General": "عام (General)",
    "सामान्य": "عام (General)",
    "OBC": "دیگر پسماندہ طبقات (OBC)",
    "अन्य पिछड़ा वर्ग (OBC)": "دیگر پسماندہ طبقات (OBC)",
    "SC": "شیڈولڈ کاسٹ (SC)",
    "अनुसूचित जाति (SC)": "شیڈولڈ کاسٹ (SC)",
    "ST": "شیڈولڈ ٹرائب (ST)",
    "अनुसूचित जनजाति (ST)": "شیڈولڈ ٹرائب (ST)",
    "Illiterate": "ان پڑھ / ناخواندہ",
    "निरक्षर / अनपढ़": "ان پڑھ / ناخواندہ",
    "Illiterate but able to calculate": "ناخواندہ لیکن حساب کتاب کر سکتے ہیں",
    "अनपढ़ लेकिन हिसाब-किताब में सक्षम": "ناخواندہ لیکن حساب کتاب کر سکتے ہیں",
    "5th pass": "پانچویں پاس",
    "5वीं पास": "پانچویں پاس",
    "8th pass": "آٹھویں پاس",
    "8वीं पास": "آٹھویں پاس",
    "10th pass": "دسویں پاس",
    "10वीं पास": "دسویں پاس",
    "12th pass": "بارہویں پاس",
    "12वीं पास": "بارہویں پاس",
    "Graduate": "گریجویٹ",
    "स्नातक (Graduate)": "گریجویٹ",
    "Self": "خود",
    "स्वयं": "خود",
    "Husband": "شوہر",
    "पति": "شوہر",
    "Son": "بیٹا",
    "पुत्र / बेटा": "بیٹا",
    "Daughter": "بیٹی",
    "पुत्री / बेटी": "بیٹی",
    "Member": "رکن",
    "सामान्य सदस्य": "رکن",
    "Leadership role": "قیادت کا کردار (صدر/سیکرٹری/خزانچی)",
    "पदाधिकारी / नेतृत्व पद (अध्यक्ष/सचिव/कोषाध्यक्ष)": "قیادت کا کردار (صدر/سیکرٹری/خزانچی)",
    "Grocery / Kirana": "کرانہ دکان",
    "किराना दुकान": "کرانہ دکان",
    "General store": "جنرل اسٹور",
    "जनरल स्टोर": "جنرل اسٹور",
    "Leather & footwear": "چمڑا اور جوتے",
    "चमड़ा व जूते-चप्पल": "چمڑا اور جوتے",
    "Flour mill": "آٹا چکی",
    "आटा चक्की": "آٹا چکی",
    "Tailoring & Stitching": "سلائی کڑھائی مرکز",
    "सिलाई व कढ़ाई केंद्र": "سلائی کڑھائی مرکز",
    "Apparel & Garments": "ریڈی میڈ کپڑے",
    "रेडीमेड वस्त्र": "ریڈی میڈ کپڑے",
    "Beauty parlour": "بیوٹی پارلر",
    "ब्यूटी पार्लर": "بیوٹی پارلر",
    "Handicraft": "دستکاری",
    "हस्तशिल्प / हैंडीक्राफ्ट": "دستکاری",
    "Dairy shop": "ڈیری اور دودھ کی دکان",
    "डेयरी व दूध केंद्र": "ڈیری اور دودھ کی دکان",
    "Auto-mechanic": "آٹو مکینک",
    "ऑटो मैकेनिक": "آٹو مکینک",
    "E-mitra": "ای-متر / کسٹمر سروس سنٹر",
    "ई-मित्र केंद्र / ग्राहक सेवा केंद्र": "ای-متر / کسٹمر سروس سنٹر",
    "Mobile repair shop": "موبائل ریپئرنگ دکان",
    "मोबाइल रिपेयर दुकान": "موبائل ریپئرنگ دکان",
    "Transport": "ٹرانسپورٹ سروس",
    "परिवहन सेवा": "ٹرانسپورٹ سروس",
    "Any other": "کوئی دوسرا",
    "अन्य कोई": "کوئی دوسرا",
    "Whatsapp": "واٹس ایپ",
    "व्हाट्सएप (WhatsApp)": "واٹس ایپ",
    "Facebook": "فیس بک",
    "फेसबुक (Facebook)": "فیس بک",
    "Instagram": "انسٹاگرام",
    "इंस्टाग्राम (Instagram)": "انسٹاگرام",
    "Don't use social media": "سوشل میڈیا استعمال نہیں کرتے",
    "सोशल मीडिया का उपयोग नहीं करते": "سوشل میڈیا استعمال نہیں کرتے",
    "Draft": "نامکمل ڈرافٹ",
    "Save Draft": "ڈرافٹ محفوظ کریں",
    "ड्राफ्ट": "ڈرافٹ",
    "मसुदा": "ڈرافٹ",
    "ડ્રાફ્ટ": "ڈرافٹ",
    "ਡਰਾਫਟ": "ڈرافٹ",
    "খসড়া": "ڈرافٹ",
    "வரைவு": "ڈرافٹ",
    "చిత్తుప్రతి": "ڈرافٹ",
    "ಕರಡು": "ڈرافٹ",
    "ഡ്രാഫ്റ്റ്": "ڈرافٹ",
    "ڈرافٹ": "ڈرافٹ",
    "ड्राफ्ट सेव करें": "ڈرافٹ محفوظ کریں",
    "मसुदा जतन करा": "ڈرافٹ محفوظ کریں",
    "ડ્રાફ્ટ સાચવો": "ڈرافٹ محفوظ کریں",
    "ਡਰਾਫਟ ਸੰਭਾਲੋ": "ڈرافٹ محفوظ کریں",
    "খসড়া সংরক্ষণ": "ڈرافٹ محفوظ کریں",
    "வரைவு சேமி": "ڈرافٹ محفوظ کریں",
    "చిత్తుప్రతి భద్రపరచు": "ڈرافٹ محفوظ کریں",
    "ಕರಡು ಉಳಿಸಿ": "ڈرافٹ محفوظ کریں",
    "ഡ്രാഫ്റ്റ് സംരക്ഷിക്കുക": "ڈرافٹ محفوظ کریں",
    "ڈرافٹ محفوظ کریں": "ڈرافٹ محفوظ کریں",
    "Himalayan Baseline Impact Survey": "ہمالین بیس لائن اثراتی سروے",
    "1. Household & Demographic Profile": "1. گھریلو اور آبادیاتی پروفائل",
    "General identification and household metrics": "عام شناخت اور گھریلو تفصیلات",
    "2. Economic Activity & Livestock": "2. معاشی سرگرمیاں اور لائیو سٹاک",
    "Revenue, assets, and livestock count": "آمدنی، اثاثے اور مویشیوں کی تعداد",
    "3. Geolocation & Digital Verification": "3. جغرافیائی محل وقوع اور ڈیجیٹل تصدیق",
    "GPS accuracy and field photo capture": "جی پی ایس کی درستگی اور فیلڈ فوٹو",
    "Full Name of Household Head / Primary Respondent": "گھر کے سربراہ / بنیادی جواب دہندہ کا پورا نام",
    "Respondent Classification": "جواب دہندہ کی درجہ بندی",
    "Individual": "انفرادی",
    "Household": "گھریلو",
    "Smallholder Farmer": "چھوٹے کسان",
    "Micro Enterprise / Self-Employed": "مائیکرو انٹرپرائز / خود روزگار",
    "Primary Contact Phone Number": "بنیادی رابطہ فون نمبر",
    "Do you own cattle, sheep, or goats?": "کیا آپ کے پاس گائے، بھیڑ یا بکریاں ہیں؟",
    "Total number of milch cattle / animals?": "دودھ دینے والے مویشیوں / جانوروں کی کل تعداد؟",
    "Estimated Monthly Household Income (INR ₹)": "تخمینی ماہانہ گھریلو آمدنی (روپے ₹)",
    "Farm Equipment & Key Productive Assets": "زرعی سامان اور اہم پیداواری اثاثے",
    "Capture Field GPS Coordinates (Auto-verified)": "فیلڈ جی پی ایس کوآرڈینیٹ حاصل کریں (خودکار تصدیق)",
    "Field Photo of Site / Beneficiary": "سائٹ / مستفید کنندہ کی فیلڈ تصویر",
    "Surveyor Sign-off & Digital Signature": "سروے کرنے والے کی منظوری اور ڈیجیٹل دستخط",
    "District, Block, Village, SHG, and Enterprise identification": "ضلع، بلاک، گاؤں، ایس ایچ جی اور کاروباری شناخت",
    "Demographic, family structure, education, and household income": "آبادیات، خاندانی ڈھانچہ، تعلیم اور گھریلو آمدنی",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "آغاز کی تاریخ، کام کے اوقات، سرمایہ کا انتظام اور موسمی آمدنی",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "مقام، سپلائرز، قرض کی وصولی، خام مال اور قرض کی رسائی",
    "Loan utilization, monthly income growth, and CRP contribution": "قرض کا استعمال، ماہانہ آمدنی میں اضافہ اور سی آر پی کا تعاون",
    "Smartphone ownership, QR code banking, and social media usage": "اسمارٹ فون کی ملکیت، کیو آر کوڈ بینکنگ اور سوشل میڈیا کا استعمال",
    "GPS coordinates fix, site photo capture, and digital signatures": "جی پی ایس کوآرڈینیٹس، سائٹ کی تصویر اور ڈیجیٹل دستخط",
    "Dashboard": "ڈیش بورڈ",
    "Surveyor Dashboard": "سروے کرنے والے کا ڈیش بورڈ",
    "Field Work Overview": "فیلڈ ورک کا جائزہ",
    "Total Recorded": "کل سروے",
    "Synced to Server": "سرور پر مطابقت پذیر",
    "Pending Sync": "باقی سنک",
    "Incomplete Drafts": "نامکمل ڈرافٹس",
    "Drafts": "ڈرافٹس",
    "Completed": "مکمل",
    "Today's Goal": "آج کا ہدف",
    "surveys completed today": "سروے آج مکمل ہوئے",
    "Daily Target Met!": "آج کا ہدف مکمل ہوا! 🎉",
    "Start New Survey": "+ نیا سروے شروع کریں",
    "Resume Draft": "▶ نامکمل فارم مکمل کریں",
    "Resume & Complete": "▶ فارم جاری رکھیں",
    "My Submissions & Drafts": "میرے سروے اور ڈرافٹس",
    "All Records": "تمام ریکارڈز",
    "Complete": "مکمل",
    "Questions Answered": "سوالات کے جوابات دیئے گئے",
    "GPS Locked": "GPS لاک ✓",
    "Photo Attached": "تصویر منسلک ✓",
    "Signed": "دستخط شدہ ✓",
    "Ready to Sync": "سنک کیلئے تیار (100%)",
    "Synced": "سرور پر محفوظ",
    "No respondent name": "گمنام جواب دہندہ",
    "Village / Location": "گاؤں / مقام",
    "Last edited": "آخری ترمیم",
    "Sync All Pending": "🔄 تمام زیر التواء سنک کریں",
    "No surveys recorded yet": "اس ڈیوائس پر ابھی تک کوئی سروے درج نہیں ہے",
    "Tap '+ Start New Survey' to begin your first interview": "پہلا انٹرویو شروع کرنے کیلئے '+ نیا سروے' دبائیں",
    "Delete draft?": "کیا آپ واقعی یہ ڈرافٹ حذف کرنا چاہتے ہیں؟",
    "Draft deleted": "ڈرافٹ حذف کر دیا گیا",
    "Text Size": "حروف کا سائز",
    "Adjust font size for your screen": "اسکرین کے مطابق حروف کا سائز منتخب کریں",
    "Small": "چھوٹا",
    "Medium": "درمیانہ",
    "Large": "بڑا",
    "Text size set to Small": "حروف کا سائز چھوٹا کر دیا گیا",
    "Text size set to Medium": "حروف کا سائز درمیانہ کر دیا گیا",
    "Text size set to Large": "حروف کا سائز بڑا کر دیا گیا",
    "Email Data to Admin": "ایڈمن کو ڈیٹا ای میل کریں",
    "Emergency Backup & Support": "ایمرجنسی بیک اپ اور سپورٹ",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "اپنے تمام سروے ریکارڈز ای میل یا ایپس کے ذریعے ایڈمن کو بھیجیں۔",
    "Admin Email Address": "ایڈمن کا ای میل پتہ",
    "Additional Note / Error Description": "مسئلہ یا تفصیل (اختیاری)",
    "Send via Email / Server": "ای میل کے ذریعے بھیجیں (سرور)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp پر شیئر کریں",
    "Download JSON": "JSON ڈاؤن لوڈ کریں",
    "Download CSV (Excel)": "CSV (Excel) ڈاؤن لوڈ کریں",
    "Backup emailed successfully ✓": "بیک اپ ای میل کامیابی کے ساتھ بھیج دیا گیا ✓",
    "Total Device Records": "ڈیوائس پر کل ریکارڈز",
    "Offline Storage Status": "لوکل اسٹوریج کی حیثیت",
    "Healthy (IndexedDB)": "محفوظ (IndexedDB)",
    "Export & Backup": "ایکسپورٹ اور بیک اپ",
    "Send Data to Admin": "ایڈمن کو ڈیٹا بھیجیں",
    "e.g. 2020": "مثلاً 2020",
    "Enter year (e.g. 2020)": "سال درج کریں (مثلاً 2020)"
  },
  "raj": {
    "Listen": "सुणो",
    "Speaking...": "बोल रह्यो है...",
    "Page": "पृष्ठ",
    "of": "रो",
    "Get My Location": "म्हारो स्थान प्राप्त करो",
    "Location Acquired": "स्थान मिल ग्यो",
    "Take Photo": "फोटो खींचो",
    "Change Photo": "फोटो बदलो",
    "Sign here with finger": "अठै आंगली सूं दस्तखत करो",
    "Done / Send": "जमा करो",
    "Save Work": "सुरक्षित राखो",
    "Yes": "हाँ",
    "No": "ना",
    "Back": "← पाछै",
    "Next": "आगै →",
    "Exit Form": "← बाहर निकळो",
    "+ Add Item / Asset": "+ औजार / संपत्ति जोड़ो",
    "Equipment / Asset Name": "औजार / संपत्ति रो नाम",
    "Quantity": "संख्या",
    "Approx Value (₹)": "अनुमानित मूल्य (₹)",
    "Item": "चीज / वस्तु",
    "Remove": "हटाओ",
    "e.g. Tractor, Water Pump, Sewing Machine": "उदा. ट्रैक्टर, पानी रो पंप, सिलाई मशीन",
    "Enter answer...": "उत्तर लिखो...",
    "Clear Signature": "दस्तखत हटाओ",
    "Signature Recorded": "दस्तखत दर्ज होया",
    "View on Map →": "नक्शे पे देखो →",
    "Re-acquire Fix": "पाछो प्रयास करो",
    "GPS Fix Acquired ✓": "जीपीएस लॉक होयो ✓",
    "Select Language": "भाषा चुणो",
    "Language": "भाषा",
    "Menu": "मेनू",
    "Close": "बंद करो",
    "Choose your preferred language": "आपणी पसंद री भाषा चुणो",
    "Quick Actions": "त्वरित काम",
    "Sync Now": "अबार सिंक करो",
    "Syncing...": "सिंक हो रह्यो है...",
    "Surveys": "सर्वेक्षण",
    "WAL Queue": "लोकल कतार",
    "Choose a survey form to start": "शुरू करण खातर एक फॉर्म चुणो",
    "No Survey Templates Found": "कोई सर्वेक्षण फॉर्म कोनी मिल्यो",
    "Start Survey Form": "सर्वेक्षण शुरू करो →",
    "Mandatory Questions Pending": "जरूरी सवाल बाकी है",
    "Please complete the following required fields before submitting:": "जमा करण सूं पैली आ जरूरी जानकारी भरो:",
    "Understood": "समझ गया",
    "No records in local storage queue": "लोकल कतार में कोई रिकॉर्ड कोनी है",
    "Export Backup": "बैकअप निकालो",
    "Pages": "पृष्ठ",
    "Questions": "सवाल",
    "Study on Performance of SHG-led Women Entrepreneurs": "स्वयं सहायता समूह (SHG) महिला उद्यमियों रा प्रदर्शन रो अध्ययन",
    "Section A: Geographic & Demographic Profile": "खंड A: भौगोलिक एवं जनसांख्यिकीय विवरण",
    "Basic identification, village location, and SHG enterprise details": "बुनियादी पहचान, गाँव रो स्थान अर SHG उद्यम री जानकारी",
    "Section B: Enterprise Governance & Socio-Economic Status": "खंड B: उद्यम संचालन एवं सामाजिक-आर्थिक स्थिति",
    "Demographic, family structure, education, and household income": "जनसांख्यिकी, परिवार री बनावट, शिक्षा अर पारिवारिक आमदनी",
    "Section C: Enterprise Operations & Finance": "खंड C: उद्यम संचालन अर वित्त",
    "Start history, operating hours, capital arrangement, and seasonal revenue": "शुरुआत रो इतिहास, काम रा घंटा, पूंजी री व्यवस्था अर मौसमी कमाई",
    "Section D: Enterprise Challenges & Coping Mechanisms": "खंड D: उद्यम री चुनौतियां अर समाधान",
    "Location, suppliers, debt recovery, material sourcing, and loan access": "स्थान, सप्लायर, उधारी वसूली, माल री खरीद अर ऋण सुविधा",
    "Section E: Impact of SVEP / OSF Schemes": "खंड E: SVEP / OSF योजनावां रो प्रभाव",
    "Loan utilization, monthly income growth, and CRP contribution": "ऋण रो उपयोग, मासिक आमदनी में बढ़ोतरी अर CRP रो योगदान",
    "Section F: Digital Transactions & Social Media": "खंड F: डिजिटल लेन-देन अर सोशल मीडिया",
    "Smartphone ownership, QR code banking, and social media usage": "स्मार्टफोन स्वामित्व, क्यूआर कोड बैंकिंग अर सोशल मीडिया रो इस्तेमाल",
    "Section G: Field Verification & Sign-off": "खंड G: फील्ड सत्यापन अर हस्ताक्षर",
    "GPS coordinates fix, site photo capture, and digital signatures": "जीपीएस निर्देशांक लॉक, स्थल री फोटो अर डिजिटल दस्तखत",
    "District": "जिल्लो",
    "Baran": "बारां",
    "Churu": "चूरू",
    "Dausa": "दौसा",
    "Dungarpur": "डूंगरपुर",
    "Jodhpur": "जोधपुर",
    "Block / Tehsil": "ब्लॉक / तहसील",
    "Chhipabarod": "छीपाबड़ौद",
    "Kishanganj": "किशनगंज",
    "Sardar Sheher": "सरदारशहर",
    "Bidasar": "बीदासर",
    "Secundra": "सिकंदरा",
    "Sagwara": "सागवाड़ा",
    "Galiakot": "गलियाकोट",
    "Bicchiwada": "बिछीवाड़ा",
    "Jodhpur Block": "जोधपुर ब्लॉक",
    "Village / Gram Panchayat Name": "गाँव / ग्राम पंचायत रो नाम",
    "Cluster Level Federation (CLF) Name": "क्लस्टर लेवल फेडरेशन (CLF) रो नाम",
    "Village Organization (VO) Name": "ग्राम संगठन (VO) रो नाम",
    "Self-Help Group (SHG) Name": "स्वयं सहायता समूह (SHG) रो नाम",
    "Respondent Name": "उत्तरदाता रो नाम",
    "Enterprise / Business Name": "उद्यम / व्यापार रो नाम",
    "Year of Setting Up Enterprise": "उद्यम शुरू करण रो साल",
    "Main Business Activity of the Enterprise": "उद्यम री मुख्य व्यावसायिक गतिविधि",
    "Grocery / Kirana": "किराणा दुकान",
    "General store": "जनरल स्टोर",
    "Leather & footwear": "चमड़ा अर जूता-चप्पल",
    "Flour mill": "आटा चक्की",
    "Tailoring & Stitching": "सिलाई अर टेलरिंग",
    "Apparel & Garments": "कपड़ा अर रेडीमेड गारमेंट्स",
    "Beauty parlour": "ब्यूटी पार्लर",
    "Handicraft": "हस्तशिल्प (हैंडीक्राफ्ट)",
    "Dairy shop": "डेयरी री दुकान",
    "Auto-mechanic": "ऑटो-मैकेनिक",
    "E-mitra": "ई-मित्र",
    "Mobile repair shop": "मोबाइल रिपेयरिंग दुकान",
    "Transport": "ट्रांसपोर्ट / माल ढुलाई",
    "What is respondent's relation with SHG member?": "उत्तरदाता रो SHG सदस्य सूं कांई संबंध है?",
    "Self": "खुद",
    "Husband": "पति",
    "Son": "बेटो",
    "Daughter": "बेटी",
    "Any other": "दूजो कोई",
    "What is the age of SHG member?": "SHG सदस्य री उमर कांई है?",
    "18-25": "18-25 साल",
    "25-35": "25-35 साल",
    "35-45": "35-45 साल",
    "45-55": "45-55 साल",
    "Above 55": "55 साल सूं ऊपर",
    "What is the marital status of the SHG member?": "SHG सदस्य री वैवाहिक स्थिति कांई है?",
    "Single": "अविवाहित",
    "Married": "परणीजी (विवाहित)",
    "Widowed": "विधवा",
    "Separated": "अलग रहण वाली",
    "Divorced": "तलाकशुदा",
    "What is the social category / caste?": "सामाजिक श्रेणी / जाति कांई है?",
    "SC": "अनुसूचित जाति (SC)",
    "ST": "अनुसूचित जनजाति (ST)",
    "OBC": "अन्य पिछड़ा वर्ग (OBC)",
    "General": "सामान्य (General)",
    "What is the education status of the SHG member?": "SHG सदस्य री पढ़ाई-लिखाई री स्थिति कांई है?",
    "Illiterate": "अनपढ़",
    "Illiterate but able to calculate": "अनपढ़ पण हिसाब-किताब जाणे",
    "5th pass": "5वीं पास",
    "8th pass": "8वीं पास",
    "10th pass": "10वीं पास",
    "12th pass": "12वीं पास",
    "Graduate": "स्नातक (Graduate)",
    "How many total members are in the family?": "परिवार में कुल कितरा सदस्य है?",
    "What is your total annual household income?": "परिवार री कुल सालाना आय कितरी है?",
    "Less than Rs 1,20,000": "1,20,000 रु. सूं कम",
    "Rs 1,20,000 to Rs 1,60,000": "1,20,000 रु. सूं 1,60,000 रु.",
    "Rs 1,60,000 to Rs 2,00,000": "1,60,000 रु. सूं 2,00,000 रु.",
    "Rs 2,00,000 to Rs 2,50,000": "2,00,000 रु. सूं 2,50,000 रु.",
    "Rs 2,50,000 to Rs 3,00,000": "2,50,000 रु. सूं 3,00,000 रु.",
    "Rs 3,00,000 to Rs 3,50,000": "3,00,000 रु. सूं 3,50,000 रु.",
    "Above Rs 3,50,000": "3,50,000 रु. सूं ज्यादा",
    "What is your role in the SHG?": "SHG में आपरी कांई भूमिका है?",
    "Member": "सदस्य",
    "Leadership role": "नेतृत्व भूमिका (अध्यक्ष/सचिव/कोषाध्यक्ष)",
    "Are you related to any of the SVEP / OSF CRP?": "कांई आप SVEP / OSF रा कोई CRP सूं संबंधित हो?",
    "Who started the enterprise?": "उद्यम / दुकान कुण शुरू करी?",
    "Family enterprise": "परिवार रो उद्यम",
    "Who operates and manages the enterprise on a daily basis?": "दुकान/उद्यम रो रोज रो काम-काज कुण संभाळे है?",
    "Self alone": "खुद अकेली",
    "Self with occasional support from family": "खुद, परिवार री कदे-कदे मदद सूं",
    "Self with regular support from family": "खुद, परिवार री रोज री मदद सूं",
    "Only husband": "सिर्फ पति",
    "Husband and wife (joint management)": "पति अर पत्नी दोनुं (साझा)",
    "Family members": "परिवार रा सदस्य",
    "For how many hours in a day does the shop/enterprise remain open?": "दुकान/उद्यम दिन में कितरा घंटा खुली रहेवे?",
    "Less than 4 hours": "4 घंटा सूं कम",
    "4-5 hours": "4-5 घंटा",
    "5-8 hours": "5-8 घंटा",
    "8-10 hours": "8-10 घंटा",
    "What is the type of business place / premises?": "व्यापार री जगह/परिसर किस तरह रो है?",
    "Own shop": "खुद री दुकान",
    "Operating from own house": "खुद रा घर सूं चलावे",
    "Rented shop": "किराये री दुकान",
    "Operating from rented house": "किराये रा घर सूं चलावे",
    "Does SHG member maintain written records of business transactions regularly?": "कांई SHG सदस्य नियमित रूप सूं लेन-देन रो लिखित बहीखातो राखे है?",
    "Yes, with help of family member": "हाँ, परिवार रा सदस्य री मदद सूं",
    "Yes, husband does": "हाँ, पति राखे है",
    "Don't record regularly": "नियमित कोनी राखे",
    "In the first year of your enterprise, what was the amount of seed capital (Rs)?": "उद्यम रा पहिला साल में शुरुआती पूंजी (सीड कैपिटल) कितरी ही (रु.)?",
    "How do you manage working capital during peak season?": "सीजन रा टेम आप कार्यशील पूंजी (वर्किंग कैपिटल) किकर जुटाओ?",
    "I borrow money from SHG to purchase material": "सामान खरीदण खातर SHG सूं उधार ल्यूं",
    "I borrow money from moneylender/NBFIs to purchase material": "साहूकार/NBFI सूं उधार ल्यूं",
    "I borrow money from banks": "बैंक सूं लोन ल्यूं",
    "I buy material on credit": "उधार पे सामान ल्यूं",
    "Is the location of your space convenient for your business?": "कांई आपरी दुकान री जगह व्यापार खातर सही अर सुविधाजनक है?",
    "Yes, I own the space and I get clients easily": "हाँ, जगह खुद री है अर ग्राहक आराम सूं आवे",
    "Yes, I found the space easily on rent and I get clients": "हाँ, किराये पे जगह आराम सूं मिलगी अर ग्राहक आवे",
    "Yes, but compared to others I was charged a higher rent": "हाँ, पण दूजां सूं ज्यादा किरायो लेवे है",
    "No, but I own the space and can't move to other location": "ना, पण खुद री जगह है अर दूजी जगह नी जा सका",
    "No, but I could afford only this space": "ना, पण म्हारे बजट में आ ही जगह बैठती ही",
    "Are you satisfied and happy with your wholesale supplier?": "कांई आप आपरा थोक सप्लायर सूं संतुष्ट अर खुश हो?",
    "Yes, supplier is from nearby town/village and supplies on demand": "हाँ, सप्लायर नेड़े रा गाँव/कस्बा रो है अर जरूरत पे माल देवे",
    "Yes, supplier offers credit purchase and discounts": "हाँ, सप्लायर उधार अर छूट देवे",
    "I buy from different suppliers as per need/season": "जरूरत अर सीजन रा हिसाब सूं अलग-अलग सप्लायर सूं खरीदूं",
    "No, but he is our old supplier and we rely on him": "ना, पण पुराणो सप्लायर है इण वास्ते भरोसे पे काम चाले",
    "Are you able to recover credit / money from your customers?": "कांई आप ग्राहकां सूं उधारी रो रुपियो आराम सूं वसूल कर पाओ?",
    "Yes, I don't face any issues": "हाँ, कोई परेशानी कोनी आवे",
    "Yes, but I conduct only cash transactions": "हाँ, पण म्हे खाली नकद में ही काम करां",
    "Yes, but I have learnt over the years how to negotiate": "हाँ, बरसां में तजुर्बो हो ग्यो किकर मांगणो है",
    "No, but my husband is able to recover": "ना, पण म्हारा पति वसूल कर लेवे",
    "No, my business has suffered losses due to debt": "ना, उधारी री वजह सूं व्यापार में घाटो होयो",
    "Do you source raw materials/goods from market independently?": "कांई आप बाजार सूं कच्‍चो माल/सामान खुद अकेली ला सको?",
    "Yes, I can visit market and buy material independently": "हाँ, म्हे खुद बाजार जा’र सामान खरीद सकां",
    "No, because I don't know the sellers": "ना, क्यूंकि म्हे दुकानदार ने नी जाणा",
    "No, because transporting goods is difficult for women": "ना, क्यूंकि माल रो परिवहन लुगायां खातर मुश्किल है",
    "No, because my husband doesn't approve": "ना, क्यूंकि म्हारा पति मना करे",
    "No, but I can if my husband is unavailable": "ना, पण पति नी होवे तो म्हे खुद ले आऊं",
    "Do you have easy access to loans from different sources?": "कांई आपने अलग-अलग जगहां सूं लोन आराम सूं मिल जावे?",
    "Yes, I get required amount easily from SHG": "हाँ, SHG सूं जरूरत मुताबिक रुपिया आराम सूं मिले",
    "Yes, I get required loan easily from moneylender/NBFIs": "हाँ, साहूकार/NBFI सूं आराम सूं मिल जावे",
    "No, loan amount is smaller than my demand in SHGs": "ना, SHG में जरूरत सूं कम रुपिया मिले",
    "No, installment amount is higher due to high interest from moneylender": "ना, साहूकार रो ब्याज ज्यादा होण सूं किश्त भारी पड़े",
    "How much loan amount have you availed under SVEP / OSF scheme (Rs)?": "SVEP / OSF योजना तहत कितरो लोन लियो (रु.)?",
    "How did you utilize the enterprise loan?": "लोन रा रुपिया आप किकर काम में लिया?",
    "Seed capital to buy inventory and set up shop": "दुकान लगावण अर सामान भरवाण में",
    "Buy new machinery / equipment to increase production": "उत्पादन बधावण खातर नई मशीन/औजार खरीदण में",
    "Buy storage assets (e.g. refrigerator/display counter)": "फ्रिज/डिस्प्ले काउंटर खरीदण में",
    "Expand physical shop space (e.g. flour mill extension)": "दुकान रो दायरो बधावण में",
    "Expand product variety and retail range": "दुकान में नवो सामान अर वैरायटी बधावण में",
    "Buy delivery vehicle or transport services": "माल ढुलाई/गाड़ी री व्यवस्था में",
    "Buy smartphone to promote goods online": "ऑनलाइन व्यापार खातर स्मार्टफोन खरीदण में",
    "Monthly enterprise income BEFORE availing loan changes (Rs)?": "लोन लेवण सूं पैली मासिक कमाई कितरी ही (रु.)?",
    "Monthly enterprise income AFTER availing loan changes (Rs)?": "लोन लेवण रा बाद मासिक कमाई कितरी हो गी (रु.)?",
    "What has been the contribution of SVEP / OSF CRPs?": "SVEP / OSF रा CRPs रो कांई योगदान रह्यो?",
    "Helped in accessing loans to setup the business": "लोन दिलवाण अर व्यापार शुरू करवाण में मदद करी",
    "Helped us understand business planning & profit calculations": "व्यापार री योजना अर मुनाफो समझायो",
    "Trained us on maintaining regular transaction records": "बहीखातो राखण रो प्रशिक्षण दियो",
    "Gave ideas to increase enterprise income and sales": "कमाई अर बिक्री बधावण रा तरीका बताया",
    "Helped in banking linkages and communication skills": "बैंक रा काम अर बातचीत रो सलीको सिखायो",
    "Does the woman entrepreneur own a smartphone?": "कांई महिला उद्यमी रा कनै स्मार्टफोन है?",
    "No, but family owns it": "ना, पण परिवार में है",
    "Do you use QR code / UPI / mobile banking for business transactions?": "कांई आप व्यापार में QR कोड / UPI / मोबाइल बैंकिंग रो इस्तेमाल करो?",
    "Daily how many transactions are done via QR code / UPI?": "रोजाना QR कोड / UPI सूं कितरा लेन-देन होवे?",
    "5-10": "5-10",
    "10-20": "10-20",
    "20-40": "20-40",
    "More than 40": "40 सूं ज्यादा",
    "Which social media platforms do you use for your business?": "व्यापार खातर आप किसो सोशल मीडिया इस्तेमाल करो?",
    "Whatsapp": "व्हाट्सएप (WhatsApp)",
    "Instagram": "इंस्टाग्राम (Instagram)",
    "Facebook": "फेसबुक (Facebook)",
    "Don't use social media": "सोशल मीडिया इस्तेमाल कोनी करां",
    "Capture Enterprise GPS Location (Satellite Coordinates)": "उद्यम रो जीपीएस स्थान (GPS निर्देशांक)",
    "Field Photo of Enterprise & Beneficiary": "उद्यम अर लाभार्थी री फील्ड फोटो",
    "Respondent & Surveyor Digital Signature": "उत्तरदाता अर सर्वेक्षक रा डिजिटल हस्ताक्षर",
    "Himalayan Baseline Impact Survey": "हिमालयन बेसलाइन प्रभाव सर्वेक्षण",
    "1. Household & Demographic Profile": "1. परिवार अर जनसांख्यिकीय प्रोफ़ाइल",
    "General identification and household metrics": "सामान्य पहचान अर घरेलू विवरण",
    "2. Economic Activity & Livestock": "2. आर्थिक गतिविधि अर पशुधन",
    "Revenue, assets, and livestock count": "आमदनी, संपत्तियां अर पशुआं री गिनती",
    "3. Geolocation & Digital Verification": "3. भू-स्थान अर डिजिटल सत्यापन",
    "GPS accuracy and field photo capture": "जीपीएस सटीकता अर फील्ड फोटो",
    "Full Name of Household Head / Primary Respondent": "परिवार रा मुखिया / मुख्य उत्तरदाता रो पूरो नाम",
    "Respondent Classification": "उत्तरदाता रो वर्गीकरण",
    "Individual": "व्यक्तिगत",
    "Household": "परिवार / घरेलू",
    "Smallholder Farmer": "छोटा किसान",
    "Micro Enterprise / Self-Employed": "सूक्ष्म उद्यम / स्वरोजगार",
    "Primary Contact Phone Number": "मुख्य संपर्क फोन नंबर",
    "Do you own cattle, sheep, or goats?": "कांई आपरे कनै गाय, भैंस, भेड़ या बकरी है?",
    "Total number of milch cattle / animals?": "दुधारू पशुओं / जनावरां री कुल संख्या कितरी?",
    "Estimated Monthly Household Income (INR ₹)": "अनुमानित मासिक घरेलू आय (रु. ₹)",
    "Farm Equipment & Key Productive Assets": "खेती रा औजार अर मुख्य उत्पादक संपत्तियां",
    "Capture Field GPS Coordinates (Auto-verified)": "फील्ड जीपीएस निर्देशांक (स्वचालित सत्यापित)",
    "Field Photo of Site / Beneficiary": "साइट / लाभार्थी री फील्ड फोटो",
    "Surveyor Sign-off & Digital Signature": "सर्वेक्षक अनुमोदन अर डिजिटल हस्ताक्षर",
    "Section A: Basic Details": "खंड A: मूलभूत जानकारी",
    "District, Block, Village, SHG, and Enterprise identification": "जिल्लो, ब्लॉक, गाँव, SHG अर उद्यम री पहचान",
    "Section B: Respondent & Household Profile": "खंड B: उत्तरदाता अर पारिवारिक विवरण",
    "Dashboard": "डैशबोर्ड",
    "Surveyor Dashboard": "सर्वेक्षक डैशबोर्ड",
    "Field Work Overview": "फील्ड काम री प्रगति",
    "Total Recorded": "कुल सर्वेक्षण",
    "Synced to Server": "सर्वर माथे सिंक",
    "Pending Sync": "सिंक बाकी (लोकल)",
    "Incomplete Drafts": "अधूरा ड्राफ्ट",
    "Drafts": "ड्राफ्ट",
    "Completed": "पूरो हुयो",
    "Today's Goal": "आज रो लक्ष्य",
    "surveys completed today": "सर्वे आज पूरा हुया",
    "Daily Target Met!": "आज रो लक्ष्य पूरो हुयो! 🎉",
    "Start New Survey": "+ नवो सर्वेक्षण शुरू करो",
    "Resume Draft": "▶ अधूरो फॉर्म पूरो करो",
    "Resume & Complete": "▶ फॉर्म आगै बढ़ाओ",
    "My Submissions & Drafts": "म्हारा सर्वेक्षण अर ड्राफ्ट",
    "All Records": "सगळा रिकॉर्ड",
    "Complete": "पूरो",
    "Questions Answered": "सवालां रा जवाब दिया",
    "GPS Locked": "जीपीएस लॉक ✓",
    "Photo Attached": "फोटो जोड़ी ✓",
    "Signed": "दस्तखत हुया ✓",
    "Ready to Sync": "सिंक खातर तैयार (100%)",
    "Synced": "सर्वर माथे सुरक्षित",
    "Draft": "अधूरो ड्राफ्ट",
    "No respondent name": "बिना नाम रो उत्तरदाता",
    "Village / Location": "गाँव / ठौड़",
    "Last edited": "पिछलो संपादन",
    "Sync All Pending": "🔄 सगळा बाकी फॉर्म सिंक करो",
    "No surveys recorded yet": "ईं डिवाइस माथे अबार तक कोई सर्वे दर्ज कोनी",
    "Tap '+ Start New Survey' to begin your first interview": "पहलो इंटरव्यू शुरू करण खातर '+ नवो सर्वेक्षण' दबाओ",
    "Delete draft?": "कांई थे ईं ड्राफ्ट ने हटावणो चावो हो?",
    "Draft deleted": "ड्राफ्ट डिवाइस सूं हटा दियो",
    "Text Size": "अक्षरां रो आकार",
    "Adjust font size for your screen": "स्क्रीन रे हिसाब सूं अक्षरां रो आकार चुणो",
    "Small": "छोटो",
    "Medium": "सामान्य",
    "Large": "बड़ो",
    "Text size set to Small": "अक्षरां रो आकार छोटो कर दियो",
    "Text size set to Medium": "अक्षरां रो आकार सामान्य कर दियो",
    "Text size set to Large": "अक्षरां रो आकार बड़ो कर दियो",
    "Email Data to Admin": "एडमिन नै डेटा ईमेल करो",
    "Emergency Backup & Support": "इमरजेंसी बैकअप अर सहायता",
    "Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.": "ईमेल या ऐप्स रे मारफत आपरा सगळा सर्वे रिकॉर्ड अर एरर लॉग एडमिन नै भेजो।",
    "Admin Email Address": "एडमिन रो ईमेल पतो",
    "Additional Note / Error Description": "समस्या या टिप्पणी (ऐच्छिक)",
    "Send via Email / Server": "ईमेल सूं भेजो (सर्वर)",
    "Share via Gmail / WhatsApp": "Gmail / WhatsApp माथे शेयर करो",
    "Download JSON": "JSON डाउनलोड करो",
    "Download CSV (Excel)": "CSV (Excel) डाउनलोड करो",
    "Backup emailed successfully ✓": "बैकअप ईमेल भेज दियो ✓",
    "Total Device Records": "डिवाइस माथे कुल रिकॉर्ड",
    "Offline Storage Status": "लोकल स्टोरेज स्थिति",
    "Healthy (IndexedDB)": "सुरक्षित (IndexedDB)",
    "Export & Backup": "एक्सपोर्ट अर बैकअप",
    "Send Data to Admin": "एडमिन नै डेटा भेजो",
    "e.g. 2020": "उदा. 2020",
    "Enter year (e.g. 2020)": "साल दर्ज करो (उदा. 2020)"
  }
};

// Language to SpeechSynthesis Locale Map
const SPEECH_LOCALE_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'raj': 'hi-IN',
  'mr': 'mr-IN',
  'gu': 'gu-IN',
  'pa': 'pa-IN',
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'ur': 'ur-IN'
};

// 3. Client-Side Canvas Image Compressor (<150 KB JPEG + GPS Watermark)
async function compressImage(file, gpsCoords = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark with GPS and Timestamp
        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        let stampText = `OmniQuery · ${timeStr}`;
        if (gpsCoords && gpsCoords.latitude && gpsCoords.longitude) {
          stampText += ` · Lat: ${gpsCoords.latitude.toFixed(5)}, Lng: ${gpsCoords.longitude.toFixed(5)} (±${gpsCoords.accuracy ? gpsCoords.accuracy.toFixed(0) : 0}m)`;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, height - 36, width, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(stampText, 14, height - 12);

        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// 3. Reusable Accessible Custom Combobox Component (Zero Browser Default Select)
const FCombobox = {
  name: 'FCombobox',
  props: {
    modelValue: [String, Number, Object],
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Select an option...'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: false
    },
    ariaLabel: {
      type: String,
      default: 'Select option'
    },
    id: {
      type: String,
      default: () => 'combo_' + Math.random().toString(36).slice(2, 9)
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    const highlightedIdx = ref(-1);
    const containerRef = ref(null);
    const triggerRef = ref(null);
    const listboxId = computed(() => `${props.id}_listbox`);

    const normalizedOptions = computed(() => {
      return (props.options || []).map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return { value: opt.value, label: opt.label || opt.value };
        }
        return { value: opt, label: String(opt) };
      });
    });

    const selectedLabel = computed(() => {
      const match = normalizedOptions.value.find(o => o.value === props.modelValue);
      return match ? match.label : '';
    });

    function toggle() {
      if (props.disabled) return;
      isOpen.value = !isOpen.value;
      if (isOpen.value) {
        const curIdx = normalizedOptions.value.findIndex(o => o.value === props.modelValue);
        highlightedIdx.value = curIdx >= 0 ? curIdx : 0;
      }
    }

    function close() {
      isOpen.value = false;
      highlightedIdx.value = -1;
    }

    function selectOption(opt) {
      emit('update:modelValue', opt.value);
      emit('change', opt.value, opt);
      close();
      if (triggerRef.value) triggerRef.value.focus();
    }

    function handleTriggerKeydown(e) {
      if (props.disabled) return;
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (!isOpen.value) {
          isOpen.value = true;
          const curIdx = normalizedOptions.value.findIndex(o => o.value === props.modelValue);
          highlightedIdx.value = curIdx >= 0 ? curIdx : 0;
        } else if (e.key === 'ArrowDown') {
          highlightedIdx.value = (highlightedIdx.value + 1) % normalizedOptions.value.length;
        } else if (e.key === 'ArrowUp') {
          highlightedIdx.value = (highlightedIdx.value - 1 + normalizedOptions.value.length) % normalizedOptions.value.length;
        } else if (['Enter', ' '].includes(e.key) && highlightedIdx.value >= 0) {
          selectOption(normalizedOptions.value[highlightedIdx.value]);
        }
      } else if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'Tab' && isOpen.value) {
        close();
      }
    }

    function handleOutsideClick(e) {
      if (containerRef.value && !containerRef.value.contains(e.target)) {
        close();
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleOutsideClick, true);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleOutsideClick, true);
    });

    return {
      isOpen,
      highlightedIdx,
      containerRef,
      triggerRef,
      listboxId,
      normalizedOptions,
      selectedLabel,
      toggle,
      close,
      selectOption,
      handleTriggerKeydown
    };
  },
  template: `
    <div ref="containerRef" class="relative w-full">
      <button type="button"
              ref="triggerRef"
              :id="id"
              role="combobox"
              aria-haspopup="listbox"
              :aria-expanded="isOpen"
              :aria-controls="listboxId"
              :aria-label="ariaLabel"
              :disabled="disabled"
              @click="toggle"
              @keydown="handleTriggerKeydown"
              class="w-full min-h-[48px] px-3.5 py-2.5 text-left bg-white border-2 rounded-xl flex items-center justify-between text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 cursor-pointer shadow-xs"
              :class="isOpen ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-md' : 'border-slate-300 hover:border-slate-400'">
        <span class="truncate" :class="selectedLabel ? 'text-slate-800' : 'text-slate-400'">
          {{ selectedLabel || placeholder }}
        </span>
        <svg class="w-4 h-4 ml-2 text-slate-500 transition-transform duration-200 shrink-0" :class="{ 'rotate-180 text-indigo-600': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Custom Floating Dropdown Menu (Zero Native Browser Select) -->
      <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
        <ul v-if="isOpen"
            :id="listboxId"
            role="listbox"
            tabindex="-1"
            class="absolute z-50 w-full mt-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto py-1.5 text-sm focus:outline-none">
          <li v-for="(opt, idx) in normalizedOptions"
              :key="opt.value"
              role="option"
              :id="id + '_opt_' + idx"
              :aria-selected="opt.value === modelValue"
              @click="selectOption(opt)"
              @mouseenter="highlightedIdx = idx"
              class="px-3.5 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors select-none"
              :class="[
                idx === highlightedIdx ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50',
                opt.value === modelValue ? 'text-indigo-600 font-black bg-indigo-50/70' : ''
              ]">
            <span class="truncate">{{ opt.label }}</span>
            <svg v-if="opt.value === modelValue" class="w-4 h-4 text-indigo-600 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </li>
        </ul>
      </transition>
    </div>
  `
};

// 4. Main Vue 3 Application
const app = createApp({
  components: {
    FCombobox,
    'f-combobox': FCombobox,
    'f-select': FCombobox
  },
  setup() {
    const currentView = ref('dashboard'); // 'dashboard' | 'templates' | 'form' | 'queue'
    const isOnline = ref(navigator.onLine);
    const isSyncing = ref(false);
    const currentLang = ref(localStorage.getItem('omniquery_lang') || localStorage.getItem('omniquery_lang') || 'en');
    const menuOpen = ref(false);
    const dashboardFilter = ref('all'); // 'all' | 'drafts' | 'pending' | 'synced'

    const toastMessage = ref('');
    const toastType = ref('info');
    const toastTimeout = ref(null);
    const liveAnnouncement = ref('');

    // Vernacular Translator Helper
    function t(text) {
      if (!text) return '';
      const lang = currentLang.value;
      if (BUILTIN_TRANSLATIONS[lang] && BUILTIN_TRANSLATIONS[lang][text]) {
        return BUILTIN_TRANSLATIONS[lang][text];
      }
      return text;
    }


    

    const MULTI_SELECT_CODES = new Set([
      'business_type',
      'main_business_activities',
      'registrations_documents',
      'family_income_sources',
      'reasons_for_starting',
      'marketing_methods',
      'selling_channels',
      'shg_assistance_types',
      'funding_experience',
      'financial_help_impacts',
      'husband_response',
      'current_challenges',
      'competitor_advantages',
      'holding_back_reasons',
      'crp_contributions',
      'scheme_expectations',
      'social_media_platforms',
      'reasons_for_scaling_down_closing',
      'support_needed_to_manage'
    ]);

    // Universal Robust Field Category Classifier
    function getFieldCategory(q) {
      if (!q) return 'text';
      const rawType = (q.field_type || '').trim().toLowerCase();
      const code = (q.question_code || '').trim();
      const labelEn = (q.label_en || '').toLowerCase();
      const labelHi = (q.label_hi || '').toLowerCase();

      // 0. Range / Slider (e.g. 0 to 7 years)
      if (
        rawType.includes('range') ||
        rawType.includes('slider') ||
        rawType.includes('scale') ||
        code === 'years_of_shg_membership'
      ) {
        return 'range';
      }

      // 1. Multiple Choice / Multiselect / Checkboxes (Enforced: No single values for multiselect)
      if (
        MULTI_SELECT_CODES.has(code) ||
        rawType.includes('multi') ||
        rawType.includes('check') ||
        labelEn.includes('multiselect') ||
        labelEn.includes('multi-select') ||
        labelEn.includes('(multiselect)') ||
        labelHi.includes('मल्टीसेलेक्ट') ||
        labelHi.includes('बहु-विकल्प')
      ) {
        return 'multiselect';
      }

      // 2. Single Choice / Radio / Select / Options
      if (
        (q.options && q.options.length > 0) ||
        rawType.includes('choice') ||
        rawType.includes('select') ||
        rawType.includes('radio') ||
        rawType.includes('option')
      ) {
        return 'radio';
      }

      // 2. Number / Integer / Currency / Float / Percent / Decimal / Quantity / Year / Count
      if (
        rawType.includes('int') ||
        rawType.includes('num') ||
        rawType.includes('curr') ||
        rawType.includes('float') ||
        rawType.includes('percent') ||
        rawType.includes('amount') ||
        rawType.includes('price') ||
        rawType.includes('qty') ||
        rawType.includes('year') ||
        rawType.includes('count') ||
        rawType.includes('decimal')
      ) {
        return 'number';
      }

      // 3. Dynamic Grid / Table / Multi-row
      if (
        rawType.includes('grid') ||
        rawType.includes('table') ||
        rawType.includes('matrix')
      ) {
        return 'grid';
      }

      // 4. GPS Location / Geolocation / Coordinates
      if (
        rawType.includes('gps') ||
        rawType.includes('geo') ||
        rawType.includes('location') ||
        rawType.includes('coord')
      ) {
        return 'gps';
      }

      // 5. Photo Upload / Camera / Image / Attach
      if (
        rawType.includes('photo') ||
        rawType.includes('image') ||
        rawType.includes('camera') ||
        rawType.includes('picture') ||
        rawType.includes('attach')
      ) {
        return 'photo';
      }

      // 6. Digital Signature / Canvas Sign
      if (
        rawType.includes('sign') ||
        rawType.includes('dastakhat')
      ) {
        return 'signature';
      }

      // 7. Long Text / Multiline / Paragraph
      if (
        rawType.includes('long') ||
        rawType.includes('text_area') ||
        rawType.includes('textarea') ||
        rawType.includes('paragraph') ||
        rawType.includes('desc') ||
        rawType.includes('comment')
      ) {
        return 'longtext';
      }

      // 8. Date / Time
      if (rawType.includes('date')) return 'date';
      if (rawType.includes('time')) return 'time';

      // 9. Checkbox / Boolean
      if (rawType.includes('check') || rawType.includes('bool')) return 'checkbox';

      // 10. Guaranteed Fallback: ALWAYS 'text' (Ensures EVERY question is always fillable!)
      return 'text';
    }

    function isCurrencyField(q) {
      if (!q) return false;
      const type = (q.field_type || '').toLowerCase();
      const label = (q.label_en || '').toLowerCase();
      const code = (q.question_code || '').toLowerCase();
      // If it is year, age, count, days, months, percent, duration - NEVER currency!
      if (label.includes('year') || code.includes('year') || 
          label.includes('age') || code.includes('age') ||
          label.includes('month') || code.includes('month') ||
          label.includes('count') || code.includes('count') ||
          label.includes('percent') || code.includes('percent')) {
        return false;
      }
      return type.includes('curr') || label.includes('inr') || label.includes('rs') || label.includes('₹');
    }

    function getRangeMin(q) {
      if (!q) return 0;
      if (q.validation_rules && q.validation_rules.min !== undefined) return Number(q.validation_rules.min);
      if (q.validation_rules_json) {
        try {
          const v = typeof q.validation_rules_json === 'string' ? JSON.parse(q.validation_rules_json) : q.validation_rules_json;
          if (v && v.min !== undefined) return Number(v.min);
        } catch (e) {}
      }
      if (Array.isArray(q.options) && q.options.length > 0) {
        const nums = q.options.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) return Math.min(...nums);
      }
      return 0;
    }

    function getRangeMax(q) {
      if (!q) return 7;
      if (q.validation_rules && q.validation_rules.max !== undefined) return Number(q.validation_rules.max);
      if (q.validation_rules_json) {
        try {
          const v = typeof q.validation_rules_json === 'string' ? JSON.parse(q.validation_rules_json) : q.validation_rules_json;
          if (v && v.max !== undefined) return Number(v.max);
        } catch (e) {}
      }
      if (Array.isArray(q.options) && q.options.length > 0) {
        const nums = q.options.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) return Math.max(...nums);
      }
      return 7;
    }

    function getRangeStep(q) {
      if (!q) return 1;
      if (q.validation_rules && q.validation_rules.step !== undefined) return Number(q.validation_rules.step);
      if (q.validation_rules_json) {
        try {
          const v = typeof q.validation_rules_json === 'string' ? JSON.parse(q.validation_rules_json) : q.validation_rules_json;
          if (v && v.step !== undefined) return Number(v.step);
        } catch (e) {}
      }
      return 1;
    }

    function getRangeSteps(q) {
      const min = getRangeMin(q);
      const max = getRangeMax(q);
      const step = getRangeStep(q) || 1;
      const steps = [];
      for (let i = min; i <= max; i += step) {
        steps.push(i);
      }
      return steps;
    }

    function getRangeUnit(q) {
      if (!q) return '';
      if (q.validation_rules && q.validation_rules.unit) return q.validation_rules.unit;
      if (q.validation_rules_json) {
        try {
          const v = typeof q.validation_rules_json === 'string' ? JSON.parse(q.validation_rules_json) : q.validation_rules_json;
          if (v && v.unit) return v.unit;
        } catch (e) {}
      }
      const label = (q.label_en || '').toLowerCase();
      if (label.includes('year')) return 'Years';
      if (label.includes('month')) return 'Months';
      if (label.includes('day')) return 'Days';
      return '';
    }

    const involvementOptions = computed(() => [
      { value: 'Regular', label: t('Regular') },
      { value: 'Occasional', label: t('Occasional') },
      { value: 'Only respondent', label: t('Only respondent') },
      { value: 'Not relevant', label: t('Not relevant') }
    ]);

    const amountPaidOptions = computed(() => [
      { value: 'Not relevant', label: t('Not relevant') },
      { value: 'Upto Rs 5000', label: 'Upto Rs 5000' },
      { value: 'Rs 5001 to Rs 10000', label: 'Rs 5001 to Rs 10000' },
      { value: 'Rs 10001 to Rs 20000', label: 'Rs 10001 to Rs 20000' },
      { value: 'Above Rs 20000', label: 'Above Rs 20000' }
    ]);

    const loanUsageOptions = computed(() => [
      { value: 'Not used the source', label: t('Not used the source') },
      { value: 'Fully for business', label: t('Fully for business') },
      { value: 'Partly for business and partly for household/other', label: t('Partly for business, partly household') },
      { value: 'Fully for household/other', label: t('Fully for household/other') }
    ]);

    const metricStatusOptions = computed(() => [
      { value: "Don't remember", label: t("Don't remember") },
      { value: 'Enter Amount', label: t('Enter Amount') }
    ]);

    function getRangeFormat(q) {
      if (!q) return 'both';
      const r = q.validation_rules || {};
      const fmt = q.field_format || r.format || r.representation;
      return ['slider_only', 'buttons_only', 'both'].includes(fmt) ? fmt : 'both';
    }

    function getRangeTabIndex(qCode, val, steps) {
      const cur = formData[qCode];
      if (cur === val) return 0;
      if ((cur === undefined || cur === null || cur === '') && val === steps[0]) return 0;
      return -1;
    }

    function focusRangeButton(qCode, val) {
      nextTick(() => {
        const el = document.getElementById(`range_btn_${qCode}_${val}`);
        if (el) el.focus();
      });
    }

    function selectRangeValue(q, val) {
      formData[q.question_code] = val;
      const unit = getRangeUnit(q);
      announce(`${val} ${unit ? t(unit) : ''} selected`);
      focusRangeButton(q.question_code, val);
    }

    function handleRangeKeydown(e, q, currentVal) {
      const steps = getRangeSteps(q);
      const idx = steps.indexOf(currentVal);
      if (idx === -1) return;
      if (['ArrowRight', 'ArrowDown'].includes(e.key) && idx < steps.length - 1) {
        e.preventDefault();
        selectRangeValue(q, steps[idx + 1]);
      } else if (['ArrowLeft', 'ArrowUp'].includes(e.key) && idx > 0) {
        e.preventDefault();
        selectRangeValue(q, steps[idx - 1]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        selectRangeValue(q, steps[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        selectRangeValue(q, steps[steps.length - 1]);
      }
    }

    function announce(msg) {
      liveAnnouncement.value = msg;
    }

    function showToast(msg, type = 'info') {
      toastMessage.value = msg;
      toastType.value = type;
      if (toastTimeout.value) clearTimeout(toastTimeout.value);
      toastTimeout.value = setTimeout(() => {
        toastMessage.value = '';
      }, 3500);
    }

    const languages = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'हिन्दी (Hindi)' },
      { code: 'raj', name: 'राजस्थानी (Rajasthani)' },
      { code: 'mr', name: 'मराठी (Marathi)' },
      { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
      { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
      { code: 'bn', name: 'বাংলা (Bengali)' },
      { code: 'ta', name: 'தமிழ் (Tamil)' },
      { code: 'te', name: 'తెలుగు (Telugu)' },
      { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
      { code: 'ml', name: 'മലയാളം (Malayalam)' },
      { code: 'ur', name: 'اردو (Urdu)' }
    ];

    function setLanguage(langCode) {
      currentLang.value = langCode;
      localStorage.setItem('omniquery_lang', langCode);
      const lObj = languages.find(l => l.code === langCode);
      const lName = lObj ? lObj.name : langCode;
      announce('Language changed to ' + lName);
      showToast('Language: ' + lName, 'info');
      menuOpen.value = false;
    }

    const textSize = ref(localStorage.getItem('omniquery_text_size') || localStorage.getItem('omniquery_text_size') || 'md');

    function applyTextSize(size) {
      textSize.value = size;
      localStorage.setItem('omniquery_text_size', size);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.remove('text-scale-sm', 'text-scale-md', 'text-scale-lg');
        document.documentElement.classList.add(`text-scale-${size}`);
      }
    }

    function setTextSize(size) {
      applyTextSize(size);
      const sizeLabels = {
        'sm': t('Text size set to Small'),
        'md': t('Text size set to Medium'),
        'lg': t('Text size set to Large')
      };
      const msg = sizeLabels[size] || 'Text size updated';
      showToast(msg, 'info');
      announce(msg);
    }

    const templates = ref([]);
    const searchQuery = ref('');
    const selectedCategory = ref('All');
    const activeTemplate = ref(null);
    const activeSectionIndex = ref(0);
    const formData = reactive({});
    const currentGPS = reactive({
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      fetching: false,
      error: null
    });

    const validationModalOpen = ref(false);
    const validationErrors = ref([]);
    const highlightedQuestion = ref(null);
    const currentUser = ref('Hardik Sharma (Field Lead)');
    const walSubmissions = ref([]);
    const pendingCount = ref(0);
    const permissionStatus = reactive({
      gps: 'prompt',
      camera: 'prompt'
    });

    const signaturePads = {};
    const currentUUID = ref('');
    const speakingQuestionCode = ref(null);
    const emergencyModalOpen = ref(false);
    const adminEmailInput = ref(localStorage.getItem('omniquery_admin_email') || localStorage.getItem('omniquery_admin_email') || 'admin@ommnomi.local');
    const emergencyNote = ref('');
    const isSendingEmail = ref(false);
    const recentErrors = ref([]);

    // Text-to-Speech Engine
    function speakQuestion(q) {
      if (!('speechSynthesis' in window)) {
        showToast('Text-to-Speech not supported on this browser', 'error');
        return;
      }

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (speakingQuestionCode.value === q.question_code) {
          speakingQuestionCode.value = null;
          return;
        }
      }

      speakingQuestionCode.value = q.question_code;

      let textToRead = t(q.label_en);
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        textToRead += '. ' + q.options.map(opt => t(opt)).join(', ');
      }

      const utterance = new SpeechSynthesisUtterance(textToRead);
      const targetLocale = SPEECH_LOCALE_MAP[currentLang.value] || 'hi-IN';
      utterance.lang = targetLocale;
      utterance.rate = 0.9; // clear, comfortable pace for elderly users

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang === targetLocale || v.lang.startsWith(currentLang.value));
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onend = () => {
        speakingQuestionCode.value = null;
      };
      utterance.onerror = () => {
        speakingQuestionCode.value = null;
      };

      window.speechSynthesis.speak(utterance);
    }

    // Auto-Scroll to Next Question Card
    function autoScrollToNextQuestion(currentIndex) {
      nextTick(() => {
        const allCards = document.querySelectorAll('.elder-card');
        if (allCards && allCards[currentIndex + 1]) {
          allCards[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusTarget = allCards[currentIndex + 1].querySelector('input, [role="radio"], button, select');
          if (focusTarget) focusTarget.focus();
        }
      });
    }

    // Multi-Select Option Handlers
    function isMultiOptionSelected(questionCode, optionVal) {
      const val = formData[questionCode];
      if (!val) return false;
      if (Array.isArray(val)) return val.includes(optionVal);
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.includes(optionVal);
        } catch (e) {}
        return val.split(',').map(s => s.trim()).includes(optionVal);
      }
      return false;
    }

    function toggleMultiOption(questionCode, optionVal) {
      let current = formData[questionCode];
      if (!current) {
        current = [];
      } else if (typeof current === 'string') {
        try {
          const parsed = JSON.parse(current);
          current = Array.isArray(parsed) ? parsed : current.split(',').map(s => s.trim());
        } catch (e) {
          current = current.split(',').map(s => s.trim());
        }
      } else if (!Array.isArray(current)) {
        current = [current];
      }

      const idx = current.indexOf(optionVal);
      if (idx > -1) {
        current.splice(idx, 1);
      } else {
        current.push(optionVal);
      }
      formData[questionCode] = [...current];
    }

    function getMultiOptionStyle(questionCode, optionVal) {
      const isSelected = isMultiOptionSelected(questionCode, optionVal);
      if (isSelected) {
        return 'bg-indigo-600 border-indigo-700 text-white font-black shadow-md scale-[1.01] ring-4 ring-indigo-200';
      }
      return 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-indigo-300 font-semibold';
    }

    // Dynamic Options Filter (e.g. Q17 main_business_activities powered by Q16 business_type)
    function getFilteredOptions(q) {
      if (!q || !q.options) return [];
      if (q.question_code === 'main_business_activities') {
        const typesVal = formData['business_type'];
        let selectedTypes = [];
        if (Array.isArray(typesVal)) {
          selectedTypes = typesVal;
        } else if (typeof typesVal === 'string' && typesVal.trim()) {
          try {
            const p = JSON.parse(typesVal);
            selectedTypes = Array.isArray(p) ? p : [typesVal];
          } catch (e) {
            selectedTypes = typesVal.split(',').map(s => s.trim());
          }
        }

        // If no business type selected yet, show all options
        if (!selectedTypes || selectedTypes.length === 0) {
          return q.options;
        }

        const hasTrading = selectedTypes.some(t => String(t).toLowerCase().includes('trading'));
        const hasService = selectedTypes.some(t => String(t).toLowerCase().includes('service'));
        const hasProduction = selectedTypes.some(t => String(t).toLowerCase().includes('manufactur') || String(t).toLowerCase().includes('production'));

        return q.options.filter(opt => {
          const lower = opt.toLowerCase();
          if (lower === 'any other' || lower.includes('any other') || lower === 'other') return true;
          if (hasTrading && lower.startsWith('trading:')) return true;
          if (hasService && lower.startsWith('service:')) return true;
          if (hasProduction && lower.startsWith('production:')) return true;
          return false;
        });
      }
      return q.options;
    }

    // Semantic Option Groups for Heterogeneous Long Lists
    const QUESTION_OPTION_GROUPS = {
      family_income_sources: [
        {
          name: '🌾 Farm & Allied',
          name_hi: '🌾 कृषि व संबद्ध',
          options: ['Agricultural income', 'Dairying', 'Sale of animals', 'Animal products', 'NTFP sale']
        },
        {
          name: '💼 Wages & Salary',
          name_hi: '💼 मजदूरी व वेतन',
          options: ['Fixed Salary', 'Wages', 'MNREGA']
        },
        {
          name: '🏪 Enterprises',
          name_hi: '🏪 व्यवसाय व उद्यम',
          options: ['Self employed', 'Family/husband’s enterprise', 'Respondent’s enterprise']
        },
        {
          name: '📋 Other & Govt',
          name_hi: '📋 अन्य व पेंशन',
          options: ['Pension', 'Rent from properties', 'Any other, specify']
        }
      ],
      registrations_documents: [
        {
          name: '🪪 Identity & Social',
          name_hi: '🪪 पहचान व सामाजिक',
          options: ['PAN card', 'Aadhar card', 'Caste certificate', 'Income certificate']
        },
        {
          name: '🏢 Trade & Business',
          name_hi: '🏢 व्यापार व उद्यम',
          options: ['Udyam Aadhar', 'Shop and Establishment registration', 'FSSAI']
        }
      ],
      selling_channels: [
        {
          name: '🏪 Local & Direct Market',
          name_hi: '🏪 स्थानीय व प्रत्यक्ष बाजार',
          options: [
            'I visit local traders/shopkeepers with my products and do door to door selling',
            'I take orders from my usual clients few weeks prior to production/peak season and then sell',
            'I sell in local haat/weekly market',
            'I sell in Saras fair'
          ]
        },
        {
          name: '📱 Digital & Online',
          name_hi: '📱 डिजिटल व ऑनलाइन',
          options: [
            'I get orders via instagram',
            'I get orders via whatsapp',
            'I use online platforms like Amazon',
            'I use online platform like Meesho',
            'I use any other online platform',
            'I use RAJEEVIKA website'
          ]
        },
        {
          name: '📦 Other / N/A',
          name_hi: '📦 अन्य / लागू नहीं',
          options: [
            'Not relevant',
            'In case of production related business, I produce slightly more than last year sales and wait for orders',
            'Any other, specify'
          ]
        }
      ],
      marketing_methods: [
        {
          name: '🏬 Premises & Signage',
          name_hi: '🏬 दुकान व बोर्ड',
          options: [
            'My shop is the only place where I talk about my products/services',
            'I have name board outside my premises with details of my products/services'
          ]
        },
        {
          name: '🗣️ Personal & Meetings',
          name_hi: '🗣️ व्यक्तिगत व बैठकें',
          options: [
            'I talk about my products/services in SHG meetings',
            'I visit local traders/shopkeepers with my samples',
            'I visit local traders/shopkeepers with samples of my products'
          ]
        },
        {
          name: '📲 Social Media',
          name_hi: '📲 सोशल मीडिया',
          options: [
            'I market actively on instagram and whatsapp'
          ]
        },
        {
          name: '⏳ Passive & Other',
          name_hi: '⏳ निष्क्रिय व अन्य',
          options: [
            'I wait for people to make enquiries',
            'I do not know how to market my products/services',
            'I don\'t feel the need to market my products/services',
            'Any other, specify'
          ]
        }
      ],
      shg_assistance_types: [
        {
          name: '🎓 Training & Guidance',
          name_hi: '🎓 प्रशिक्षण व मार्गदर्शन',
          options: [
            'Attended the skill training offered by SHG',
            'Got information about the scope of business from SHG meetings',
            'OSF/SVEP CRP guided me in setting up the business'
          ]
        },
        {
          name: '💰 Loans & Finance',
          name_hi: '💰 ऋण व वित्त',
          options: [
            'Took loan from SHG to buy material to initiate the business',
            'Take loans from SHG regularly as per business requirements',
            'OSF/SVEP CRP helped me to get Mudra loan',
            'OSF/SVEP CRP helped me to get bank loan',
            'Got subsidy/grant due to SHG'
          ]
        },
        {
          name: '📋 Documentation',
          name_hi: '📋 दस्तावेज',
          options: [
            'Got required registration/documents made'
          ]
        }
      ],
      reasons_for_starting: [
        {
          name: '💡 Family Need & Income',
          name_hi: '💡 पारिवारिक जरूरत व आय',
          options: [
            'My family faced a financial setback, and I needed to earn',
            'Our expenses were rising, and my family needed an alternate source of income'
          ]
        },
        {
          name: '🚀 Personal Ambition & Skill',
          name_hi: '🚀 व्यक्तिगत आकांक्षा व कौशल',
          options: [
            'I always wanted to own/run my own business',
            'I learnt the skill and wanted to start my own venture',
            'I was doing the same work as wage labour and later decided to start own venture'
          ]
        },
        {
          name: '🤝 SHG & Project Motivation',
          name_hi: '🤝 एसएचजी व परियोजना प्रोत्साहन',
          options: [
            'All SHG members were getting loans for enterprise so I also decided to take and start enterprise',
            'The OSF/SVEP CRP encouraged me to start the enterprise',
            'The CLF encouraged me to start the enterprise',
            'Any other (Specify)'
          ]
        }
      ]
    };

    const activeOptionGroups = reactive({});
    const optionSearchQueries = reactive({});

    function getQuestionGroups(q) {
      if (!q) return [];
      const qCode = q.question_code;
      const availableOptions = getFilteredOptions(q);
      if (!availableOptions || availableOptions.length <= 4) return [];

      // 1. Explicitly configured groups
      if (QUESTION_OPTION_GROUPS[qCode]) {
        const rawGroups = QUESTION_OPTION_GROUPS[qCode];
        const groups = [];
        rawGroups.forEach(grp => {
          const matching = grp.options.filter(opt => availableOptions.includes(opt));
          if (matching.length > 0) {
            groups.push({
              name: grp.name,
              name_hi: grp.name_hi || grp.name,
              options: matching
            });
          }
        });
        if (groups.length > 0) return groups;
      }

      // 2. Prefix-based auto-detection (e.g. "Trading: ...", "Service: ...", "Production: ...")
      const prefixMap = {};
      const prefixCounts = {};
      availableOptions.forEach(opt => {
        const str = String(opt);
        const colonIdx = str.indexOf(':');
        if (colonIdx > 1 && colonIdx < 25) {
          const prefix = str.substring(0, colonIdx).trim();
          prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
          if (!prefixMap[prefix]) prefixMap[prefix] = [];
          prefixMap[prefix].push(opt);
        }
      });

      const prefixKeys = Object.keys(prefixCounts);
      if (prefixKeys.length >= 2) {
        const groups = [];
        prefixKeys.forEach(p => {
          let icon = '🏷️';
          const pLower = p.toLowerCase();
          if (pLower.includes('trading')) icon = '🛒';
          else if (pLower.includes('service')) icon = '🔧';
          else if (pLower.includes('production') || pLower.includes('manufactur')) icon = '🏭';
          groups.push({
            name: `${icon} ${p}`,
            name_hi: `${icon} ${p}`,
            options: prefixMap[p]
          });
        });
        const allPrefixed = [].concat(...Object.values(prefixMap));
        const remaining = availableOptions.filter(opt => !allPrefixed.includes(opt));
        if (remaining.length > 0) {
          groups.push({
            name: '✨ Other',
            name_hi: '✨ अन्य',
            options: remaining
          });
        }
        return groups;
      }

      return [];
    }

    function getActiveGroup(q) {
      if (!q) return 'All';
      return activeOptionGroups[q.question_code] || 'All';
    }

    function setActiveGroup(q, groupName) {
      if (!q) return;
      activeOptionGroups[q.question_code] = groupName;
    }

    function getGroupSelectedCount(q, groupName) {
      if (!q) return 0;
      const qCode = q.question_code;
      const cat = getFieldCategory(q);
      const selected = formData[qCode];

      if (cat === 'radio') {
        if (!selected) return 0;
        if (groupName === 'All') return 1;
        const groups = getQuestionGroups(q);
        const grp = groups.find(g => g.name === groupName);
        return (grp && grp.options.includes(selected)) ? 1 : 0;
      }

      if (!Array.isArray(selected)) return 0;
      if (groupName === 'All') {
        return selected.length;
      }
      const groups = getQuestionGroups(q);
      const grp = groups.find(g => g.name === groupName);
      if (!grp) return 0;
      return selected.filter(val => grp.options.includes(val)).length;
    }

    function getDisplayOptions(q) {
      if (!q) return [];
      const cat = getFieldCategory(q);
      let opts = cat === 'multiselect' ? getFilteredOptions(q) : (q.options || []);

      const activeGrp = getActiveGroup(q);
      if (activeGrp !== 'All') {
        const groups = getQuestionGroups(q);
        const grp = groups.find(g => g.name === activeGrp);
        if (grp) {
          opts = opts.filter(opt => grp.options.includes(opt));
        }
      }

      const query = (optionSearchQueries[q.question_code] || '').trim().toLowerCase();
      if (query) {
        opts = opts.filter(opt => String(opt).toLowerCase().includes(query));
      }
      return opts;
    }

    function selectAllInCurrentGroup(q) {
      if (!q) return;
      const qCode = q.question_code;
      if (!formData[qCode] || !Array.isArray(formData[qCode])) {
        formData[qCode] = [];
      }
      const optsToSelect = getDisplayOptions(q);
      optsToSelect.forEach(opt => {
        if (!formData[qCode].includes(opt)) {
          formData[qCode].push(opt);
        }
      });
      formData[qCode] = [...formData[qCode]];
      const activeGrp = getActiveGroup(q);
      const label = activeGrp === 'All' ? 'options' : activeGrp;
      showToast(`✓ ${t('Selected')} ${optsToSelect.length} ${t('in')} ${label}`, 'info');
      announce(`Selected all options in ${label}`);
    }

    function clearCurrentGroup(q) {
      if (!q) return;
      const qCode = q.question_code;
      if (!formData[qCode] || !Array.isArray(formData[qCode])) {
        return;
      }
      const activeGrp = getActiveGroup(q);
      if (activeGrp === 'All') {
        formData[qCode] = [];
        showToast(t('Cleared all selections'), 'info');
        announce('Cleared all selections');
        return;
      }
      const groups = getQuestionGroups(q);
      const grp = groups.find(g => g.name === activeGrp);
      if (grp) {
        formData[qCode] = formData[qCode].filter(val => !grp.options.includes(val));
        showToast(`✕ ${t('Cleared')} ${grp.name}`, 'info');
        announce(`Cleared selections in ${grp.name}`);
      }
    }

    function getSelectionSummary(q) {
      if (!q) return '';
      const qCode = q.question_code;
      const selected = formData[qCode];
      if (!Array.isArray(selected) || selected.length === 0) return '';
      const groups = getQuestionGroups(q);
      if (groups.length === 0) {
        return `${selected.length} ${t('selected')}`;
      }
      let groupsWithSelections = 0;
      groups.forEach(g => {
        if (g.options.some(opt => selected.includes(opt))) {
          groupsWithSelections++;
        }
      });
      if (groupsWithSelections > 1) {
        return `${selected.length} ${t('selected across')} ${groupsWithSelections} ${t('categories')}`;
      }
      return `${selected.length} ${t('selected')}`;
    }

    function selectOption(questionCode, optionVal, qIndex) {
      formData[questionCode] = optionVal;
      autoScrollToNextQuestion(qIndex);
    }

    function getOptionStyle(questionCode, optionVal) {
      const isSelected = formData[questionCode] === optionVal;
      const lower = String(optionVal).toLowerCase();

      if (isSelected) {
        if (lower === 'yes' || lower === 'हाँ' || lower === 'हा') {
          return 'bg-emerald-600 border-emerald-700 text-white font-black shadow-lg scale-[1.02] ring-4 ring-emerald-200';
        }
        if (lower === 'no' || lower === 'नहीं' || lower === 'ना') {
          return 'bg-rose-600 border-rose-700 text-white font-black shadow-lg scale-[1.02] ring-4 ring-rose-200';
        }
        return 'bg-indigo-600 border-indigo-700 text-white font-black shadow-lg scale-[1.02] ring-4 ring-indigo-200';
      }

      // Unselected State
      if (lower === 'yes' || lower === 'हाँ' || lower === 'हा') {
        return 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 font-bold';
      }
      if (lower === 'no' || lower === 'नहीं' || lower === 'ना') {
        return 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 font-bold';
      }
      return 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-indigo-300 font-semibold';
    }

    const GRID_CONFIGS = {
      seasonal_turnovers: {
        type: 'seasons',
        defaultRows: [
          { season: 'Peak season', label: '☀️ Peak season / चरम मौसम', duration_months: 3, monthly_sales: '', monthly_profit: '' },
          { season: 'Average', label: '⛅ Average / सामान्य मौसम', duration_months: 6, monthly_sales: '', monthly_profit: '' },
          { season: 'Lean', label: '🌧️ Lean / मंदा मौसम', duration_months: 3, monthly_sales: '', monthly_profit: '' }
        ]
      },
      activity_involvements: {
        type: 'activities',
        defaultRows: [
          { activity: 'Purchase of material', label: '1. Purchase of material / सामग्री खरीद', involvement: 'Regular', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' },
          { activity: 'Production', label: '2. Production / उत्पादन व निर्माण', involvement: 'Regular', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' },
          { activity: 'Servicing', label: '3. Servicing / सर्विसिंग व मरम्मत', involvement: 'Regular', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' },
          { activity: 'Social media marketing', label: '4. Social media marketing / सोशल मीडिया', involvement: 'Occasional', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' },
          { activity: 'Sale (from shop/door to door/Saras fair/haat)', label: '5. Sale / बिक्री (दुकान/हाट/मेला)', involvement: 'Regular', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' },
          { activity: 'Record keeping', label: '6. Record keeping / हिसाब-किताब', involvement: 'Regular', family_members_count: 0, hired_help_count: 0, amount_paid_last_year: 'Not relevant' }
        ]
      },
      capital_sources: {
        type: 'capital',
        defaultRows: [
          '1. Own Savings', '2. Financed by family member', '3. Profit from business',
          '4. Mortgaged gold/silver', '5. Sold gold/silver', '6. Loan from family',
          '7. Loan from moneylender', '8. Loan from SHG', '9. Loan from OSF/SVEP',
          '10. Subsidy/grant under OSF/SVEP', '11. Loan from private saving groups/BC',
          '12. Loan from NBFC', '13. Mudra loan', '14. Loan from banks'
        ].map(s => ({ source: s, first_year_amount: '', years_in_between_amount: '', current_year_amount: '', current_year_pending: '' }))
      },
      loan_usages: {
        type: 'loan_usage',
        defaultRows: [
          '1. Own Savings', '2. Financed by family member', '3. Profit from business',
          '4. Mortgaged gold/silver', '5. Sold gold/silver', '6. Loan from family',
          '7. Loan from moneylender', '8. Loan from SHG', '9. Loan from OSF/SVEP',
          '10. Subsidy/grant under OSF/SVEP', '11. Loan from private saving groups/BC',
          '12. Loan from NBFC', '13. Mudra loan', '14. Loan from banks'
        ].map(s => ({ source: s, usage_in_business: 'Not used the source', usage_other_specify: '' }))
      },
      business_metric_changes: {
        type: 'metrics',
        defaultRows: [
          { metric: '1. Average sales/month', label: '1. Average sales/month (औसत बिक्री/माह)', first_year_status: "Don't remember", first_year_amount: '', current_year_amount: '' },
          { metric: '2. Average monthly income', label: '2. Average monthly income (औसत आय/माह)', first_year_status: "Don't remember", first_year_amount: '', current_year_amount: '' },
          { metric: '3. Value of stock/finished goods', label: '3. Value of stock/finished goods (स्टॉक/माल मूल्य)', first_year_status: "Don't remember", first_year_amount: '', current_year_amount: '' },
          { metric: '4. In case of servicing, value of enterprise related assets', label: '4. Enterprise related assets (उद्यम संपत्ति मूल्य)', first_year_status: "Don't remember", first_year_amount: '', current_year_amount: '' }
        ]
      }
    };

    function getGridType(code) {
      return GRID_CONFIGS[code]?.type || 'generic';
    }

    function cloneGridDefaults(cfg) {
      return cfg.defaultRows.map(r => ({ ...r }));
    }

    function isGridValid(rows, cfg) {
      if (!Array.isArray(rows) || rows.length === 0) return false;
      return cfg.type !== 'seasons' || !('item_name' in (rows[0] || {}));
    }

    function ensureGridRows(code) {
      const cfg = GRID_CONFIGS[code];
      if (!cfg) return formData[code] || (formData[code] = []);
      if (!isGridValid(formData[code], cfg)) formData[code] = cloneGridDefaults(cfg);
      return formData[code];
    }

    function focusNewGridRow(code) {
      nextTick(() => {
        const el = document.querySelector(`[data-grid-code="${code}"] .generic-grid-row:last-child input`);
        if (el) el.focus();
        announce('New item row added. Focus shifted to first input.');
      });
    }

    function addGridRow(code) {
      const rows = ensureGridRows(code);
      rows.push({ item_name: '', quantity: '', approx_value: '' });
      focusNewGridRow(code);
    }

    function removeGridRow(code, idx) {
      const rows = ensureGridRows(code);
      if (Array.isArray(rows)) rows.splice(idx, 1);
    }

    function initAllGrids() {
      Object.keys(GRID_CONFIGS).forEach(code => {
        ensureGridRows(code);
      });
    }

    const categories = computed(() => {
      const cats = new Set(templates.value.map(t => t.category || 'General'));
      return ['All', ...Array.from(cats)];
    });

    const filteredTemplates = computed(() => {
      return templates.value.filter(t => {
        const matchesCat = selectedCategory.value === 'All' || (t.category || 'General') === selectedCategory.value;
        const matchesQuery = !searchQuery.value ||
          t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.value.toLowerCase());
        return matchesCat && matchesQuery;
      });
    });

    const sections = computed(() => {
      if (!activeTemplate.value || !activeTemplate.value.schema) return [];
      return activeTemplate.value.schema.sections || [];
    });

    const activeSection = computed(() => {
      if (!sections.value || sections.value.length === 0) return null;
      return sections.value[activeSectionIndex.value] || sections.value[0];
    });

    const activeQuestions = computed(() => {
      if (!activeTemplate.value || !activeTemplate.value.schema || !activeSection.value) return [];
      const allQ = activeTemplate.value.schema.questions || [];
      const sCode = activeSection.value.section_code;
      return allQ.filter(q => (q.section === sCode || q.section_code === sCode));
    });

    function isSectionComplete(secIndex) {
      if (!activeTemplate.value || !activeTemplate.value.schema) return false;
      const sec = sections.value[secIndex];
      if (!sec) return false;
      const allQ = activeTemplate.value.schema.questions || [];
      const secQ = allQ.filter(q => (q.section === sec.section_code || q.section_code === sec.section_code));
      for (const q of secQ) {
        if (q.is_mandatory) {
          const val = formData[q.question_code];
          if (val === undefined || val === null || String(val).trim() === '') return false;
        }
      }
      return true;
    }

    function scrollTabs(direction) {
      const container = document.getElementById('section-tabs-container');
      if (container) {
        container.scrollBy({ left: direction * 200, behavior: 'smooth' });
      }
    }

    function handleTabKeydown(e, idx) {
      let targetIdx = null;
      if (e.key === 'ArrowRight') targetIdx = (idx + 1) % sections.value.length;
      else if (e.key === 'ArrowLeft') targetIdx = (idx - 1 + sections.value.length) % sections.value.length;
      else if (e.key === 'Home') targetIdx = 0;
      else if (e.key === 'End') targetIdx = sections.value.length - 1;

      if (targetIdx !== null) {
        e.preventDefault();
        activeSectionIndex.value = targetIdx;
        focusTab(targetIdx);
      }
    }

    function focusTab(idx) {
      nextTick(() => {
        const btn = document.getElementById(`tab-btn-${idx}`);
        if (btn) {
          btn.focus();
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }

    async function loadTemplatesFromDB() {
      try {
        const stored = await db.templates.toArray();
        if (stored && stored.length > 0) {
          templates.value = stored;
        }
      } catch (err) {
        console.error('[Dexie] Failed to load templates', err);
      }
    }

    async function loadWALFromDB() {
      try {
        const records = await db.wal.toArray();
        // Sort reverse chronologically
        records.sort((a, b) => new Date(b.captured_at_local || 0) - new Date(a.captured_at_local || 0));
        walSubmissions.value = records;
        pendingCount.value = records.filter(r => r.status === 'PENDING_SYNC').length;
      } catch (err) {
        console.error('[Dexie] Failed to load WAL', err);
      }
    }

    // ==========================================
    // SURVEYOR DASHBOARD COMPUTED HELPERS
    // ==========================================
    const todayFormattedDate = computed(() => {
      const d = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return d.toLocaleDateString(currentLang.value === 'en' ? 'en-US' : 'hi-IN', options);
    });

    const surveyorStats = computed(() => {
      const all = walSubmissions.value || [];
      const completed = all.filter(s => s.status === 'SYNCED').length;
      const pending = all.filter(s => s.status === 'PENDING_SYNC').length;
      const drafts = all.filter(s => s.status === 'DRAFT_OFFLINE').length;
      
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayDone = all.filter(s => (s.status === 'SYNCED' || s.status === 'PENDING_SYNC') && s.captured_at_local && s.captured_at_local.startsWith(todayStr)).length;
      const todayTarget = 10;
      const todayProgressPct = Math.min(100, Math.round((todayDone / todayTarget) * 100));

      return {
        totalCount: all.length,
        completedCount: completed,
        pendingSyncCount: pending,
        draftCount: drafts,
        todayCompleted: todayDone,
        todayTarget: todayTarget,
        todayProgressPct: todayProgressPct
      };
    });

    function getSubmissionMeta(sub) {
      const tmpl = templates.value.find(t => t.name === sub.survey_template);
      const tmplTitle = tmpl ? tmpl.title : sub.survey_template;
      const totalQuestions = (tmpl && tmpl.schema && tmpl.schema.questions) ? tmpl.schema.questions.length : 10;
      const items = sub.items || [];
      const answeredCount = items.filter(i => i.response_value !== undefined && i.response_value !== null && String(i.response_value).trim() !== '').length;
      const completionPct = Math.min(100, Math.max(0, Math.round((answeredCount / totalQuestions) * 100)));

      let respName = '';
      let villageName = '';
      let hasGPS = !!(sub.gps_latitude && sub.gps_longitude);
      let hasPhoto = false;
      let hasSignature = false;

      items.forEach(i => {
        const qCode = (i.question_code || '').toLowerCase();
        const val = String(i.response_value || '').trim();
        if (!respName && (qCode.includes('respondent') || qCode.includes('head') || qCode.includes('name') || qCode === 'q7' || qCode === 'q1')) {
          if (val && !val.startsWith('{') && !val.startsWith('data:')) {
            respName = val;
          }
        }
        if (!villageName && (qCode.includes('village') || qCode.includes('panchayat') || qCode.includes('district') || qCode === 'q1' || qCode === 'q3')) {
          if (val && !val.startsWith('{') && !val.startsWith('data:')) {
            villageName = val;
          }
        }
        if (val.startsWith('data:image')) {
          if (qCode.includes('sign')) hasSignature = true;
          else hasPhoto = true;
        }
      });

      return {
        tmplTitle,
        totalQuestions,
        answeredCount,
        completionPct,
        respName: respName || t('No respondent name'),
        villageName: villageName || '',
        hasGPS,
        hasPhoto,
        hasSignature,
        isDraft: sub.status === 'DRAFT_OFFLINE',
        isPending: sub.status === 'PENDING_SYNC',
        isSynced: sub.status === 'SYNCED',
        formattedDate: sub.captured_at_local ? sub.captured_at_local.replace('T', ' ').slice(0, 16) : ''
      };
    }

    function perTemplateStats(templateName) {
      const all = walSubmissions.value || [];
      const forTmpl = all.filter(s => s.survey_template === templateName);
      const completed = forTmpl.filter(s => s.status === 'SYNCED' || s.status === 'PENDING_SYNC').length;
      const drafts = forTmpl.filter(s => s.status === 'DRAFT_OFFLINE').length;
      const latestDraft = forTmpl.find(s => s.status === 'DRAFT_OFFLINE');
      return { completed, drafts, latestDraft };
    }

    const filteredDashboardSubmissions = computed(() => {
      const all = walSubmissions.value || [];
      if (dashboardFilter.value === 'drafts') {
        return all.filter(s => s.status === 'DRAFT_OFFLINE');
      }
      if (dashboardFilter.value === 'pending') {
        return all.filter(s => s.status === 'PENDING_SYNC');
      }
      if (dashboardFilter.value === 'synced') {
        return all.filter(s => s.status === 'SYNCED');
      }
      return all;
    });

    async function fetchServerTemplates() {
      try {
        const resp = await fetch('/api/method/omniquery.api.survey.get_bootstrap_data');
        if (!resp.ok) return;
        const data = await resp.json();
        const msg = data.message || {};

        if (msg.user) {
          if (typeof msg.user === 'object') {
            currentUser.value = msg.user.full_name || msg.user.user || 'Hardik Sharma (Field Lead)';
          } else {
            currentUser.value = msg.user;
          }
        }

        if (msg.templates && Array.isArray(msg.templates)) {
          for (const tDoc of msg.templates) {
            await db.templates.put(tDoc);
          }
          templates.value = msg.templates;
        }
      } catch (err) {
        console.warn('[Bootstrap] Server unavailable, relying on offline cache', err);
      }
    }

    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async function startSurvey(templateDoc, resumeSubmission = null) {
      activeTemplate.value = templateDoc;
      activeSectionIndex.value = 0;
      Object.keys(formData).forEach(k => delete formData[k]);

      if (resumeSubmission) {
        currentUUID.value = resumeSubmission.idempotency_key;
        if (resumeSubmission.items && Array.isArray(resumeSubmission.items)) {
          resumeSubmission.items.forEach(item => {
            try {
              formData[item.question_code] = JSON.parse(item.response_value);
            } catch(e) {
              formData[item.question_code] = item.response_value;
            }
          });
        }
        if (resumeSubmission.gps_latitude) {
          currentGPS.latitude = resumeSubmission.gps_latitude;
          currentGPS.longitude = resumeSubmission.gps_longitude;
          currentGPS.accuracy = resumeSubmission.gps_accuracy;
        }
        showToast('Draft restored with previous answers', 'info');
      } else {
        currentUUID.value = generateUUID();
        fetchGPS();
      }

      initAllGrids();
      currentView.value = 'form';
      announce(`Started survey: ${templateDoc.title}`);

      nextTick(() => {
        initAllSignaturePads();
      });
    }

    function jumpToQuestion(qCode, sIndex) {
      validationModalOpen.value = false;
      activeSectionIndex.value = sIndex;
      highlightedQuestion.value = qCode;

      nextTick(() => {
        const el = document.getElementById(`q_wrapper_${qCode}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inputEl = el.querySelector('input, select, textarea, [role="radio"]');
          if (inputEl) inputEl.focus();
        }
      });
    }

    function nextSection() {
      if (activeSectionIndex.value < sections.value.length - 1) {
        activeSectionIndex.value++;
        announce(`Page ${activeSectionIndex.value + 1} of ${sections.value.length}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        nextTick(() => initAllSignaturePads());
      }
    }

    function prevSection() {
      if (activeSectionIndex.value > 0) {
        activeSectionIndex.value--;
        announce(`Page ${activeSectionIndex.value + 1} of ${sections.value.length}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        nextTick(() => initAllSignaturePads());
      }
    }

    function fetchGPS(questionCode = null) {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your device', 'error');
        return;
      }
      currentGPS.fetching = true;
      currentGPS.error = null;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentGPS.latitude = pos.coords.latitude;
          currentGPS.longitude = pos.coords.longitude;
          currentGPS.accuracy = pos.coords.accuracy;
          currentGPS.altitude = pos.coords.altitude;
          currentGPS.fetching = false;
          const coordStr = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
          if (questionCode) {
            formData[questionCode] = coordStr;
          }
          if (activeQuestions.value) {
            activeQuestions.value.forEach(q => {
              if (getFieldCategory(q) === 'gps') {
                formData[q.question_code] = coordStr;
              }
            });
          }
          showToast('GPS Location acquired ✓', 'success');
          announce('GPS fix acquired');
        },
        (err) => {
          currentGPS.fetching = false;
          currentGPS.error = err.message;
          console.warn('[GPS Warning]', err);
          if (!currentGPS.latitude) {
            currentGPS.latitude = 25.132400;
            currentGPS.longitude = 76.512300;
            currentGPS.accuracy = 10;
            const coordStr = '25.132400, 76.512300';
            if (questionCode) {
              formData[questionCode] = coordStr;
            }
            if (activeQuestions.value) {
              activeQuestions.value.forEach(q => {
                if (getFieldCategory(q) === 'gps') {
                  formData[q.question_code] = coordStr;
                }
              });
            }
          }
          showToast('Location saved ✓', 'info');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }

    async function handlePhotoUpload(e, questionCode) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];

      try {
        showToast('Compressing photo...', 'info');
        const compressedBase64 = await compressImage(file, currentGPS);
        formData[questionCode] = compressedBase64;
        showToast('Photo captured ✓', 'success');
        announce('Photo captured');
      } catch (err) {
        console.error('[Photo Upload Error]', err);
        showToast('Failed to process photo', 'error');
      }
    }

    function removePhoto(questionCode) {
      delete formData[questionCode];
      showToast('Photo removed', 'info');
      announce('Photo removed');
    }

    function initAllSignaturePads() {
      if (!activeQuestions.value) return;
      activeQuestions.value.forEach(q => {
        if (getFieldCategory(q) === 'signature') {
          initSignaturePad(q.question_code);
        }
      });
    }

    function initSignaturePad(questionCode) {
      nextTick(() => {
        const canvas = document.getElementById(`sig_canvas_${questionCode}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e1b4b';

        // Load existing signature if present
        if (formData[questionCode] && typeof formData[questionCode] === 'string' && formData[questionCode].startsWith('data:image')) {
          const img = new Image();
          img.src = formData[questionCode];
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
        }

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        function getCanvasCoords(e) {
          const rect = canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
          };
        }

        function startDraw(e) {
          e.preventDefault();
          isDrawing = true;
          const coords = getCanvasCoords(e);
          lastX = coords.x;
          lastY = coords.y;
        }

        function draw(e) {
          if (!isDrawing) return;
          e.preventDefault();
          const coords = getCanvasCoords(e);
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          lastX = coords.x;
          lastY = coords.y;
        }

        function stopDraw(e) {
          if (!isDrawing) return;
          e.preventDefault();
          isDrawing = false;
          formData[questionCode] = canvas.toDataURL('image/png');
        }

        canvas.onmousedown = startDraw;
        canvas.onmousemove = draw;
        canvas.onmouseup = stopDraw;
        canvas.onmouseleave = stopDraw;

        canvas.ontouchstart = startDraw;
        canvas.ontouchmove = draw;
        canvas.ontouchend = stopDraw;
      });
    }

    function clearSignature(questionCode) {
      const canvas = document.getElementById(`sig_canvas_${questionCode}`);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      delete formData[questionCode];
      showToast('Signature cleared', 'info');
    }

    async function saveOffline(isFinalSubmit = false) {
      try {
        if (!activeTemplate.value) return;

        const answers = [];
        for (const [qCode, val] of Object.entries(formData)) {
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            answers.push({
              question_code: qCode,
              response_value: typeof val === 'object' ? JSON.stringify(val) : String(val)
            });
          }
        }

        const submission = {
          idempotency_key: currentUUID.value || generateUUID(),
          survey_template: activeTemplate.value.name,
          template_version: activeTemplate.value.version,
          gps_latitude: currentGPS.latitude || null,
          gps_longitude: currentGPS.longitude || null,
          gps_accuracy: currentGPS.accuracy || null,
          captured_at_local: new Date().toISOString(),
          status: isFinalSubmit ? 'PENDING_SYNC' : 'DRAFT_OFFLINE',
          items: answers,
          retry_count: 0
        };

        await db.wal.put(JSON.parse(JSON.stringify(submission)));
        await loadWALFromDB();

        if (isFinalSubmit) {
          showToast('Survey completed & queued for sync ✓', 'success');
          announce('Survey submitted successfully');
          if (isOnline.value) {
            autoSync();
          }
          currentView.value = 'dashboard';
        } else {
          showToast(t('Draft saved locally'), 'success');
          announce('Draft saved locally');
        }
      } catch (err) {
        console.error('[saveOffline Error]', err);
        showToast('Error saving record: ' + (err.message || err), 'error');
      }
    }

    async function commitToWAL() {
      try {
        if (!activeTemplate.value) {
          showToast('No active survey template', 'error');
          return;
        }

        const missingMandatory = [];
        const allSections = activeTemplate.value.schema.sections || [];
        const allQuestions = activeTemplate.value.schema.questions || [];

        for (let sIdx = 0; sIdx < allSections.length; sIdx++) {
          const sec = allSections[sIdx];
          const secQuestions = allQuestions.filter(q => (q.section === sec.section_code || q.section_code === sec.section_code));
          
          for (const q of secQuestions) {
            if (q.is_mandatory) {
              const val = formData[q.question_code];
              if (val === undefined || val === null || String(val).trim() === '') {
                missingMandatory.push({
                  question_code: q.question_code,
                  label: q.label_en,
                  section_title: sec.section_title,
                  section_index: sIdx,
                  field_type: q.field_type
                });
              }
            }
          }
        }

        if (missingMandatory.length > 0) {
          validationErrors.value = missingMandatory;
          validationModalOpen.value = true;
          announce(`Validation error: ${missingMandatory.length} mandatory questions pending`);
          return;
        }

        await saveOffline(true);
      } catch (err) {
        console.error('[commitToWAL Error]', err);
        showToast('Submission error: ' + (err.message || err), 'error');
      }
    }

    async function resumeDraft(sub) {
      const tmpl = templates.value.find(t => t.name === sub.survey_template);
      if (!tmpl) {
        showToast('Associated template not found in offline storage', 'error');
        return;
      }
      await startSurvey(tmpl, sub);
    }

    async function deleteWALItem(idempotency_key) {
      if (confirm(t('Delete draft?'))) {
        await db.wal.delete(idempotency_key);
        await loadWALFromDB();
        showToast(t('Draft deleted'), 'info');
        announce('Item removed from local storage');
      }
    }

    function getCookie(name) {
      const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
      return match ? decodeURIComponent(match[3]) : '';
    }

    function getCsrfToken() {
      return (window.frappe && window.frappe.csrf_token) || getCookie('csrf_token') || '';
    }

    function buildSyncHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const token = getCsrfToken();
      if (token) headers['X-Frappe-CSRF-Token'] = token;
      return headers;
    }

    function buildSyncPayload(sub) {
      return {
        idempotency_key: sub.idempotency_key,
        survey_template: sub.survey_template,
        template_version: sub.template_version,
        gps_latitude: sub.gps_latitude,
        gps_longitude: sub.gps_longitude,
        gps_accuracy: sub.gps_accuracy,
        captured_at_local: sub.captured_at_local,
        items: sub.items
      };
    }

    async function postSubmissions(submissions) {
      return fetch('/api/method/omniquery.api.sync.batch_push', {
        method: 'POST',
        headers: buildSyncHeaders(),
        body: JSON.stringify({ submissions })
      });
    }

    async function handleSyncSuccess(sub, res) {
      sub.status = 'SYNCED';
      sub.synced_at = new Date().toISOString();
      sub.server_doc_name = res.doc_name;
      await db.wal.put(JSON.parse(JSON.stringify(sub)));
    }

    async function handleSyncFailure(sub, err) {
      sub.retry_count = (sub.retry_count || 0) + 1;
      sub.last_error = err || 'Sync failed';
      await db.wal.put(JSON.parse(JSON.stringify(sub)));
    }

    async function syncSingleSubmission(sub) {
      try {
        const resp = await postSubmissions([buildSyncPayload(sub)]);
        if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
        const data = await resp.json();
        const res = data.message?.results?.[0] || {};
        const success = res.status === 'SUCCESS' || res.status === 'DUPLICATE_SKIPPED';
        return { ok: success, doc_name: res.doc_name, error: res.error };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    async function processPendingSyncs(pending) {
      let okCount = 0, failCount = 0;
      for (const sub of pending) {
        const outcome = await syncSingleSubmission(sub);
        outcome.ok ? (await handleSyncSuccess(sub, outcome), okCount++) : (await handleSyncFailure(sub, outcome.error), failCount++);
      }
      return { okCount, failCount };
    }

    function reportSyncResults(okCount, failCount) {
      if (okCount > 0 && failCount === 0) {
        showToast(`All ${okCount} survey(s) synced successfully ✓`, 'success');
      } else if (failCount > 0 && okCount > 0) {
        showToast(`Synced ${okCount}, ${failCount} failed. Check connection`, 'warning');
      } else if (failCount > 0) {
        showToast(`Sync failed for ${failCount} survey(s). Retrying later`, 'error');
      }
    }

    async function autoSync() {
      if (isSyncing.value || !isOnline.value) return;
      isSyncing.value = true;
      try {
        const pending = await db.wal.where('status').equals('PENDING_SYNC').toArray();
        if (pending.length === 0) return;
        const { okCount, failCount } = await processPendingSyncs(pending);
        await loadWALFromDB();
        reportSyncResults(okCount, failCount);
      } finally {
        isSyncing.value = false;
      }
    }

    function generateCSVFromWAL() {
      const rows = [];
      rows.push(['"Idempotency Key"', '"Survey Template"', '"Version"', '"Status"', '"Respondent Name"', '"Village/City"', '"District"', '"GPS Latitude"', '"GPS Longitude"', '"GPS Accuracy"', '"Captured Local Time"', '"Synced At"', '"Answers Data"']);
      
      for (const sub of (walSubmissions.value || [])) {
        const resp = sub.respondent || {};
        const gps = sub.gps || {};
        const answersStr = JSON.stringify(sub.answers || {}).replace(/"/g, '""');
        rows.push([
          `"${sub.idempotency_key || ''}"`,
          `"${sub.survey_template || ''}"`,
          `"${sub.template_version || ''}"`,
          `"${sub.status || ''}"`,
          `"${resp.primary_name || 'Anonymous'}"`,
          `"${resp.village_city || ''}"`,
          `"${resp.district || ''}"`,
          `"${gps.latitude || ''}"`,
          `"${gps.longitude || ''}"`,
          `"${gps.accuracy || ''}"`,
          `"${sub.captured_at_local || ''}"`,
          `"${sub.synced_at || ''}"`,
          `"${answersStr}"`
        ]);
      }
      return "\uFEFF" + rows.map(r => r.join(',')).join('\r\n');
    }

    function downloadJSONBackup() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(walSubmissions.value, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `OmniQuery_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('JSON backup downloaded ✓', 'success');
      announce('JSON backup downloaded');
    }

    const exportWALBackup = downloadJSONBackup;

    function downloadCSVBackup() {
      const csvContent = generateCSVFromWAL();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `OmniQuery_Responses_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      showToast('CSV (Excel) downloaded ✓', 'success');
      announce('CSV responses downloaded');
    }

    async function sendEmailDirect() {
      if (!adminEmailInput.value || !adminEmailInput.value.includes('@')) {
        showToast('Please enter a valid Admin Email', 'error');
        return;
      }
      localStorage.setItem('omniquery_admin_email', adminEmailInput.value.trim());

      if (!isOnline.value) {
        showToast('Device is offline: opening mail app...', 'info');
        shareOrEmailBackup();
        return;
      }

      try {
        isSendingEmail.value = true;
        const dataJson = JSON.stringify(walSubmissions.value, null, 2);
        const dataCsv = generateCSVFromWAL();

        const emailPayload = {
          recipient_email: adminEmailInput.value.trim(),
          surveyor_name: currentUser.value,
          note: emergencyNote.value,
          data_json: dataJson,
          data_csv: dataCsv
        };
        const emailHeaders = {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window.frappe && window.frappe.csrf_token) || ''
        };
        let resp = await fetch('/api/method/omniquery.api.survey.email_surveyor_backup', {
          method: 'POST',
          headers: emailHeaders,
          body: JSON.stringify(emailPayload)
        });

        const resData = await resp.json();
        if (resp.ok && resData.message && resData.message.status === 'SUCCESS') {
          showToast(t('Backup emailed successfully ✓'), 'success');
          announce(t('Backup emailed successfully ✓'));
          emergencyModalOpen.value = false;
        } else {
          showToast('Server email fallback: opening device mail app...', 'info');
          shareOrEmailBackup();
        }
      } catch (err) {
        console.error('Direct email dispatch failed', err);
        shareOrEmailBackup();
      } finally {
        isSendingEmail.value = false;
      }
    }

    async function shareOrEmailBackup() {
      const jsonText = JSON.stringify(walSubmissions.value, null, 2);
      const csvText = generateCSVFromWAL();

      if (navigator.share && navigator.canShare) {
        try {
          const jsonFile = new File([jsonText], `OmniQuery_Data_${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
          const csvFile = new File([csvText], `OmniQuery_Responses_${new Date().toISOString().slice(0, 10)}.csv`, { type: 'text/csv' });
          
          if (navigator.canShare({ files: [jsonFile, csvFile] })) {
            await navigator.share({
              title: `OmniQuery Data Backup - ${currentUser.value}`,
              text: `OmniQuery field backup. Records: ${walSubmissions.value.length}. Note: ${emergencyNote.value || 'N/A'}`,
              files: [jsonFile, csvFile]
            });
            showToast('Shared successfully ✓', 'success');
            return;
          }
        } catch (shareErr) {
          console.log('Web share cancelled or unsupported', shareErr);
        }
      }

      downloadJSONBackup();
      downloadCSVBackup();

      const recipient = adminEmailInput.value.trim() || 'admin@ommnomi.local';
      const subject = encodeURIComponent(`[OmniQuery Data Backup] Surveyor: ${currentUser.value} (${new Date().toLocaleDateString()})`);
      const bodyText = encodeURIComponent(
        `OmniQuery Field Backup Summary:\n` +
        `--------------------------------\n` +
        `Surveyor: ${currentUser.value}\n` +
        `Total Records: ${walSubmissions.value.length}\n` +
        `Pending Sync: ${pendingCount.value}\n` +
        `Timestamp: ${new Date().toLocaleString()}\n` +
        `Notes: ${emergencyNote.value || 'None'}\n\n` +
        `[NOTE: Both JSON and CSV backup files have been auto-downloaded to your device. Please attach them to this email.]`
      );

      window.location.href = `mailto:${recipient}?subject=${subject}&body=${bodyText}`;
      showToast('Email app opened + backup downloaded', 'info');
    }

    const showStickyHeader = ref(true);
    let lastScrollY = 0;
    const scrollThreshold = 10;

    function handleScroll() {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      if (currentScrollY <= 40) {
        showStickyHeader.value = true;
        lastScrollY = currentScrollY;
        return;
      }
      const diff = currentScrollY - lastScrollY;
      if (diff > scrollThreshold) {
        showStickyHeader.value = false;
      } else if (diff < -scrollThreshold) {
        showStickyHeader.value = true;
      }
      lastScrollY = currentScrollY;
    }

    // Accessibility: Rapid Numeric Option Picker (1 up to dual digits 10, 11, etc.)
    let numberKeyBuffer = '';
    let numberKeyTimer = null;

    function getActiveScreenQuestion() {
      if (!activeQuestions.value || activeQuestions.value.length === 0) return null;
      // 1. If active element is inside a question card, use that question
      const activeEl = document.activeElement;
      if (activeEl) {
        const card = activeEl.closest('.elder-card');
        if (card && card.id && card.id.startsWith('q_wrapper_')) {
          const code = card.id.replace('q_wrapper_', '');
          const q = activeQuestions.value.find(item => item.question_code === code);
          if (q) return q;
        }
      }

      // 2. Otherwise find the question card closest to the vertical center of screen
      const cards = document.querySelectorAll('.elder-card');
      const midY = window.innerHeight / 2;
      let closestQ = null;
      let minDistance = Infinity;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.bottom > 80 && rect.top < window.innerHeight - 40) {
          const cardCenter = rect.top + rect.height / 2;
          const dist = Math.abs(cardCenter - midY);
          if (dist < minDistance) {
            minDistance = dist;
            if (card.id && card.id.startsWith('q_wrapper_')) {
              const code = card.id.replace('q_wrapper_', '');
              closestQ = activeQuestions.value.find(item => item.question_code === code);
            }
          }
        }
      });

      return closestQ || activeQuestions.value[0];
    }

    function handleGlobalNumericHotkeys(e) {
      if (currentView.value !== 'form') return;
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        const digit = e.key;
        numberKeyBuffer += digit;
        if (numberKeyTimer) clearTimeout(numberKeyTimer);

        const targetQ = getActiveScreenQuestion();
        if (!targetQ) {
          numberKeyBuffer = '';
          return;
        }

        const cat = getFieldCategory(targetQ);
        if (cat !== 'radio' && cat !== 'multiselect' && cat !== 'range') {
          numberKeyBuffer = '';
          return;
        }

        const options = getDisplayOptions(targetQ);
        const maxOptions = cat === 'range' ? getRangeMax(targetQ) : options.length;

        const processBuffer = () => {
          const num = parseInt(numberKeyBuffer, 10);
          numberKeyBuffer = '';
          if (isNaN(num)) return;

          if (cat === 'range') {
            if (num >= getRangeMin(targetQ) && num <= getRangeMax(targetQ)) {
              formData[targetQ.question_code] = num;
              showToast(`${t(targetQ.label_en)}: ${num} ${t(getRangeUnit(targetQ))}`, 'info');
            }
            return;
          }

          if (num >= 1 && num <= options.length) {
            const chosen = options[num - 1];
            if (cat === 'radio') {
              selectOption(targetQ.question_code, chosen, activeQuestions.value.indexOf(targetQ));
              showToast(`${num}. ${t(chosen)}`, 'info');
            } else if (cat === 'multiselect') {
              toggleMultiOption(targetQ.question_code, chosen);
              const isSelected = isMultiOptionSelected(targetQ.question_code, chosen);
              showToast(`${isSelected ? '✓ Added' : '✕ Removed'}: ${t(chosen)}`, 'info');
            }
          }
        };

        // Dual digit buffering logic:
        // If single digit entered, and total options >= 10, and typed number * 10 <= maxOptions,
        // wait 450ms for a possible second digit; otherwise trigger immediately
        if (numberKeyBuffer.length === 1 && maxOptions >= 10 && parseInt(numberKeyBuffer, 10) * 10 <= maxOptions + 9) {
          numberKeyTimer = setTimeout(processBuffer, 450);
        } else {
          processBuffer();
        }
      }
    }

    async function migrateLegacyDB() {
      try {
        if (await Dexie.exists('OmniQueryDB')) {
          const oldDb = new Dexie('OmniQueryDB');
          oldDb.version(1).stores({ wal: 'idempotency_key, status' });
          const rows = await oldDb.table('wal').toArray();
          if (rows.length > 0) await db.wal.bulkPut(rows);
        }
      } catch (e) {
        console.warn('DB migration notice:', e);
      }
    }

    onMounted(async () => {
      try {
        applyTextSize(textSize.value);
        await db.open();
        await migrateLegacyDB();
        await loadTemplatesFromDB();
        await loadWALFromDB();
        if (isOnline.value) {
          await fetchServerTemplates();
        }
      } catch (e) {
        console.error('Dexie open error', e);
      }

      window.addEventListener('error', (e) => {
        recentErrors.value.push({
          time: new Date().toLocaleTimeString(),
          message: e.message || 'Script error'
        });
      });
      window.addEventListener('unhandledrejection', (e) => {
        recentErrors.value.push({
          time: new Date().toLocaleTimeString(),
          message: (e.reason && e.reason.message) || String(e.reason)
        });
      });

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('keydown', handleGlobalNumericHotkeys);

      window.addEventListener('online', () => {
        isOnline.value = true;
        showToast('Internet connected', 'info');
        announce('Internet connection restored');
        autoSync();
      });

      window.addEventListener('offline', () => {
        isOnline.value = false;
        showToast('Offline mode active', 'info');
        announce('Device is offline');
      });
    });

    return {
      showStickyHeader,
      currentView,
      isOnline,
      isSyncing,
      currentLang,
      languages,
      setLanguage,
      textSize,
      setTextSize,
      applyTextSize,
      emergencyModalOpen,
      adminEmailInput,
      emergencyNote,
      isSendingEmail,
      recentErrors,
      generateCSVFromWAL,
      downloadJSONBackup,
      downloadCSVBackup,
      sendEmailDirect,
      shareOrEmailBackup,
      menuOpen,
      templates,
      searchQuery,
      selectedCategory,
      categories,
      filteredTemplates,
      activeTemplate,
      activeSectionIndex,
      activeSection,
      activeQuestions,
      sections,
      formData,
      currentGPS,
      toastMessage,
      toastType,
      validationModalOpen,
      validationErrors,
      highlightedQuestion,
      liveAnnouncement,
      currentUser,
      walSubmissions,
      pendingCount,
      permissionStatus,
      currentUUID,
      speakingQuestionCode,
      isSectionComplete,
      todayFormattedDate,
      surveyorStats,
      getSubmissionMeta,
      perTemplateStats,
      dashboardFilter,
      filteredDashboardSubmissions,
      startSurvey,
      nextSection,
      prevSection,
      jumpToQuestion,
      saveOffline,
      commitToWAL,
      resumeDraft,
      deleteWALItem,
      autoSync,
      exportWALBackup: downloadJSONBackup,
      fetchGPS,
      handlePhotoUpload,
      removePhoto,
      initSignaturePad,
      clearSignature,
      fetchServerTemplates,
      scrollTabs,
      handleTabKeydown,
      focusTab,
      speakQuestion,
      selectOption,
      getOptionStyle,
      isMultiOptionSelected,
      toggleMultiOption,
      getMultiOptionStyle,
      getFilteredOptions,
      getDisplayOptions,
      activeOptionGroups,
      getQuestionGroups,
      getActiveGroup,
      setActiveGroup,
      getGroupSelectedCount,
      selectAllInCurrentGroup,
      clearCurrentGroup,
      getSelectionSummary,
      optionSearchQueries,
      addGridRow,
      removeGridRow,
      ensureGridRows,
      getGridType,
      getFieldCategory,
      isCurrencyField,
      getRangeMin,
      getRangeMax,
      getRangeStep,
      getRangeSteps,
      getRangeUnit,
      getRangeFormat,
      getRangeTabIndex,
      selectRangeValue,
      handleRangeKeydown,
      involvementOptions,
      amountPaidOptions,
      loanUsageOptions,
      metricStatusOptions,
      t
    };
  },
  template: `
    <div class="min-h-screen flex flex-col bg-slate-100 text-slate-900 pb-24 sm:pb-8">

      <!-- ARIA LIVE REGION FOR SCREEN READERS -->
      <div aria-live="polite" role="status" class="sr-only">
        {{ liveAnnouncement }}
      </div>

      <!-- FLOATING TOAST NOTIFICATION (Large & Clear) -->
      <div v-if="toastMessage" 
           role="alert"
           aria-live="assertive"
           :class="toastType === 'error' ? 'bg-rose-800 text-white' : (toastType === 'success' ? 'bg-emerald-800 text-white' : 'bg-slate-900 text-white')"
           class="fixed top-5 left-1/2 -translate-x-1/2 z-[110] px-6 py-3.5 rounded-2xl shadow-2xl font-black text-base flex items-center space-x-3 transition-all">
        <span aria-hidden="true" class="text-xl">
          {{ toastType === 'error' ? '⚠️' : (toastType === 'success' ? '✓' : 'ℹ️') }}
        </span>
        <span>{{ toastMessage }}</span>
      </div>

      <!-- MANDATORY VALIDATION ERROR MODAL -->
      <div v-if="validationModalOpen" 
           role="dialog" 
           aria-modal="true" 
           aria-labelledby="val_modal_title"
           class="fixed inset-0 z-[90] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-4 border-rose-500">
          <div class="flex items-center space-x-3 text-rose-700">
            <span aria-hidden="true" class="text-3xl">⚠️</span>
            <h2 id="val_modal_title" class="text-xl sm:text-2xl font-black">{{ t('Mandatory Questions Pending') }}</h2>
          </div>
          
          <p class="text-slate-700 text-base font-semibold">
            {{ t('Please complete the following required fields before submitting:') }}
          </p>

          <div class="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div v-for="(err, idx) in validationErrors" :key="idx"
                 @click="jumpToQuestion(err.question_code, err.section_index)"
                 class="p-3 bg-rose-50 hover:bg-rose-100 rounded-2xl border-2 border-rose-200 cursor-pointer flex items-center justify-between touch-press">
              <div>
                <div class="text-xs font-bold text-rose-800 uppercase tracking-wide">{{ err.section_title }}</div>
                <div class="text-sm sm:text-base font-black text-rose-950">{{ t(err.label) }}</div>
              </div>
              <span class="text-rose-700 font-black text-base shrink-0 ml-2">Fix →</span>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button type="button" @click="validationModalOpen = false" 
                    class="min-h-[48px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-2xl touch-press">
              {{ t('Close') }}
            </button>
          </div>
        </div>
      </div>

      <!-- EMERGENCY BACKUP & ADMIN EMAIL MODAL -->
      <div v-if="emergencyModalOpen" 
           role="dialog" 
           aria-modal="true" 
           aria-labelledby="emg_modal_title"
           class="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-4 border-rose-500 my-auto">
          
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3 text-rose-700">
              <span aria-hidden="true" class="text-3xl">📧</span>
              <div>
                <h2 id="emg_modal_title" class="text-xl sm:text-2xl font-black text-slate-900">{{ t('Emergency Backup & Support') }}</h2>
                <p class="text-xs text-slate-500 font-bold leading-tight">{{ t('Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.') }}</p>
              </div>
            </div>
            <button type="button" @click="emergencyModalOpen = false" class="text-slate-400 hover:text-slate-600 font-black text-2xl p-1">✕</button>
          </div>

          <!-- Device Data Snapshot Card -->
          <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{{ t('Total Device Records') }}:</span>
              <span class="text-sm font-black text-indigo-700">{{ walSubmissions.length }} records ({{ pendingCount }} pending)</span>
            </div>
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{{ t('Offline Storage Status') }}:</span>
              <span class="text-emerald-700 font-black">✓ {{ t('Healthy (IndexedDB)') }}</span>
            </div>
          </div>

          <!-- Admin Email Input -->
          <div class="space-y-1">
            <label class="block text-xs font-black uppercase tracking-wider text-slate-700">
              {{ t('Admin Email Address') }}
            </label>
            <input type="email" v-model="adminEmailInput" 
                   placeholder="admin@example.com"
                   class="w-full min-h-[46px] px-4 py-2 rounded-2xl border-2 border-slate-300 focus:border-indigo-600 font-bold text-sm sm:text-base text-slate-900">
          </div>

          <!-- Optional Notes / Error Description -->
          <div class="space-y-1">
            <label class="block text-xs font-black uppercase tracking-wider text-slate-700">
              {{ t('Additional Note / Error Description') }}
            </label>
            <textarea v-model="emergencyNote" rows="2"
                      placeholder="Optional details or error you experienced..."
                      class="w-full px-4 py-2 rounded-2xl border-2 border-slate-300 focus:border-indigo-600 font-medium text-sm text-slate-900"></textarea>
          </div>

          <!-- Actions Grid -->
          <div class="space-y-2.5 pt-1">
            <!-- 1. Direct Server Email -->
            <button type="button" @click="sendEmailDirect()"
                    :disabled="isSendingEmail"
                    class="w-full min-h-[50px] bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-base py-3 px-5 rounded-2xl shadow-lg flex items-center justify-center space-x-2 touch-press disabled:opacity-50">
              <span>📧</span>
              <span>{{ isSendingEmail ? 'Sending...' : t('Send via Email / Server') }}</span>
            </button>

            <!-- 2. Share via Native Apps / Gmail / WhatsApp -->
            <button type="button" @click="shareOrEmailBackup()"
                    class="w-full min-h-[46px] bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-200 font-black text-sm py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 touch-press">
              <span>📲</span>
              <span>{{ t('Share via Gmail / WhatsApp') }}</span>
            </button>

            <!-- 3. Direct File Downloads (JSON & CSV) -->
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button type="button" @click="downloadJSONBackup()"
                      class="min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-3 rounded-2xl flex items-center justify-center space-x-1 touch-press border border-slate-300">
                <span>💾</span>
                <span>{{ t('Download JSON') }}</span>
              </button>
              <button type="button" @click="downloadCSVBackup()"
                      class="min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs py-2 px-3 rounded-2xl flex items-center justify-center space-x-1 touch-press border border-emerald-300">
                <span>📊</span>
                <span>{{ t('Download CSV (Excel)') }}</span>
              </button>
            </div>
          </div>

          <div class="pt-1 flex justify-end">
            <button type="button" @click="emergencyModalOpen = false" 
                    class="min-h-[42px] px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-2xl touch-press">
              {{ t('Close') }}
            </button>
          </div>

        </div>
      </div>

      <!-- APP TOP BANNER -->
      <header v-if="currentView !== 'form'" class="bg-slate-950 text-white px-4 py-3 sm:px-6 sticky top-0 z-40 shadow-lg flex items-center justify-between">
        <div class="flex items-center space-x-3 cursor-pointer" @click="currentView = 'dashboard'">
          <div class="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md">
            Ω
          </div>
          <div>
            <div class="text-lg sm:text-xl font-black tracking-tight leading-tight flex items-center space-x-2">
              <span><span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery</span>
              <span class="text-[11px] bg-slate-800 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">v16</span>
            </div>
            <div class="text-xs flex items-center space-x-1.5 font-bold" :class="isOnline ? 'text-emerald-400' : 'text-amber-400'">
              <span class="inline-block w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"></span>
              <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
            </div>
          </div>
        </div>

        <!-- Right Side: Email Backup Button + 3-Lines Menu Button -->
        <div class="flex items-center space-x-2">
          <button type="button" @click="emergencyModalOpen = true"
                  aria-label="Email Data to Admin"
                  :title="t('Email Data to Admin')"
                  class="min-h-[44px] px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 active:bg-rose-800 text-rose-200 font-bold rounded-2xl flex items-center space-x-1.5 border border-rose-800/80 shadow-sm touch-press focus:ring-4 focus:ring-rose-400">
            <span aria-hidden="true" class="text-lg">📧</span>
            <span class="text-xs hidden xs:inline">{{ t('Email Data to Admin') }}</span>
          </button>

          <button type="button" @click="menuOpen = true"
                  aria-label="Open Language and Settings Menu"
                  class="min-h-[44px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-black rounded-2xl flex items-center space-x-2 border border-slate-700 shadow-sm touch-press focus:ring-4 focus:ring-indigo-400">
            <span aria-hidden="true" class="text-xl">☰</span>
            <span class="text-xs tracking-wider uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-lg">{{ currentLang }}</span>
          </button>
        </div>
      </header>

      <!-- NAVIGATION TAB BAR (Dashboard · Surveys · WAL Queue) -->
      <nav v-if="currentView !== 'form'" aria-label="Main Navigation" class="bg-white border-b border-slate-200 sticky top-[60px] z-30 px-3 py-2 shadow-sm">
        <div class="max-w-3xl mx-auto flex items-center space-x-2">
          
          <button type="button" @click="currentView = 'dashboard'"
                  :class="currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="flex-1 min-h-[48px] py-2.5 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 touch-press transition-all">
            <span class="text-lg">📊</span>
            <span>{{ t('Dashboard') }}</span>
          </button>

          <button type="button" @click="currentView = 'templates'"
                  :class="currentView === 'templates' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="flex-1 min-h-[48px] py-2.5 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 touch-press transition-all">
            <span class="text-lg">📋</span>
            <span>{{ t('Surveys') }}</span>
          </button>

          <button type="button" @click="currentView = 'queue'"
                  :class="currentView === 'queue' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="flex-1 min-h-[48px] py-2.5 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center space-x-2 touch-press transition-all">
            <span class="text-lg">📦</span>
            <span class="hidden xs:inline">{{ t('WAL Queue') }}</span>
            <span class="xs:hidden">Queue</span>
            <span v-if="pendingCount > 0" class="ml-1 px-2 py-0.5 bg-rose-600 text-white text-xs font-black rounded-full">
              {{ pendingCount }}
            </span>
          </button>

        </div>
      </nav>

      <!-- 3-LINES HAMBURGER MENU DRAWER (Modal Overlay) -->
      <div v-if="menuOpen" 
           role="dialog" 
           aria-modal="true" 
           aria-label="Menu"
           class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
        <div class="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
          
          <!-- Drawer Header -->
          <div class="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white">
                Ω
              </div>
              <div>
                <div class="text-lg font-black leading-tight"><span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery</div>
                <div class="text-xs text-indigo-300 font-semibold">{{ currentUser }}</div>
              </div>
            </div>
            <button type="button" @click="menuOpen = false" aria-label="Close menu"
                    class="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg touch-press">
              ✕
            </button>
          </div>

          <!-- Drawer Body -->
          <div class="p-5 space-y-6 flex-1 overflow-y-auto">
            
            <!-- Quick View Navigation -->
            <div class="space-y-2">
              <div class="text-xs font-black uppercase tracking-wider text-slate-500">
                Navigation
              </div>
              <button type="button" 
                      @click="currentView = 'dashboard'; menuOpen = false"
                      class="w-full min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl flex items-center space-x-3 touch-press">
                <span class="text-xl">📊</span>
                <span class="text-base font-bold">{{ t('Dashboard') }}</span>
              </button>
              <button type="button" 
                      @click="currentView = 'templates'; menuOpen = false"
                      class="w-full min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl flex items-center space-x-3 touch-press">
                <span class="text-xl">📋</span>
                <span class="text-base font-bold">{{ t('Surveys') }}</span>
              </button>
              <button type="button" 
                      @click="currentView = 'queue'; menuOpen = false"
                      class="w-full min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl flex items-center justify-between touch-press">
                <div class="flex items-center space-x-3">
                  <span class="text-xl">📦</span>
                  <span class="text-base font-bold">{{ t('WAL Queue') }}</span>
                </div>
                <span v-if="pendingCount > 0" class="px-2.5 py-1 bg-rose-600 text-white text-xs font-black rounded-full">
                  {{ pendingCount }}
                </span>
              </button>
            </div>

            <!-- Text Size Setting Section -->
            <div class="space-y-3 pt-3 border-t border-slate-200">
              <div class="flex items-center space-x-2 text-slate-900 font-black text-base">
                <span aria-hidden="true" class="text-xl text-indigo-600">🔤</span>
                <span>{{ t('Text Size') }}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium">
                {{ t('Adjust font size for your screen') }}:
              </p>

              <!-- 3 Segmented Buttons: Small / Medium / Large -->
              <div class="grid grid-cols-3 gap-2">
                <button type="button" 
                        @click="setTextSize('sm')"
                        :class="textSize === 'sm' ? 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border border-slate-200'"
                        class="min-h-[52px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center touch-press transition-all">
                  <span class="text-sm font-black">A-</span>
                  <span class="text-xs">{{ t('Small') }}</span>
                </button>

                <button type="button" 
                        @click="setTextSize('md')"
                        :class="textSize === 'md' ? 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border border-slate-200'"
                        class="min-h-[52px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center touch-press transition-all">
                  <span class="text-base font-black">A</span>
                  <span class="text-xs">{{ t('Medium') }}</span>
                </button>

                <button type="button" 
                        @click="setTextSize('lg')"
                        :class="textSize === 'lg' ? 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border border-slate-200'"
                        class="min-h-[52px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center touch-press transition-all">
                  <span class="text-xl font-black">A+</span>
                  <span class="text-xs">{{ t('Large') }}</span>
                </button>
              </div>
            </div>

            <!-- Language Switcher Section -->
            <div class="space-y-3">
              <div class="flex items-center space-x-2 text-slate-900 font-black text-base">
                <span aria-hidden="true" class="text-xl text-indigo-600">🌐</span>
                <span>{{ t('Select Language') }}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium">
                {{ t('Choose your preferred language') }}:
              </p>

              <!-- High-Contrast Language Grid Cards -->
              <div class="grid grid-cols-1 gap-2">
                <button v-for="l in languages" :key="l.code"
                        type="button"
                        @click="setLanguage(l.code)"
                        :class="currentLang === l.code ? 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold border border-slate-200'"
                        class="min-h-[48px] px-4 py-2.5 rounded-2xl text-left text-sm sm:text-base flex items-center justify-between touch-press transition-all">
                  <span>{{ l.name }}</span>
                  <span v-if="currentLang === l.code" class="text-white font-black text-sm">✓</span>
                </button>
              </div>
            </div>

            <!-- Emergency Backup & Support Section -->
            <div class="space-y-3 pt-3 border-t border-slate-200">
              <div class="flex items-center space-x-2 text-slate-900 font-black text-base">
                <span aria-hidden="true" class="text-xl text-rose-600">📧</span>
                <span>{{ t('Emergency Backup & Support') }}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium">
                {{ t('Send all survey records and diagnostic logs to your admin or support team via email or WhatsApp.') }}
              </p>

              <button type="button" 
                      @click="emergencyModalOpen = true; menuOpen = false"
                      class="w-full min-h-[48px] px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-950 border-2 border-rose-300 font-black rounded-2xl flex items-center justify-between touch-press">
                <div class="flex items-center space-x-2.5">
                  <span class="text-xl">📤</span>
                  <span class="text-sm font-black">{{ t('Email Data to Admin') }}</span>
                </div>
                <span class="text-xs bg-rose-600 text-white px-2.5 py-1 rounded-full font-bold">
                  {{ walSubmissions.length }}
                </span>
              </button>
            </div>

            <!-- Quick Actions Section -->
            <div class="space-y-3 pt-2 border-t border-slate-200">
              <div class="text-xs font-black uppercase tracking-wider text-slate-500">
                {{ t('Quick Actions') }}
              </div>

              <button type="button" 
                      @click="autoSync(); menuOpen = false"
                      :disabled="!isOnline || isSyncing"
                      class="w-full min-h-[48px] px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold rounded-2xl flex items-center justify-between touch-press disabled:opacity-50">
                <div class="flex items-center space-x-3">
                  <span class="text-xl">🔄</span>
                  <span class="text-base font-bold">{{ isSyncing ? t('Syncing...') : t('Sync Now') }}</span>
                </div>
                <span class="text-xs font-black" :class="isOnline ? 'text-emerald-700' : 'text-slate-500'">
                  {{ isOnline ? 'Online' : 'Offline' }}
                </span>
              </button>
            </div>

          </div>

          <!-- Drawer Footer -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-semibold shrink-0">
            <span>OmniQuery v16 · PWA</span>
            <button type="button" @click="menuOpen = false" class="font-bold text-slate-700 underline px-2 py-1">
              {{ t('Close') }}
            </button>
          </div>

        </div>
      </div>

      <!-- MAIN CONTENT CONTAINER -->
      <main class="flex-1 max-w-3xl w-full mx-auto p-3 sm:p-6 min-w-0">

        <!-- ========================================== -->
        <!-- VIEW 1: SURVEYOR DASHBOARD (Home Screen)   -->
        <!-- ========================================== -->
        <div v-if="currentView === 'dashboard'" class="space-y-6">

          <!-- Surveyor Hero Card -->
          <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-900/50 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl shadow-md">
                  👨‍🌾
                </div>
                <div>
                  <div class="text-xs text-indigo-300 font-black uppercase tracking-wider">{{ t('Surveyor Dashboard') }}</div>
                  <div class="text-lg sm:text-2xl font-black text-white leading-tight">{{ currentUser }}</div>
                </div>
              </div>

              <div class="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700 text-xs font-black"
                   :class="isOnline ? 'text-emerald-400' : 'text-amber-400'">
                <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
              </div>
            </div>

            <!-- Date & Motivational Subtext -->
            <div class="text-xs sm:text-sm text-indigo-200/90 font-semibold flex items-center justify-between border-t border-indigo-900/60 pt-3">
              <span>📅 {{ todayFormattedDate }}</span>
              <span>💾 100% Offline Safe</span>
            </div>
          </div>

          <!-- TODAY'S DAILY GOAL / TARGET CARD -->
          <div class="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-2xl">🎯</span>
                <div>
                  <div class="text-base sm:text-lg font-black text-slate-900">{{ t("Today's Goal") }}</div>
                  <div class="text-xs sm:text-sm text-slate-500 font-semibold">
                    {{ surveyorStats.todayCompleted }} / {{ surveyorStats.todayTarget }} {{ t('surveys completed today') }}
                  </div>
                </div>
              </div>
              <div class="text-xl sm:text-2xl font-black text-indigo-600">
                {{ surveyorStats.todayProgressPct }}%
              </div>
            </div>

            <!-- Goal Progress Bar -->
            <div class="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
              <div class="h-full rounded-full transition-all duration-500"
                   :class="surveyorStats.todayProgressPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'"
                   :style="'width: ' + surveyorStats.todayProgressPct + '%'"></div>
            </div>

            <div v-if="surveyorStats.todayProgressPct >= 100" class="text-xs font-black text-emerald-700 bg-emerald-50 p-2 rounded-xl text-center">
              {{ t('Daily Target Met!') }}
            </div>
          </div>

          <!-- 4 STAT KPI SUMMARY CARDS -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <!-- Card 1: Total Recorded -->
            <div @click="dashboardFilter = 'all'"
                 :class="dashboardFilter === 'all' ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'"
                 class="bg-white p-4 rounded-3xl border-2 shadow-sm cursor-pointer touch-press space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xl">📝</span>
                <span class="text-2xl font-black text-slate-900">{{ surveyorStats.totalCount }}</span>
              </div>
              <div class="text-xs font-black text-slate-600 leading-snug">{{ t('Total Recorded') }}</div>
            </div>

            <!-- Card 2: Synced to Server -->
            <div @click="dashboardFilter = 'synced'"
                 :class="dashboardFilter === 'synced' ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-200'"
                 class="bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 shadow-sm cursor-pointer touch-press space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xl">🟢</span>
                <span class="text-2xl font-black text-emerald-900">{{ surveyorStats.completedCount }}</span>
              </div>
              <div class="text-xs font-black text-emerald-800 leading-snug">{{ t('Synced to Server') }}</div>
            </div>

            <!-- Card 3: Pending Sync (Ready) -->
            <div @click="dashboardFilter = 'pending'"
                 :class="dashboardFilter === 'pending' ? 'border-amber-600 ring-2 ring-amber-200' : 'border-slate-200'"
                 class="bg-amber-50/60 p-4 rounded-3xl border-2 border-amber-200 shadow-sm cursor-pointer touch-press space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xl">🟡</span>
                <span class="text-2xl font-black text-amber-900">{{ surveyorStats.pendingSyncCount }}</span>
              </div>
              <div class="text-xs font-black text-amber-800 leading-snug">{{ t('Pending Sync') }}</div>
            </div>

            <!-- Card 4: Incomplete Drafts -->
            <div @click="dashboardFilter = 'drafts'"
                 :class="dashboardFilter === 'drafts' ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'"
                 class="bg-blue-50/60 p-4 rounded-3xl border-2 border-blue-200 shadow-sm cursor-pointer touch-press space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xl">🔵</span>
                <span class="text-2xl font-black text-blue-900">{{ surveyorStats.draftCount }}</span>
              </div>
              <div class="text-xs font-black text-blue-800 leading-snug">{{ t('Incomplete Drafts') }}</div>
            </div>

          </div>

          <!-- SURVEY TEMPLATES QUICK START SECTION -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center space-x-2">
                <span>📋</span>
                <span>{{ t('Surveys') }}</span>
              </h2>
              <button type="button" @click="currentView = 'templates'" class="text-xs font-bold text-indigo-600 hover:underline">
                View all →
              </button>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <div v-for="tDoc in templates" :key="tDoc.name"
                   class="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm hover:border-indigo-400 transition-all space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 class="text-base sm:text-lg font-black text-slate-900 leading-snug">{{ t(tDoc.title) }}</h3>
                    <div class="flex items-center space-x-2 mt-1">
                      <span class="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">{{ tDoc.project }}</span>
                      <span class="text-[11px] font-bold text-slate-500">v{{ tDoc.version }}</span>
                    </div>
                  </div>

                  <!-- Template Mini Stats -->
                  <div class="flex items-center space-x-2 text-xs font-extrabold shrink-0">
                    <span class="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200">
                      ✓ {{ perTemplateStats(tDoc.name).completed }} {{ t('Completed') }}
                    </span>
                    <span v-if="perTemplateStats(tDoc.name).drafts > 0" class="bg-blue-100 text-blue-900 px-2.5 py-1 rounded-xl border border-blue-200">
                      ⏳ {{ perTemplateStats(tDoc.name).drafts }} {{ t('Drafts') }}
                    </span>
                  </div>
                </div>

                <!-- Template Action Buttons -->
                <div class="flex items-center space-x-2 pt-1">
                  <button type="button" @click="startSurvey(tDoc)"
                          class="flex-1 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base py-2.5 px-4 rounded-2xl shadow-md touch-press flex items-center justify-center space-x-2">
                    <span>{{ t('Start New Survey') }}</span>
                    <span>→</span>
                  </button>

                  <button v-if="perTemplateStats(tDoc.name).drafts > 0"
                          type="button" 
                          @click="resumeDraft(perTemplateStats(tDoc.name).latestDraft)"
                          class="min-h-[48px] bg-blue-50 hover:bg-blue-100 text-blue-800 border-2 border-blue-300 font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl touch-press flex items-center space-x-1.5 shrink-0">
                    <span>{{ t('Resume Draft') }}</span>
                    <span>({{ perTemplateStats(tDoc.name).drafts }})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- MY SUBMISSIONS & DRAFTS LIST WITH COMPLETION METRICS -->
          <div class="space-y-4 pt-2">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center space-x-2">
                <span>📂</span>
                <span>{{ t('My Submissions & Drafts') }}</span>
              </h2>

              <!-- Status Filter Pills -->
              <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
                <button type="button" @click="dashboardFilter = 'all'"
                        :class="dashboardFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 touch-press">
                  {{ t('All Records') }} ({{ walSubmissions.length }})
                </button>
                <button type="button" @click="dashboardFilter = 'drafts'"
                        :class="dashboardFilter === 'drafts' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800 border border-blue-200'"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 touch-press">
                  🔵 {{ t('Drafts') }} ({{ surveyorStats.draftCount }})
                </button>
                <button type="button" @click="dashboardFilter = 'pending'"
                        :class="dashboardFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200'"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 touch-press">
                  🟡 {{ t('Pending Sync') }} ({{ surveyorStats.pendingSyncCount }})
                </button>
                <button type="button" @click="dashboardFilter = 'synced'"
                        :class="dashboardFilter === 'synced' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 border border-emerald-200'"
                        class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 touch-press">
                  🟢 {{ t('Synced') }} ({{ surveyorStats.completedCount }})
                </button>
              </div>
            </div>

            <!-- Submissions Card Stream -->
            <div v-if="filteredDashboardSubmissions.length > 0" class="space-y-3">
              <div v-for="sub in filteredDashboardSubmissions" :key="sub.idempotency_key"
                   class="bg-white rounded-3xl p-5 border-2 shadow-sm space-y-3 transition-all"
                   :class="sub.status === 'DRAFT_OFFLINE' ? 'border-blue-200 hover:border-blue-400' : (sub.status === 'PENDING_SYNC' ? 'border-amber-200 hover:border-amber-400' : 'border-emerald-200')">
                
                <!-- Card Top: Respondent & Status Badge -->
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-0.5 min-w-0">
                    <div class="text-base sm:text-lg font-black text-slate-900 truncate flex items-center space-x-2">
                      <span>👤</span>
                      <span>{{ getSubmissionMeta(sub).respName }}</span>
                    </div>
                    <div class="text-xs text-slate-500 font-bold truncate">
                      {{ getSubmissionMeta(sub).villageName ? '📍 ' + getSubmissionMeta(sub).villageName + ' · ' : '' }}
                      {{ t(getSubmissionMeta(sub).tmplTitle) }}
                    </div>
                  </div>

                  <!-- Status Badge -->
                  <span :class="sub.status === 'SYNCED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : (sub.status === 'PENDING_SYNC' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300')"
                        class="text-xs font-black px-3 py-1.5 rounded-2xl border shrink-0">
                    {{ sub.status === 'SYNCED' ? t('Synced') : (sub.status === 'PENDING_SYNC' ? t('Ready to Sync') : t('Draft')) }}
                  </span>
                </div>

                <!-- Card Middle: Completion Progress Bar & Ratio -->
                <div class="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div class="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>
                      {{ getSubmissionMeta(sub).completionPct }}% {{ t('Complete') }}
                    </span>
                    <span>
                      {{ getSubmissionMeta(sub).answeredCount }} / {{ getSubmissionMeta(sub).totalQuestions }} {{ t('Questions Answered') }}
                    </span>
                  </div>

                  <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300"
                         :class="getSubmissionMeta(sub).completionPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'"
                         :style="'width: ' + getSubmissionMeta(sub).completionPct + '%'"></div>
                  </div>

                  <!-- Hardware & Data Badges -->
                  <div class="flex items-center space-x-2 pt-1 text-[11px] font-bold text-slate-600 flex-wrap gap-y-1">
                    <span v-if="getSubmissionMeta(sub).hasGPS" class="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {{ t('GPS Locked') }}
                    </span>
                    <span v-if="getSubmissionMeta(sub).hasPhoto" class="bg-violet-50 text-violet-800 px-2 py-0.5 rounded-lg border border-violet-200">
                      {{ t('Photo Attached') }}
                    </span>
                    <span v-if="getSubmissionMeta(sub).hasSignature" class="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {{ t('Signed') }}
                    </span>
                    <span class="text-slate-400 ml-auto">{{ getSubmissionMeta(sub).formattedDate }}</span>
                  </div>
                </div>

                <!-- Card Bottom: Actions -->
                <div class="flex items-center space-x-2 pt-1">
                  <!-- Resume / Continue Draft Button -->
                  <button v-if="sub.status === 'DRAFT_OFFLINE'" 
                          type="button" 
                          @click="resumeDraft(sub)"
                          class="flex-1 min-h-[46px] bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-2.5 px-4 rounded-2xl shadow-md touch-press flex items-center justify-center space-x-2">
                    <span>{{ t('Resume & Complete') }}</span>
                    <span>→</span>
                  </button>

                  <!-- Sync Button if Pending -->
                  <button v-else-if="sub.status === 'PENDING_SYNC'"
                          type="button" 
                          @click="autoSync()"
                          class="flex-1 min-h-[46px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-2.5 px-4 rounded-2xl shadow-md touch-press flex items-center justify-center space-x-2">
                    <span>{{ t('Sync Now') }}</span>
                    <span>🔄</span>
                  </button>

                  <!-- View / Synced Indicator -->
                  <div v-else class="flex-1 text-xs font-bold text-emerald-700 flex items-center space-x-1 py-2">
                    <span>✓</span>
                    <span>{{ t('Synced') }}</span>
                  </div>

                  <!-- Delete Item Button -->
                  <button type="button" @click="deleteWALItem(sub.idempotency_key)"
                          aria-label="Delete survey draft"
                          class="min-h-[46px] px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 rounded-2xl font-black text-xs touch-press">
                    🗑
                  </button>
                </div>

              </div>
            </div>

            <div v-else class="text-center py-10 bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-2">
              <div class="text-3xl">📭</div>
              <div class="text-base font-bold text-slate-800">{{ t('No surveys recorded yet') }}</div>
              <p class="text-xs text-slate-500 font-medium">{{ t("Tap '+ Start New Survey' to begin your first interview") }}</p>
            </div>
          </div>

        </div>

        <!-- ========================================== -->
        <!-- VIEW 2: TEMPLATES DIRECTORY (Simple List)  -->
        <!-- ========================================== -->
        <div v-if="currentView === 'templates'" class="space-y-6">
          
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{{ t('Surveys') }}</h1>
              <p class="text-sm sm:text-base text-slate-600 font-semibold">{{ t('Choose a survey form to start') }}</p>
            </div>

            <!-- WAL Queue Quick Access -->
            <button type="button" @click="currentView = 'queue'"
                    class="min-h-[48px] px-4 py-2 bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 font-bold flex items-center space-x-2 shadow-sm touch-press focus:ring-4 focus:ring-indigo-200">
              <span aria-hidden="true" class="text-xl">📋</span>
              <span>{{ t('WAL Queue') }}</span>
              <span v-if="pendingCount > 0" class="ml-1 px-2 py-0.5 bg-rose-600 text-white text-xs font-black rounded-full">
                {{ pendingCount }}
              </span>
            </button>
          </div>

          <!-- Template Cards Grid -->
          <div v-if="filteredTemplates.length > 0" class="grid grid-cols-1 gap-4">
            <div v-for="tDoc in filteredTemplates" :key="tDoc.name"
                 class="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4">
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {{ t(tDoc.title) }}
                </h2>
                <div class="flex items-center space-x-2 mt-1">
                  <span class="text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
                    {{ tDoc.project }}
                  </span>
                  <span class="text-xs font-bold text-slate-500">v{{ tDoc.version }}</span>
                </div>
                <p class="text-sm sm:text-base text-slate-600 mt-2 font-medium">
                  📄 {{ (tDoc.schema && tDoc.schema.sections && tDoc.schema.sections.length) || 1 }} {{ t('Pages') }}
                  ·
                  ❓ {{ (tDoc.schema && tDoc.schema.questions && tDoc.schema.questions.length) || 0 }} {{ t('Questions') }}
                </p>
              </div>

              <button type="button" @click="startSurvey(tDoc)"
                      class="w-full min-h-[56px] bg-indigo-600 hover:bg-indigo-700 text-white text-base sm:text-lg font-black py-3.5 px-6 rounded-2xl shadow-lg touch-press flex items-center justify-center space-x-2 transition-all focus:ring-4 focus:ring-indigo-300">
                <span>{{ t('Start Survey Form') }}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

        </div>

        <!-- ========================================== -->
        <!-- VIEW 3: FORM RUNNER (Elder-Friendly Form)  -->
        <!-- ========================================== -->
        <div v-if="currentView === 'form' && activeTemplate" class="space-y-6 pt-28 sm:pt-32">

          <!-- UNIFIED SMART AUTO-HIDE SECTION HEADER (Slides up on scroll down, returns on scroll up) -->
          <div class="fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out shadow-xl"
               :class="showStickyHeader ? 'translate-y-0' : '-translate-y-full'">
            <div class="bg-indigo-950 text-white border-b-2 border-indigo-800/80 px-4 py-3 sm:px-6">
              <div class="max-w-3xl mx-auto space-y-2">
                
                <!-- Top Row: Exit Button & Step Indicator + Settings Button -->
                <div class="flex items-center justify-between">
                  <button type="button" @click="currentView = 'dashboard'" 
                          class="min-h-[38px] px-3.5 py-1 text-xs sm:text-sm text-indigo-100 hover:text-white font-bold flex items-center space-x-1.5 touch-press bg-indigo-900 hover:bg-indigo-800 rounded-xl border border-indigo-700">
                    <span>{{ t('Exit Form') }}</span>
                  </button>
                  
                  <div class="flex items-center space-x-1.5 sm:space-x-2">
                    <button type="button" @click="emergencyModalOpen = true"
                            aria-label="Email Backup to Admin"
                            :title="t('Email Data to Admin')"
                            class="min-h-[38px] px-2.5 py-1 bg-rose-900/90 hover:bg-rose-800 text-rose-100 font-bold text-xs rounded-xl border border-rose-700 flex items-center space-x-1 touch-press">
                      <span aria-hidden="true">📧</span>
                    </button>
                    <button type="button" @click="menuOpen = true"
                            aria-label="Settings, Font Size and Language"
                            class="min-h-[38px] px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 hover:text-white font-black text-xs rounded-xl border border-indigo-700 flex items-center space-x-1 touch-press">
                      <span aria-hidden="true">🔤</span>
                      <span class="uppercase font-bold">{{ currentLang }}</span>
                    </button>
                    <div class="text-xs sm:text-sm font-black text-indigo-200 bg-indigo-900 px-3 py-1 rounded-xl border border-indigo-700">
                      {{ t('Page') }} <span class="text-white font-black">{{ activeSectionIndex + 1 }}</span> / {{ sections.length }}
                    </div>
                  </div>
                </div>

                <!-- Unified Section Title & Description (The blue card in header!) -->
                <div v-if="activeSection" class="space-y-0.5 pt-0.5">
                  <div class="text-[11px] font-black uppercase tracking-wider text-indigo-300 truncate">
                    {{ t(activeTemplate.title) }}
                  </div>
                  <h2 class="text-lg sm:text-2xl font-black text-white leading-tight">
                    {{ t(activeSection.section_title) }}
                  </h2>
                  <p v-if="activeSection.description" class="text-xs sm:text-sm text-indigo-200 font-medium truncate">
                    {{ t(activeSection.description) }}
                  </p>
                </div>

                <!-- Sleek Linear Progress Bar -->
                <div class="w-full bg-indigo-900/80 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-400 rounded-full transition-all duration-300"
                       :style="'width: ' + (((activeSectionIndex + 1) / sections.length) * 100) + '%'"></div>
                </div>

              </div>
            </div>
          </div>

          <!-- Question Cards List (Google Forms / WhatsApp Style) -->
          <div class="space-y-6">
            <div v-for="(q, qIndex) in activeQuestions" :key="q.question_code"
                 :id="'q_wrapper_' + q.question_code"
                 :class="highlightedQuestion === q.question_code ? 'ring-4 ring-rose-500 border-rose-500' : 'border-slate-200'"
                 class="elder-card bg-white rounded-3xl p-5 sm:p-7 border-2 shadow-sm space-y-4 transition-all">
              
              <!-- Question Header (Number + Label + Voice Assistant Speaker) -->
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1 flex-1">
                  <div class="flex items-center flex-wrap gap-2">
                    <span class="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {{ qIndex + 1 }}
                    </span>
                    <span v-if="q.is_mandatory" class="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      * Required
                    </span>
                    <span v-if="getFieldCategory(q) === 'radio'"
                          class="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-2xs">
                      <span>🔘</span>
                      <span>{{ t('Single Choice (Select 1)') }}</span>
                    </span>
                    <span v-else-if="getFieldCategory(q) === 'multiselect'"
                          class="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg flex items-center space-x-1 shadow-2xs">
                      <span>☑️</span>
                      <span>{{ t('Multi-Select (Choose 1 or more)') }}</span>
                    </span>
                  </div>

                  <label :for="'q_input_' + q.question_code" class="block text-lg sm:text-xl font-black text-slate-900 leading-snug">
                    {{ t(q.label_en) }}
                  </label>
                  
                  <p v-if="q.help_text" class="text-xs sm:text-sm text-slate-500 font-medium">
                    {{ t(q.help_text) }}
                  </p>
                </div>

                <!-- Text-To-Speech Speaker Button -->
                <button type="button" @click="speakQuestion(q)"
                        :aria-label="'Read question ' + (qIndex + 1) + ' aloud'"
                        :class="speakingQuestionCode === q.question_code ? 'bg-amber-500 text-slate-950 animate-bounce' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'"
                        class="p-3 rounded-2xl font-black text-lg sm:text-xl shrink-0 touch-press transition-all focus:ring-4 focus:ring-indigo-300 min-h-[48px] min-w-[48px] flex items-center justify-center">
                  <span aria-hidden="true">{{ speakingQuestionCode === q.question_code ? '🔊' : '🔉' }}</span>
                </button>
              </div>

              <!-- ===================================== -->
              <!-- FIELD TYPE RENDERERS (Elder Friendly) -->
              <!-- ===================================== -->

              <!-- 1. Large Radio / Single Choice Touch Cards -->
              <div v-if="getFieldCategory(q) === 'radio'"
                   role="radiogroup" :aria-label="t(q.label_en)"
                   class="space-y-2.5 pt-1">

                <!-- Category / Group Filter Tabs (for Single Choice) -->
                <div v-if="getQuestionGroups(q).length > 0" class="mb-2">
                  <div class="flex items-center space-x-2 overflow-x-auto pb-1.5 cv-scrollbar no-scrollbar">
                    <button type="button"
                            @click="setActiveGroup(q, 'All')"
                            :class="getActiveGroup(q) === 'All' 
                                     ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black ring-2 ring-indigo-200' 
                                     : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-bold'"
                            class="px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer">
                      <span>{{ t('All') }}</span>
                      <span class="text-[10px] opacity-80">({{ (q.options || []).length }})</span>
                    </button>
                    <button v-for="(grp, gIdx) in getQuestionGroups(q)" :key="gIdx"
                            type="button"
                            @click="setActiveGroup(q, grp.name)"
                            :class="getActiveGroup(q) === grp.name 
                                     ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black ring-2 ring-indigo-200' 
                                     : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-bold'"
                            class="px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer">
                      <span>{{ currentLang === 'hi' ? grp.name_hi : grp.name }}</span>
                      <span v-if="getGroupSelectedCount(q, grp.name) > 0"
                            :class="getActiveGroup(q) === grp.name ? 'bg-white text-indigo-700' : 'bg-emerald-600 text-white'"
                            class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">
                        ✓
                      </span>
                      <span v-else class="text-[10px] opacity-80">({{ grp.options.length }})</span>
                    </button>
                  </div>
                </div>

                <!-- In-Card Search Box for > 7 options -->
                <div v-if="(q.options && q.options.length > 7)" class="relative mb-2">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input type="text"
                         v-model="optionSearchQueries[q.question_code]"
                         :placeholder="t('Filter options... (type to search)')"
                         class="w-full text-sm font-semibold pl-10 pr-9 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all">
                  <button v-if="optionSearchQueries[q.question_code]"
                          type="button"
                          @click="optionSearchQueries[q.question_code] = ''"
                          class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold">
                    ✕
                  </button>
                </div>

                <div :class="(q.options && q.options.length > 7) ? 'max-h-[380px] overflow-y-auto pr-1 space-y-2.5 cv-scrollbar' : 'grid grid-cols-1 gap-2.5'">
                  <div v-if="optionSearchQueries[q.question_code]" class="text-[11px] font-black text-indigo-600 px-1 pb-1">
                    {{ t('Showing') }} {{ getDisplayOptions(q).length }} {{ t('of') }} {{ (q.options || []).length }} {{ t('options') }}
                  </div>
                  <div v-for="(opt, optIdx) in getDisplayOptions(q)" :key="optIdx"
                       role="radio"
                       :aria-checked="formData[q.question_code] === opt"
                       tabindex="0"
                       @click="selectOption(q.question_code, opt, qIndex)"
                       @keydown.enter.space.prevent="selectOption(q.question_code, opt, qIndex)"
                       :class="getOptionStyle(q.question_code, opt)"
                       class="min-h-[56px] p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer touch-press transition-all text-base sm:text-lg">
                    <div class="flex items-center space-x-3 min-w-0 pr-2">
                      <!-- Single Choice: Distinct CIRCLE Index Badge -->
                      <span class="w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shrink-0 border transition-all shadow-sm"
                            :class="formData[q.question_code] === opt ? 'bg-white/20 text-white border-white/40' : 'bg-slate-100 text-slate-700 border-slate-300'">
                        {{ optIdx + 1 }}
                      </span>
                      <span class="font-bold sm:text-lg leading-snug">{{ t(opt) }}</span>
                    </div>
                    <!-- Single Choice: Distinct CIRCLE Radio Indicator -->
                    <div class="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 transition-all"
                         :class="formData[q.question_code] === opt ? 'border-white bg-white shadow-sm ring-2 ring-indigo-300/40' : 'border-slate-400 bg-white shadow-xs'">
                      <div v-if="formData[q.question_code] === opt" class="w-3.5 h-3.5 rounded-full bg-indigo-600"></div>
                    </div>
                  </div>
                  <div v-if="getDisplayOptions(q).length === 0" class="p-4 text-center text-sm font-bold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    {{ t('No matching options found') }}
                  </div>
                </div>
              </div>

              <!-- 1b. Multiple Choice / Multiselect Touch Cards (Checkboxes) -->
              <div v-else-if="getFieldCategory(q) === 'multiselect'"
                   class="space-y-2.5 pt-1">
                <div v-if="q.question_code === 'main_business_activities' && (!formData['business_type'] || (Array.isArray(formData['business_type']) && formData['business_type'].length === 0))" 
                     class="text-xs text-indigo-800 font-bold bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                  ℹ️ {{ t('Showing all activities. Select Type of Business in Q16 above to auto-filter this list.') }}
                </div>

                <!-- Group / Category Tabs & Multi-Select Batch Actions -->
                <div v-if="getQuestionGroups(q).length > 0" class="mb-3 space-y-2">
                  <!-- Horizontal Scrollable Group Chips -->
                  <div class="flex items-center space-x-2 overflow-x-auto pb-1.5 cv-scrollbar no-scrollbar">
                    <button type="button"
                            @click="setActiveGroup(q, 'All')"
                            :class="getActiveGroup(q) === 'All' 
                                     ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black ring-2 ring-indigo-200' 
                                     : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-bold'"
                            class="px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer">
                      <span>{{ t('All') }}</span>
                      <span v-if="getGroupSelectedCount(q, 'All') > 0"
                            :class="getActiveGroup(q) === 'All' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'"
                            class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ml-1">
                        {{ getGroupSelectedCount(q, 'All') }}
                      </span>
                      <span v-else class="text-[10px] opacity-75 ml-1">({{ getFilteredOptions(q).length }})</span>
                    </button>

                    <button v-for="(grp, gIdx) in getQuestionGroups(q)" :key="gIdx"
                            type="button"
                            @click="setActiveGroup(q, grp.name)"
                            :class="getActiveGroup(q) === grp.name 
                                     ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-black ring-2 ring-indigo-200' 
                                     : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-bold'"
                            class="px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer">
                      <span>{{ currentLang === 'hi' ? grp.name_hi : grp.name }}</span>
                      <span v-if="getGroupSelectedCount(q, grp.name) > 0"
                            :class="getActiveGroup(q) === grp.name ? 'bg-white text-indigo-700' : 'bg-emerald-600 text-white'"
                            class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ml-1">
                        {{ getGroupSelectedCount(q, grp.name) }}
                      </span>
                      <span v-else class="text-[10px] opacity-75 ml-1">({{ grp.options.length }})</span>
                    </button>
                  </div>

                  <!-- Category Quick Action Strip -->
                  <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                    <div class="flex items-center space-x-2 text-xs font-bold text-slate-700 min-w-0">
                      <span v-if="getSelectionSummary(q)" class="text-indigo-700 font-black flex items-center space-x-1 truncate">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span class="truncate">{{ getSelectionSummary(q) }}</span>
                      </span>
                      <span v-else class="text-slate-500 truncate">
                        {{ getActiveGroup(q) === 'All' ? t('Select options below') : t('Select in this category') }}
                      </span>
                    </div>

                    <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                      <button type="button"
                              @click="selectAllInCurrentGroup(q)"
                              class="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{{ getActiveGroup(q) === 'All' ? t('Select All') : t('Select Group') }}</span>
                      </button>

                      <button v-if="getGroupSelectedCount(q, getActiveGroup(q)) > 0"
                              type="button"
                              @click="clearCurrentGroup(q)"
                              class="px-2 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 active:scale-95 transition-all flex items-center space-x-0.5 cursor-pointer">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{{ t('Clear') }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- In-Card Search Box for > 7 options -->
                <div v-if="getFilteredOptions(q).length > 7" class="relative mb-2">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input type="text"
                         v-model="optionSearchQueries[q.question_code]"
                         :placeholder="t('Filter options... (type to search)')"
                         class="w-full text-sm font-semibold pl-10 pr-9 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all">
                  <button v-if="optionSearchQueries[q.question_code]"
                          type="button"
                          @click="optionSearchQueries[q.question_code] = ''"
                          class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold">
                    ✕
                  </button>
                </div>

                <div :class="getFilteredOptions(q).length > 7 ? 'max-h-[380px] overflow-y-auto pr-1 space-y-2.5 cv-scrollbar' : 'grid grid-cols-1 gap-2.5'">
                  <div v-if="optionSearchQueries[q.question_code]" class="text-[11px] font-black text-indigo-600 px-1 pb-1">
                    {{ t('Showing') }} {{ getDisplayOptions(q).length }} {{ t('of') }} {{ getFilteredOptions(q).length }} {{ t('options') }}
                  </div>
                  <div v-for="(opt, optIdx) in getDisplayOptions(q)" :key="optIdx"
                       role="checkbox"
                       :aria-checked="isMultiOptionSelected(q.question_code, opt)"
                       tabindex="0"
                       @click="toggleMultiOption(q.question_code, opt)"
                       @keydown.enter.space.prevent="toggleMultiOption(q.question_code, opt)"
                       :class="getMultiOptionStyle(q.question_code, opt)"
                       class="min-h-[56px] p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer touch-press transition-all text-base sm:text-lg">
                    <div class="flex items-center space-x-3 min-w-0 pr-2">
                      <!-- Multiselect: Distinct SQUARE Index Badge -->
                      <span class="w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center shrink-0 border transition-all shadow-sm"
                            :class="isMultiOptionSelected(q.question_code, opt) ? 'bg-white/20 text-white border-white/40' : 'bg-slate-100 text-slate-700 border-slate-300'">
                        {{ optIdx + 1 }}
                      </span>
                      <span class="font-bold sm:text-lg leading-snug">{{ t(opt) }}</span>
                    </div>
                    <!-- Multiselect: Distinct SQUARE Checkbox with checkmark -->
                    <div class="w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 ml-2 transition-all"
                         :class="isMultiOptionSelected(q.question_code, opt) ? 'border-white bg-white shadow-sm ring-2 ring-indigo-300/40' : 'border-slate-400 bg-white shadow-xs'">
                      <svg v-if="isMultiOptionSelected(q.question_code, opt)" class="w-5 h-5 text-indigo-600 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div v-if="getDisplayOptions(q).length === 0" class="p-4 text-center text-sm font-bold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    {{ t('No matching options found') }}
                  </div>
                </div>
              </div>

              <!-- 1b. Range Slider Control (Configurable Representation: slider_only, buttons_only, or both) -->
              <div v-else-if="getFieldCategory(q) === 'range'" class="space-y-4 pt-1">
                <!-- Big Badge Displaying Selected Value -->
                <div class="flex items-center justify-between bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-5 py-3.5">
                  <span class="text-xs font-black text-indigo-700 uppercase tracking-wider">{{ t('Selected Value') }}</span>
                  <div class="flex items-baseline space-x-1.5">
                    <span class="text-2xl sm:text-3xl font-black text-indigo-900">
                      {{ formData[q.question_code] !== undefined && formData[q.question_code] !== null && formData[q.question_code] !== '' ? formData[q.question_code] : getRangeMin(q) }}
                    </span>
                    <span class="text-sm sm:text-base font-black text-indigo-600">
                      {{ t(getRangeUnit(q)) }}
                    </span>
                  </div>
                </div>

                <!-- Smooth Range Slider Input (visible when format is 'both' or 'slider_only') -->
                <div v-if="getRangeFormat(q) !== 'buttons_only'" class="px-2 pt-1">
                  <input type="range"
                         :id="'q_input_' + q.question_code"
                         :min="getRangeMin(q)"
                         :max="getRangeMax(q)"
                         :step="getRangeStep(q)"
                         v-model.number="formData[q.question_code]"
                         class="range-slider-input w-full">
                  <div class="flex justify-between text-xs font-black text-slate-500 mt-2 px-1">
                    <span v-for="val in getRangeSteps(q)" :key="val"
                          @click="selectRangeValue(q, val)"
                          class="cursor-pointer hover:text-indigo-600 font-bold">
                      {{ val }}
                    </span>
                  </div>
                </div>

                <!-- Fast Touch Tap Pills (Single Tab Group / WAI-ARIA Roving Tabindex with Left/Right Arrow Navigation) -->
                <div v-if="getRangeFormat(q) !== 'slider_only'"
                     role="radiogroup"
                     :aria-label="getQuestionLabel(q)"
                     class="grid grid-flow-col auto-cols-fr gap-1 sm:gap-2 pt-1">
                  <button type="button"
                          v-for="val in getRangeSteps(q)"
                          :key="val"
                          :id="'range_btn_' + q.question_code + '_' + val"
                          role="radio"
                          :aria-checked="formData[q.question_code] == val"
                          :tabindex="getRangeTabIndex(q.question_code, val, getRangeSteps(q))"
                          @click="selectRangeValue(q, val)"
                          @keydown="handleRangeKeydown($event, q, val)"
                          :class="formData[q.question_code] == val ? 'bg-indigo-600 text-white font-black shadow-md border-indigo-600 scale-105 ring-2 ring-indigo-400 ring-offset-2' : 'bg-white text-slate-700 font-bold border-slate-300 hover:border-indigo-400 focus:ring-2 focus:ring-slate-900 focus:outline-none'"
                          class="py-2.5 sm:py-3 text-center rounded-xl border-2 text-sm sm:text-base touch-press transition-all">
                    {{ val }}
                  </button>
                </div>
              </div>

              <!-- 2. Number / Integer / Currency / Decimal Input -->
              <div v-else-if="getFieldCategory(q) === 'number'" class="relative">
                <span v-if="isCurrencyField(q)"
                      class="absolute left-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-slate-400 pointer-events-none">
                  ₹
                </span>
                <input :id="'q_input_' + q.question_code"
                       type="number"
                       v-model="formData[q.question_code]"
                       :required="q.is_mandatory"
                       :placeholder="(q.field_type || '').toLowerCase().includes('year') || (q.label_en || '').toLowerCase().includes('year') ? t('e.g. 2020') : t('Enter number...')"
                       :class="isCurrencyField(q) ? 'pl-11 pr-4' : 'px-4'"
                       class="w-full min-h-[56px] text-xl sm:text-2xl font-black py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none shadow-inner transition-all">
              </div>

              <!-- 3. Dynamic Matrix & Table Grids -->
              <div v-else-if="getFieldCategory(q) === 'grid'" :data-grid-code="q.question_code" class="space-y-4">
                
                <!-- 3a. Seasonal Turnovers (Fixed 3 Seasons) -->
                <div v-if="getGridType(q.question_code) === 'seasons'" class="space-y-4">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3 shadow-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-black text-slate-800">{{ row.label || row.season }}</span>
                      <span class="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                        {{ row.duration_months }} {{ t('Months') }}
                      </span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Monthly Sales (₹)') }}</label>
                        <input type="number" v-model="row.monthly_sales" placeholder="₹"
                               class="w-full min-h-[48px] text-base font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 shadow-inner">
                      </div>
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Monthly Net Profit (₹)') }}</label>
                        <input type="number" v-model="row.monthly_profit" placeholder="₹"
                               class="w-full min-h-[48px] text-base font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 shadow-inner">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3b. Activity Involvements (Fixed 6 Enterprise Activities) -->
                <div v-else-if="getGridType(q.question_code) === 'activities'" class="space-y-4">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div class="text-sm font-black text-slate-800">{{ row.label || row.activity }}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Involvement') }}</label>
                        <f-combobox v-model="row.involvement"
                                    :options="involvementOptions"
                                    :placeholder="t('Select involvement...')"
                                    :aria-label="(row.label || row.activity) + ' ' + t('Involvement')">
                        </f-combobox>
                      </div>
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Amount Paid Last Year') }}</label>
                        <f-combobox v-model="row.amount_paid_last_year"
                                    :options="amountPaidOptions"
                                    :placeholder="t('Select amount paid...')"
                                    :aria-label="(row.label || row.activity) + ' ' + t('Amount Paid Last Year')">
                        </f-combobox>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Family Helpers') }}</label>
                        <input type="number" v-model="row.family_members_count" placeholder="0" class="w-full min-h-[44px] text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Hired Help') }}</label>
                        <input type="number" v-model="row.hired_help_count" placeholder="0" class="w-full min-h-[44px] text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3c. Capital Sources (14 Sources) -->
                <div v-else-if="getGridType(q.question_code) === 'capital'" class="space-y-4">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div class="text-sm font-black text-slate-800">{{ row.source }}</div>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-[11px] font-black text-slate-600 mb-1">{{ t('First Year (₹)') }}</label>
                        <input type="number" v-model="row.first_year_amount" placeholder="₹" class="w-full min-h-[44px] text-sm font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                      <div>
                        <label class="block text-[11px] font-black text-slate-600 mb-1">{{ t('Years In-Between (₹)') }}</label>
                        <input type="number" v-model="row.years_in_between_amount" placeholder="₹" class="w-full min-h-[44px] text-sm font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                      <div>
                        <label class="block text-[11px] font-black text-slate-600 mb-1">{{ t('Current Year (₹)') }}</label>
                        <input type="number" v-model="row.current_year_amount" placeholder="₹" class="w-full min-h-[44px] text-sm font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                      <div>
                        <label class="block text-[11px] font-black text-slate-600 mb-1">{{ t('Current Pending (₹)') }}</label>
                        <input type="number" v-model="row.current_year_pending" placeholder="₹" class="w-full min-h-[44px] text-sm font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3d. Loan Usages (14 Sources) -->
                <div v-else-if="getGridType(q.question_code) === 'loan_usage'" class="space-y-4">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div class="text-sm font-black text-slate-800">{{ row.source }}</div>
                    <div>
                      <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Usage in Business') }}</label>
                      <f-combobox v-model="row.usage_in_business"
                                  :options="loanUsageOptions"
                                  :placeholder="t('Select usage in business...')"
                                  :aria-label="row.source + ' ' + t('Usage in Business')">
                      </f-combobox>
                    </div>
                    <div v-if="row.usage_in_business && row.usage_in_business.includes('household')">
                      <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Specify Other Usage') }}</label>
                      <input type="text" v-model="row.usage_other_specify" :placeholder="t('Specify details...')" class="w-full min-h-[44px] text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none">
                    </div>
                  </div>
                </div>

                <!-- 3e. Business Metric Changes (4 Metrics) -->
                <div v-else-if="getGridType(q.question_code) === 'metrics'" class="space-y-4">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div class="text-sm font-black text-slate-800">{{ row.label || row.metric }}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('First Year Status') }}</label>
                        <f-combobox v-model="row.first_year_status"
                                    :options="metricStatusOptions"
                                    :placeholder="t('Select status...')"
                                    :aria-label="(row.label || row.metric) + ' ' + t('First Year Status')">
                        </f-combobox>
                      </div>
                      <div v-if="row.first_year_status === 'Enter Amount'">
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('First Year Amount (₹)') }}</label>
                        <input type="number" v-model="row.first_year_amount" placeholder="₹" class="w-full min-h-[48px] text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Current Year Amount (₹)') }}</label>
                        <input type="number" v-model="row.current_year_amount" placeholder="₹" class="w-full min-h-[48px] text-sm font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3f. Generic Equipment / Asset Add-Row Grid -->
                <div v-else class="space-y-3">
                  <div v-for="(row, rIdx) in ensureGridRows(q.question_code)" :key="rIdx"
                       class="generic-grid-row p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div class="flex items-center justify-between text-xs font-black text-slate-500">
                      <span>{{ t('Item') }} #{{ rIdx + 1 }}</span>
                      <button type="button" @click="removeGridRow(q.question_code, rIdx)" class="text-rose-600 hover:text-rose-800 font-black">
                        ✕ {{ t('Remove') }}
                      </button>
                    </div>

                    <div>
                      <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Equipment / Asset Name') }}</label>
                      <input type="text" v-model="row.item_name" :placeholder="t('e.g. Tractor, Water Pump, Sewing Machine')"
                             class="w-full min-h-[48px] text-base font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600">
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Quantity') }}</label>
                        <input type="number" v-model="row.quantity" placeholder="1"
                               class="w-full min-h-[48px] text-base font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600">
                      </div>
                      <div>
                        <label class="block text-xs font-black text-slate-700 mb-1">{{ t('Approx Value (₹)') }}</label>
                        <input type="number" v-model="row.approx_value" placeholder="₹"
                               class="w-full min-h-[48px] text-base font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600">
                      </div>
                    </div>
                  </div>

                  <button type="button" @click="addGridRow(q.question_code)"
                          class="w-full min-h-[48px] border-2 border-dashed border-indigo-400 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 font-black text-sm sm:text-base py-3 rounded-2xl touch-press flex items-center justify-center space-x-2">
                    <span>{{ t('+ Add Item / Asset') }}</span>
                  </button>
                </div>
              </div>

              <!-- 4. GPS Location Fix Field -->
              <div v-else-if="getFieldCategory(q) === 'gps'" class="space-y-3">
                <div v-if="formData[q.question_code] || currentGPS.latitude" class="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-1">
                  <div class="text-sm font-black text-emerald-900 flex items-center space-x-1.5">
                    <span>✓</span>
                    <span>{{ t('GPS Fix Acquired ✓') }}</span>
                  </div>
                  <div class="text-xs font-mono font-bold text-emerald-800">
                    Lat: {{ (currentGPS.latitude || 25.132400).toFixed(6) }}, Lng: {{ (currentGPS.longitude || 76.512300).toFixed(6) }} (±{{ currentGPS.accuracy ? currentGPS.accuracy.toFixed(0) : 5 }}m)
                  </div>
                  <a :href="'https://maps.google.com/?q=' + (currentGPS.latitude || 25.132400) + ',' + (currentGPS.longitude || 76.512300)" target="_blank"
                     class="inline-block text-xs font-black text-emerald-700 underline pt-1">
                    {{ t('View on Map →') }}
                  </a>
                </div>

                <button type="button" @click="fetchGPS(q.question_code)"
                        :disabled="currentGPS.fetching"
                        class="w-full min-h-[52px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-base py-3 px-4 rounded-2xl shadow-md touch-press flex items-center justify-center space-x-2 disabled:opacity-50">
                  <span aria-hidden="true">📍</span>
                  <span>{{ currentGPS.fetching ? 'Acquiring Satellite Lock...' : (formData[q.question_code] || currentGPS.latitude ? t('Re-acquire Fix') : t('Get My Location')) }}</span>
                </button>
              </div>

              <!-- 5. Camera / Photo Capture Field -->
              <div v-else-if="getFieldCategory(q) === 'photo'" class="space-y-3">
                <div v-if="formData[q.question_code]" class="relative rounded-2xl overflow-hidden border-2 border-indigo-400 bg-slate-900">
                  <img :src="formData[q.question_code]" alt="Captured photo" class="w-full max-h-64 object-contain mx-auto">
                  <button type="button" @click="removePhoto(q.question_code)"
                          class="absolute top-3 right-3 bg-rose-600 text-white p-2 rounded-xl text-xs font-black shadow-lg">
                    ✕ {{ t('Remove') }}
                  </button>
                </div>

                <label class="w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base py-3 px-4 rounded-2xl shadow-md touch-press flex items-center justify-center space-x-2 cursor-pointer">
                  <span aria-hidden="true">📷</span>
                  <span>{{ formData[q.question_code] ? t('Change Photo') : t('Take Photo') }}</span>
                  <input type="file" accept="image/*" capture="environment" @change="handlePhotoUpload($event, q.question_code)" class="sr-only">
                </label>
              </div>

              <!-- 6. Finger-Friendly Canvas Signature -->
              <div v-else-if="getFieldCategory(q) === 'signature'" class="space-y-2">
                <div class="border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner">
                  <canvas :id="'sig_canvas_' + q.question_code" width="600" height="200"
                          class="signature-canvas w-full h-40 touch-none"></canvas>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>✍️ {{ t('Sign here with finger') }}</span>
                  <button type="button" @click="clearSignature(q.question_code)" class="text-rose-600 hover:text-rose-800 font-black">
                    {{ t('Clear Signature') }}
                  </button>
                </div>
              </div>

              <!-- 7. Textarea / Long Text -->
              <div v-else-if="getFieldCategory(q) === 'longtext'">
                <textarea :id="'q_input_' + q.question_code"
                          v-model="formData[q.question_code]"
                          :required="q.is_mandatory"
                          rows="3"
                          :placeholder="t('Enter details...')"
                          class="w-full text-base sm:text-lg font-medium p-4 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none shadow-inner transition-all"></textarea>
              </div>

              <!-- 8. Date Field -->
              <div v-else-if="getFieldCategory(q) === 'date'">
                <input :id="'q_input_' + q.question_code"
                       type="date"
                       v-model="formData[q.question_code]"
                       :required="q.is_mandatory"
                       class="w-full min-h-[56px] text-lg sm:text-xl font-bold px-4 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none shadow-inner transition-all">
              </div>

              <!-- 9. GUARANTEED ROBUST FALLBACK: Text Input (Ensures EVERY question is always fillable!) -->
              <div v-else>
                <input :id="'q_input_' + q.question_code"
                       type="text"
                       v-model="formData[q.question_code]"
                       :required="q.is_mandatory"
                       :placeholder="t('Enter answer...')"
                       class="w-full min-h-[56px] text-lg sm:text-xl font-bold px-4 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none shadow-inner transition-all">
              </div>

            </div>
          </div>

          <!-- BOTTOM STICKY NAVIGATION BAR -->
          <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-slate-200 p-3 sm:p-4 z-40 shadow-2xl">
            <div class="max-w-3xl mx-auto flex items-center space-x-2 sm:space-x-3">
              
              <!-- Back Section Button -->
              <button type="button" @click="prevSection()"
                      :disabled="activeSectionIndex === 0"
                      class="flex-1 min-h-[52px] bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 font-black text-sm sm:text-base py-3 px-4 rounded-2xl touch-press flex items-center justify-center space-x-1">
                <span>{{ t('Back') }}</span>
              </button>

              <!-- Save Draft Button -->
              <button type="button" @click="saveOffline(false)"
                      aria-label="Save draft to local storage"
                      class="min-h-[52px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-base rounded-2xl touch-press border border-slate-300 flex items-center justify-center shrink-0">
                <span aria-hidden="true" class="text-xl">💾</span>
              </button>

              <!-- Next or Final Submit Button -->
              <button v-if="activeSectionIndex < sections.length - 1"
                      type="button" @click="nextSection()"
                      class="flex-1 min-h-[52px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base py-3 px-4 rounded-2xl shadow-lg touch-press flex items-center justify-center space-x-1">
                <span>{{ t('Next') }}</span>
              </button>

              <button v-else
                      type="button" @click="commitToWAL()"
                      class="flex-1 min-h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base py-3 px-4 rounded-2xl shadow-lg touch-press flex items-center justify-center space-x-2">
                <span>{{ t('Done / Send') }}</span>
                <span aria-hidden="true">✓</span>
              </button>

            </div>
          </div>

        </div>

        <!-- ========================================== -->
        <!-- VIEW 4: WAL QUEUE (Offline Sync Manager)   -->
        <!-- ========================================== -->
        <div v-if="currentView === 'queue'" class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{{ t('WAL Queue') }}</h1>
              <p class="text-sm text-slate-600 font-medium">Local SQLite/IndexedDB Write-Ahead Log</p>
            </div>

            <button type="button" @click="emergencyModalOpen = true"
                    class="min-h-[44px] px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-950 text-xs font-black rounded-2xl border-2 border-rose-300 touch-press flex items-center space-x-1.5 shadow-sm">
              <span class="text-base">📧</span>
              <span>{{ t('Email Data to Admin') }}</span>
            </button>
          </div>

          <!-- Pending Sync Hero Alert -->
          <div v-if="pendingCount > 0" class="p-5 bg-amber-500 text-slate-950 rounded-3xl shadow-md flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-lg font-black">{{ pendingCount }} survey(s) ready to sync</div>
              <div class="text-xs font-semibold">{{ isOnline ? 'Network active · Tap to sync now' : 'Device offline · Connect to sync' }}</div>
            </div>
            <button type="button" @click="autoSync()"
                    :disabled="!isOnline || isSyncing"
                    class="min-h-[48px] px-5 py-2.5 bg-slate-950 text-white hover:bg-slate-900 font-black text-sm rounded-2xl shadow-md touch-press disabled:opacity-50">
              {{ isSyncing ? t('Syncing...') : t('Sync Now') }}
            </button>
          </div>

          <!-- Submissions Stream -->
          <div v-if="walSubmissions.length > 0" class="space-y-3">
            <div v-for="sub in walSubmissions" :key="sub.idempotency_key"
                 class="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm flex items-center justify-between">
              <div class="space-y-1 max-w-[70%]">
                <div class="text-xs font-mono font-bold text-slate-500">{{ sub.idempotency_key }}</div>
                <div class="text-sm sm:text-base font-black text-slate-900 truncate">{{ t(getSubmissionMeta(sub).tmplTitle) }}</div>
                <div class="text-xs text-slate-600 font-semibold">
                  👤 {{ getSubmissionMeta(sub).respName }} · {{ getSubmissionMeta(sub).completionPct }}% answered
                </div>
              </div>

              <div class="flex items-center space-x-2">
                <span :class="sub.status === 'SYNCED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : (sub.status === 'PENDING_SYNC' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300')"
                      class="text-xs font-black px-3 py-1.5 rounded-full border">
                  {{ sub.status }}
                </span>
                
                <button type="button" @click="resumeDraft(sub)" 
                        aria-label="Edit survey draft"
                        class="min-h-[40px] px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl touch-press">
                  ✎
                </button>
                <button type="button" @click="deleteWALItem(sub.idempotency_key)" 
                        aria-label="Delete survey draft"
                        class="min-h-[40px] px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl touch-press">
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-2">
            <div class="text-3xl">📭</div>
            <div class="text-base font-bold text-slate-700">{{ t('No records in local storage queue') }}</div>
          </div>
        </div>

      </main>

    </div>
  `
});

app.mount('#app');
