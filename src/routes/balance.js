const { Router } = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../model');

const balanceRoutes = new Router();

/**
 * Deposits money into the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 *
 * @body {JSON} amount the amount to deposit. Must be a positive number.
 * @param {number} userId the id of the user we are depositing to
 */
balanceRoutes.post('/balances/deposit/:userId', async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const deposit_amount = req.body.amount;
  const userId = req.params.userId;

  if (!deposit_amount) {
    return res.status(400).json({
      code: 400,
      message: 'Missing required body parameter amount'
    });
  }

  if (deposit_amount < 0) {
    return res.status(400).json({
      code: 400,
      message: 'Deposit amount must be a positive number'
    });
  }

  if (deposit_amount > req.profile.balance) {
    return res.status(400).json({
      code: 400,
      message: 'You do not have enough balance to make this deposit'
    });
  }

  const user = await Profile.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      code: 404,
      message: 'User ID does not exist'
    });
  }

  const total_owed = await Contract.findAll({
    where: {
      ClientId: req.profile.id,
      '$Jobs.paid$': {
        [Op.eq]: null
      }
    },
    attributes: [[sequelize.fn('SUM', sequelize.col('Jobs.price')), 'total_owed']],
    include: [
      {
        model: Job
      }
    ]
  })[0].total_owed;

  const max_deposit_amount = total_owed / 4;

  if (deposit_amount > max_deposit_amount) {
    return res.status(400).json({
      code: 400,
      message: 'Deposit amount cannot exceed 25% of jobs to pay'
    });
  }

  const transaction = await sequelize.transaction();

  try {
    await user.update(
      {
        balance: (user.balance += deposit_amount)
      },
      { transaction }
    );
    await req.profile.update(
      {
        balance: (req.profile.balance -= deposit_amount)
      },
      { transaction }
    );
    transaction.commit();
  } catch (e) {
    console.log(e);
    transaction.rollback();
    return res.status(500).json({
      code: 500,
      message: 'Internal Server Error'
    });
  }

  res.status(200).end();
});

module.exports = balanceRoutes;
