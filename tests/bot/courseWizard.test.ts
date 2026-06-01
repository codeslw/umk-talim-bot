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
