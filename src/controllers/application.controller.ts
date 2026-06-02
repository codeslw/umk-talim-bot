const { buildApplicationsWorkbook } = require('../services/excel.service');
const {
  changeApplicationStatus,
  createCourseApplication,
  editApplication,
  getApplications,
  getApplicationStats,
  removeApplication
} = require('../services/application.service');
const { applicationSchema } = require('../validators/application.validator');

function validateApplicationPayload(payload) {
  const { value, error } = applicationSchema.validate(payload, { abortEarly: false });

  if (!error) return value;

  const validationError = new Error(error.details.map((detail) => detail.message).join(', ')) as Error & { statusCode?: number };
  validationError.statusCode = 400;
  throw validationError;
}

async function postApplication(req, res) {
  const payload = validateApplicationPayload(req.body);
  const { application } = await createCourseApplication(payload, {
    birthDate: req.body.birthDate,
    source: 'api'
  });

  res.status(201).json({ data: application });
}

async function getApplicationsController(req, res) {
  res.json({ data: await getApplications(req.query) });
}

async function patchApplicationStatus(req, res) {
  const application = await changeApplicationStatus(req.params.id, req.body.status, 'API');
  res.json({ data: application });
}

async function patchApplication(req, res) {
  const application = await editApplication(req.params.id, req.body);
  res.json({ data: application });
}

async function deleteApplicationController(req, res) {
  await removeApplication(req.params.id);
  res.status(204).send();
}

async function getStats(req, res) {
  res.json({ data: await getApplicationStats() });
}

async function exportExcel(req, res) {
  const applications = await getApplications({
    courseId: req.query.courseId,
    status: req.query.status
  });
  const workbook = await buildApplicationsWorkbook(applications);
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
  res.send(Buffer.from(buffer));
}

module.exports = {
  postApplication,
  getApplications: getApplicationsController,
  patchApplication,
  patchApplicationStatus,
  deleteApplication: deleteApplicationController,
  getStats,
  exportExcel
};
