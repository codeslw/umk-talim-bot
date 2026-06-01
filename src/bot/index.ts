const bot = require('../utils/telegram');
const { adminIds, adminUsernames } = require('../config/env');
const {
  listActiveCourses,
  listAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  getActiveCourseById
} = require('../services/course.service');
const { applicationSchema } = require('../validators/application.validator');
const {
  BOT_APPLICATION_STATUS_LABELS: APPLICATION_STATUS_LABELS
} = require('../constants/application');
const {
  COURSE_WIZARD_STEPS,
  chunk,
  formatCourseWizardSummary,
  getCourseWizardPrompt,
  normalizeCourseWizardValue,
  normalizeCourseWizardCallback,
  courseWizardKeyboard,
  courseEditWizardKeyboard,
  buildEditFieldKeyboard
} = require('./courseWizard');
const {
  changeApplicationStatus,
  createCourseApplication,
  findUserByTelegramId,
  getApplications,
  getApplicationStats
} = require('../services/application.service');
const { calculateAge, parseBirthDate } = require('../utils/date');
const { normalizeUsername } = require('../utils/normalize');
const logger = require('../utils/logger');
const { LANGUAGE_LABELS, TEXT } = require('./i18n');
const { formatAvailableCommands } = require('./commands');
const {
  buildAppStatusKeyboard,
  formatApplicationCard,
  formatCourseAdminInfo,
  formatCourseInfo
} = require('./presenters');

const formState = new Map();
const userLanguage = new Map();
const courseCreateState = new Map();
const courseEditState = new Map();
let botPollingStopped = false;
const CALLBACK_QUERY_TEXT_LIMIT = 200;
type CallbackAnswerOptions = { text?: string; [key: string]: unknown };
type InlineButton = { text: string; callback_data: string };

function trimCallbackText(text) {
  if (!text || String(text).length <= CALLBACK_QUERY_TEXT_LIMIT) return text;
  return `${String(text).slice(0, CALLBACK_QUERY_TEXT_LIMIT - 3)}...`;
}

function answerCallbackQuery(queryId: string, options?: CallbackAnswerOptions) {
  if (!options) return bot.answerCallbackQuery(queryId);
  if (!options.text) return bot.answerCallbackQuery(queryId, options);
  return bot.answerCallbackQuery(queryId, {
    ...options,
    text: trimCallbackText(options.text)
  });
}

const STEPS = [
  'fullName',
  'gender',
  'birthDate',
  'phone',
  'city',
  'experience',
  'workplace',
  'specialization',
  'learningGoal',
  'studyFormat',
  'studyTime',
  'source',
  'comment'
];

const PERSONAL_STEPS = new Set(['fullName', 'gender', 'birthDate', 'phone', 'city']);
const OPTION_STEPS = ['gender', 'learningGoal', 'studyFormat'];
const APPS_PAGE_SIZE = 10;

function isBotAdmin(userId) {
  return adminIds.includes(String(userId));
}

function isBotAdminUser(msgFrom) {
  if (!msgFrom) return false;
  if (isBotAdmin(msgFrom.id)) return true;

  const username = normalizeUsername(msgFrom.username);
  if (!username) return false;

  return adminUsernames.some((entry) => normalizeUsername(entry) === username);
}

function clearChatState(chatId) {
  formState.delete(chatId);
  userLanguage.delete(chatId);
  courseCreateState.delete(chatId);
  courseEditState.delete(chatId);
}

function clearRuntimeState() {
  formState.clear();
  userLanguage.clear();
  courseCreateState.clear();
  courseEditState.clear();
}

async function stopBotPolling(reason = 'manual stop') {
  if (!bot || botPollingStopped) return;

  botPollingStopped = true;
  clearRuntimeState();
  await bot.stopPolling({ cancel: true });
  logger.info(`Telegram bot polling stopped: ${reason}`);
}

function safeJsonParse(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (err) {
    return { value: null, error: err };
  }
}

function startCourseWizard(chatId) {
  courseCreateState.set(chatId, {
    stepIndex: 0,
    data: {}
  });
}

