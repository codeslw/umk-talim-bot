const { BOT_APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TRANSITIONS } = require('../constants/application');
const { COURSE_FORMAT_OPTIONS } = require('../constants/course');

function yesNo(value, lang) {
  const map = {
    ru: { true: 'Да', false: 'Нет' },
    uz: { true: 'Ha', false: "Yo'q" },
    uz_lat: { true: 'Ha', false: "Yo'q" }
  };

  return map[lang][String(Boolean(value))];
}

function formatCourseInfo(course, lang) {
  return [
    `*${course.title}*`,
    course.duration ? `Продолжительность: ${course.duration}` : null,
    `Формат: ${course.format}`,
    `Практика: ${yesNo(course.hasPractice, lang)}`,
    course.cost ? `Стоимость: ${course.cost}` : null,
    `Оплата частями: ${yesNo(course.canPayInInstallments, lang)}`,
    `Возраст: ${course.ageMin}-${course.ageMax} лет`,
    course.additionalInfo ? `Дополнительная информация: ${course.additionalInfo}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

function formatCourseAdminInfo(course) {
  const notSet = 'не указано';
  const yes = 'да';
  const no = 'нет';

  return [
    `*${course.title}* (ID: ${course.id})`,
    `Статус: ${course.isActive ? '✅ Активен' : '❌ Неактивен'}`,
    `Формат: ${COURSE_FORMAT_OPTIONS[course.format] || course.format}`,
    `Продолжительность: ${course.duration || notSet}`,
    `Практика: ${course.hasPractice ? yes : no}`,
    `Стоимость: ${course.cost || notSet}`,
    `Оплата частями: ${course.canPayInInstallments ? yes : no}`,
    `Возраст: ${course.ageMin}-${course.ageMax} лет`,
    `Изображение: ${course.imageFileId ? 'есть' : notSet}`,
    `Доп. инфо: ${course.additionalInfo || notSet}`
  ].join('\n');
}

function formatApplicationCard(application) {
  const statusLabel = BOT_APPLICATION_STATUS_LABELS[application.status] || application.status;

  return [
    `🆔 Заявка #${application.id}`,
    `👤 ${application.user?.fullName || 'неизвестно'}`,
    `📞 ${application.user?.phone || 'нет телефона'}`,
    `📌 Курс: ${application.course?.title || 'неизвестно'}`,
    `📊 Статус: ${statusLabel}`,
    `📅 ${new Date(application.createdAt).toLocaleDateString('ru-RU')}`
  ].join('\n');
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
  formatCourseAdminInfo,
  formatCourseInfo,
  buildAppStatusKeyboard
};
