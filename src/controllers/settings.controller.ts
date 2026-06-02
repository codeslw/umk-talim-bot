const { getDynamicSchemas, getSchemaMeta, updateDynamicSchemas } = require('../services/schemaSettings.service');

async function getSchemas(req, res) {
  res.json({ data: await getDynamicSchemas() });
}

async function putSchemas(req, res) {
  res.json({ data: await updateDynamicSchemas(req.body) });
}

async function getMeta(req, res) {
  res.json({ data: getSchemaMeta() });
}

module.exports = {
  getSchemas,
  putSchemas,
  getMeta
};
