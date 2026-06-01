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
