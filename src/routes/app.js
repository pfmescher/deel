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
 * Returns a contract by id only if it belongs to the current profile
 *
 * @param id number
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
 *
 * @returns contracts Contract[]
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
 *
 * @returns Job[]
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

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 *
 * @param job_id number
 */
app.post('/jobs/:job_id/pay', async (req, res) => {
  const { Job } = req.app.get('models');
  // get the job first
  const job = await Job.findByPk(req.params.job_id);
  // no job? nothing to pay. Return 404 and end request
  if (!job) return res.status(404).end();
  // has job been paid already?
  // user might have sent the same form twice. No need to throw a scary error. No harm done.
  if (job.paid) return res.status(200).end();
  // Now check if the user has enough funds to pay
  if (job.price > req.profile.balance)
    return res.status(400).send({
      error: `Not enough funds. Job costs ${job.price} but user only has ${req.profile.balance} available.`
    });

  try {
    // All set. Now we can initiate the payment transaction
    const transaction = await sequelize.transaction();
    await req.profile.update(
      {
        balance: req.profile.balance - job.price
      },
      { transaction }
    );
    await job.update(
      {
        paid: true,
        paymentDate: new Date()
      },
      { transaction }
    );
    await transaction.commit();
  } catch (e) {
    // Something bad happened. Better log to console
    console.error(e);
    return res.status(500).end();
  }
  return res.status(200).end();
});

module.exports = app;
