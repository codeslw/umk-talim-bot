const bot = require('../utils/telegram');
const prisma = require('../config/prisma');
const { adminIds, adminUsernames } = require('../config/env');
const { listActiveCourses, listAllCourses, createCourse, updateCourse, deleteCourse, getCourseById } = require('../repositories/courseRepository');
const { applicationSchema } = require('../validators/application.validator');
const {
  createApplication,
  listApplications,
  updateApplicationStatus,
  updateApplicationNotificationReference
} = require('../repositories/applicationRepository');
const { notifyNewApplication, notifyApplicationStatusChanged } = require('../services/notification.service');
const { calculateAge, parseBirthDate } = require('../utils/date');

const formState = new Map();
const userLanguage = new Map();
const courseCreateState = new Map();
const courseEditState = new Map();
let botPollingStopped = false;
const CALLBACK_QUERY_TEXT_LIMIT = 200;

function trimCallbackText(text) {
  if (!text || String(text).length <= CALLBACK_QUERY_TEXT_LIMIT) return text;
  return `${String(text).slice(0, CALLBACK_QUERY_TEXT_LIMIT - 3)}...`;
}

function answerCallbackQuery(queryId, options = undefined) {
  if (!options) return bot.answerCallbackQuery(queryId);
  if (!options.text) return bot.answerCallbackQuery(queryId, options);
  return bot.answerCallbackQuery(queryId, {
    ...options,
    text: trimCallbackText(options.text)
  });
}

const LANGUAGE_LABELS = {
  ru: 'Русский',
  uz: 'Узбекский',
  uz_lat: "O'zbek"
};

