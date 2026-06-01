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