async function askCourseWizardStep(chatId) {
  const state = courseCreateState.get(chatId);
  if (!state) return;
  const step = COURSE_WIZARD_STEPS[state.stepIndex];
  const keyboard = courseWizardKeyboard(step);
  await bot.sendMessage(
    chatId,
    getCourseWizardPrompt(step),
    keyboard ? { reply_markup: keyboard } : undefined
  );
}

async function finishCourseWizard(chatId) {
  const state = courseCreateState.get(chatId);
  if (!state) return;

  if (
    Number.isFinite(state.data.ageMin) &&
    Number.isFinite(state.data.ageMax) &&
    state.data.ageMin > state.data.ageMax
  ) {
    await bot.sendMessage(
      chatId,
      'Минимальный возраст не может быть больше максимального. Создание курса отменено.'
    );
    courseCreateState.delete(chatId);
    return;
  }

  try {
    const course = await createCourse(state.data);
    await bot.sendMessage(
      chatId,
      `Курс успешно создан.\nID: ${course.id}\nНазвание: ${course.title}\nАктивен: ${course.isActive ? 'да' : 'нет'}`
    );
  } catch (err) {
    await bot.sendMessage(chatId, courseCreateErrorMessage(err));
  } finally {
    courseCreateState.delete(chatId);
  }
}

function courseCreateErrorMessage(err) {
  if (err && err.code === 'P2002') {
    return 'Не удалось создать курс: курс с таким названием уже существует.';
  }
  return `Не удалось создать курс: ${err.message}`;
}

function getLang(chatId) {
  return userLanguage.get(chatId) || 'ru';
}

function getText(chatId) {
  return TEXT[getLang(chatId)];
}

function safeUserError(chatId): string {
  return getText(chatId).error;
}

async function sendCourseWithImage(chatId, course, text, opts = {}) {
  if (course.imageFileId) {
    await bot.sendPhoto(chatId, course.imageFileId, {
      caption: text,
      parse_mode: 'Markdown',
      ...opts
    });
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...opts });
  }
}

function sendLanguageMenu(chatId) {
  return bot.sendMessage(chatId, TEXT.ru.chooseLanguage, {
    reply_markup: {
      inline_keyboard: [
        Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
          text: label,
          callback_data: `lang:${code}`
        }))
      ]
    }
  });
}

function sendMainMenu(chatId) {
  const t = getText(chatId);
  return bot.sendMessage(chatId, t.welcome, {
    reply_markup: {
      inline_keyboard: [[{ text: t.chooseCourse, callback_data: 'choose_course' }]]
    }
  });
}

async function sendCourseList(chatId) {
  const courses = await listActiveCourses();
  const t = getText(chatId);

  if (!courses.length) {
    return bot.sendMessage(chatId, t.noCourses);
  }

  return bot.sendMessage(chatId, t.coursesTitle, {
    reply_markup: {
      inline_keyboard: courses.map((course) => [
        { text: course.title, callback_data: `course:${course.id}` }
      ])
    }
  });
}

async function sendAdminCourseList(chatId) {
  const courses = await listAllCourses();
  if (!courses.length) {
    await bot.sendMessage(chatId, 'Курсов ещё нет.');
    return;
  }

  for (const course of courses) {
    const text = formatCourseAdminInfo(course);
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Редактировать', callback_data: `course_mgmt:edit_menu:${course.id}` },
          { text: '🗑 Удалить', callback_data: `course_mgmt:delete_confirm:${course.id}` }
        ]
      ]
    };
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
}

function getOptionsForStep(step, chatId) {
  const t = getText(chatId);
  return t.options[step] || {};
}

function getPrompt(step, chatId) {
  const t = getText(chatId);

  if (step === 'gender') return t.gender;
  if (step === 'learningGoal') return t.learningGoal;
  if (step === 'studyFormat') return t.studyFormat;

  return t.enter[step];
}

function hasSavedPersonalValue(data, step) {
  const value = data[step];

  if (step === 'birthDate') {
    const birthDate = parseBirthDate(value);
    const age = birthDate ? calculateAge(birthDate) : null;
    return Number.isInteger(age) && age >= 18 && age <= 45;
  }
  if (step === 'gender') return ['MALE', 'FEMALE'].includes(value);
  if (step === 'fullName') return typeof value === 'string' && value.trim().length >= 3;
  if (step === 'phone') return typeof value === 'string' && /^\+?[0-9()\-\s]{7,20}$/.test(value.trim());
  if (step === 'city') return typeof value === 'string' && value.trim().length >= 2;
  return value !== null && value !== undefined;
}

