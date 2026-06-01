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
      preview: "Kurs ko'rinishi:",
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
