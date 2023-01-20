const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite3'
});

const Profile = require('./profile.model')(sequelize, Sequelize);
const Contract = require('./contract.model')(sequelize, Sequelize);
const Job = require('./job.model')(sequelize, Sequelize);

Profile.hasMany(Contract, { as: 'Contractor', foreignKey: 'ContractorId' });
Contract.belongsTo(Profile, { as: 'Contractor' });
Profile.hasMany(Contract, { as: 'Client', foreignKey: 'ClientId' });
Contract.belongsTo(Profile, { as: 'Client' });
Contract.hasMany(Job);
Job.belongsTo(Contract);

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job
};
