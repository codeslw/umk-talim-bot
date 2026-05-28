const bot = require('../utils/telegram');
const prisma = require('../config/prisma');
const { adminIds, adminUsernames } = require('../config/env');
const { listActiveCourses, createCourse } = require('../repositories/courseRepository');
const { applicationSchema } = require('../validators/application.validator');
const { createApplication } = require('../repositories/applicationRepository');
const { notifyAdmins } = require('../services/notification.service');
const { calculateAge, parseBirthDate } = require('../utils/date');

const formState = new Map();
const userLanguage = new Map();
const courseCreateState = new Map();

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
    selectedCourse: (title) => `Вы выбрали курс: ${title}`,
    enter: {
      fullName: 'Введите ФИО:',
      birthDate: 'Введите дату рождения в формате дд.мм.гггг:',
      phone: 'Введите телефон:',
      city: 'Введите город:',
      experience: 'Опыт работы:',
      workplace: 'Текущее место работы:',
      specialization: 'Специализация:',
      studyTime: 'Удобное время обучения:',
      source: 'Откуда узнали о нас?',
      comment: 'Комментарий:'
    },
    gender: 'Выберите пол:',
    educationType: 'Какое у вас образование? Выберите самое последнее образование:',
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
    selectedCourse: (title) => `Сиз танлаган курс: ${title}`,
    enter: {
      fullName: 'Ф.И.О. ни киритинг:',
      birthDate: 'Туғилган санани кк.оо.йййй форматида киритинг:',
      phone: 'Телефон рақамини киритинг:',
      city: 'Шаҳарни киритинг:',
      experience: 'Иш тажрибангиз:',
      workplace: 'Ҳозирги иш жойингиз:',
      specialization: 'Мутахассислигингиз:',
      studyTime: 'Ўқиш учун қулай вақт:',
      source: 'Биз ҳақимизда қаердан эшитдингиз?',
      comment: 'Изоҳ:'
    },
    gender: 'Жинсни танланг:',
    educationType: 'Маълумотингиз қандай? Энг охирги маълумотингизни танланг:',
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
    selectedCourse: (title) => `Siz tanlagan kurs: ${title}`,
    enter: {
      fullName: 'F.I.O. ni kiriting:',
      birthDate: "Tug'ilgan sanani kk.oo.yyyy formatida kiriting:",
      phone: 'Telefon raqamini kiriting:',
      city: 'Shaharni kiriting:',
      experience: 'Ish tajribangiz:',
      workplace: 'Hozirgi ish joyingiz:',
      specialization: 'Mutaxassisligingiz:',
      studyTime: "O'qish uchun qulay vaqt:",
      source: 'Biz haqimizda qayerdan eshitdingiz?',
      comment: 'Izoh:'
    },
    gender: 'Jinsni tanlang:',
    educationType: "Ma'lumotingiz qanday? Eng oxirgi ma'lumotingizni tanlang:",
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

const EDUCATION_OPTIONS = {
  HIGHER: 'Высшее (институт/университет)',
  INCOMPLETE_HIGHER: 'Неполное высшее',
  SECONDARY_SPECIALIZED: 'Средне-техническое (колледж/техникум/профшкола/лицей)',
  RETRAINING_COURSES: 'Курсы переподготовки/подготовки',
  SECONDARY: 'Среднее (школа - 11 классов)',
  BASIC: 'Базовое (школа - 9 классов)'
};

const STEPS = [
  'fullName',
  'gender',
  'birthDate',
  'phone',
  'city',
  'experience',
  'workplace',
  'educationType',
  'specialization',
  'learningGoal',
  'studyFormat',
  'studyTime',
  'source',
  'comment'
];

const OPTION_STEPS = ['gender', 'educationType', 'learningGoal', 'studyFormat'];
const COURSE_BOOLEAN_FIELDS = new Set(['hasPractice', 'canPayInInstallments', 'isActive']);
const COURSE_INT_FIELDS = new Set(['ageMin', 'ageMax']);
const COURSE_YES_NO_FIELDS = new Set(['hasPractice', 'canPayInInstallments']);
const COURSE_STATUS_FIELDS = new Set(['isActive']);
const COURSE_WIZARD_STEPS = [
  'title',
  'educationType',
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
  return [
    'Course preview:',
    `Title: ${data.title}`,
    `Education type: ${data.educationType}`,
    `Duration: ${data.duration || 'not set'}`,
    `Format: ${data.format}`,
    `Has practice: ${data.hasPractice ? 'yes' : 'no'}`,
    `Cost: ${data.cost || 'not set'}`,
    `Installments: ${data.canPayInInstallments ? 'yes' : 'no'}`,
    `Age range: ${data.ageMin}-${data.ageMax}`,
    `Additional info: ${data.additionalInfo || 'not set'}`,
    `Active: ${data.isActive ? 'yes' : 'no'}`
  ].join('\n');
}

