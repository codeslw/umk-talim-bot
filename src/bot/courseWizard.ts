const { COURSE_FORMAT_OPTIONS } = require('../constants/course');
const { parseBooleanStrict } = require('../utils/normalize');

type CourseWizardStep =
  | 'title'
  | 'image'
  | 'duration'
  | 'format'
  | 'hasPractice'
  | 'cost'
  | 'canPayInInstallments'
  | 'ageMin'
  | 'ageMax'
  | 'additionalInfo'
  | 'isActive';

type InlineButton = { text: string; callback_data: string };
type InlineKeyboard = { inline_keyboard: InlineButton[][] };
type CourseWizardData = Partial<Record<CourseWizardStep | 'imageFileId', string | number | boolean | null>>;
type WizardParseResult = { ok: true; value: string | number | boolean | null } | { ok: false };

const COURSE_BOOLEAN_FIELDS = new Set<CourseWizardStep>(['hasPractice', 'canPayInInstallments', 'isActive']);
const COURSE_INT_FIELDS = new Set<CourseWizardStep>(['ageMin', 'ageMax']);
const COURSE_YES_NO_FIELDS = new Set<CourseWizardStep>(['hasPractice', 'canPayInInstallments']);
const COURSE_STATUS_FIELDS = new Set<CourseWizardStep>(['isActive']);
const COURSE_OPTIONAL_FIELDS = new Set<CourseWizardStep>(['duration', 'cost', 'additionalInfo', 'image']);
const COURSE_WIZARD_STEPS: CourseWizardStep[] = [
  'title',
  'image',
  'duration',
  'format',
  'hasPractice',
  'cost',
  'canPayInInstallments',
  'ageMin',
  'ageMax',
  'additionalInfo',
  'isActive'
];
const COURSE_EDIT_FIELDS = [...COURSE_WIZARD_STEPS];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function formatCourseWizardSummary(data: CourseWizardData): string {
  const notSet = 'не указано';
  const yes = 'да';
  const no = 'нет';

  return [
    'Предпросмотр курса:',
    `Название: ${data.title}`,
    `Изображение: ${data.imageFileId ? 'загружено' : notSet}`,
    `Продолжительность: ${data.duration || notSet}`,
    `Формат: ${COURSE_FORMAT_OPTIONS[String(data.format)] || data.format}`,
    `Практика: ${data.hasPractice ? yes : no}`,
    `Стоимость: ${data.cost || notSet}`,
    `Оплата частями: ${data.canPayInInstallments ? yes : no}`,
    `Возраст: ${data.ageMin}-${data.ageMax}`,
    `Дополнительная информация: ${data.additionalInfo || notSet}`,
    `Активен: ${data.isActive ? yes : no}`
  ].join('\n');
}

function getCourseWizardPrompt(step: CourseWizardStep): string {
  const prompts = {
    title: 'Введите название курса:',
    image: 'Отправьте фото для курса или «-», чтобы пропустить:',
    duration: 'Введите продолжительность или отправьте «-», чтобы пропустить:',
    format: 'Выберите формат обучения с помощью кнопок ниже:',
    hasPractice: 'Есть ли практика? Выберите «Да» или «Нет»:',
    cost: 'Введите стоимость или отправьте «-», чтобы пропустить:',
    canPayInInstallments: 'Доступна ли оплата частями? Выберите «Да» или «Нет»:',
    ageMin: 'Введите минимальный возраст (целое число):',
    ageMax: 'Введите максимальный возраст (целое число):',
    additionalInfo: 'Введите дополнительную информацию или отправьте «-», чтобы пропустить:',
    isActive: 'Сделать курс активным сейчас? Выберите «Активен» или «Неактивен»:'
  };

  return prompts[step] || 'Введите значение:';
}

