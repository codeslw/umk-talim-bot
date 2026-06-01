const { BOT_APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TRANSITIONS } = require('../constants/application');
const { COURSE_FORMAT_OPTIONS } = require('../constants/course');
const { TEXT } = require('./i18n');

function yesNo(value, lang) {
  const map = {
    ru: { true: 'Да', false: 'Нет' },
    uz: { true: 'Ha', false: "Yo'q" },
    uz_lat: { true: 'Ha', false: "Yo'q" }
  };
  return (map[lang] || map.ru)[String(Boolean(value))];
}

function formatCourseInfo(course, lang) {
  const L = TEXT[lang]?.courseInfoLabels || TEXT.ru.courseInfoLabels;
  return [
    `*${course.title}*`,
    course.duration ? `${L.duration}: ${course.duration}` : null,
    `${L.format}: ${COURSE_FORMAT_OPTIONS[course.format] || course.format}`,
    `${L.practice}: ${yesNo(course.hasPractice, lang)}`,
    course.cost ? `${L.cost}: ${course.cost}` : null,
    `${L.installments}: ${yesNo(course.canPayInInstallments, lang)}`,
    `${L.age}: ${course.ageMin}-${course.ageMax}`,
    course.additionalInfo ? `${L.additionalInfo}: ${course.additionalInfo}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

function formatCourseAdminInfo(course) {
  const notSet = 'не указано';
  return [
    `*${course.title}* (ID: ${course.id})`,
    `Статус: ${course.isActive ? '✅ Активен' : '❌ Неактивен'}`,
    `Формат: ${COURSE_FORMAT_OPTIONS[course.format] || course.format}`,
    `Продолжительность: ${course.duration || notSet}`,
    `Практика: ${course.hasPractice ? 'да' : 'нет'}`,
    `Стоимость: ${course.cost || notSet}`,
    `Оплата частями: ${course.canPayInInstallments ? 'да' : 'нет'}`,
    `Возраст: ${course.ageMin}-${course.ageMax} лет`,
    `Изображение: ${course.imageFileId ? 'есть' : notSet}`,
    `Доп. инфо: ${course.additionalInfo || notSet}`
  ].join('\n');
}

const LEARNING_GOAL_LABELS = {
  CAREER_CHANGE: 'Смена профессии',
  QUALIFICATION: 'Повышение квалификации',
  JOB_SEARCH: 'Поиск работы',
  PERSONAL_DEVELOPMENT: 'Личное развитие'
};

const STUDY_FORMAT_LABELS = {
  ONLINE: 'Онлайн',
  OFFLINE: 'Офлайн',
  HYBRID: 'Смешанный'
};

const GENDER_LABELS = {
  MALE: 'Мужской',
  FEMALE: 'Женский'
};

function formatApplicationCard(application) {
  const statusLabel = BOT_APPLICATION_STATUS_LABELS[application.status] || application.status;
  const user = application.user || {};
  const course = application.course || {};

  const lines: (string | null)[] = [
    `🆔 Заявка #${application.id}`,
    `📅 ${new Date(application.createdAt).toLocaleDateString('ru-RU')}`,
    '',
    '👤 Личные данные',
    user.fullName ? `Имя: ${user.fullName}` : null,
    user.gender ? `Пол: ${GENDER_LABELS[user.gender] || user.gender}` : null,
    user.age != null ? `Возраст: ${user.age} лет` : null,
    user.phone ? `Телефон: ${user.phone}` : null,
    user.city ? `Город: ${user.city}` : null,
    '',
    '📚 Курс',
    course.title ? `Курс: ${course.title}` : null,
    `Статус: ${statusLabel}`
  ];

  const profileLines: (string | null)[] = [
    '',
    '🎓 Профиль',
    application.experience ? `Опыт: ${application.experience}` : null,
    application.workplace ? `Место работы: ${application.workplace}` : null,
    application.specialization ? `Специализация: ${application.specialization}` : null,
    application.learningGoal ? `Цель обучения: ${LEARNING_GOAL_LABELS[application.learningGoal] || application.learningGoal}` : null,
    application.studyFormat ? `Формат: ${STUDY_FORMAT_LABELS[application.studyFormat] || application.studyFormat}` : null,
    application.studyTime ? `Удобное время: ${application.studyTime}` : null,
    application.source ? `Откуда узнали: ${application.source}` : null
  ];

  const profileContent = profileLines.filter(Boolean);
  if (profileContent.length > 2) {
    lines.push(...profileLines);
  }

  if (application.comment && application.comment !== '-') {
    lines.push('', '💬 Комментарий', application.comment);
  }

  return lines.filter((l) => l !== null).join('\n');
}

function formatApplicationSummary(data, lang: string): string {
  const L = TEXT[lang]?.confirmLabels || TEXT.ru.confirmLabels;
  const genderLabels = TEXT[lang]?.options?.gender || TEXT.ru.options.gender;
  const learningGoalLabels = TEXT[lang]?.options?.learningGoal || TEXT.ru.options.learningGoal;
  const studyFormatLabels = TEXT[lang]?.options?.studyFormat || TEXT.ru.options.studyFormat;

  function line(label: string, value: unknown): string | null {
    if (value === null || value === undefined || value === '' || value === '-') return null;
    return `${label}: ${value}`;
  }

  return [
    L.header,
    line(L.courseTitle, data.courseTitle),
    line(L.fullName, data.fullName),
    line(L.gender, genderLabels[data.gender] || data.gender),
    line(L.birthDate, data.birthDate),
    line(L.phone, data.phone),
    line(L.city, data.city),
    line(L.experience, data.experience),
    line(L.workplace, data.workplace),
    line(L.specialization, data.specialization),
    line(L.learningGoal, learningGoalLabels[data.learningGoal] || data.learningGoal),
    line(L.studyFormat, studyFormatLabels[data.studyFormat] || data.studyFormat),
    line(L.studyTime, data.studyTime),
    line(L.source, data.source),
    line(L.comment, data.comment)
  ].filter(Boolean).join('\n');
}

function buildAppStatusKeyboard(application) {
  const transitions = APPLICATION_STATUS_TRANSITIONS[application.status] || [];
  if (!transitions.length) return null;

  return {
    inline_keyboard: [
      transitions.map((status) => ({
        text: BOT_APPLICATION_STATUS_LABELS[status] || status,
        callback_data: `app_status:${application.id}:${status}`
      }))
    ]
  };
}

module.exports = {
  formatApplicationCard,
  formatApplicationSummary,
  formatCourseAdminInfo,
  formatCourseInfo,
  buildAppStatusKeyboard
};