function getCourseWizardPrompt(step) {
  const prompts = {
    title: 'Enter course title:',
    educationType: 'Choose education type from the buttons below:',
    duration: 'Enter duration, or send `-` to skip:',
    format: 'Enter format (online, offline, or hybrid):',
    hasPractice: 'Has practice? Reply `yes` or `no`:',
    cost: 'Enter cost, or send `-` to skip:',
    canPayInInstallments: 'Can students pay in installments? Reply `yes` or `no`:',
    ageMin: 'Enter minimum age:',
    ageMax: 'Enter maximum age:',
    additionalInfo: 'Enter additional info, or send `-` to skip:',
    isActive: 'Should the course be active now? Reply `yes` or `no`:'
  };

  return prompts[step] || 'Enter value:';
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
  if (text === '-') return { ok: true, value: null };

  if (COURSE_BOOLEAN_FIELDS.has(step)) {
    const parsed = parseBooleanInput(text);
    return parsed === null ? { ok: false } : { ok: true, value: parsed };
  }

  if (COURSE_INT_FIELDS.has(step)) {
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
  }

  if (step === 'educationType') {
    return EDUCATION_OPTIONS[text] ? { ok: true, value: text } : { ok: false };
  }

  return { ok: true, value: text };
}

function normalizeCourseWizardCallback(step, value) {
  if (COURSE_BOOLEAN_FIELDS.has(step)) {
    if (value === 'true') return { ok: true, value: true };
    if (value === 'false') return { ok: true, value: false };
    return { ok: false };
  }

  if (step === 'educationType') {
    return EDUCATION_OPTIONS[value] ? { ok: true, value } : { ok: false };
  }

  return { ok: false };
}

