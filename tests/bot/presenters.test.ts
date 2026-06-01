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
