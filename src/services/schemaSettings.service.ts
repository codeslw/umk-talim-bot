const { getSetting, upsertSetting } = require('../repositories/adminSettingRepository');
const { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, EDUCATION_TYPES, LEARNING_GOALS, STUDY_FORMATS } = require('../constants/application');
const { COURSE_FORMAT_OPTIONS } = require('../constants/course');

const SCHEMA_SETTING_KEY = 'admin.dynamicSchemas';

const QUESTION_TYPES = Object.freeze([
  'text',
  'textarea',
  'number',
  'date',
  'phone',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'boolean',
  'file'
]);

const RESPONSE_TYPES = Object.freeze([
  'string',
  'number',
  'boolean',
  'date',
  'enum',
  'array',
  'fileId'
]);

const DEFAULT_SCHEMAS = Object.freeze({
  course: {
    title: 'Course schema',
    description: 'Fields used by the bot and admin dashboard when creating courses.',
    questions: [
      { key: 'title', label: 'Course title', questionType: 'text', responseType: 'string', required: true },
      { key: 'educationType', label: 'Education type', questionType: 'text', responseType: 'string', required: false },
      { key: 'duration', label: 'Duration', questionType: 'text', responseType: 'string', required: false },
      { key: 'format', label: 'Format', questionType: 'select', responseType: 'enum', required: true, options: Object.keys(COURSE_FORMAT_OPTIONS) },
      { key: 'hasPractice', label: 'Has practice', questionType: 'boolean', responseType: 'boolean', required: false },
      { key: 'cost', label: 'Cost', questionType: 'text', responseType: 'string', required: false },
      { key: 'canPayInInstallments', label: 'Installments available', questionType: 'boolean', responseType: 'boolean', required: false },
      { key: 'ageMin', label: 'Minimum age', questionType: 'number', responseType: 'number', required: true },
      { key: 'ageMax', label: 'Maximum age', questionType: 'number', responseType: 'number', required: true },
      { key: 'additionalInfo', label: 'Additional info', questionType: 'textarea', responseType: 'string', required: false },
      { key: 'imageFileId', label: 'Telegram image file id', questionType: 'file', responseType: 'fileId', required: false },
      { key: 'isActive', label: 'Active', questionType: 'boolean', responseType: 'boolean', required: true }
    ]
  },
  application: {
    title: 'Application schema',
    description: 'Fields collected from clients before an application is created.',
    questions: [
      { key: 'fullName', label: 'Full name', questionType: 'text', responseType: 'string', required: true },
      { key: 'gender', label: 'Gender', questionType: 'radio', responseType: 'enum', required: true, options: ['MALE', 'FEMALE'] },
      { key: 'birthDate', label: 'Birth date', questionType: 'date', responseType: 'date', required: true },
      { key: 'phone', label: 'Phone', questionType: 'phone', responseType: 'string', required: true },
      { key: 'city', label: 'City', questionType: 'text', responseType: 'string', required: true },
      { key: 'courseId', label: 'Course', questionType: 'select', responseType: 'number', required: true },
      { key: 'experience', label: 'Experience', questionType: 'textarea', responseType: 'string', required: false },
      { key: 'educationType', label: 'Education', questionType: 'select', responseType: 'enum', required: false, options: EDUCATION_TYPES },
      { key: 'specialization', label: 'Specialization', questionType: 'text', responseType: 'string', required: false },
      { key: 'learningGoal', label: 'Learning goal', questionType: 'select', responseType: 'enum', required: true, options: LEARNING_GOALS },
      { key: 'studyFormat', label: 'Study format', questionType: 'select', responseType: 'enum', required: true, options: STUDY_FORMATS },
      { key: 'studyTime', label: 'Study time', questionType: 'text', responseType: 'string', required: true },
      { key: 'source', label: 'Source', questionType: 'text', responseType: 'string', required: true },
      { key: 'comment', label: 'Comment', questionType: 'textarea', responseType: 'string', required: false }
    ]
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeQuestion(question, index) {
  const key = String(question.key || '').trim();
  const label = String(question.label || '').trim();
  const questionType = String(question.questionType || '').trim();
  const responseType = String(question.responseType || '').trim();

  if (!key || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
    const error = new Error(`Question ${index + 1} has an invalid key`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (!label) {
    const error = new Error(`Question ${key} requires a label`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (!QUESTION_TYPES.includes(questionType)) {
    const error = new Error(`Question ${key} has an unsupported question type`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (!RESPONSE_TYPES.includes(responseType)) {
    const error = new Error(`Question ${key} has an unsupported response type`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  return {
    key,
    label,
    questionType,
    responseType,
    required: Boolean(question.required),
    helpText: String(question.helpText || '').trim() || null,
    placeholder: String(question.placeholder || '').trim() || null,
    options: Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [],
    validation: question.validation && typeof question.validation === 'object' ? question.validation : {}
  };
}

function normalizeSchema(name, schema) {
  if (!schema || typeof schema !== 'object') {
    const error = new Error(`${name} schema must be an object`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const questions = Array.isArray(schema.questions) ? schema.questions.map(normalizeQuestion) : [];
  const keys = new Set<string>();
  for (const question of questions) {
    if (keys.has(question.key)) {
      const error = new Error(`${name} schema contains duplicate key ${question.key}`) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
    keys.add(question.key);
  }

  return {
    title: String(schema.title || DEFAULT_SCHEMAS[name]?.title || name).trim(),
    description: String(schema.description || '').trim(),
    questions
  };
}

async function getDynamicSchemas() {
  const setting = await getSetting(SCHEMA_SETTING_KEY);
  return setting?.value || clone(DEFAULT_SCHEMAS);
}

async function updateDynamicSchemas(payload) {
  const schemas = {
    course: normalizeSchema('course', payload.course),
    application: normalizeSchema('application', payload.application)
  };
  const setting = await upsertSetting(SCHEMA_SETTING_KEY, schemas);
  return setting.value;
}

function getSchemaMeta() {
  return {
    questionTypes: QUESTION_TYPES,
    responseTypes: RESPONSE_TYPES,
    applicationStatuses: APPLICATION_STATUSES,
    applicationStatusLabels: APPLICATION_STATUS_LABELS,
    educationTypes: EDUCATION_TYPES,
    learningGoals: LEARNING_GOALS,
    studyFormats: STUDY_FORMATS,
    courseFormats: COURSE_FORMAT_OPTIONS
  };
}

module.exports = {
  DEFAULT_SCHEMAS,
  getDynamicSchemas,
  updateDynamicSchemas,
  getSchemaMeta
};
