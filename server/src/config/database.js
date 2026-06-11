const path = require('path');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'clubborrow',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: console.log,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+07:00',
    dialectOptions: {
      timezone: '+07:00',
      dateStrings: true,
      typeCast: true,
    },
  }
);

module.exports = sequelize;