function skipSavedPersonalSteps(state) {
  while (
    state.step < STEPS.length &&
    PERSONAL_STEPS.has(STEPS[state.step]) &&
    hasSavedPersonalValue(state.data, STEPS[state.step])
  ) {
    state.step += 1;
  }
}

function applySavedProfile(data, user) {
  if (!user) return false;

  const profile = {
    fullName: user.fullName,
    gender: user.gender,
    birthDate: user.birthDate,
    phone: user.phone,
    city: user.city
  };

  let hasAnyProfileValue = false;
  for (const [field, value] of Object.entries(profile)) {
    if (value !== null && value !== undefined && value !== '') {
      data[field] = value;
      hasAnyProfileValue = true;
    }
  }

  return hasAnyProfileValue;
}

async function askCurrentStep(chatId) {
  const state = formState.get(chatId);
  if (!state) return;

  const step = STEPS[state.step];
  const prompt = `(${state.step + 1}/${STEPS.length}) ${getPrompt(step, chatId)}`;

  if (OPTION_STEPS.includes(step)) {
    const options = Object.entries(getOptionsForStep(step, chatId)).map(([value, label]) => ({
      text: label,
      callback_data: `answer:${step}:${value}`
    }));

    await bot.sendMessage(chatId, prompt, {
      reply_markup: { inline_keyboard: chunk(options, 1) }
    });
    return;
  }

  await bot.sendMessage(chatId, prompt);
}

async function finishApplication(chatId) {
  const state = formState.get(chatId);
  const { value, error } = applicationSchema.validate(state.data, { abortEarly: false });
  const t = getText(chatId);

  if (error) {
    await bot.sendMessage(chatId, t.invalid(error.details.map((detail) => detail.message).join(', ')));
    formState.delete(chatId);
    return;
  }

  const { application, course } = await createCourseApplication(value, {
    birthDate: state.data.birthDate,
    source: 'bot'
  });
  const courseTitle = course ? course.title : String(value.courseId);

  await bot.sendMessage(chatId, t.saved(application.id, courseTitle));
  formState.delete(chatId);
}

async function saveAnswer(chatId, step, value) {
  const state = formState.get(chatId);
  if (!state || STEPS[state.step] !== step) return;

  if (step === 'birthDate' && !parseBirthDate(value)) {
    await bot.sendMessage(chatId, getPrompt(step, chatId));
    return;
  }

  state.data[step] = typeof value === 'string' ? value.trim() : value;
  state.step += 1;
  skipSavedPersonalSteps(state);

  if (state.step < STEPS.length) {
    await askCurrentStep(chatId);
    return;
  }

  await finishApplication(chatId);
}

async function sendApplicationsPage(chatId, page, statusFilter) {
  const pageNum = Number(page) || 0;
  const where = statusFilter ? { status: statusFilter } : {};
  const apps = await getApplications(where);
  const total = apps.length;
  const totalPages = Math.ceil(total / APPS_PAGE_SIZE);
  const pageApps = apps.slice(pageNum * APPS_PAGE_SIZE, (pageNum + 1) * APPS_PAGE_SIZE);

  if (!pageApps.length) {
    await bot.sendMessage(chatId, 'Заявок не найдено.');
    return;
  }

  const filterButtons = Object.entries(APPLICATION_STATUS_LABELS).map(([status, label]) => ({
    text: (statusFilter === status ? '✓ ' : '') + label,
    callback_data: `apps_page:0:${status}`
  }));
  filterButtons.push({ text: 'Все', callback_data: 'apps_page:0:ALL' });

  const navRow: InlineButton[] = [];
  if (pageNum > 0) navRow.push({ text: '◀️ Назад', callback_data: `apps_page:${pageNum - 1}:${statusFilter || 'ALL'}` });
  if (pageNum < totalPages - 1) navRow.push({ text: 'Вперёд ▶️', callback_data: `apps_page:${pageNum + 1}:${statusFilter || 'ALL'}` });

  const headerKeyboard = {
    inline_keyboard: [
      ...chunk(filterButtons, 3),
      ...(navRow.length ? [navRow] : [])
    ]
  };

  await bot.sendMessage(
    chatId,
    `Заявки (стр. ${pageNum + 1}/${Math.max(totalPages, 1)}, всего: ${total})${statusFilter && statusFilter !== 'ALL' ? `, фильтр: ${APPLICATION_STATUS_LABELS[statusFilter] || statusFilter}` : ''}:`,
    { reply_markup: headerKeyboard }
  );

  for (const app of pageApps) {
    const text = formatApplicationCard(app);
    const keyboard = buildAppStatusKeyboard(app);
    await bot.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined);
  }
}