const TEXT = {
  ru: {
    chooseLanguage: 'Выберите язык бота:',
    welcome: 'Добро пожаловать в учебный центр. Выберите курс, чтобы оставить заявку:',
    chooseCourse: 'Выбрать курс',
    coursesTitle: 'Выберите курс из списка:',
    noCourses: 'Пока нет активных курсов.',
    usingSavedProfile: 'Используем сохранённые личные данные, где они уже заполнены.',
    selectedCourse: (title) => `Вы выбрали курс: ${title}`,
    enter: {
      fullName: 'Введите ФИО:',
      birthDate: 'Введите дату рождения в формате дд.мм.гггг:',
      phone: 'Введите телефон в формате +998XXXXXXXXX:',
      city: 'Введите город:',
      experience: 'Введите опыт работы (например: 2 года, нет опыта):',
      workplace: 'Введите текущее место работы (или "нет", если не работаете):',
      specialization: 'Введите специализацию (вашу текущую профессию или область):',
      studyTime: 'Введите удобное время обучения (например: утро, вечер, выходные):',
      source: 'Откуда узнали о нас? (например: Instagram, друзья, реклама):',
      comment: 'Введите комментарий (или "-", чтобы пропустить):'
    },
    gender: 'Выберите пол:',
    learningGoal: 'Выберите цель обучения:',
    studyFormat: 'Выберите формат обучения:',
    invalid: (message) => `Ошибка: ${message}`,
    saved: (id, title) => `Заявка №${id} успешно отправлена на курс "${title}".`,
    stats: (total) => `Всего заявок: ${total}`,
    options: {
      gender: { MALE: 'Мужской', FEMALE: 'Женский' },
      learningGoal: {
        CAREER_CHANGE: 'Смена профессии',
        QUALIFICATION: 'Повышение квалификации',
        JOB_SEARCH: 'Поиск работы',
        PERSONAL_DEVELOPMENT: 'Личное развитие'
      },
      studyFormat: { ONLINE: 'Онлайн', OFFLINE: 'Офлайн', HYBRID: 'Смешанный' }
    }
  },
  uz: {
    chooseLanguage: 'Бот тилини танланг:',
    welcome: 'Ўқув марказига хуш келибсиз. Ариза қолдириш учун курсни танланг:',
    chooseCourse: 'Курсни танлаш',
    coursesTitle: 'Рўйхатдан курсни танланг:',
    noCourses: 'Ҳозирча фаол курслар йўқ.',
    usingSavedProfile: 'Аввал сақланган шахсий маълумотлардан фойдаланамиз.',
    selectedCourse: (title) => `Сиз танлаган курс: ${title}`,
    enter: {
      fullName: 'Ф.И.О. ни киритинг:',
      birthDate: 'Туғилган санани кк.оо.йййй форматида киритинг:',
      phone: 'Телефон рақамини +998XXXXXXXXX форматида киритинг:',
      city: 'Шаҳарни киритинг:',
      experience: 'Иш тажрибангизни киритинг (масалан: 2 йил, тажриба йўқ):',
      workplace: 'Ҳозирги иш жойингизни киритинг (ишламасангиз "йўқ" деб ёзинг):',
      specialization: 'Мутахассислигингизни киритинг:',
      studyTime: 'Ўқиш учун қулай вақтни киритинг (масалан: эрталаб, кечқурун):',
      source: 'Биз ҳақимизда қаердан эшитдингиз? (масалан: Instagram, дўстлар):',
      comment: 'Изоҳ киритинг (ёки «-» юборинг):'
    },
    gender: 'Жинсни танланг:',
    learningGoal: 'Ўқиш мақсадини танланг:',
    studyFormat: 'Ўқиш форматини танланг:',
    invalid: (message) => `Хатолик: ${message}`,
    saved: (id, title) => `Ариза №${id} "${title}" курсига муваффақиятли юборилди.`,
    stats: (total) => `Жами аризалар: ${total}`,
    options: {
      gender: { MALE: 'Эркак', FEMALE: 'Аёл' },
      learningGoal: {
        CAREER_CHANGE: 'Касбни ўзгартириш',
        QUALIFICATION: 'Малака ошириш',
        JOB_SEARCH: 'Иш топиш',
        PERSONAL_DEVELOPMENT: 'Шахсий ривожланиш'
      },
      studyFormat: { ONLINE: 'Онлайн', OFFLINE: 'Офлайн', HYBRID: 'Аралаш' }
    }
  },
  uz_lat: {
    chooseLanguage: "Bot tilini tanlang:",
    welcome: "O'quv markaziga xush kelibsiz. Ariza qoldirish uchun kursni tanlang:",
    chooseCourse: 'Kursni tanlash',
    coursesTitle: "Ro'yxatdan kursni tanlang:",
    noCourses: "Hozircha faol kurslar yo'q.",
    usingSavedProfile: "Avval saqlangan shaxsiy ma'lumotlardan foydalanamiz.",
    selectedCourse: (title) => `Siz tanlagan kurs: ${title}`,
    enter: {
      fullName: 'F.I.O. ni kiriting:',
      birthDate: "Tug'ilgan sanani kk.oo.yyyy formatida kiriting:",
      phone: 'Telefon raqamini +998XXXXXXXXX formatida kiriting:',
      city: 'Shaharni kiriting:',
      experience: "Ish tajribangizni kiriting (masalan: 2 yil, tajriba yo'q):",
      workplace: "Hozirgi ish joyingizni kiriting (ishlamasangiz \"yo'q\" deb yozing):",
      specialization: 'Mutaxassisligingizni kiriting:',
      studyTime: "O'qish uchun qulay vaqtni kiriting (masalan: ertalab, kechqurun):",
      source: "Biz haqimizda qayerdan eshitdingiz? (masalan: Instagram, do'stlar):",
      comment: "Izoh kiriting (yoki «-» yuboring):"
    },
    gender: 'Jinsni tanlang:',
    learningGoal: "O'qish maqsadini tanlang:",
    studyFormat: "O'qish formatini tanlang:",
    invalid: (message) => `Xatolik: ${message}`,
    saved: (id, title) => `Ariza №${id} "${title}" kursiga muvaffaqiyatli yuborildi.`,
    stats: (total) => `Jami arizalar: ${total}`,
    options: {
      gender: { MALE: 'Erkak', FEMALE: 'Ayol' },
      learningGoal: {
        CAREER_CHANGE: "Kasbni o'zgartirish",
        QUALIFICATION: 'Malaka oshirish',
        JOB_SEARCH: 'Ish topish',
        PERSONAL_DEVELOPMENT: 'Shaxsiy rivojlanish'
      },
      studyFormat: { ONLINE: 'Onlayn', OFFLINE: 'Oflayn', HYBRID: 'Aralash' }
    }
  }
};

