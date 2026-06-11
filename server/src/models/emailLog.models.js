const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailLog = sequelize.define(
  'EmailLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    borrowRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    templateCode: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    toEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed'),
      allowNull: false,
      defaultValue: 'sent'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'email_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

module.exports = EmailLog;