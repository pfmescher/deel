const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('../model');
const { getProfile } = require('./middleware/getProfile');
const app = express();
const { Op } = require('sequelize');
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);
app.use(getProfile);

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', async (req, res) => {
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

/**
 * Returns a list of contracts belonging to a user (client or contractor), the list should only contain non terminated contracts.
 */
app.get('/contracts', async (req, res) => {
  const { Contract } = req.app.get('models');
  const contracts = await Contract.findAll({
    where: {
      status: { [Op.ne]: 'terminated' },
      [Op.or]: {
        ClientId: req.profile.id,
        ContractorId: req.profile.id
      }
    }
  });
  res.json(contracts);
});

/**
 * Get all unpaid jobs for a user (**_either_** a client or contractor), for **_active contracts only_**
 */
app.get('/jobs/unpaid', async (req, res) => {
  const { Contract, Job } = req.app.get('models');
  const contract = await Contract.findOne({
    where: {
      [Op.or]: {
        ClientId: req.profile.id,
        ContractorId: req.profile.id
      },
      status: 'in_progress'
    },
    include: [
      {
        model: Job,
        where: {
          paid: {
            [Op.eq]: null
          }
        }
      }
    ]
  });

  res.json(contract?.Jobs || []);
});

module.exports = app;