if (bot) {
  bot.onText(/\/start/, async (msg) => {
    clearChatState(msg.chat.id);
    await sendLanguageMenu(msg.chat.id);
  });

  bot.onText(/^\/(?:help|commands|admin_help|admin_commands)\b/, async (msg) => {
    await bot.sendMessage(msg.chat.id, formatAvailableCommands(isBotAdminUser(msg.from)));
  });

  bot.onText(/^\/(?:bot_stop|stop_bot|quit_bot|shutdown_bot)\b/, async (msg) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
      return;
    }

    await bot.sendMessage(
      msg.chat.id,
      'Polling остановлен. API-сервер продолжает работать, но бот больше не принимает Telegram updates в этом процессе.'
    );
    await stopBotPolling(`admin ${msg.from.id} requested stop`);
  });

  bot.onText(/\/course_create(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
      return;
    }

    const payloadText = (match?.[1] || '').trim();
    if (payloadText) {
      const { value: payload, error } = safeJsonParse(payloadText);
      if (error || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
        await bot.sendMessage(msg.chat.id, 'Некорректный JSON.');
        return;
      }

      try {
        const course = await createCourse(payload);
        await bot.sendMessage(
          msg.chat.id,
          `Курс создан:\nID: ${course.id}\nНазвание: ${course.title}\nАктивен: ${course.isActive ? 'да' : 'нет'}`
        );
      } catch (err) {
        await bot.sendMessage(msg.chat.id, courseCreateErrorMessage(err));
      }
      return;
    }

    startCourseWizard(msg.chat.id);
    await bot.sendMessage(
      msg.chat.id,
      'Запущен мастер создания курса. Отправьте /cancel, чтобы прервать в любой момент.'
    );
    await askCourseWizardStep(msg.chat.id);
  });

  bot.onText(/\/course_list/, async (msg) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
      return;
    }
    await sendAdminCourseList(msg.chat.id);
  });

  bot.onText(/\/applications(?:\s+(\w+))?/, async (msg, match) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
      return;
    }
    const statusFilter = match?.[1]?.toUpperCase();
    const validFilter = statusFilter && APPLICATION_STATUS_LABELS[statusFilter] ? statusFilter : null;
    await sendApplicationsPage(msg.chat.id, 0, validFilter);
  });

  bot.onText(/^\/cancel\b/, async (msg) => {
    if (courseCreateState.has(msg.chat.id)) {
      courseCreateState.delete(msg.chat.id);
      await bot.sendMessage(msg.chat.id, 'Создание курса отменено.');
      return;
    }

    if (courseEditState.has(msg.chat.id)) {
      courseEditState.delete(msg.chat.id);
      await bot.sendMessage(msg.chat.id, 'Редактирование курса отменено.');
      return;
    }

    if (formState.has(msg.chat.id)) {
      formState.delete(msg.chat.id);
      await bot.sendMessage(msg.chat.id, 'Заявка отменена.');
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat?.id;
    const callbackData = query.data || '';
    try {
    if (!chatId) {
      await answerCallbackQuery(query.id, { text: 'Не удалось определить чат.' });
      return;
    }

    if (callbackData.startsWith('lang:')) {
      const lang = callbackData.split(':')[1];
      if (TEXT[lang]) {
        userLanguage.set(chatId, lang);
      } else {
        await answerCallbackQuery(query.id, { text: 'Неизвестный язык.' });
        await sendLanguageMenu(chatId);
        return;
      }
      await answerCallbackQuery(query.id);
      await sendMainMenu(chatId);
      return;
    }

    if (callbackData.startsWith('course_create:pick:')) {
      const courseState = courseCreateState.get(chatId);
      if (!courseState) return;

      const parts = callbackData.split(':');
      const step = parts[2];
      const value = parts[3];
      if (COURSE_WIZARD_STEPS[courseState.stepIndex] !== step) return;

      const parsed = normalizeCourseWizardCallback(step, value);
      if (!parsed.ok) {
        await bot.sendMessage(chatId, 'Неверный выбор. Попробуйте ещё раз.');
        await askCourseWizardStep(chatId);
        return;
      }

      courseState.data[step] = parsed.value;
      courseState.stepIndex += 1;

      if (courseState.stepIndex >= COURSE_WIZARD_STEPS.length) {
        await bot.sendMessage(chatId, formatCourseWizardSummary(courseState.data));
        await finishCourseWizard(chatId);
        return;
      }

      await askCourseWizardStep(chatId);
      return;
    }

    if (callbackData.startsWith('course_mgmt:')) {
      if (!isBotAdminUser(query.from)) {
        await answerCallbackQuery(query.id, { text: 'Недостаточно прав.' });
        return;
      }

      const parts = callbackData.split(':');
      const action = parts[1];
      const courseId = Number(parts[2]);

      if (action === 'edit_menu') {
        const course = await getCourseById(courseId);
        if (!course) {
          await answerCallbackQuery(query.id, { text: 'Курс не найден.' });
          return;
        }
        await bot.sendMessage(
          chatId,
          `Редактирование курса *${course.title}*\nВыберите поле для изменения:`,
          { parse_mode: 'Markdown', reply_markup: buildEditFieldKeyboard(courseId) }
        );
        await answerCallbackQuery(query.id);
        return;
      }

      if (action === 'delete_confirm') {
        const course = await getCourseById(courseId);
        if (!course) {
          await answerCallbackQuery(query.id, { text: 'Курс не найден.' });
          return;
        }
        await bot.sendMessage(
          chatId,
          `Удалить курс *${course.title}*? Если по нему уже есть заявки, курс будет снят с публикации вместо удаления.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ Да, удалить', callback_data: `course_mgmt:delete_do:${courseId}` },
                { text: '❌ Отмена', callback_data: `course_mgmt:delete_cancel:${courseId}` }
              ]]
            }
          }
        );
        await answerCallbackQuery(query.id);
        return;
      }

      if (action === 'delete_do') {
        try {
          const result = await deleteCourse(courseId);
          const message = result.deleted
            ? 'Курс удалён.'
            : `У курса есть заявки (${result.applicationCount}), поэтому он снят с публикации вместо удаления.`;
          await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: query.message.message_id
          });
        } catch (err) {
          await answerCallbackQuery(query.id, { text: `Ошибка: ${err.message}` });
          return;
        }
        await answerCallbackQuery(query.id);
        return;
      }

      if (action === 'delete_cancel') {
        await bot.editMessageText('Удаление отменено.', {
          chat_id: chatId,
          message_id: query.message.message_id
        });
        await answerCallbackQuery(query.id);
        return;
      }

      return;
    }

    if (callbackData.startsWith('course_edit:field:')) {
      if (!isBotAdminUser(query.from)) {
        await answerCallbackQuery(query.id, { text: 'Недостаточно прав.' });
        return;
      }
      const parts = callbackData.split(':');
      const courseId = Number(parts[2]);
      const field = parts[3];

      courseEditState.set(chatId, { courseId, field });
      const keyboard = courseEditWizardKeyboard(field, courseId);
      await bot.sendMessage(
        chatId,
        getCourseWizardPrompt(field),
        keyboard ? { reply_markup: keyboard } : undefined
      );
      await answerCallbackQuery(query.id);
      return;
    }

    if (callbackData.startsWith('course_edit:pick:')) {
      if (!isBotAdminUser(query.from)) {
        await answerCallbackQuery(query.id, { text: 'Недостаточно прав.' });
        return;
      }
      const parts = callbackData.split(':');
      const courseId = Number(parts[2]);
      const field = parts[3];
      const value = parts[4];

      const parsed = normalizeCourseWizardCallback(field, value);
      if (!parsed.ok) {
        await answerCallbackQuery(query.id, { text: 'Неверный выбор.' });
        return;
      }

      try {
        await updateCourse(courseId, { [field]: parsed.value });
        courseEditState.delete(chatId);
        await answerCallbackQuery(query.id, { text: 'Сохранено.' });
        await bot.sendMessage(chatId, `Поле обновлено. Используйте /course_list для просмотра.`);
      } catch (err) {
        await answerCallbackQuery(query.id, { text: `Ошибка: ${err.message}` });
      }
      return;
    }

    if (callbackData.startsWith('apps_page:')) {
      if (!isBotAdminUser(query.from)) {
        await answerCallbackQuery(query.id, { text: 'Недостаточно прав.' });
        return;
      }
      const parts = callbackData.split(':');
      const page = Number(parts[1]) || 0;
      const statusFilter = parts[2] === 'ALL' ? null : parts[2];
      await sendApplicationsPage(chatId, page, statusFilter);
      await answerCallbackQuery(query.id);
      return;
    }

    if (callbackData.startsWith('app_status:')) {
      if (!isBotAdminUser(query.from)) {
        await answerCallbackQuery(query.id, { text: 'Недостаточно прав.' });
        return;
      }
      const parts = callbackData.split(':');
      const appId = Number(parts[1]);
      const newStatus = parts[2];

      try {
        const changedBy = query.from?.username
          ? `@${query.from.username}`
          : String(query.from?.id || 'администратор');
        const updated = await changeApplicationStatus(appId, newStatus, changedBy);
        const statusLabel = APPLICATION_STATUS_LABELS[updated.status] || updated.status;
        await answerCallbackQuery(query.id, { text: `Статус обновлён: ${statusLabel}` });

        const newText = formatApplicationCard(updated);
        const newKeyboard = buildAppStatusKeyboard(updated);
        await bot.editMessageText(newText, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: newKeyboard || undefined
        });
      } catch (err) {
        await answerCallbackQuery(query.id, { text: `Ошибка: ${err.message}` });
      }
      return;
    }

    if (callbackData === 'choose_course') {
      await answerCallbackQuery(query.id);
      await sendCourseList(chatId);
      return;
    }

    if (callbackData.startsWith('course:')) {
      const courseId = Number(callbackData.split(':')[1]);
      const course = await getActiveCourseById(courseId);

      if (!course) {
        await answerCallbackQuery(query.id, { text: 'Курс не найден или неактивен.' });
        await sendCourseList(chatId);
        return;
      }

      const infoText = formatCourseInfo(course, getLang(chatId));
      await sendCourseWithImage(chatId, course, infoText);
      const applicationData = {
        telegramId: String(query.from.id),
        telegramUsername: query.from.username || '',
        courseId
      };
      const savedUser = await findUserByTelegramId(query.from.id);
      const usedSavedProfile = applySavedProfile(applicationData, savedUser);
      const nextState = {
        step: 0,
        data: applicationData
      };
      skipSavedPersonalSteps(nextState);
      formState.set(chatId, nextState);
      await bot.sendMessage(chatId, getText(chatId).selectedCourse(course.title));
      if (usedSavedProfile && nextState.step > 0) {
        await bot.sendMessage(chatId, getText(chatId).usingSavedProfile);
      }
      await answerCallbackQuery(query.id);
      await askCurrentStep(chatId);
      return;
    }

    if (callbackData.startsWith('answer:')) {
      const [, step, value] = callbackData.split(':');
      await answerCallbackQuery(query.id);
      await saveAnswer(chatId, step, value);
      return;
    }

    await answerCallbackQuery(query.id, { text: 'Неизвестное действие.' });
    } catch (err) {
      logger.error('callback_query handler error', { err });
      try { await answerCallbackQuery(query.id, { text: 'Произошла ошибка.' }); } catch (_) {}
      if (chatId) {
        try { await bot.sendMessage(chatId, safeUserError(chatId)); } catch (_) {}
      }
    }
  });

  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;

    const courseState = courseCreateState.get(chatId);
    if (courseState && COURSE_WIZARD_STEPS[courseState.stepIndex] === 'image') {
      const photo = msg.photo[msg.photo.length - 1];
      courseState.data.imageFileId = photo.file_id;
      courseState.stepIndex += 1;

      if (courseState.stepIndex >= COURSE_WIZARD_STEPS.length) {
        await bot.sendMessage(chatId, formatCourseWizardSummary(courseState.data));
        await finishCourseWizard(chatId);
        return;
      }

      await askCourseWizardStep(chatId);
      return;
    }

    const editState = courseEditState.get(chatId);
    if (editState && editState.field === 'image') {
      const photo = msg.photo[msg.photo.length - 1];
      try {
        await updateCourse(editState.courseId, { imageFileId: photo.file_id });
        courseEditState.delete(chatId);
        await bot.sendMessage(chatId, 'Изображение обновлено.');
      } catch (err) {
        await bot.sendMessage(chatId, `Ошибка: ${err.message}`);
      }
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    try {

    const courseState = courseCreateState.get(msg.chat.id);
    if (courseState) {
      const step = COURSE_WIZARD_STEPS[courseState.stepIndex];

      if (step === 'image') {
        if (msg.text.trim() === '-') {
          courseState.data.imageFileId = null;
          courseState.stepIndex += 1;

          if (courseState.stepIndex >= COURSE_WIZARD_STEPS.length) {
            await bot.sendMessage(msg.chat.id, formatCourseWizardSummary(courseState.data));
            await finishCourseWizard(msg.chat.id);
            return;
          }

          await askCourseWizardStep(msg.chat.id);
          return;
        }

        await bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте фото или «-», чтобы пропустить.');
        return;
      }

      const parsed = normalizeCourseWizardValue(step, msg.text);

      if (!parsed.ok) {
        await bot.sendMessage(msg.chat.id, 'Неверное значение. Попробуйте ещё раз.');
        await askCourseWizardStep(msg.chat.id);
        return;
      }

      courseState.data[step] = parsed.value;
      courseState.stepIndex += 1;

      if (courseState.stepIndex >= COURSE_WIZARD_STEPS.length) {
        await bot.sendMessage(msg.chat.id, formatCourseWizardSummary(courseState.data));
        await finishCourseWizard(msg.chat.id);
        return;
      }

      await askCourseWizardStep(msg.chat.id);
      return;
    }

    const editState = courseEditState.get(msg.chat.id);
    if (editState) {
      const { courseId, field } = editState;

      if (field === 'image') {
        if (msg.text.trim() === '-') {
          try {
            await updateCourse(courseId, { imageFileId: null });
            courseEditState.delete(msg.chat.id);
            await bot.sendMessage(msg.chat.id, 'Изображение удалено.');
          } catch (err) {
            await bot.sendMessage(msg.chat.id, `Ошибка: ${err.message}`);
          }
        } else {
          await bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте фото или «-», чтобы удалить изображение.');
        }
        return;
      }

      const parsed = normalizeCourseWizardValue(field, msg.text);
      if (!parsed.ok) {
        await bot.sendMessage(msg.chat.id, 'Неверное значение. Попробуйте ещё раз.');
        return;
      }

      try {
        await updateCourse(courseId, { [field]: parsed.value });
        courseEditState.delete(msg.chat.id);
        await bot.sendMessage(msg.chat.id, 'Поле обновлено. Используйте /course_list для просмотра.');
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Ошибка: ${err.message}`);
      }
      return;
    }

    const state = formState.get(msg.chat.id);
    if (!state) return;

    const step = STEPS[state.step];
    if (OPTION_STEPS.includes(step)) {
      await askCurrentStep(msg.chat.id);
      return;
    }

    await saveAnswer(msg.chat.id, step, msg.text);
    } catch (err) {
      logger.error('message handler error', { err });
      try { await bot.sendMessage(msg.chat.id, safeUserError(msg.chat.id)); } catch (_) {}
    }
  });

  bot.onText(/\/stats/, async (msg) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
      return;
    }
    const stats = await getApplicationStats();
    await bot.sendMessage(msg.chat.id, getText(msg.chat.id).stats(stats.total));
  });

  bot.stopGracefully = stopBotPolling;
  bot.startConfiguredPolling?.().catch((err) => {
    logger.error('Failed to start Telegram polling', { err });
  });
}

module.exports = bot;
