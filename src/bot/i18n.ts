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
});

module.exports = { LANGUAGE_LABELS, TEXT };
