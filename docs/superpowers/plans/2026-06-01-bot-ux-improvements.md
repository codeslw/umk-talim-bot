# Bot UX & Business Logic Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Russian-only labels, add progress indicator and confirmation step to application flow, expand admin application cards, enforce per-course age validation, sanitize error messages, and gate `/stats` to admins.

**Architecture:** All changes are contained in `src/bot/` (i18n.ts, presenters.ts, courseWizard.ts, index.ts) plus a minor relaxation in `src/validators/application.validator.ts`. Pure helper functions get unit tests; Telegram-coupled handlers are verified manually via bot interaction.

**Tech Stack:** TypeScript (compiled via ts-node), node-telegram-bot-api, Prisma/PostgreSQL, Joi, Jest (added for unit tests only)

---

## File Map

| File | Role |
|------|------|
| `src/bot/i18n.ts` | Add `courseInfoLabels`, `courseWizardLabels`, `confirmLabels`, `sourceOptions` to all 3 locales |
| `src/bot/presenters.ts` | Fix `formatCourseInfo` lang param; expand `formatApplicationCard`; add `formatApplicationSummary` |
| `src/bot/courseWizard.ts` | Update `formatCourseWizardSummary` to accept `lang`, use i18n labels |
| `src/bot/index.ts` | Progress indicator; source buttons + OTHER_PENDING flow; confirmation step + callbacks; dynamic age validation; `safeUserError`; `/stats` admin gate |
| `src/validators/application.validator.ts` | Relax hardcoded age range 18–45 → 0–120 |
| `tests/bot/presenters.test.ts` | Unit tests for `formatCourseInfo`, `formatApplicationCard`, `formatApplicationSummary` |
| `tests/bot/courseWizard.test.ts` | Unit tests for updated `formatCourseWizardSummary` |
| `tests/bot/i18n.test.ts` | Smoke tests: all 3 locales have required keys |

---

### Task 1: Install Jest and configure for TypeScript

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `tsconfig.test.json`

- [ ] **Step 1: Install Jest + TypeScript support**

```bash
npm install --save-dev jest ts-jest @types/jest
```

Expected: packages appear in `devDependencies` in `package.json`.

- [ ] **Step 2: Create `jest.config.js`**

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        resolveJsonModule: true
      }
    }
  }
};
```

- [ ] **Step 3: Add test script to `package.json`**

In the `scripts` block add:
```json
"test": "jest"
```

- [ ] **Step 4: Create `tests/` directory and verify Jest works**

```bash
mkdir -p tests/bot
echo 'test("sanity", () => expect(1+1).toBe(2));' > tests/bot/sanity.test.ts
npx jest tests/bot/sanity.test.ts
```

Expected output contains: `PASS tests/bot/sanity.test.ts`

- [ ] **Step 5: Remove sanity file and commit**

```bash
rm tests/bot/sanity.test.ts
git add jest.config.js package.json package-lock.json
git commit -m "chore: add jest + ts-jest for unit tests"
```

---

### Task 2: Expand i18n with new label groups

**Files:**
- Modify: `src/bot/i18n.ts`

The goal is to add 4 new key groups to each of the 3 locales: `courseInfoLabels`, `courseWizardLabels`, `confirmLabels`, `sourceOptions`.

- [ ] **Step 1: Write the failing i18n smoke test**

Create `tests/bot/i18n.test.ts`:

```ts
const { TEXT } = require('../../src/bot/i18n');

const LOCALES = ['ru', 'uz', 'uz_lat'];

const REQUIRED_COURSE_INFO_LABELS = [
  'duration', 'format', 'practice', 'cost', 'installments', 'age', 'additionalInfo'
];

const REQUIRED_CONFIRM_LABELS = [
  'header', 'fullName', 'gender', 'birthDate', 'phone', 'city',
  'experience', 'workplace', 'specialization', 'learningGoal',
  'studyFormat', 'studyTime', 'source', 'comment', 'confirm', 'cancel',
  'courseTitle'
];

const REQUIRED_SOURCE_OPTIONS = ['instagram', 'friends', 'ad', 'youtube', 'other'];

const REQUIRED_WIZARD_LABELS = [
  'preview', 'title', 'image', 'duration', 'format', 'practice',
  'cost', 'installments', 'ageRange', 'additionalInfo', 'active',
  'uploaded', 'notSet', 'yes', 'no'
];

