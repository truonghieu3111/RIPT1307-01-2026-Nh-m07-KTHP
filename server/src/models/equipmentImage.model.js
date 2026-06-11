const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EquipmentImage = sequelize.define(
  'EquipmentImage',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    equipmentId: { type: DataTypes.INTEGER, allowNull: false },
    imageUrl: { type: DataTypes.STRING(500), allowNull: false },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
  },
  {
    tableName: 'equipment_images',
    underscored: true,
    timestamps: false
  }
);

module.exports = EquipmentImage;