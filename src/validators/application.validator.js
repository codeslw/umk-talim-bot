const Joi = require('joi');
const { calculateAge, parseBirthDate } = require('../utils/date');

const educationTypes = [
  'HIGHER',
  'INCOMPLETE_HIGHER',
  'SECONDARY_SPECIALIZED',
  'RETRAINING_COURSES',
  'SECONDARY',
  'BASIC'
];

const birthDateSchema = Joi.custom((value, helpers) => {
  const birthDate = parseBirthDate(value);
  if (!birthDate) {
    return helpers.error('any.invalid');
  }

  const age = calculateAge(birthDate);
  if (age < 18 || age > 45) {
    return helpers.error('date.outOfRange');
  }

  return birthDate;
}, 'birth date in dd.mm.yyyy format').messages({
  'any.invalid': 'Дата рождения должна быть в формате дд.мм.гггг',
  'date.outOfRange': 'Возраст должен быть от 18 до 45 лет'
});

const applicationSchema = Joi.object({
  telegramId: Joi.string().required(),
  fullName: Joi.string().min(3).max(120).required(),
  gender: Joi.string().valid('MALE', 'FEMALE').required(),
  birthDate: birthDateSchema.required(),
  age: Joi.number().integer().min(18).max(45),
  phone: Joi.string().pattern(/^\+?[0-9()\-\s]{7,20}$/).required(),
  telegramUsername: Joi.string().max(64).allow('', null),
  city: Joi.string().min(2).max(80).required(),
  courseId: Joi.number().integer().required(),
  experience: Joi.string().max(500).allow('', null),
  workplace: Joi.string().max(200).allow('', null),
  educationType: Joi.string().valid(...educationTypes).required(),
  specialization: Joi.string().max(200).required(),
  learningGoal: Joi.string().valid('CAREER_CHANGE', 'QUALIFICATION', 'JOB_SEARCH', 'PERSONAL_DEVELOPMENT').required(),
  studyFormat: Joi.string().valid('ONLINE', 'OFFLINE', 'HYBRID').required(),
  studyTime: Joi.string().max(120).required(),
  source: Joi.string().max(120).required(),
  comment: Joi.string().max(1000).allow('', null)
});

module.exports = { applicationSchema };
