/**
 * @typedef {Object} OmniQueryQuestion
 * @property {string} question_code
 * @property {string} label_en
 * @property {string} [label_hi]
 * @property {string} field_type
 * @property {boolean|number} [is_mandatory]
 * @property {string} [section_code]
 * @property {Object} [conditional_logic]
 * @property {Array<{label: string, value: string|number}>} [options]
 */

/**
 * @typedef {Object} OmniQuerySection
 * @property {string} section_code
 * @property {string} section_title
 * @property {string} [description]
 * @property {number} display_order
 */

/**
 * @typedef {Object} OmniQueryTemplate
 * @property {string} template_name
 * @property {string} title
 * @property {string} [project]
 * @property {string} [project_name]
 * @property {number} version
 * @property {string} [response_title_format]
 * @property {Array<OmniQuerySection>} sections
 * @property {Array<OmniQueryQuestion>} questions
 */

/**
 * @typedef {Object} SurveyDraft
 * @property {string} response_uid
 * @property {string} template_name
 * @property {string} title
 * @property {string} [response_title_format]
 * @property {Record<string, any>} responses
 * @property {number} [active_section_index]
 * @property {number} [progress_percent]
 * @property {'Draft'|'Submitted'} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {boolean} synced
 */

/**
 * @typedef {Object} WALItem
 * @property {string} wal_id
 * @property {string} entity_type
 * @property {'INSERT'|'UPDATE'} operation
 * @property {string} payload_json
 * @property {'pending'|'synced'|'failed'} status
 * @property {string} timestamp
 * @property {number} attempts
 * @property {string} [last_error]
 */

export {};
