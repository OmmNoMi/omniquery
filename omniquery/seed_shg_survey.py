import frappe
import json

MULTI_SELECT_OPTIONS = {
    'business_type': [
        'Trading', 'Servicing', 'Manufacturing/production'
    ],
    'main_business_activities': [
        'Trading: Vegetable/Fruit', 'Trading: Grocery', 'Trading: Fancy/Cosmetic/General store',
        'Trading: Apparel/fabric', 'Trading: Electric goods', 'Trading: Stone shop',
        'Trading: Agri-input retail', 'Trading: AI/breeding kits', 'Trading: Goat trading',
        'Service: Flour mill', 'Service: Tailoring', 'Service: Beauty parlour',
        'Service: Auto-mechanic/two-wheeler repair', 'Service: E-mitra', 'Service: Transport',
        'Service: Tent house', 'Service: Mobile repair shop', 'Service: Stone cutting',
        'Production: Sanitary napkin making', 'Production: Handicraft', 'Production: Dairy shop/Milk collection',
        'Production: Juice', 'Production: Food processing (pickle/badi/papad)', 'Production: Food making (sweets/namkeen/hotel)',
        'Production: Sweet box making', 'Production: Flag making', 'Production: Leather products', 'Production: Stone idols', 'Any other'
    ],
    'registrations_documents': [
        'PAN card', 'Aadhar card', 'Udyam Aadhar', 'Shop and Establishment registration',
        'FSSAI', 'Caste certificate', 'Income certificate'
    ],
    'family_income_sources': [
        'Agricultural income', 'Fixed Salary', 'Wages', 'Self employed', 'NTFP sale',
        'Dairying', 'Sale of animals', 'Animal products', 'Family/husband’s enterprise',
        'Respondent’s enterprise', 'MNREGA', 'Pension', 'Rent from properties', 'Any other, specify'
    ],
    'reasons_for_starting': [
        'My family faced a financial setback, and I needed to earn',
        'Our expenses were rising, and my family needed an alternate source of income',
        'I always wanted to own/run my own business',
        'I learnt the skill and wanted to start my own venture',
        'I was doing the same work as wage labour and later decided to start own venture',
        'All SHG members were getting loans for enterprise so I also decided to take and start enterprise',
        'The OSF/SVEP CRP encouraged me to start the enterprise',
        'The CLF encouraged me to start the enterprise',
        'Any other (Specify)'
    ],
    'marketing_methods': [
        'My shop is the only place where I talk about my products/services',
        'I have name board outside my premises with details of my products/services',
        'I visit local traders/shopkeepers with my samples',
        'I talk about my products/services in SHG meetings',
        'I visit local traders/shopkeepers with samples of my products',
        'I market actively on instagram and whatsapp',
        'I wait for people to make enquiries',
        'I do not know how to market my products/services',
        'I don\'t feel the need to market my products/services',
        'Any other, specify'
    ],
    'selling_channels': [
        'Not relevant',
        'In case of production related business, I produce slightly more than last year sales and wait for orders',
        'I visit local traders/shopkeepers with my products and do door to door selling',
        'I take orders from my usual clients few weeks prior to production/peak season and then sell',
        'I sell in local haat/weekly market',
        'I sell in Saras fair',
        'I get orders via instagram',
        'I get orders via whatsapp',
        'I use online platforms like Amazon',
        'I use online platform like Meesho',
        'I use any other online platform',
        'I use RAJEEVIKA website',
        'Any other, specify'
    ],
    'shg_assistance_types': [
        'Attended the skill training offered by SHG',
        'Got information about the scope of business from SHG meetings',
        'Got required registration/documents made',
        'Got subsidy/grant due to SHG',
        'Took loan from SHG to buy material to initiate the business',
        'Take loans from SHG regularly as per business requirements',
        'OSF/SVEP CRP guided me in setting up the business',
        'OSF/SVEP CRP helped me to get Mudra loan',
        'OSF/SVEP CRP helped me to get bank loan'
    ],
    'funding_experience': [
        'SHG loan is sufficient for the current scale of my business',
        'I regularly plough in my business earnings',
        'SHG loan size is smaller than my requirement',
        'I get the required loan easily from the moneylender/NBFIs',
        'My family members help me with funds and loans',
        'I don\'t prefer money lender or NBFIs as the interest rate is high',
        'I don\'t prefer money lender or NBFIs as the repayment time is shorter for my convenience'
    ],
    'financial_help_impacts': [
        'I don\'t need to ask money from my husband/family for my needs',
        'The income from enterprise is the biggest source of income for my family',
        'The income from enterprise is used in covering education related expenses for my children',
        'I have been able to pay the family debts',
        'I have contributed money in acquiring assets for my family',
        'I have contributed money for marriage expenses',
        'Any other (Please specify)'
    ],
    'husband_response': [
        'I need help from my family in running my enterprise more effectively',
        'My husband was not supportive initially, but now helps when required',
        'My husband supports/supported me financially',
        'I have full support of my husband/family and helped me in every possible way',
        'I am running my enterprise without anyone\'s support'
    ],
    'current_challenges': [
        'OSF is phased out now which has affected fund sufficiency',
        'I need timely access to funds to buy inputs before the production/peak season begins',
        'I need support to access bigger market to source material/inputs at lower cost',
        'I need help in selling my inventory',
        'I need help in learning use of social media',
        'Any other, specify'
    ],
    'competitor_advantages': [
        'I operate from a better location',
        'I operate from a shop while they operate from home',
        'I offer a wide variety of products/services',
        'I offer discounts and still able to make profit',
        'I offer better quality of products/services',
        'I sell my products/services on credit',
        'I take less time to supply products/deliver services',
        'I use social media to market my products/services',
        'Any other, specify',
        'I don\'t have any advantage'
    ],
    'holding_back_reasons': [
        'Lack of capital/funds',
        'Lack of family support/time due to household responsibilities',
        'Lack of market access/demand beyond current customer base',
        'Lack of skills/training needed for the next step',
        'Health or personal constraints',
        'Nothing is holding me back, I am already working towards it',
        'Any other, specify'
    ],
    'crp_contributions': [
        'Accessing subsidy',
        'Getting necessary documents (Aadhar, PAN, Income, Caste, Udyam, FSSAI, Shop reg)',
        'They helped us to understand business plans',
        'They gave us new ideas to improve our profit',
        'They trained us on maintaining records which we didn\'t know earlier',
        'They helped in accessing loans from bank',
        'They helped in our communication skills',
        'They helped in marketing',
        'They helped in learning use of instagram',
        'They helped us to understand our competitors and suggested ways to beat competition'
    ],
    'scheme_expectations': [
        'Need bigger loan amount',
        'Need help in accessing Mudra loan',
        'Need more guidance of SBDP/SVEP CRPs',
        'Need help to access bigger markets',
        'Need help with online purchase',
        'Need help with instagram',
        'Need my business specific trainings',
        'Any other, Specify'
    ],
    'social_media_platforms': [
        'Whatsapp', 'Instagram', 'Pinterest', 'Facebook', 'Snapchat', 'Don’t use social media'
    ],
    'reasons_for_scaling_down_closing': [
        'Sales reduced over the years as there was no one guiding us',
        'Needed more capital to source material but there was no source of loan',
        'Banks refused to give us loan',
        'Unable to reach new customers',
        'New competitors in the market offering discounts',
        'Any other, specify',
        'Don\'t know'
    ],
    'support_needed_to_manage': [
        'Continued access to OSF loan',
        'Continued support by OSF CRPs',
        'Any other, specify'
    ]
}