describe('i18n completeness', () => {
  for (const locale of LOCALES) {
    describe(`locale: ${locale}`, () => {
      it('has courseInfoLabels with all required keys', () => {
        const labels = TEXT[locale].courseInfoLabels;
        expect(labels).toBeDefined();
        for (const key of REQUIRED_COURSE_INFO_LABELS) {
          expect(labels[key]).toBeDefined();
        }
      });

      it('has confirmLabels with all required keys', () => {
        const labels = TEXT[locale].confirmLabels;
        expect(labels).toBeDefined();
        for (const key of REQUIRED_CONFIRM_LABELS) {
          expect(labels[key]).toBeDefined();
        }
      });

      it('has sourceOptions with all required keys', () => {
        const opts = TEXT[locale].sourceOptions;
        expect(opts).toBeDefined();
        for (const key of REQUIRED_SOURCE_OPTIONS) {
          expect(opts[key]).toBeDefined();
        }
      });

      it('has courseWizardLabels with all required keys', () => {
        const labels = TEXT[locale].courseWizardLabels;
        expect(labels).toBeDefined();
        for (const key of REQUIRED_WIZARD_LABELS) {
          expect(labels[key]).toBeDefined();
        }
      });
    });
  }
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest tests/bot/i18n.test.ts
```

Expected: FAIL — `courseInfoLabels` is undefined.

- [ ] **Step 3: Add new i18n keys to all 3 locales in `src/bot/i18n.ts`**

Replace the entire file content with the following (preserving all existing keys, adding the 4 new groups to each locale):

```ts
const LANGUAGE_LABELS = Object.freeze({
  ru: 'Русский',
  uz: 'Узбекский',
  uz_lat: "O'zbek"
});

const TEXT = Object.freeze({
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
      source: 'Откуда узнали о нас?',
      sourceOther: 'Напишите, откуда узнали о нас:',
      comment: 'Введите комментарий (или "-", чтобы пропустить):'
    },
    gender: 'Выберите пол:',
    learningGoal: 'Выберите цель обучения:',
    studyFormat: 'Выберите формат обучения:',
    ageOutOfRange: (min, max) => `Возраст должен быть от ${min} до ${max} лет.`,
    invalid: (message) => `Ошибка: ${message}`,
    saved: (id, title) => `Заявка №${id} успешно отправлена на курс "${title}".`,
    stats: (total) => `Всего заявок: ${total}`,
    error: 'Произошла ошибка. Попробуйте /start ещё раз.',
    options: {
      gender: { MALE: 'Мужской', FEMALE: 'Женский' },
      learningGoal: {
        CAREER_CHANGE: 'Смена профессии',
        QUALIFICATION: 'Повышение квалификации',
        JOB_SEARCH: 'Поиск работы',
        PERSONAL_DEVELOPMENT: 'Личное развитие'
      },
      studyFormat: { ONLINE: 'Онлайн', OFFLINE: 'Офлайн', HYBRID: 'Смешанный' }
    },
    sourceOptions: {
      instagram: 'Instagram',
      friends: 'Друзья / знакомые',
      ad: 'Реклама',
      youtube: 'YouTube',
      other: 'Другое'
    },
    courseInfoLabels: {
      duration: 'Продолжительность',
      format: 'Формат',
      practice: 'Практика',
      cost: 'Стоимость',
      installments: 'Оплата частями',
      age: 'Возраст',
      additionalInfo: 'Дополнительная информация'
    },
    courseWizardLabels: {
      preview: 'Предпросмотр курса:',
      title: 'Название',
      image: 'Изображение',
      duration: 'Продолжительность',
      format: 'Формат',
      practice: 'Практика',
      cost: 'Стоимость',
      installments: 'Оплата частями',
      ageRange: 'Возраст',
      additionalInfo: 'Дополнительная информация',
      active: 'Активен',
      uploaded: 'загружено',
      notSet: 'не указано',
      yes: 'да',
      no: 'нет'
    },
    confirmLabels: {
      header: 'Проверьте вашу заявку:',
      courseTitle: 'Курс',
      fullName: 'ФИО',
      gender: 'Пол',
      birthDate: 'Дата рождения',
      phone: 'Телефон',
      city: 'Город',
      experience: 'Опыт работы',
      workplace: 'Место работы',
      specialization: 'Специализация',
      learningGoal: 'Цель обучения',
      studyFormat: 'Формат обучения',
      studyTime: 'Удобное время',
      source: 'Откуда узнали',
      comment: 'Комментарий',
      confirm: '✅ Подтвердить',
      cancel: '❌ Отменить и начать заново'
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
      source: 'Биз ҳақимизда қаердан билдингиз?',
      sourceOther: 'Биз ҳақимизда қаердан билганингизни ёзинг:',
      comment: 'Изоҳ киритинг (ёки «-» юборинг):'
    },
    gender: 'Жинсни танланг:',
    learningGoal: 'Ўқиш мақсадини танланг:',
    studyFormat: 'Ўқиш форматини танланг:',
    ageOutOfRange: (min, max) => `Ёш ${min} дан ${max} гача бўлиши керак.`,
    invalid: (message) => `Хатолик: ${message}`,
    saved: (id, title) => `Ариза №${id} "${title}" курсига муваффақиятли юборилди.`,
    stats: (total) => `Жами аризалар: ${total}`,
    error: 'Хатолик юз берди. /start ни қайта уриниб кўринг.',
    options: {
      gender: { MALE: 'Эркак', FEMALE: 'Аёл' },
      learningGoal: {
        CAREER_CHANGE: 'Касбни ўзгартириш',
        QUALIFICATION: 'Малака ошириш',
        JOB_SEARCH: 'Иш топиш',
        PERSONAL_DEVELOPMENT: 'Шахсий ривожланиш'
      },
      studyFormat: { ONLINE: 'Онлайн', OFFLINE: 'Офлайн', HYBRID: 'Аралаш' }
    },
    sourceOptions: {
      instagram: 'Instagram',
      friends: 'Дўстлар / танишлар',
      ad: 'Реклама',
      youtube: 'YouTube',
      other: 'Бошқа'
    },
    courseInfoLabels: {
      duration: 'Муддат',
      format: 'Формат',
      practice: 'Амалиёт',
      cost: 'Нарх',
      installments: 'Бўлиб тўлаш',
      age: 'Ёш',
      additionalInfo: 'Қўшимча маълумот'
    },
    courseWizardLabels: {
      preview: 'Курс кўриниши:',
      title: 'Номи',
      image: 'Расм',
      duration: 'Муддат',
      format: 'Формат',
      practice: 'Амалиёт',
      cost: 'Нарх',
      installments: 'Бўлиб тўлаш',
      ageRange: 'Ёш',
      additionalInfo: 'Қўшимча маълумот',
      active: 'Фаол',
      uploaded: 'юкланган',
      notSet: 'кўрсатилмаган',
      yes: 'ха',
      no: 'йўқ'
    },
    confirmLabels: {
      header: 'Аризангизни текширинг:',
      courseTitle: 'Курс',
      fullName: 'Ф.И.О.',
      gender: 'Жинс',
      birthDate: 'Туғилган сана',
      phone: 'Телефон',
      city: 'Шаҳар',
      experience: 'Иш тажрибаси',
      workplace: 'Иш жойи',
      specialization: 'Мутахассислик',
      learningGoal: 'Ўқиш мақсади',
      studyFormat: 'Ўқиш формати',
      studyTime: 'Қулай вақт',
      source: 'Қаердан билдингиз',
      comment: 'Изоҳ',
      confirm: '✅ Тасдиқлаш',
      cancel: '❌ Бекор қилиш ва қайта бошлаш'
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
      source: "Biz haqimizda qayerdan bildingiz?",
      sourceOther: "Biz haqimizda qayerdan bilganingizni yozing:",
      comment: "Izoh kiriting (yoki «-» yuboring):"
    },
    gender: 'Jinsni tanlang:',
    learningGoal: "O'qish maqsadini tanlang:",
    studyFormat: "O'qish formatini tanlang:",
    ageOutOfRange: (min, max) => `Yosh ${min} dan ${max} gacha bo'lishi kerak.`,
    invalid: (message) => `Xatolik: ${message}`,
    saved: (id, title) => `Ariza №${id} "${title}" kursiga muvaffaqiyatli yuborildi.`,
    stats: (total) => `Jami arizalar: ${total}`,
    error: "Xatolik yuz berdi. /start ni qayta urinib ko'ring.",
    options: {
      gender: { MALE: 'Erkak', FEMALE: 'Ayol' },
      learningGoal: {
        CAREER_CHANGE: "Kasbni o'zgartirish",
        QUALIFICATION: 'Malaka oshirish',
        JOB_SEARCH: 'Ish topish',
        PERSONAL_DEVELOPMENT: 'Shaxsiy rivojlanish'
      },
      studyFormat: { ONLINE: 'Onlayn', OFFLINE: 'Oflayn', HYBRID: 'Aralash' }
    },
    sourceOptions: {
      instagram: 'Instagram',
      friends: "Do'stlar / tanishlar",
      ad: 'Reklama',
      youtube: 'YouTube',
      other: 'Boshqa'
    },
    courseInfoLabels: {
      duration: 'Davomiyligi',
      format: 'Format',
      practice: 'Amaliyot',
      cost: 'Narxi',
      installments: "Bo'lib to'lash",
      age: 'Yosh',
      additionalInfo: "Qo'shimcha ma'lumot"
    },
    courseWizardLabels: {
      preview: 'Kurs ko\'rinishi:',
      title: 'Nomi',
      image: 'Rasm',
      duration: 'Davomiyligi',
      format: 'Format',
      practice: 'Amaliyot',
      cost: 'Narxi',
      installments: "Bo'lib to'lash",
      ageRange: 'Yosh',
      additionalInfo: "Qo'shimcha ma'lumot",
      active: 'Faol',
      uploaded: 'yuklangan',
      notSet: "ko'rsatilmagan",
      yes: 'ha',
      no: "yo'q"
    },
    confirmLabels: {
      header: 'Arizangizni tekshiring:',
      courseTitle: 'Kurs',
      fullName: 'F.I.O.',
      gender: 'Jins',
      birthDate: "Tug'ilgan sana",
      phone: 'Telefon',
      city: 'Shahar',
      experience: 'Ish tajribasi',
      workplace: 'Ish joyi',
      specialization: 'Mutaxassislik',
      learningGoal: "O'qish maqsadi",
      studyFormat: "O'qish formati",
      studyTime: 'Qulay vaqt',
      source: 'Qayerdan bildingiz',
      comment: 'Izoh',
      confirm: '✅ Tasdiqlash',
      cancel: '❌ Bekor qilish va qayta boshlash'
    }
  }
});

