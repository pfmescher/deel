const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('../model');
const { getProfile } = require('./middleware/getProfile');
const app = express();
const contractRoutes = require('./contracts');
const jobRoutes = require('./jobs');
const balanceRoutes = require('./balance');
const adminRoutes = require('./admin');

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);
app.use(getProfile);

app.use(contractRoutes);
app.use(jobRoutes);
app.use(balanceRoutes);
app.use(adminRoutes);

module.exports = app;
