const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('../model');
const { getProfile } = require('./middleware/getProfile');
const app = express();
const { Op } = require('sequelize');
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const contract = await Contract.findOne({
    where: {
      id,
      [Op.or]: {
        ContractorId: req.profile.id,
        ClientId: req.profile.id
      }
    }
  });

  if (!contract) return res.status(404).end();
  res.json(contract);
});

app.get('/contracts', async (req, res) => {
  const { Contract } = req.app.get('models');
  const contracts = await Contract.findAll({ where: { status: { [Op.ne]: 'terminated' } } });
  res.json(contracts);
});
module.exports = app;
