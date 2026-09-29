app_name = "omniquery"
app_title = "OmniQuery"
app_publisher = "OmmNoMi Automation LLP"
app_description = "Next-Gen Dynamic Survey Engine, Zero-Data-Loss Offline PWA & Frappe Insights Platform"
app_email = "omniquery@ommnomi.com"
app_license = "mit"
app_logo_url = "/assets/omniquery/icons/desktop_icons/solid/omniquery.svg?v=oq_v1"
app_icon = "/assets/omniquery/icons/desktop_icons/solid/omniquery.svg?v=oq_v1"
app_color = "#8FA915"

# Apps
# ------------------

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "omniquery",
		"logo": "/assets/omniquery/icons/desktop_icons/solid/omniquery.svg?v=oq_v1",
		"title": "OmniQuery",
		"route": "/desk/omniquery",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/omniquery/css/omniquery.css"
# app_include_js = "/assets/omniquery/js/omniquery.js"

# include js, css files in header of web template
# web_include_css = "/assets/omniquery/css/omniquery.css"
# web_include_js = "/assets/omniquery/js/omniquery.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "omniquery/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "omniquery/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "omniquery.utils.jinja_methods",
# 	"filters": "omniquery.utils.jinja_filters"
# }

# Installation
# ------------

after_install = "omniquery.install.after_install"
after_migrate = "omniquery.install.after_migrate"

website_route_rules = [
	{"from_route": "/omniquery/<path:app_path>", "to_route": "omniquery"},
]

# Fixtures
# --------
fixture_auto_order = True
fixtures = [
	{
		"doctype": "OmniQuery Option Set",
		"filters": [["scope", "=", "Platform"]],
	},
	{
		"doctype": "OmniQuery Workspace",
		"filters": [["name", "in", ["OQW-001"]]],
	},
	{
		"doctype": "OmniQuery Project",
		"filters": [["name", "in", ["OQP-001-001", "PROJ-SHG Rajasthan Women Entrepreneurs Study"]]],
	},
	{
		"doctype": "OmniQuery Template",
		"filters": [
			["name", "in", ["OQS-001-001-001", "TMPL-Study on Performance of SHG-led Women Entrepreneurs in Rajasthan-1"]]
		],
	},
]


# Uninstallation
# ------------

# before_uninstall = "omniquery.uninstall.before_uninstall"
# after_uninstall = "omniquery.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "omniquery.utils.before_app_install"
# after_app_install = "omniquery.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "omniquery.utils.before_app_uninstall"
# after_app_uninstall = "omniquery.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "omniquery.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "omniquery.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"omniquery.tasks.all"
# 	],
# 	"daily": [
# 		"omniquery.tasks.daily"
# 	],
# 	"hourly": [
# 		"omniquery.tasks.hourly"
# 	],
# 	"weekly": [
# 		"omniquery.tasks.weekly"
# 	],
# 	"monthly": [
# 		"omniquery.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "omniquery.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "omniquery.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "omniquery.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "omniquery.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["omniquery.utils.before_request"]
# after_request = ["omniquery.utils.after_request"]

# Job Events
# ----------
# before_job = ["omniquery.utils.before_job"]
# after_job = ["omniquery.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"omniquery.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

# Permissions & RBAC
# ------------------
permission_query_conditions = {
	"OmniQuery Template": "omniquery.api.survey.get_template_permission_query_conditions",
}

has_permission = {
	"OmniQuery Template": "omniquery.api.survey.has_template_doc_permission",
}
