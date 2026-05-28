const ExcelJS = require('exceljs');

async function buildApplicationsWorkbook(applications) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Applications');

  sheet.columns = [
    { header: 'ID заявки', key: 'id', width: 12 },
    { header: 'Дата заявки', key: 'createdAt', width: 20 },
    { header: 'ФИО', key: 'fullName', width: 24 },
    { header: 'Пол', key: 'gender', width: 12 },
    { header: 'Дата рождения', key: 'birthDate', width: 16 },
    { header: 'Возраст', key: 'age', width: 10 },
    { header: 'Телефон', key: 'phone', width: 18 },
    { header: 'Telegram', key: 'telegram', width: 18 },
    { header: 'Город', key: 'city', width: 16 },
    { header: 'Курс', key: 'course', width: 24 },
    { header: 'Стаж', key: 'experience', width: 20 },
    { header: 'Место работы', key: 'workplace', width: 20 },
    { header: 'Образование', key: 'educationType', width: 16 },
    { header: 'Специализация', key: 'specialization', width: 20 },
    { header: 'Цель обучения', key: 'learningGoal', width: 20 },
    { header: 'Формат обучения', key: 'studyFormat', width: 16 },
    { header: 'Время обучения', key: 'studyTime', width: 18 },
    { header: 'Источник', key: 'source', width: 18 },
    { header: 'Комментарий', key: 'comment', width: 24 },
    { header: 'Статус', key: 'status', width: 14 },
    { header: 'Дата обновления', key: 'updatedAt', width: 20 }
  ];

  applications.forEach((a) => {
    sheet.addRow({
      id: a.id,
      createdAt: a.createdAt,
      fullName: a.user.fullName,
      gender: a.user.gender || '',
      birthDate: a.user.birthDate || '',
      age: a.user.age || '',
      phone: a.user.phone || '',
      telegram: a.user.username || '',
      city: a.user.city || '',
      course: a.course.title,
      experience: a.experience || '',
      workplace: a.workplace || '',
      educationType: a.educationType || '',
      specialization: a.specialization || '',
      learningGoal: a.learningGoal || '',
      studyFormat: a.studyFormat || '',
      studyTime: a.studyTime || '',
      source: a.source || '',
      comment: a.comment || '',
      status: a.status,
      updatedAt: a.updatedAt
    });
  });

  return workbook;
}

module.exports = { buildApplicationsWorkbook };