SECTIONS_CONFIG = [
    ("SEC_A", "Section A: Identification & General Information", "District, Block, SHG, CLF and Enterprise Overview"),
    ("SEC_B", "Section B: Respondent Profile & Demographics", "Age, Social Category, Education, Family Members and Income"),
    ("SEC_C", "Section C: Enterprise Operations & Activities", "Operations, Premises, Peak/Lean Seasons, Record Keeping"),
    ("SEC_D", "Section D: Financial Performance & Capital History", "Capital sources, loan usage, asset changes, sales"),
    ("SEC_E", "Section E: Role of Family & Social Impact", "Family support, household contribution, social status"),
    ("SEC_F", "Section F: Marketing, Competition & Ecosystem", "Customers, marketing channels, digital presence"),
    ("SEC_G", "Section G: Aspirations & Growth Trajectory", "Future plans, scaling up, aspirations"),
    ("SEC_H", "Section H: Community Resource Persons (CRPs)", "CRP support, guidance, expectations"),
    ("SEC_I", "Section I: Closed / Scaled Down Enterprises", "Reasons for closure, challenges, revival support")
]

SECTION_TAB_MAP = {
    "section_a_tab": "SEC_A",
    "section_b_tab": "SEC_B",
    "section_c_tab": "SEC_C",
    "section_d_tab": "SEC_D",
    "section_e_tab": "SEC_E",
    "section_f_tab": "SEC_F",
    "section_g_tab": "SEC_G",
    "section_h_tab": "SEC_H",
    "section_i_tab": "SEC_I"
}