function normalizeCourseWizardValue(step: CourseWizardStep, value: unknown): WizardParseResult {
  const text = String(value).trim();
  if (text === '-') {
    return COURSE_OPTIONAL_FIELDS.has(step) ? { ok: true, value: null } : { ok: false };
  }

  if (!text) return { ok: false };

  if (COURSE_BOOLEAN_FIELDS.has(step)) {
    const parsed = parseBooleanStrict(text);
    return parsed === null ? { ok: false } : { ok: true, value: parsed };
  }

  if (COURSE_INT_FIELDS.has(step)) {
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
  }

  if (step === 'format') {
    return COURSE_FORMAT_OPTIONS[text] ? { ok: true, value: text } : { ok: false };
  }

  return { ok: true, value: text };
}

function normalizeCourseWizardCallback(step: CourseWizardStep, value: string): WizardParseResult {
  if (COURSE_BOOLEAN_FIELDS.has(step)) {
    if (value === 'true') return { ok: true, value: true };
    if (value === 'false') return { ok: true, value: false };
    return { ok: false };
  }

  if (step === 'format') {
    return COURSE_FORMAT_OPTIONS[value] ? { ok: true, value } : { ok: false };
  }

  return { ok: false };
}

function courseWizardKeyboard(step: CourseWizardStep): InlineKeyboard | null {
  if (step === 'format') {
    return {
      inline_keyboard: chunk(
        Object.entries(COURSE_FORMAT_OPTIONS).map(([value, label]) => ({
          text: String(label),
          callback_data: `course_create:pick:${step}:${value}`
        })),
        1
      )
    };
  }

  if (COURSE_YES_NO_FIELDS.has(step)) {
    return {
      inline_keyboard: [[
        { text: 'Да', callback_data: `course_create:pick:${step}:true` },
        { text: 'Нет', callback_data: `course_create:pick:${step}:false` }
      ]]
    };
  }

  if (COURSE_STATUS_FIELDS.has(step)) {
    return {
      inline_keyboard: [[
        { text: 'Активен', callback_data: `course_create:pick:${step}:true` },
        { text: 'Неактивен', callback_data: `course_create:pick:${step}:false` }
      ]]
    };
  }

  return null;
}

function courseEditWizardKeyboard(step: CourseWizardStep, courseId: number): InlineKeyboard | null {
  if (step === 'format') {
    return {
      inline_keyboard: chunk(
        Object.entries(COURSE_FORMAT_OPTIONS).map(([value, label]) => ({
          text: String(label),
          callback_data: `course_edit:pick:${courseId}:${step}:${value}`
        })),
        1
      )
    };
  }

  if (COURSE_YES_NO_FIELDS.has(step)) {
    return {
      inline_keyboard: [[
        { text: 'Да', callback_data: `course_edit:pick:${courseId}:${step}:true` },
        { text: 'Нет', callback_data: `course_edit:pick:${courseId}:${step}:false` }
      ]]
    };
  }

  if (COURSE_STATUS_FIELDS.has(step)) {
    return {
      inline_keyboard: [[
        { text: 'Активен', callback_data: `course_edit:pick:${courseId}:${step}:true` },
        { text: 'Неактивен', callback_data: `course_edit:pick:${courseId}:${step}:false` }
      ]]
    };
  }

  return null;
}

function buildEditFieldKeyboard(courseId: number): InlineKeyboard {
  const fieldLabels: Record<CourseWizardStep, string> = {
    title: 'Название',
    image: 'Изображение',
    duration: 'Продолжительность',
    format: 'Формат',
    hasPractice: 'Практика',
    cost: 'Стоимость',
    canPayInInstallments: 'Оплата частями',
    ageMin: 'Мин. возраст',
    ageMax: 'Макс. возраст',
    additionalInfo: 'Доп. инфо',
    isActive: 'Статус'
  };

  return {
    inline_keyboard: chunk(
      COURSE_EDIT_FIELDS.map((field) => ({
        text: fieldLabels[field] || field,
        callback_data: `course_edit:field:${courseId}:${field}`
      })),
      2
    )
  };
}

module.exports = {
  COURSE_WIZARD_STEPS,
  COURSE_EDIT_FIELDS,
  chunk,
  formatCourseWizardSummary,
  getCourseWizardPrompt,
  normalizeCourseWizardValue,
  normalizeCourseWizardCallback,
  courseWizardKeyboard,
  courseEditWizardKeyboard,
  buildEditFieldKeyboard
};
