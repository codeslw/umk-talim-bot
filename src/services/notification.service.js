const bot = require('../utils/telegram');
const { adminIds, applicationsChannelId } = require('../config/env');
const logger = require('../utils/logger');

const APPLICATION_STATUS_LABELS = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  CONTACTED: 'Связались',
  ENROLLED: 'Зачислен',
  REJECTED: 'Отклонён',
  COMPLETED: 'Завершён'
};

function formatApplicationNotification(application, user, course, birthDate, age) {
  const statusLabel = APPLICATION_STATUS_LABELS[application.status] || application.status;
  const lines = [
    'Новая заявка',
    `ID: ${application.id}`,
    `Курс: ${course ? course.title : 'неизвестно'}`,
    `ФИО: ${user.fullName}`,
    `Телефон: ${user.phone || 'не указан'}`,
    `Пол: ${user.gender === 'MALE' ? 'Мужской' : user.gender === 'FEMALE' ? 'Женский' : 'не указан'}`,
    `Дата рождения: ${birthDate || 'не указана'}`,
    `Возраст: ${age} лет`,
    `Город: ${user.city || 'не указан'}`,
    `Опыт работы: ${application.experience || 'не указан'}`,
    `Место работы: ${application.workplace || 'не указано'}`,
    `Специализация: ${application.specialization || 'не указана'}`,
    `Цель обучения: ${application.learningGoal || 'не указана'}`,
    `Формат обучения: ${application.studyFormat || 'не указан'}`,
    `Удобное время: ${application.studyTime || 'не указано'}`,
    `Источник: ${application.source || 'не указан'}`,
    `Комментарий: ${application.comment || 'нет'}`,
    `Статус: ${statusLabel}`
  ];
  return lines.join('\n');
}

function findChannelNotificationResult(results) {
  if (!applicationsChannelId) return null;
  const result = results.find((item) => String(item.target) === String(applicationsChannelId) && item.ok && item.messageId);
  if (!result) return null;

  return {
    chatId: String(result.target),
    messageId: result.messageId
  };
}

function formatApplicationStatusNotification(application, changedBy) {
  const previousStatus = APPLICATION_STATUS_LABELS[application.previousStatus] || application.previousStatus || 'неизвестно';
  const nextStatus = APPLICATION_STATUS_LABELS[application.status] || application.status;
  const lines = [
    'Статус заявки изменён',
    `ID: ${application.id}`,
    `Курс: ${application.course?.title || 'неизвестно'}`,
    `ФИО: ${application.user?.fullName || 'неизвестно'}`,
    `Статус: ${previousStatus} -> ${nextStatus}`
  ];

  if (changedBy) {
    lines.push(`Изменил: ${changedBy}`);
  }

  return lines.join('\n');
}

async function notifyAdmins(text, opts = {}) {
  if (!bot) {
    logger.warn('Telegram notification skipped: BOT_TOKEN is not set.');
    return [];
  }

  const targets = [];
  if (applicationsChannelId) {
    if (applicationsChannelId.startsWith('+')) {
      logger.error('APPLICATIONS_CHANNEL_ID looks like a private invite link/hash. Use a public @channelusername or the numeric -100... channel id.');
    } else {
      targets.push(applicationsChannelId);
    }
  }
  targets.push(...adminIds);

  if (!targets.length) {
    logger.warn('Telegram notification skipped: APPLICATIONS_CHANNEL_ID and ADMIN_IDS are empty.');
    return [];
  }

  const results = await Promise.allSettled(
    targets.map((id) => bot.sendMessage(id, text, opts))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error('Failed to send Telegram notification', {
        err: result.reason,
        target: targets[index]
      });
    } else {
      logger.info('Telegram notification sent', { target: targets[index] });
    }
  });

  return results.map((result, index) => ({
    target: targets[index],
    ok: result.status === 'fulfilled',
    messageId: result.status === 'fulfilled' ? result.value?.message_id || null : null,
    chatId: result.status === 'fulfilled' ? result.value?.chat?.id || null : null,
    error: result.status === 'rejected' ? result.reason?.message || String(result.reason) : null
  }));
}

async function notifyNewApplication(application, user, course, birthDate, age) {
  const text = formatApplicationNotification(application, user, course, birthDate, age);
  const results = await notifyAdmins(text);
  return {
    results,
    channelMessage: findChannelNotificationResult(results)
  };
}

async function notifyApplicationStatusChanged(application, changedBy) {
  if (!bot) {
    logger.warn('Application status notification skipped: BOT_TOKEN is not set.');
    return null;
  }

  if (!applicationsChannelId) {
    logger.warn('Application status notification skipped: APPLICATIONS_CHANNEL_ID is empty.');
    return null;
  }

  const opts = {};
  if (
    application.notificationChatId &&
    application.notificationMessageId &&
    String(application.notificationChatId) === String(applicationsChannelId)
  ) {
    opts.reply_to_message_id = application.notificationMessageId;
    opts.allow_sending_without_reply = true;
  }

  const text = formatApplicationStatusNotification(application, changedBy);
  return bot.sendMessage(applicationsChannelId, text, opts);
}

module.exports = {
  notifyAdmins,
  notifyNewApplication,
  notifyApplicationStatusChanged,
  formatApplicationNotification,
  formatApplicationStatusNotification
};