async function finishCourseWizard(chatId) {
  const state = courseCreateState.get(chatId);
  if (!state) return;

  try {
    const course = await createCourse(state.data);
    await bot.sendMessage(
      chatId,
      `Course created successfully.\nID: ${course.id}\nTitle: ${course.title}\nActive: ${course.isActive ? 'yes' : 'no'}`
    );
  } catch (err) {
    await bot.sendMessage(chatId, `Failed to create course: ${err.message}`);
  } finally {
    courseCreateState.delete(chatId);
  }
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
  if (step === 'educationType') {
    return {
      inline_keyboard: chunk(
        Object.entries(EDUCATION_OPTIONS).map(([value, label]) => ({
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
        { text: 'Yes', callback_data: `course_create:pick:${step}:true` },
        { text: 'No', callback_data: `course_create:pick:${step}:false` }
      ]]
    };
  }

  if (COURSE_STATUS_FIELDS.has(step)) {
    return {
      inline_keyboard: [[
        { text: 'Active', callback_data: `course_create:pick:${step}:true` },
        { text: 'Inactive', callback_data: `course_create:pick:${step}:false` }
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
    `Вид обучения: ${course.educationType}`,
    course.duration ? `Продолжительность: ${course.duration}` : null,
    `Формат: ${course.format}`,
    `Практика: ${yesNo(course.hasPractice, chatId)}`,
    course.cost ? `Стоимость: ${course.cost}` : null,
    `Оплата частями: ${yesNo(course.canPayInInstallments, chatId)}`,
    `Возраст: ${course.ageMin}-${course.ageMax} лет`,
    course.additionalInfo ? `Дополнительная информация про курс: ${course.additionalInfo}` : null
  ]
    .filter(Boolean)
    .join('\n');
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

function getOptionsForStep(step, chatId) {
  const t = getText(chatId);

  if (step === 'educationType') {
    return EDUCATION_OPTIONS;
  }

  return t.options[step] || {};
}

function getPrompt(step, chatId) {
  const t = getText(chatId);

  if (step === 'gender') return t.gender;
  if (step === 'educationType') return t.educationType;
  if (step === 'learningGoal') return t.learningGoal;
  if (step === 'studyFormat') return t.studyFormat;

  return t.enter[step];
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
    comment: value.comment
  });

  const course = await prisma.course.findUnique({ where: { id: value.courseId } });
  const courseTitle = course ? course.title : String(value.courseId);

  await notifyAdmins(
    `Новая заявка:\nИмя: ${value.fullName}\nТелефон: ${value.phone}\nКурс: ${courseTitle}\nДата рождения: ${state.data.birthDate}\nВозраст: ${age}\nГород: ${value.city}`
  );
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

  if (state.step < STEPS.length) {
    await askCurrentStep(chatId);
    return;
  }

  await finishApplication(chatId);
}

if (bot) {
  bot.onText(/\/start/, async (msg) => {
    formState.delete(msg.chat.id);
    await sendLanguageMenu(msg.chat.id);
  });

  bot.onText(/\/course_create(?:\s+([\s\S]+))?$/, async (msg, match) => {
    if (!isBotAdminUser(msg.from)) {
      await bot.sendMessage(msg.chat.id, 'Unauthorized');
      return;
    }

    const payloadText = (match?.[1] || '').trim();
    if (payloadText) {
      const { value: payload, error } = safeJsonParse(payloadText);
      if (error || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
        await bot.sendMessage(msg.chat.id, 'Invalid JSON payload.');
        return;
      }

      try {
        const course = await createCourse(payload);
        await bot.sendMessage(
          msg.chat.id,
          `Course created:\nID: ${course.id}\nTitle: ${course.title}\nActive: ${course.isActive ? 'yes' : 'no'}`
        );
      } catch (err) {
        await bot.sendMessage(msg.chat.id, `Failed to create course: ${err.message}`);
      }
      return;
    }

    startCourseWizard(msg.chat.id);
    await bot.sendMessage(
      msg.chat.id,
      'Course creation wizard started. Send /cancel to stop at any time.'
    );
    await askCourseWizardStep(msg.chat.id);
  });

  bot.onText(/\/cancel/, async (msg) => {
    if (courseCreateState.has(msg.chat.id)) {
      courseCreateState.delete(msg.chat.id);
      await bot.sendMessage(msg.chat.id, 'Course creation cancelled.');
      return;
    }

    if (formState.has(msg.chat.id)) {
      formState.delete(msg.chat.id);
      await bot.sendMessage(msg.chat.id, 'Application cancelled.');
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    if (query.data.startsWith('lang:')) {
      const lang = query.data.split(':')[1];
      if (TEXT[lang]) {
        userLanguage.set(chatId, lang);
      }
      await sendMainMenu(chatId);
      return;
    }

    if (query.data.startsWith('course_create:pick:')) {
      const courseState = courseCreateState.get(chatId);
      if (!courseState) return;

      const [, , , step, value] = query.data.split(':');
      if (COURSE_WIZARD_STEPS[courseState.stepIndex] !== step) return;

      const parsed = normalizeCourseWizardCallback(step, value);
      if (!parsed.ok) {
        await bot.sendMessage(chatId, `Invalid selection. ${getCourseWizardPrompt(step)}`);
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

    if (query.data === 'choose_course') {
      await sendCourseList(chatId);
      return;
    }

    if (query.data.startsWith('course:')) {
      const courseId = Number(query.data.split(':')[1]);
      const course = await prisma.course.findFirst({ where: { id: courseId, isActive: true } });

      if (!course) {
        await sendCourseList(chatId);
        return;
      }

      await bot.sendMessage(chatId, formatCourseInfo(course, chatId));
      formState.set(chatId, {
        step: 0,
        data: {
          telegramId: String(query.from.id),
          telegramUsername: query.from.username || '',
          courseId
        }
      });
      await bot.sendMessage(chatId, getText(chatId).selectedCourse(course.title));
      await askCurrentStep(chatId);
      return;
    }

    if (query.data.startsWith('answer:')) {
      const [, step, value] = query.data.split(':');
      await saveAnswer(chatId, step, value);
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const courseState = courseCreateState.get(msg.chat.id);
    if (courseState) {
      const step = COURSE_WIZARD_STEPS[courseState.stepIndex];
      const parsed = normalizeCourseWizardValue(step, msg.text);

      if (!parsed.ok) {
        await bot.sendMessage(msg.chat.id, `Invalid value. ${getCourseWizardPrompt(step)}`);
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

    const state = formState.get(msg.chat.id);
    if (!state) return;

    const step = STEPS[state.step];
    if (OPTION_STEPS.includes(step)) {
      await askCurrentStep(msg.chat.id);
      return;
    }

    await saveAnswer(msg.chat.id, step, msg.text);
  });

  bot.onText(/\/stats/, async (msg) => {
    const applications = await prisma.application.count();
    await bot.sendMessage(msg.chat.id, getText(msg.chat.id).stats(applications));
  });
}

module.exports = bot;