module.exports = { LANGUAGE_LABELS, TEXT };
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest tests/bot/i18n.test.ts
```

Expected: `PASS tests/bot/i18n.test.ts` — all locales have all required keys.

- [ ] **Step 5: Commit**

```bash
git add src/bot/i18n.ts tests/bot/i18n.test.ts
git commit -m "feat: add courseInfoLabels, confirmLabels, sourceOptions, courseWizardLabels to all locales"
```

---

### Task 3: Fix `formatCourseWizardSummary` to use i18n labels

**Files:**
- Modify: `src/bot/courseWizard.ts`
- Create: `tests/bot/courseWizard.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/bot/courseWizard.test.ts`:

```ts
const { formatCourseWizardSummary } = require('../../src/bot/courseWizard');
const { TEXT } = require('../../src/bot/i18n');

describe('formatCourseWizardSummary', () => {
  const data = {
    title: 'Веб-разработка',
    imageFileId: 'abc123',
    duration: '3 месяца',
    format: 'ONLINE',
    hasPractice: true,
    cost: '500000',
    canPayInInstallments: false,
    ageMin: 18,
    ageMax: 35,
    additionalInfo: null,
    isActive: true
  };

  it('uses ru labels when lang is ru', () => {
    const result = formatCourseWizardSummary(data, 'ru');
    expect(result).toContain(TEXT.ru.courseWizardLabels.preview);
    expect(result).toContain(TEXT.ru.courseWizardLabels.title);
    expect(result).toContain('Веб-разработка');
    expect(result).toContain(TEXT.ru.courseWizardLabels.uploaded);
    expect(result).toContain(TEXT.ru.courseWizardLabels.yes);
  });

  it('uses uz_lat labels when lang is uz_lat', () => {
    const result = formatCourseWizardSummary(data, 'uz_lat');
    expect(result).toContain(TEXT.uz_lat.courseWizardLabels.preview);
    expect(result).toContain(TEXT.uz_lat.courseWizardLabels.uploaded);
  });

  it('defaults to ru when no lang provided', () => {
    const result = formatCourseWizardSummary(data);
    expect(result).toContain(TEXT.ru.courseWizardLabels.preview);
  });

  it('shows notSet for null additionalInfo', () => {
    const result = formatCourseWizardSummary(data, 'ru');
    expect(result).toContain(TEXT.ru.courseWizardLabels.notSet);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest tests/bot/courseWizard.test.ts
```

Expected: FAIL — `formatCourseWizardSummary` doesn't accept a `lang` param yet.

- [ ] **Step 3: Update `formatCourseWizardSummary` in `src/bot/courseWizard.ts`**

Replace the existing `formatCourseWizardSummary` function (lines 50–68) with:

```ts
function formatCourseWizardSummary(data: CourseWizardData, lang = 'ru'): string {
  const { TEXT } = require('./i18n');
  const L = TEXT[lang]?.courseWizardLabels || TEXT.ru.courseWizardLabels;
  const { COURSE_FORMAT_OPTIONS } = require('../constants/course');

  return [
    L.preview,
    `${L.title}: ${data.title}`,
    `${L.image}: ${data.imageFileId ? L.uploaded : L.notSet}`,
    `${L.duration}: ${data.duration || L.notSet}`,
    `${L.format}: ${COURSE_FORMAT_OPTIONS[String(data.format)] || data.format}`,
    `${L.practice}: ${data.hasPractice ? L.yes : L.no}`,
    `${L.cost}: ${data.cost || L.notSet}`,
    `${L.installments}: ${data.canPayInInstallments ? L.yes : L.no}`,
    `${L.ageRange}: ${data.ageMin}-${data.ageMax}`,
    `${L.additionalInfo}: ${data.additionalInfo || L.notSet}`,
    `${L.active}: ${data.isActive ? L.yes : L.no}`
  ].join('\n');
}
```

Also remove the two `require` lines at the top of `courseWizard.ts` that were used only for `formatCourseWizardSummary` (the `COURSE_FORMAT_OPTIONS` require moves inside the function, and `parseBooleanStrict` stays at top since it's used by `normalizeCourseWizardValue`). Keep the existing `const { COURSE_FORMAT_OPTIONS } = require('../constants/course');` at the top for the other functions that use it.

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest tests/bot/courseWizard.test.ts
```

Expected: `PASS tests/bot/courseWizard.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/bot/courseWizard.ts tests/bot/courseWizard.test.ts
git commit -m "feat: make formatCourseWizardSummary i18n-aware"
```

---

### Task 4: Fix `formatCourseInfo` and expand `formatApplicationCard`, add `formatApplicationSummary`

**Files:**
- Modify: `src/bot/presenters.ts`
- Create: `tests/bot/presenters.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bot/presenters.test.ts`:

```ts
const { formatCourseInfo, formatApplicationCard, formatApplicationSummary } = require('../../src/bot/presenters');
const { TEXT } = require('../../src/bot/i18n');

const mockCourse = {
  title: 'Веб-разработка',
  duration: '3 месяца',
  format: 'ONLINE',
  hasPractice: true,
  cost: '500000',
  canPayInInstallments: false,
  ageMin: 18,
  ageMax: 35,
  additionalInfo: 'Для начинающих'
};

const mockApplication = {
  id: 42,
  status: 'IN_PROGRESS',
  createdAt: new Date('2026-06-01'),
  user: {
    fullName: 'Иванов Иван',
    phone: '+998901234567',
    gender: 'MALE',
    age: 27,
    city: 'Ташкент'
  },
  course: { title: 'Веб-разработка' },
  experience: '2 года',
  workplace: 'ООО Тест',
  specialization: 'Backend',
  learningGoal: 'QUALIFICATION',
  studyFormat: 'ONLINE',
  studyTime: 'Вечер',
  source: 'Instagram',
  comment: 'Хочу развиваться'
};

describe('formatCourseInfo', () => {
  it('uses ru labels for ru lang', () => {
    const result = formatCourseInfo(mockCourse, 'ru');
    expect(result).toContain(TEXT.ru.courseInfoLabels.duration);
    expect(result).toContain(TEXT.ru.courseInfoLabels.format);
    expect(result).toContain('3 месяца');
  });

  it('uses uz_lat labels for uz_lat lang', () => {
    const result = formatCourseInfo(mockCourse, 'uz_lat');
    expect(result).toContain(TEXT.uz_lat.courseInfoLabels.duration);
    expect(result).toContain(TEXT.uz_lat.courseInfoLabels.format);
  });

  it('omits duration when not set', () => {
    const result = formatCourseInfo({ ...mockCourse, duration: null }, 'ru');
    expect(result).not.toContain(TEXT.ru.courseInfoLabels.duration);
  });
});

describe('formatApplicationCard', () => {
  it('includes all main sections', () => {
    const result = formatApplicationCard(mockApplication);
    expect(result).toContain('#42');
    expect(result).toContain('Иванов Иван');
    expect(result).toContain('+998901234567');
    expect(result).toContain('Ташкент');
    expect(result).toContain('27');
    expect(result).toContain('Веб-разработка');
    expect(result).toContain('Instagram');
    expect(result).toContain('Хочу развиваться');
    expect(result).toContain('Backend');
  });

  it('omits null fields silently', () => {
    const result = formatApplicationCard({ ...mockApplication, comment: null, workplace: null });
    expect(result).not.toContain('Место работы:');
    expect(result).not.toContain('💬 Комментарий');
  });
});

describe('formatApplicationSummary', () => {
  const data = {
    courseTitle: 'Веб-разработка',
    fullName: 'Иванов Иван',
    gender: 'MALE',
    birthDate: '01.01.1999',
    phone: '+998901234567',
    city: 'Ташкент',
    experience: '2 года',
    workplace: null,
    specialization: 'Backend',
    learningGoal: 'QUALIFICATION',
    studyFormat: 'ONLINE',
    studyTime: 'Вечер',
    source: 'Instagram',
    comment: '-'
  };

  it('renders header from confirmLabels', () => {
    const result = formatApplicationSummary(data, 'ru');
    expect(result).toContain(TEXT.ru.confirmLabels.header);
  });

  it('shows all non-empty fields', () => {
    const result = formatApplicationSummary(data, 'ru');
    expect(result).toContain('Иванов Иван');
    expect(result).toContain('Ташкент');
    expect(result).toContain('Backend');
  });

  it('omits null and "-" fields', () => {
    const result = formatApplicationSummary(data, 'ru');
    expect(result).not.toContain(TEXT.ru.confirmLabels.workplace);
    expect(result).not.toContain(TEXT.ru.confirmLabels.comment);
  });

  it('uses uz labels for uz lang', () => {
    const result = formatApplicationSummary(data, 'uz');
    expect(result).toContain(TEXT.uz.confirmLabels.header);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/bot/presenters.test.ts
```

Expected: FAIL — `formatCourseInfo` uses hardcoded Russian labels; `formatApplicationCard` missing fields; `formatApplicationSummary` not defined.

- [ ] **Step 3: Rewrite `src/bot/presenters.ts`**

Replace the entire file with:

```ts
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

  const lines: string[] = [
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
    `Статус: ${statusLabel}`,
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
    application.source ? `Откуда узнали: ${application.source}` : null,
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/bot/presenters.test.ts
```

Expected: `PASS tests/bot/presenters.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/bot/presenters.ts tests/bot/presenters.test.ts
git commit -m "feat: fix formatCourseInfo i18n, expand formatApplicationCard, add formatApplicationSummary"
```

---

### Task 5: Relax age validation in Joi schema

**Files:**
- Modify: `src/validators/application.validator.ts`

The bot layer will now enforce per-course age bounds. The Joi schema only needs to confirm the value is a plausible age.

- [ ] **Step 1: Update `src/validators/application.validator.ts`**

Change the `birthDateSchema` age range check from `age < 18 || age > 45` to `age < 0 || age > 120`, and update the `age` field constraint:

```ts
const Joi = require('joi');
const { EDUCATION_TYPES, LEARNING_GOALS, STUDY_FORMATS } = require('../constants/application');
const { calculateAge, parseBirthDate } = require('../utils/date');

const birthDateSchema = Joi.custom((value, helpers) => {
  const birthDate = parseBirthDate(value);
  if (!birthDate) {
    return helpers.error('any.invalid');
  }

  const age = calculateAge(birthDate);
  if (age < 0 || age > 120) {
    return helpers.error('date.outOfRange');
  }

  return birthDate;
}, 'birth date in dd.mm.yyyy format').messages({
  'any.invalid': 'Дата рождения должна быть в формате дд.мм.гггг',
  'date.outOfRange': 'Некорректная дата рождения'
});

const applicationSchema = Joi.object({
  telegramId: Joi.string().required(),
  fullName: Joi.string().min(3).max(120).required(),
  gender: Joi.string().valid('MALE', 'FEMALE').required(),
  birthDate: birthDateSchema.required(),
  age: Joi.number().integer().min(0).max(120),
  phone: Joi.string().pattern(/^\+?[0-9()\-\s]{7,20}$/).required(),
  telegramUsername: Joi.string().max(64).allow('', null),
  city: Joi.string().min(2).max(80).required(),
  courseId: Joi.number().integer().required(),
  experience: Joi.string().max(500).allow('', null),
  workplace: Joi.string().max(200).allow('', null),
  educationType: Joi.string().valid(...EDUCATION_TYPES).allow(null),
  specialization: Joi.string().max(200).allow('', null),
  learningGoal: Joi.string().valid(...LEARNING_GOALS).required(),
  studyFormat: Joi.string().valid(...STUDY_FORMATS).required(),
  studyTime: Joi.string().max(120).required(),
  source: Joi.string().max(120).required(),
  comment: Joi.string().max(1000).allow('', null)
});

module.exports = { applicationSchema };
```

- [ ] **Step 2: Run typecheck to confirm no type errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/validators/application.validator.ts
git commit -m "fix: relax Joi age validation to 0-120, bot layer enforces per-course bounds"
```

---

### Task 6: Update `bot/index.ts` — progress indicator, source buttons, dynamic age validation, safeUserError, /stats gate, confirmation step

**Files:**
- Modify: `src/bot/index.ts`

This is the largest task. Apply changes in sub-steps to keep diffs reviewable.

#### Sub-step A: Add `safeUserError` and gate `/stats`

- [ ] **Step 1: Add `safeUserError` function after `getLang`/`getText` helpers (around line 197 in current file)**

Insert after the `getText` function:

```ts
function safeUserError(chatId): string {
  return getText(chatId).error;
}
```

- [ ] **Step 2: Replace raw `err.message` exposure in the global `catch` blocks**

In the `callback_query` handler's outer catch (currently line ~804):
```ts
// OLD:
try { await bot.sendMessage(chatId, `Произошла ошибка. Попробуйте /start ещё раз.\n${err.message}`); } catch (_) {}
// NEW:
try { await bot.sendMessage(chatId, safeUserError(chatId)); } catch (_) {}
```

In the `message` handler's outer catch (currently line ~937):
```ts
// OLD:
try { await bot.sendMessage(msg.chat.id, `Произошла ошибка: ${err.message}`); } catch (_) {}
// NEW:
try { await bot.sendMessage(msg.chat.id, safeUserError(msg.chat.id)); } catch (_) {}
```

- [ ] **Step 3: Gate `/stats` to admins**

Find the `/stats` handler (around line 941) and add the admin check:

```ts
bot.onText(/\/stats/, async (msg) => {
  if (!isBotAdminUser(msg.from)) {
    await bot.sendMessage(msg.chat.id, 'Недостаточно прав.');
    return;
  }
  const stats = await getApplicationStats();
  await bot.sendMessage(msg.chat.id, getText(msg.chat.id).stats(stats.total));
});
```

- [ ] **Step 4: Commit sub-step A**

```bash
git add src/bot/index.ts
git commit -m "fix: sanitize user-facing error messages, gate /stats to admins"
```

#### Sub-step B: Progress indicator

- [ ] **Step 5: Update `askCurrentStep` to prefix prompt with step counter**

Find the `askCurrentStep` function (around line 332) and update it:

```ts
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
```

- [ ] **Step 6: Commit sub-step B**

```bash
git add src/bot/index.ts
git commit -m "feat: add step progress indicator to application form"
```

#### Sub-step C: Source field as inline buttons

- [ ] **Step 7: Add `source` to `OPTION_STEPS` and update `getOptionsForStep`**

Change line:
```ts
const OPTION_STEPS = ['gender', 'learningGoal', 'studyFormat'];
```
to:
```ts
const OPTION_STEPS = ['gender', 'learningGoal', 'studyFormat', 'source'];
```

Update `getOptionsForStep` to handle `source` from `sourceOptions`:

```ts
function getOptionsForStep(step, chatId) {
  const t = getText(chatId);
  if (step === 'source') {
    return t.sourceOptions || {};
  }
  return t.options[step] || {};
}
```

- [ ] **Step 8: Add `OTHER_PENDING` handling in `saveAnswer` and message handler**

In `saveAnswer`, after saving the value, add the OTHER_PENDING guard:

```ts
async function saveAnswer(chatId, step, value) {
  const state = formState.get(chatId);
  if (!state || STEPS[state.step] !== step) return;

  if (step === 'birthDate' && !parseBirthDate(value)) {
    await bot.sendMessage(chatId, getPrompt(step, chatId));
    return;
  }

  // Per-course age validation
  if (step === 'birthDate') {
    const birthDate = parseBirthDate(value);
    const age = birthDate ? calculateAge(birthDate) : null;
    const min = state.courseAgeMin ?? 18;
    const max = state.courseAgeMax ?? 45;
    if (age === null || age < min || age > max) {
      const t = getText(chatId);
      await bot.sendMessage(chatId, t.ageOutOfRange(min, max));
      await bot.sendMessage(chatId, getPrompt(step, chatId));
      return;
    }
  }

  if (step === 'source' && value === 'other') {
    state.data[step] = 'OTHER_PENDING';
    await bot.sendMessage(chatId, getText(chatId).enter.sourceOther);
    return;
  }

  state.data[step] = typeof value === 'string' ? value.trim() : value;
  state.step += 1;
  skipSavedPersonalSteps(state);

  if (state.step < STEPS.length) {
    await askCurrentStep(chatId);
    return;
  }

  await showConfirmation(chatId);
}
```

In the `message` handler, resolve `OTHER_PENDING` before the normal step handling. Add this block just before the `const step = STEPS[state.step];` line in the message handler's form state section:

```ts
if (state.data.source === 'OTHER_PENDING') {
  state.data.source = msg.text.trim();
  state.step += 1;
  skipSavedPersonalSteps(state);
  if (state.step < STEPS.length) {
    await askCurrentStep(chatId);
    return;
  }
  await showConfirmation(chatId);
  return;
}
```

- [ ] **Step 9: Commit sub-step C**

```bash
git add src/bot/index.ts
git commit -m "feat: source field as inline buttons with free-text fallback"
```

#### Sub-step D: Dynamic age validation

The age validation is already included in `saveAnswer` in Step 8 above. This sub-step adds the course age bounds to `formState` at initialization.

- [ ] **Step 10: Store course age bounds when form state is created**

In the `course:` callback handler (around line 759), update the `nextState` initialization:

```ts
const nextState = {
  step: 0,
  data: applicationData,
  courseAgeMin: course.ageMin ?? 18,
  courseAgeMax: course.ageMax ?? 45,
  awaitingConfirmation: false
};
```

Also update `hasSavedPersonalValue` to accept and use `state`:

```ts
function hasSavedPersonalValue(data, step, state?) {
  const value = data[step];

  if (step === 'birthDate') {
    const birthDate = parseBirthDate(value);
    const age = birthDate ? calculateAge(birthDate) : null;
    const min = state?.courseAgeMin ?? 18;
    const max = state?.courseAgeMax ?? 45;
    return Number.isInteger(age) && age >= min && age <= max;
  }
  if (step === 'gender') return ['MALE', 'FEMALE'].includes(value);
  if (step === 'fullName') return typeof value === 'string' && value.trim().length >= 3;
  if (step === 'phone') return typeof value === 'string' && /^\+?[0-9()\-\s]{7,20}$/.test(value.trim());
  if (step === 'city') return typeof value === 'string' && value.trim().length >= 2;
  return value !== null && value !== undefined;
}
```

Update `skipSavedPersonalSteps` to pass `state` through:

```ts
function skipSavedPersonalSteps(state) {
  while (
    state.step < STEPS.length &&
    PERSONAL_STEPS.has(STEPS[state.step]) &&
    hasSavedPersonalValue(state.data, STEPS[state.step], state)
  ) {
    state.step += 1;
  }
}
```

- [ ] **Step 11: Commit sub-step D**

```bash
git add src/bot/index.ts
git commit -m "feat: validate birthDate against per-course ageMin/ageMax"
```

#### Sub-step E: Confirmation step

- [ ] **Step 12: Add `showConfirmation` function**

Add this function after `askCurrentStep`:

```ts
async function showConfirmation(chatId) {
  const state = formState.get(chatId);
  if (!state) return;

  const { formatApplicationSummary } = require('./presenters');
  const lang = getLang(chatId);
  const t = getText(chatId);
  const L = t.confirmLabels;

  state.awaitingConfirmation = true;

  const summary = formatApplicationSummary(state.data, lang);

  await bot.sendMessage(chatId, summary, {
    reply_markup: {
      inline_keyboard: [[
        { text: L.confirm, callback_data: 'confirm_app' },
        { text: L.cancel, callback_data: 'cancel_app' }
      ]]
    }
  });
}
```

- [ ] **Step 13: Replace `finishApplication` call at end of `saveAnswer` with `showConfirmation`**

In `saveAnswer`, the last two lines were previously:
```ts
await finishApplication(chatId);
```
This is already updated in Step 8 to call `showConfirmation(chatId)`. Verify it is consistent.

- [ ] **Step 14: Add `confirm_app` and `cancel_app` callback handlers**

In the `callback_query` handler, add before the final `await answerCallbackQuery(query.id, { text: 'Неизвестное действие.' });`:

```ts
if (callbackData === 'confirm_app') {
  const state = formState.get(chatId);
  if (!state || !state.awaitingConfirmation) {
    await answerCallbackQuery(query.id, { text: 'Нет активной заявки.' });
    return;
  }
  await answerCallbackQuery(query.id);
  await finishApplication(chatId);
  return;
}

if (callbackData === 'cancel_app') {
  formState.delete(chatId);
  await answerCallbackQuery(query.id);
  await sendMainMenu(chatId);
  return;
}
```

- [ ] **Step 15: Guard message handler against stray messages during `awaitingConfirmation`**

In the `message` handler, right after `const state = formState.get(msg.chat.id);` and before any processing:

```ts
if (state?.awaitingConfirmation) return;
```

- [ ] **Step 16: Pass `lang` to `formatCourseWizardSummary` calls in index.ts**

The admin wizard summary is called in two places in `index.ts`. Find both calls to `formatCourseWizardSummary` and ensure they pass `'ru'` (admin context):

In `finishCourseWizard` (around line 153):
```ts
await bot.sendMessage(chatId, formatCourseWizardSummary(courseState.data, 'ru'));
```

In the `course_create:pick:` callback handler (around line 576):
```ts
await bot.sendMessage(chatId, formatCourseWizardSummary(courseState.data, 'ru'));
```

Also update the call in the `photo` handler (around line 819):
```ts
await bot.sendMessage(chatId, formatCourseWizardSummary(courseState.data, 'ru'));
```

And in the `message` handler for course wizard (around line 880):
```ts
await bot.sendMessage(msg.chat.id, formatCourseWizardSummary(courseState.data, 'ru'));
```

- [ ] **Step 17: Pass lang to `formatCourseInfo` calls in index.ts**

Find the call to `formatCourseInfo` (around line 769):
```ts
// OLD:
const infoText = formatCourseInfo(course, getLang(chatId));
// This may already pass lang — verify it does. If not, update it.
```

It already passes `getLang(chatId)` — confirm it matches the signature `formatCourseInfo(course, lang)`. If the old call was `formatCourseInfo(course)`, update it to `formatCourseInfo(course, getLang(chatId))`.

- [ ] **Step 18: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 19: Commit sub-step E**

```bash
git add src/bot/index.ts
git commit -m "feat: add application confirmation step with summary card and confirm/cancel buttons"
```

---

### Task 7: Run all tests and manual smoke test

- [ ] **Step 1: Run full test suite**

```bash
npx jest
```

Expected: all tests pass — `i18n.test.ts`, `courseWizard.test.ts`, `presenters.test.ts`.

- [ ] **Step 2: Manual smoke test — user flow**

Start the bot in dev mode:
```bash
npm run dev
```

Check the following:
1. `/start` → language menu appears with 3 options
2. Select a language → main menu appears in chosen language
3. Tap "Choose course" → course list appears
4. Select a course → course info card shows labels in chosen language (not hardcoded Russian)
5. Progress through form → each prompt shows `(N/13)` prefix
6. Reach `source` step → inline buttons appear (Instagram, friends, ad, YouTube, Other)
7. Select "Other" → bot asks for free-text input; type something; it proceeds to next step
8. Reach end of form → summary card appears in chosen language with confirm/cancel buttons
9. Tap cancel → returns to main menu
10. Repeat and tap confirm → "Заявка №X отправлена..." success message

- [ ] **Step 3: Manual smoke test — admin flows**

1. `/stats` as non-admin → "Недостаточно прав."
2. `/stats` as admin → shows total count
3. `/course_list` → each course card shows correctly
4. Create a course via `/course_create` wizard → summary at end shows labels correctly
5. `/applications` → each application card shows all sections (personal, course, profile, comment)

- [ ] **Step 4: Final commit if any fixups were needed**

```bash
git add -p  # stage only intentional fixups
git commit -m "fix: post-smoke-test corrections"
```

---

## Self-Review

**Spec coverage check:**
- ✅ i18n fix — courseInfoLabels, courseWizardLabels, confirmLabels, sourceOptions in all 3 locales (Task 2)
- ✅ `formatCourseInfo` uses lang param (Task 4)
- ✅ `formatCourseWizardSummary` uses lang param (Task 3)
- ✅ Progress indicator `(N/13)` (Task 6, Sub-step B)
- ✅ Source field as inline buttons with OTHER_PENDING free-text flow (Task 6, Sub-step C)
- ✅ Confirmation step with summary card + confirm/cancel (Task 6, Sub-step E)
- ✅ Full application card for admins (Task 4)
- ✅ `formatApplicationSummary` for confirmation card (Task 4)
- ✅ Dynamic age validation against course `ageMin`/`ageMax` (Task 6, Sub-step D)
- ✅ Joi schema relaxed to 0–120 (Task 5)
- ✅ `safeUserError` sanitizes error messages (Task 6, Sub-step A)
- ✅ `/stats` gated to admins (Task 6, Sub-step A)
- ✅ `awaitingConfirmation` cleared by `/cancel` automatically (part of `formState`) (Task 6, Sub-step E)

**Type consistency check:**
- `formatCourseWizardSummary(data, lang?)` — defined Task 3, called with `'ru'` in Task 6 Step 16 ✅
- `formatCourseInfo(course, lang)` — defined Task 4, called with `getLang(chatId)` in Task 6 Step 17 ✅
- `formatApplicationSummary(data, lang)` — defined Task 4, called in Task 6 Step 12 ✅
- `hasSavedPersonalValue(data, step, state?)` — updated Task 6 Step 10, called by `skipSavedPersonalSteps` which is updated same step ✅
- `state.courseAgeMin`, `state.courseAgeMax`, `state.awaitingConfirmation` — added to `nextState` in Task 6 Step 10, used in Steps 8, 12, 15 ✅
- `TEXT[lang].confirmLabels` — all keys verified by i18n test in Task 2 ✅
