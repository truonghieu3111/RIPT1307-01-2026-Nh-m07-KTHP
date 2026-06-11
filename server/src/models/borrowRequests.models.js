const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BORROW_STATUSES = [
  'pending', 'approved', 'rejected',
  'borrowing', 'returned_ontime', 'returned_late',
  'overdue', 'cancelled', 'no_show'
];

const BorrowRequest = sequelize.define(
  'BorrowRequest',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestCode: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    equipmentId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    borrowDate: { type: DataTypes.DATEONLY, allowNull: false },
    returnDate: { type: DataTypes.DATEONLY, allowNull: false },
    actualReturnDate: { type: DataTypes.DATEONLY, allowNull: true },
    purpose: { type: DataTypes.TEXT, allowNull: true },
    eventName: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM(...BORROW_STATUSES),
      allowNull: false,
      defaultValue: 'pending'
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    pickupDeadline: { type: DataTypes.DATE, allowNull: true },
    handedOverAt: { type: DataTypes.DATE, allowNull: true },
    handedOverBy: { type: DataTypes.INTEGER, allowNull: true },
    returnCondition: {
      type: DataTypes.ENUM('perfect', 'minor_damage', 'major_damage', 'lost'),
      allowNull: true
    },
    returnCheckedBy: { type: DataTypes.INTEGER, allowNull: true },
    trustScoreDelta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lateDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  },
  {
    tableName: 'borrow_requests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = BorrowRequest;
module.exports.BORROW_STATUSES = BORROW_STATUSES;