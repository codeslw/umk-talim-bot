const prisma = require('../config/prisma');
const { createApplication, listApplications, updateApplicationStatus, statistics } = require('../repositories/applicationRepository');
const { buildApplicationsWorkbook } = require('../services/excel.service');
const { applicationSchema } = require('../validators/application.validator');
const { calculateAge } = require('../utils/date');

async function postApplication(req, res, next) {
  try {
    const { value, error } = applicationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: error.details.map((d) => d.message).join(', ') });
    }
    const payload = value;
    const age = payload.age || calculateAge(payload.birthDate);
    const user = await prisma.user.upsert({
      where: { telegramId: payload.telegramId },
      create: {
        telegramId: payload.telegramId,
        username: payload.telegramUsername || null,
        fullName: payload.fullName,
        phone: payload.phone,
        gender: payload.gender,
        age,
        birthDate: payload.birthDate,
        city: payload.city
      },
      update: {
        username: payload.telegramUsername || null,
        fullName: payload.fullName,
        phone: payload.phone,
        gender: payload.gender,
        age,
        birthDate: payload.birthDate,
        city: payload.city
      }
    });
    const application = await createApplication({
      userId: user.id,
      courseId: payload.courseId,
      experience: payload.experience,
      workplace: payload.workplace,
      educationType: payload.educationType,
      specialization: payload.specialization,
      learningGoal: payload.learningGoal,
      studyFormat: payload.studyFormat,
      studyTime: payload.studyTime,
      source: payload.source,
      comment: payload.comment
    });
    res.status(201).json({ data: application });
  } catch (err) {
    next(err);
  }
}

async function getApplications(req, res, next) {
  try {
    const where = {};
    if (req.query.courseId) where.courseId = Number(req.query.courseId);
    if (req.query.status) where.status = req.query.status;
    if (req.query.minAge || req.query.maxAge || req.query.city) {
      where.user = {};
      if (req.query.city) where.user.city = { contains: String(req.query.city), mode: 'insensitive' };
      if (req.query.minAge || req.query.maxAge) {
        where.user.age = {};
        if (req.query.minAge) where.user.age.gte = Number(req.query.minAge);
        if (req.query.maxAge) where.user.age.lte = Number(req.query.maxAge);
      }
    }
    const applications = await listApplications(where);
    res.json({ data: applications });
  } catch (err) {
    next(err);
  }
}

async function patchApplicationStatus(req, res, next) {
  try {
    const allowed = ['NEW', 'IN_PROGRESS', 'CONTACTED', 'ENROLLED', 'REJECTED', 'COMPLETED'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const application = await updateApplicationStatus(Number(req.params.id), req.body.status);
    res.json({ data: application });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    res.json({ data: await statistics() });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const where = {};
    if (req.query.courseId) where.courseId = Number(req.query.courseId);
    if (req.query.status) where.status = req.query.status;
    const applications = await listApplications(where);
    const workbook = await buildApplicationsWorkbook(applications);
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = { postApplication, getApplications, patchApplicationStatus, getStats, exportExcel };
