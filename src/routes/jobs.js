const { Router } = require("express")
const { Op } = require("sequelize");
const { sequelize } = require("../model");

const jobRoutes = new Router()

/**
 * Get all unpaid jobs for a user (**_either_** a client or contractor), for **_active contracts only_**
 *
 * @returns {Job[]}
 */
jobRoutes.get('/jobs/unpaid', async (req, res) => {
  const { Contract, Job } = req.app.get('models');
  const contract = await Contract.findAll({
    where: {
      [Op.or]: {
        ClientId: req.profile.id,
        ContractorId: req.profile.id
      },
      '$Jobs.paid$': {
        [Op.eq]: null
      },
      status: 'in_progress'
    },
    include: [
      {
        model: Job
      }
    ]
  });

  res.json(contract.reduce((jobs, contract) => jobs.concat(contract.Jobs), []));
});

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
 *
 * @param {number} job_id
 */
jobRoutes.post('/jobs/:job_id/pay', async (req, res) => {
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
    return res.status(400).json({
      code: 400,
      message: `Not enough funds. Job costs ${job.price} but user only has ${req.profile.balance} available.`
    });

  // All set. Now we can initiate the payment transaction
  const transaction = await sequelize.transaction();
  try {
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
    transaction.rollback();
    return res.status(500).json({
      code: 500,
      message: 'Internal server error'
    });
  }
  return res.status(200).end();
});

module.exports = jobRoutes