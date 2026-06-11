const Equipment = require('./equipment.models');
const EquipmentImage = require('./equipmentImage.model');
const BorrowRequest = require('./borrowRequest.model');
const Student = require('./student.model');

Equipment.hasMany(EquipmentImage, { foreignKey: 'equipmentId', as: 'images' });
EquipmentImage.belongsTo(Equipment, { foreignKey: 'equipmentId' });

BorrowRequest.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });
Equipment.hasMany(BorrowRequest, { foreignKey: 'equipmentId' });

Student.belongsTo(require('./user.models'), { foreignKey: 'userId' });

module.exports = {};