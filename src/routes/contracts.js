const { Router } = require('express');
const { Op } = require('sequelize');

const contractRoutes = new Router();

/**
 * Returns a contract by id only if it belongs to the current profile
 *
 * @param {number} id
 * @returns {Contract} contract by id
 */
contractRoutes.get('/contracts/:id', async (req, res) => {
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
 * @returns {Contract[]} contracts
 */
contractRoutes.get('/contracts', async (req, res) => {
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

module.exports = contractRoutes;
