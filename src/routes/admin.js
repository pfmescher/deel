const { Router } = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../model');
const { parseISO, isBefore } = require("date-fns");

const adminRoutes = new Router();

/**
 * `/admin/best-profession?start=<date>&end=<date>`
 * Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
 *
 * @param {string} start the start of the range to search
 * @param {string} end the end of the range to search
 */
adminRoutes.get('/admin/best-profession', async (req, res) => {
  const { Profile, Contract, Job } = req.app.get('models');
  const { start, end } = req.query;

  if (!start) {
    return res.status(400).json({
      code: 400,
      message: 'Start date is required'
    })
  }

  if (!end) {
    return res.status(400).json({
      code: 400,
      message: 'End date is required'
    })
  }

  if (isBefore(end, start)) {
    return res.status(400).json({
      code: 400,
      message: 'End date should come after start date'
    })
  }

  const startDate = parseISO(start);
  const endDate = parseISO(end);

  const jobs = await Job.findAll({
    where: {
      paid: true,
      paymentDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    attributes: [[sequelize.fn('SUM', sequelize.col('Job.price')), 'total_gained']],
    include: [{
      model: Contract,
      include: [{
        model: Profile,
        as: 'Contractor'
      }]
    }],
    group: ['Contract.Contractor.profession'],
    order: [['total_gained', 'desc']],
    raw: true
  });

  const top_paying = jobs.shift();
  res.json({
    top_profession: top_paying['Contract.Contractor.profession']
  });
});

/**
 * `/admin/best-clients?start=<date>&end=<date>&limit=<integer>`
 * returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
 * */
adminRoutes.get('/admin/best-client', async (req, res) => {
  const { Profile, Contract, Job } = req.app.get('models');
  const { start, end, limit } = req.query;

  if (!start) {
    return res.status(400).json({
      code: 400,
      message: 'Start date is required'
    })
  }

  if (!end) {
    return res.status(400).json({
      code: 400,
      message: 'End date is required'
    })
  }

  if (isBefore(end, start)) {
    return res.status(400).json({
      code: 400,
      message: 'End date should come after start date'
    })
  }

  if (!limit) {
    return res.status(400).json({
      code: 4000,
      message: 'Limit is required'
    })
  }

  const startDate = parseISO(start);
  const endDate = parseISO(end);

  const clients = await Profile.findAll({
    include: [{
      model: Contract,
      as: 'Client',
      include: [{
        model: Job,
        where: {
          paid: true,
          paymentDate: {
            [Op.between]: [startDate, endDate]
          }
        },
      }]
    }],
    attributes: [[sequelize.fn('SUM', sequelize.col('Client.Jobs.price')), 'total_paid'], 'firstName', 'lastName', 'id'],
    order: [['total_paid', 'desc']],
    group: ['Profile.id']
  });

  res.json(clients.slice(0, limit).map(client=> ({
    id: client.id,
    fullName: client.fullName(),
    paid: client.dataValues.total_paid // total_paid is not part of the original model so I need to access the raw data instead
  })));
});

module.exports = adminRoutes;
