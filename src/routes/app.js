const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('../model');
const { getProfile } = require('./middleware/getProfile');
const app = express();
const contractRoutes = require("./contracts");
const jobRoutes = require("./jobs");
const adminRoutes = require("./balance");

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);
app.use(getProfile);

app.use(contractRoutes)
app.use(jobRoutes)
app.use(adminRoutes)

module.exports = app;