def seed():
    # 1. Project
    project_name = "SHG Rajasthan Women Entrepreneurs Study"
    proj_doc_name = f"PROJ-{project_name}"
    if not frappe.db.exists("OmniServey Project", proj_doc_name):
        proj = frappe.new_doc("OmniServey Project")
        proj.project_name = project_name
        proj.grantor_organization = "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP"
        proj.status = "Active"
        proj.description = "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan"
        proj.insert(ignore_permissions=True)
        print("Created Project:", proj.name)
    else:
        proj = frappe.get_doc("OmniServey Project", proj_doc_name)
        print("Using existing Project:", proj.name)

    # 2. Template
    template_title = "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan"
    existing_tmpl = frappe.db.get_value("OmniServey Template", {"title": template_title}, "name")
    if existing_tmpl:
        tmpl = frappe.get_doc("OmniServey Template", existing_tmpl)
        print("Updating existing Template:", tmpl.name)
    else:
        tmpl = frappe.new_doc("OmniServey Template")
        tmpl.title = template_title
        print("Creating new Template...")

    tmpl.project = proj.name
    tmpl.version = 2
    tmpl.status = "Published"
    tmpl.target_category = "SHG Member"
    tmpl.is_public = 1
    tmpl.allowed_roles = "All,Desk User,Guest,System Manager,Administrator"
    tmpl.allowed_users = ""

    # Populate Sections
    tmpl.set("sections", [])
    for order, (code, title, desc) in enumerate(SECTIONS_CONFIG, 1):
        tmpl.append("sections", {
            "section_code": code,
            "section_title": title,
            "description": desc,
            "display_order": order
        })

    # Read Fields from DocType Meta
    meta = frappe.get_meta("SHG Women Entrepreneur Survey")
    current_sec = "SEC_A"
    tmpl.set("questions", [])
    q_order = 1

    SECTION_A_ORDER = [
        "district", "block", "village_gp", "respondent_name", "respondent_phone",
        "shg_name", "vo_name", "clf_name", "years_of_shg_membership",
        "leadership_role", "leadership_years", "related_to_crp",
        "ep_intervention_type", "enterprise_name", "enterprise_setting_up_years",
        "business_type", "main_business_activities", "years_receiving_loan",
        "maintain_separate_records", "second_enterprise_details", "registrations_documents"
    ]

    for df in meta.fields:
        if df.fieldtype == "Tab Break":
            current_sec = SECTION_TAB_MAP.get(df.fieldname, current_sec)
            continue
        
        if df.fieldtype in ["Section Break", "Column Break"]:
            continue
        
        if df.fieldname in ["naming_series", "enumerator_user", "survey_status"]:
            continue

        fieldname = df.fieldname
        label = df.label or fieldname
        fieldtype = df.fieldtype
        options_json = None
        validation_rules_json = None

        # Determine OmniServey field_type
        if fieldname == "years_of_shg_membership":
            target_type = "Range (Slider)"
            validation_rules_json = json.dumps({"min": 0, "max": 7, "step": 1, "unit": "Years"})
            options_json = json.dumps([0, 1, 2, 3, 4, 5, 6, 7])
        elif fieldname in ["leadership_years", "enterprise_setting_up_years", "years_receiving_loan"]:
            target_type = "Integer"
        elif fieldname in MULTI_SELECT_OPTIONS:
            target_type = "Multiple Choice (Checkbox)"
            options_json = json.dumps(MULTI_SELECT_OPTIONS[fieldname])
        elif fieldname == "district":
            target_type = "Single Choice (Dropdown)"
            options_json = json.dumps(["Baran", "Churu", "Dausa", "Dungarpur", "Jodhpur"])
        elif fieldname == "block":
            target_type = "Single Choice (Dropdown)"
            options_json = json.dumps([
                "Chhipabarod", "Baran", "Ratangarh", "Sujangarh", "Sikandra", "Sagwara", "Galiakot", "Mandor", "Luni Shergadh"
            ])
        elif fieldtype == "Select":
            target_type = "Single Choice (Radio)"
            opts = [o.strip() for o in (df.options or "").split("\n") if o.strip()]
            options_json = json.dumps(opts)
        elif fieldtype == "Int":
            target_type = "Integer"
        elif fieldtype in ["Float", "Currency"]:
            target_type = "Currency (INR)"
        elif fieldtype == "Date":
            target_type = "Date"
        elif fieldtype == "Table":
            target_type = "Dynamic Grid"
        elif fieldtype in ["Small Text", "Text"]:
            target_type = "Long Text"
        else:
            target_type = "Text"

        order_val = q_order
        if current_sec == "SEC_A" and fieldname in SECTION_A_ORDER:
            order_val = SECTION_A_ORDER.index(fieldname) + 1

        tmpl.append("questions", {
            "section_code": current_sec,
            "question_code": fieldname,
            "label_en": label,
            "field_type": target_type,
            "is_mandatory": 1 if df.reqd else 0,
            "display_order": order_val,
            "options_json": options_json,
            "validation_rules_json": validation_rules_json
        })
        q_order += 1

    tmpl.save(ignore_permissions=True)
    frappe.db.commit()
    print("Successfully published OmniServey Template:", tmpl.name)
    print("Sections Count:", len(tmpl.sections))
    print("Questions Count:", len(tmpl.questions))
    print("Schema SHA-256:", tmpl.schema_hash_sha256)

if __name__ == "__main__":
    seed()
