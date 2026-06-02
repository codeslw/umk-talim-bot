const COURSE_DEFAULTS = Object.freeze({
  ageMin: 18,
  ageMax: 45,
  hasPractice: false,
  canPayInInstallments: false,
  isActive: true,
});

const COURSE_FORMAT_OPTIONS = Object.freeze({
  ONLINE: "Онлайн",
  OFFLINE: "Офлайн",
  HYBRID: "Смешанный",
});
//test deploy
const COURSE_BOOLEAN_FIELDS = Object.freeze([
  "hasPractice",
  "canPayInInstallments",
  "isActive",
]);
const COURSE_INTEGER_FIELDS = Object.freeze(["ageMin", "ageMax"]);
const COURSE_OPTIONAL_FIELDS = Object.freeze([
  "educationType",
  "duration",
  "cost",
  "additionalInfo",
  "imageFileId",
]);

module.exports = {
  COURSE_DEFAULTS,
  COURSE_FORMAT_OPTIONS,
  COURSE_BOOLEAN_FIELDS,
  COURSE_INTEGER_FIELDS,
  COURSE_OPTIONAL_FIELDS,
};
