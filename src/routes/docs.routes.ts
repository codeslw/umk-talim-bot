const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefinition = require('../../docs/swagger');

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: []
});

router.use('/', swaggerUi.serve, swaggerUi.setup(specs));

module.exports = router;