const COURSE_FORMAT_OPTIONS = {
  ONLINE: 'Онлайн',
  OFFLINE: 'Офлайн',
  HYBRID: 'Смешанный'
};

const APPLICATION_STATUS_LABELS = {
  NEW: '🆕 Новый',
  IN_PROGRESS: '🔄 В работе',
  CONTACTED: '📞 Связались',
  ENROLLED: '✅ Зачислен',
  REJECTED: '❌ Отклонён',
  COMPLETED: '🎓 Завершён'
};

const APPLICATION_STATUS_TRANSITIONS = {
  NEW: ['IN_PROGRESS', 'CONTACTED', 'REJECTED'],
  IN_PROGRESS: ['CONTACTED', 'ENROLLED', 'REJECTED'],
  CONTACTED: ['ENROLLED', 'REJECTED', 'IN_PROGRESS'],
  ENROLLED: ['COMPLETED', 'REJECTED'],
  REJECTED: ['IN_PROGRESS'],
  COMPLETED: []
};

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
const COURSE_BOOLEAN_FIELDS = new Set(['hasPractice', 'canPayInInstallments', 'isActive']);
const COURSE_INT_FIELDS = new Set(['ageMin', 'ageMax']);
const COURSE_YES_NO_FIELDS = new Set(['hasPractice', 'canPayInInstallments']);
const COURSE_STATUS_FIELDS = new Set(['isActive']);
const COURSE_OPTIONAL_FIELDS = new Set(['duration', 'cost', 'additionalInfo', 'image']);
const COURSE_WIZARD_STEPS = [
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

const COURSE_EDIT_FIELDS = [
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

const APPS_PAGE_SIZE = 10;

const PUBLIC_COMMANDS = [
  ['/start', 'выбрать язык и открыть меню курсов'],
  ['/help', 'показать доступные команды'],
  ['/commands', 'показать доступные команды'],
  ['/stats', 'показать общее количество заявок'],
  ['/cancel', 'отменить текущую заявку или мастер']
];

const ADMIN_COMMANDS = [
  ['/course_create', 'создать курс через пошаговый мастер'],
  ['/course_create {json}', 'создать курс из JSON'],
  ['/course_list', 'показать все курсы с управлением'],
  ['/applications', 'показать заявки'],
  ['/applications NEW', 'показать заявки с выбранным статусом'],
  ['/admin_help', 'показать эту справку для администраторов'],
  ['/admin_commands', 'показать эту справку для администраторов'],
  ['/bot_stop', 'остановить Telegram polling в текущем процессе'],
  ['/stop_bot, /quit_bot, /shutdown_bot', 'алиасы для остановки polling']
];

function isBotAdmin(userId) {
  return adminIds.includes(String(userId));
}

function normalizeUsername(value) {
  const text = String(value || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  return text ? text.toLowerCase() : '';
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

function formatAvailableCommands(isAdmin) {
  const sections = [
    ['Команды пользователя', PUBLIC_COMMANDS]
  ];

  if (isAdmin) {
    sections.push([
      'Команды администратора',
      ADMIN_COMMANDS
    ]);
    sections.push([
      'Статусы заявок для /applications',
      Object.entries(APPLICATION_STATUS_LABELS).map(([status, label]) => [status, label])
    ]);
  }

  return sections
    .map(([title, commands]) => [
      title,
      ...commands.map(([command, description]) => `${command} - ${description}`)
    ].join('\n'))
    .join('\n\n');
}

async function stopBotPolling(reason = 'manual stop') {
  if (!bot || botPollingStopped) return;

  botPollingStopped = true;
  clearRuntimeState();
  await bot.stopPolling({ cancel: true });
  console.log(`Telegram bot polling stopped: ${reason}`);
}

function safeJsonParse(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (err) {
    return { value: null, error: err };
  }
}

function parseBooleanInput(value) {
  const normalized = String(value).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'да', 'ha', 'x', 'on'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0', 'нет', "yo'q", 'off'].includes(normalized)) return false;
  return null;
}

function formatCourseWizardSummary(data) {
  const notSet = 'не указано';
  const yes = 'да';
  const no = 'нет';
  return [
    'Предпросмотр курса:',
    `Название: ${data.title}`,
    `Изображение: ${data.imageFileId ? 'загружено' : notSet}`,
    `Продолжительность: ${data.duration || notSet}`,
    `Формат: ${COURSE_FORMAT_OPTIONS[data.format] || data.format}`,
    `Практика: ${data.hasPractice ? yes : no}`,
    `Стоимость: ${data.cost || notSet}`,
    `Оплата частями: ${data.canPayInInstallments ? yes : no}`,
    `Возраст: ${data.ageMin}-${data.ageMax}`,
    `Дополнительная информация: ${data.additionalInfo || notSet}`,
    `Активен: ${data.isActive ? yes : no}`
  ].join('\n');
}

function getCourseWizardPrompt(step) {
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

function normalizeCourseWizardValue(step, value) {
  const text = String(value).trim();
  if (text === '-') {
    return COURSE_OPTIONAL_FIELDS.has(step) ? { ok: true, value: null } : { ok: false };
  }

  if (!text) return { ok: false };

  if (COURSE_BOOLEAN_FIELDS.has(step)) {
    const parsed = parseBooleanInput(text);
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

function normalizeCourseWizardCallback(step, value) {
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

function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function courseWizardKeyboard(step) {
  if (step === 'format') {
    return {
      inline_keyboard: chunk(
        Object.entries(COURSE_FORMAT_OPTIONS).map(([value, label]) => ({
          text: label,
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

function courseEditWizardKeyboard(step, courseId) {
  if (step === 'format') {
    return {
      inline_keyboard: chunk(
        Object.entries(COURSE_FORMAT_OPTIONS).map(([value, label]) => ({
          text: label,
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

function yesNo(value, chatId) {
  const lang = getLang(chatId);
  const map = {
    ru: { true: 'Да', false: 'Нет' },
    uz: { true: 'Ha', false: "Yo'q" },
    uz_lat: { true: 'Ha', false: "Yo'q" }
  };

  return map[lang][String(Boolean(value))];
}

function formatCourseInfo(course, chatId) {
  return [
    `*${course.title}*`,
    course.duration ? `Продолжительность: ${course.duration}` : null,
    `Формат: ${course.format}`,
    `Практика: ${yesNo(course.hasPractice, chatId)}`,
    course.cost ? `Стоимость: ${course.cost}` : null,
    `Оплата частями: ${yesNo(course.canPayInInstallments, chatId)}`,
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

function buildEditFieldKeyboard(courseId) {
  const fieldLabels = {
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
  const prompt = getPrompt(step, chatId);

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

  const age = value.age || calculateAge(value.birthDate);
  const user = await prisma.user.upsert({
    where: { telegramId: value.telegramId },
    create: {
      telegramId: value.telegramId,
      username: value.telegramUsername || null,
      fullName: value.fullName,
      phone: value.phone,
      gender: value.gender,
      age,
      birthDate: value.birthDate,
      city: value.city
    },
    update: {
      username: value.telegramUsername || null,
      fullName: value.fullName,
      phone: value.phone,
      gender: value.gender,
      age,
      birthDate: value.birthDate,
      city: value.city
    }
  });

  const application = await createApplication({
    userId: user.id,
    courseId: value.courseId,
    experience: value.experience,
    workplace: value.workplace,
    educationType: value.educationType,
    specialization: value.specialization,
    learningGoal: value.learningGoal,
    studyFormat: value.studyFormat,
    studyTime: value.studyTime,
    source: value.source,
    comment: value.comment === '-' ? null : value.comment
  });

  const course = await prisma.course.findUnique({ where: { id: value.courseId } });
  const courseTitle = course ? course.title : String(value.courseId);

  try {
    const notification = await notifyNewApplication(application, user, course, state.data.birthDate, age);
    if (notification.channelMessage) {
      await updateApplicationNotificationReference(application.id, notification.channelMessage);
    }
  } catch (err) {
    console.error('Failed to notify admins about new application:', err.message);
  }

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

function formatApplicationCard(app) {
  const statusLabel = APPLICATION_STATUS_LABELS[app.status] || app.status;
  return [
    `🆔 Заявка #${app.id}`,
    `👤 ${app.user?.fullName || 'неизвестно'}`,
    `📞 ${app.user?.phone || 'нет телефона'}`,
    `📌 Курс: ${app.course?.title || 'неизвестно'}`,
    `📊 Статус: ${statusLabel}`,
    `📅 ${new Date(app.createdAt).toLocaleDateString('ru-RU')}`
  ].join('\n');
}

function buildAppStatusKeyboard(app) {
  const transitions = APPLICATION_STATUS_TRANSITIONS[app.status] || [];
  if (!transitions.length) return null;
  return {
    inline_keyboard: [
      transitions.map((status) => ({
        text: APPLICATION_STATUS_LABELS[status] || status,
        callback_data: `app_status:${app.id}:${status}`
      }))
    ]
  };
}

async function sendApplicationsPage(chatId, page, statusFilter) {
  const pageNum = Number(page) || 0;
  const where = statusFilter ? { status: statusFilter } : {};
  const apps = await listApplications(where);
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

  const navRow = [];
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
        const updated = await updateApplicationStatus(appId, newStatus);
        const statusLabel = APPLICATION_STATUS_LABELS[updated.status] || updated.status;
        await answerCallbackQuery(query.id, { text: `Статус обновлён: ${statusLabel}` });
        const changedBy = query.from?.username
          ? `@${query.from.username}`
          : String(query.from?.id || 'администратор');
        try {
          await notifyApplicationStatusChanged(updated, changedBy);
        } catch (notifyErr) {
          console.error('Failed to notify about application status change:', notifyErr.message);
        }

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
      const course = await prisma.course.findFirst({ where: { id: courseId, isActive: true } });

      if (!course) {
        await answerCallbackQuery(query.id, { text: 'Курс не найден или неактивен.' });
        await sendCourseList(chatId);
        return;
      }

      const infoText = formatCourseInfo(course, chatId);
      await sendCourseWithImage(chatId, course, infoText);
      const applicationData = {
        telegramId: String(query.from.id),
        telegramUsername: query.from.username || '',
        courseId
      };
      const savedUser = await prisma.user.findUnique({
        where: { telegramId: String(query.from.id) }
      });
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
      console.error('callback_query handler error:', err);
      try { await answerCallbackQuery(query.id, { text: `Ошибка: ${err.message}` }); } catch (_) {}
      if (chatId) {
        try { await bot.sendMessage(chatId, `Произошла ошибка. Попробуйте /start ещё раз.\n${err.message}`); } catch (_) {}
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
      console.error('message handler error:', err);
      try { await bot.sendMessage(msg.chat.id, `Произошла ошибка: ${err.message}`); } catch (_) {}
    }
  });

  bot.onText(/\/stats/, async (msg) => {
    const applications = await prisma.application.count();
    await bot.sendMessage(msg.chat.id, getText(msg.chat.id).stats(applications));
  });

  bot.stopGracefully = stopBotPolling;
  bot.startConfiguredPolling?.().catch((err) => {
    console.error('Failed to start Telegram polling:', err.message);
  });
}

module.exports = bot;
