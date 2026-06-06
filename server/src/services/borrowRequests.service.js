const { Op } = require('sequelize');
const TrustScoreLog = require('../models/trustScoreLog.model');
const { calculateRank } = require('../utils/trustScore.util');
const BorrowRequest = require('../models/borrowRequest.model');
const Equipment = require('../models/equipment.model');
const Student = require('../models/student.model'); 
const User = require('../models/user.model');
const SystemSetting = require('../models/systemSetting.model');
const sequelize = require('../config/database');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

async function getSettingNumber(settingKey, fallback, transaction) {
  const setting = await SystemSetting.findOne({ where: { settingKey }, transaction });
  const parsed = Number(setting?.settingValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Lấy danh sách toàn bộ đơn mượn kèm phân trang & bộ lọc trạng thái (Dành cho Admin)
async function getBorrowRequests({ page = 1, limit = 10, status }) {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const offset = (parsedPage - 1) * parsedLimit;

  const whereClause = {};
  if (status) {
    whereClause.status = status;
  }

  const { count, rows } = await BorrowRequest.findAndCountAll({
    where: whereClause,
    include: [
      { model: Equipment, as: 'equipment' },
      { model: Student, as: 'student', attributes: ['fullName', 'studentCode', 'className', 'trustScore', 'trustRank'] }
    ],
    order: [['created_at', 'DESC']],
    limit: parsedLimit,
    offset: offset
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    limit: parsedLimit,
    data: rows
  };
}

// Lấy danh sách đơn mượn cá nhân kèm phân trang & bộ lọc trạng thái (Dành cho Sinh viên)
async function getMyBorrowRequests(userId, { page = 1, limit = 10, status }) {
  const student = await Student.findOne({ where: { userId: userId } });
  if (!student) {
    throw { status: 403, message: 'Không tìm thấy hồ sơ sinh viên hợp lệ' };
  }

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const offset = (parsedPage - 1) * parsedLimit;

  const whereClause = { studentId: student.id };
  if (status) {
    whereClause.status = status;
  }

  const { count, rows } = await BorrowRequest.findAndCountAll({
    where: whereClause,
    include: [{ model: Equipment, as: 'equipment' }],
    order: [['created_at', 'DESC']],
    limit: parsedLimit,
    offset: offset
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    limit: parsedLimit,
    data: rows
  };
}

// Tạo đơn mượn
async function createRequest(userId, requestData) {
  const { deviceId, quantity, borrowDate, returnDate, purpose } = requestData;

  const student = await Student.findOne({ where: { userId: userId } });
  if (!student) {
    throw { status: 403, message: 'Không tìm thấy hồ sơ sinh viên hợp lệ' };
  }

  // Kiểm tra khoá tài khoản
  if (student.isPermanentlyLocked) {
    throw { status: 403, message: 'Tài khoản của bạn đã bị khoá mượn đồ vĩnh viễn do ý thức quá kém!' };
  }

  if (student.borrowLocked) {
    if (student.borrowLockUntil) {
      const now = new Date();
      const lockUntilDate = new Date(student.borrowLockUntil);

      if (now < lockUntilDate) {
        throw { status: 403, message: `Tài khoản đang bị phạt khoá. Bạn có thể mượn lại sau thời điểm: ${lockUntilDate.toLocaleString()}` };
      } else {
        await student.update({ borrowLocked: false, borrowLockUntil: null, borrowLockReason: null });
      }
    } 
    else {
      throw { status: 403, message: 'Tài khoản của bạn đang bị khoá. Vui lòng liên hệ Admin!' };
    }
  }

  const equipment = await Equipment.findOne({ where: { id: deviceId, isActive: true } });
  if (!equipment) {
    throw { status: 404, message: 'Không tìm thấy thiết bị' };
  }

  if (equipment.availableQuantity < (quantity || 1)) {
    throw { status: 400, message: 'Thiết bị không đủ số lượng sẵn có' };
  }

  const newRequest = await BorrowRequest.create({
    requestCode: `REQ-${Date.now()}`,
    studentId: student.id,
    equipmentId: equipment.id,
    quantity: quantity || 1,
    borrowDate,
    returnDate,
    purpose,
    status: 'pending' 
  });

  return newRequest;
}

// Xét duyệt đơn mượn
async function approveRequest(requestId, adminId) {
  const transaction = await sequelize.transaction();

  try {
    const request = await BorrowRequest.findOne({ 
      where: { id: requestId, status: 'pending' },
      include: [
        { 
          model: Student, 
          as: 'student', 
          include: [{ model: User, as: 'user' }]
        }
      ],
      transaction 
    });

    if (!request) {
      throw { status: 404, message: 'Không tìm thấy đơn mượn hoặc đơn đã được xử lý' };
    }

    const equipment = await Equipment.findOne({ 
      where: { id: request.equipmentId, isActive: true }, 
      transaction 
    });

    if (!equipment || equipment.availableQuantity < request.quantity) {
      throw { status: 400, message: 'Thiết bị không tồn tại hoặc không đủ số lượng để duyệt' };
    }

    await equipment.decrement('availableQuantity', { 
      by: request.quantity, 
      transaction 
    });

    const pickupDeadline = new Date();
    pickupDeadline.setHours(pickupDeadline.getHours() + 48); 

    await request.update({
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date(),
      pickupDeadline: pickupDeadline
    }, { transaction });

    // Tạo thông báo
    await notificationService.createNotification({
      userId: request.student.userId,
      borrowRequestId: request.id,
      type: 'request_approved',
      title: 'Đơn mượn đồ đã được duyệt',
      message: `Đơn mượn thiết bị của bạn đã được duyệt. Vui lòng đến lấy đồ trước ${pickupDeadline.toLocaleString('vi-VN')}.`
    }, transaction);

    // Ghi Log Admin
    await auditLogService.logAdminAction({
      userId: adminId,
      action: 'approve_request',
      entityType: 'borrow_request',
      entityId: request.id,
      oldValue: { status: 'pending' },
      newValue: { status: 'approved', pickupDeadline }
    }, transaction);

    await transaction.commit();

    // Dù gửi mail lỗi thì DB vẫn lưu duyệt đơn thành công (không phải lỗi)
    try {
      if (request.student && request.student.user && request.student.user.email) {
        await emailService.sendDynamicEmail(
          'request_approved', 
          request.student.user.email, 
          { name: request.student.fullName, request_code: request.requestCode },
          request.student.userId,
          request.id
        );
      }
    } catch (emailErr) {
      console.error('Lỗi khi kích hoạt gửi email duyệt đơn:', emailErr.message);
    }

    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Từ chối duyệt đơn
async function rejectRequest(requestId, adminId, reason) {
  const request = await BorrowRequest.findOne({ where: { id: requestId, status: 'pending' } });
  
  if (!request) {
    throw { status: 404, message: 'Không tìm thấy đơn mượn hoặc đơn đã được xử lý' };
  }

  await request.update({
    status: 'rejected',
    rejectedBy: adminId,
    rejectedAt: new Date(),
    rejectionReason: reason || 'Không đủ điều kiện mượn'
  });

  try {
    const studentInfo = await Student.findByPk(request.studentId, { include: [{ model: User, as: 'user' }] });
    if (studentInfo && studentInfo.user) {
      await emailService.sendDynamicEmail(
        'request_rejected', 
        studentInfo.user.email, 
        { 
          name: studentInfo.fullName, 
          request_code: request.requestCode,
          reason: reason || 'Không đủ điều kiện mượn'
        },
        request.student.userId,
        request.id
      );
    }
  } catch (emailErr) {
    console.error('Lỗi khi kích hoạt gửi email từ chối:', emailErr.message);
  }
  
  return request;
}

// Bàn giao thiết bị cho sinh viên
async function handoverRequest(requestId, adminId) {
  const transaction = await sequelize.transaction();

  try {
    const request = await BorrowRequest.findOne({ 
      where: { id: requestId, status: 'approved' },
      transaction
    });

    if (!request) {
      throw { status: 404, message: 'Không tìm thấy đơn mượn hoặc đơn chưa được duyệt/đã bàn giao' };
    }

    const equipment = await Equipment.findByPk(request.equipmentId, { transaction });
    await equipment.increment('borrowingQuantity', { by: request.quantity, transaction });

    await request.update({
      status: 'borrowing',
      handedOverAt: new Date(),
      handedOverBy: adminId
    }, { transaction });

    await transaction.commit();
    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Ghi nhận trả đồ, tính điểm, cập nhật kho
async function returnRequest(requestId, adminId, returnCondition, damageNote) {
  const transaction = await sequelize.transaction();

  try {
    const request = await BorrowRequest.findOne({ 
      where: { id: requestId, status: { [Op.in]: ['borrowing', 'overdue'] } },
      transaction 
    });

    if (!request) {
      throw { status: 404, message: 'Không tìm thấy đơn mượn hoặc thiết bị chưa được bàn giao' };
    }

    const equipment = await Equipment.findByPk(request.equipmentId, { transaction });
    const student = await Student.findByPk(request.studentId, { transaction });

    // Trừ kho đang mượn
    await equipment.decrement('borrowingQuantity', { by: request.quantity, transaction });

    // Phân loại kho trả về
    if (returnCondition === 'perfect' || returnCondition === 'minor_damage') {
      await equipment.increment('availableQuantity', { by: request.quantity, transaction });
    } 
    else if (returnCondition === 'major_damage' || returnCondition === 'lost') {
      await equipment.increment('brokenQuantity', { by: request.quantity, transaction });
    }

    // Tính điểm cơ bản
    let baseScoreDelta = 0;
    let baseReason = '';
    let newStreak = student.goodReturnStreak;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expectedReturnDate = new Date(request.returnDate);
    const isOntime = today <= expectedReturnDate && request.status !== 'overdue';
    const lateDays = isOntime
      ? 0
      : Math.max(1, Math.ceil((today.getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (returnCondition === 'minor_damage') {
      baseScoreDelta = -10; baseReason = 'minor_damage'; newStreak = 0;
    } else if (returnCondition === 'major_damage' || returnCondition === 'lost') {
      baseScoreDelta = -30; baseReason = 'major_damage'; newStreak = 0;
    } else if (returnCondition === 'perfect' && isOntime) {
      baseScoreDelta = 2; baseReason = 'return_ontime'; newStreak += 1;
    } else {
      newStreak = 0;
    }

    let scoreCursor = student.trustScore;
    let rankCursor = student.trustRank;
    let tempScore = clampScore(scoreCursor + baseScoreDelta);
    let tempRank = calculateRank(tempScore);

    if (baseScoreDelta !== 0) {
      await TrustScoreLog.create({
        studentId: student.id,
        borrowRequestId: request.id,
        delta: baseScoreDelta,
        scoreBefore: scoreCursor,
        scoreAfter: tempScore,
        rankBefore: rankCursor,
        rankAfter: tempRank,
        reason: baseReason,
        note: damageNote,
        createdBy: adminId
      }, { transaction });
    }

    scoreCursor = tempScore;
    rankCursor = tempRank;

    // Nếu admin ghi nhận trả trễ trước khi cron kịp đổi đơn sang overdue, vẫn phải trừ điểm và ghi log.
    const latePenaltyPerDay = await getSettingNumber('late_penalty_per_day', 3, transaction);
    const lateScoreDelta = !isOntime && request.status !== 'overdue' ? -latePenaltyPerDay * lateDays : 0;

    if (lateScoreDelta !== 0) {
      tempScore = clampScore(scoreCursor + lateScoreDelta);
      tempRank = calculateRank(tempScore);

      await TrustScoreLog.create({
        studentId: student.id,
        borrowRequestId: request.id,
        delta: lateScoreDelta,
        scoreBefore: scoreCursor,
        scoreAfter: tempScore,
        rankBefore: rankCursor,
        rankAfter: tempRank,
        reason: 'late_return',
        note: `Trả trễ ${lateDays} ngày`,
        createdBy: adminId
      }, { transaction });

      scoreCursor = tempScore;
      rankCursor = tempRank;
    }

    // Tính điểm thưởng chuỗi
    let streakDelta = 0;
    let streakReason = '';
    if (newStreak === 3) { streakDelta = 5; streakReason = 'streak_3'; }
    if (newStreak === 5) { streakDelta = 7; streakReason = 'streak_5'; }

    let finalScore = clampScore(scoreCursor + streakDelta);
    let finalRank = calculateRank(finalScore);

    if (streakDelta !== 0) {
      await TrustScoreLog.create({
        studentId: student.id,
        borrowRequestId: request.id, 
        delta: streakDelta,
        scoreBefore: scoreCursor,
        scoreAfter: finalScore,
        rankBefore: rankCursor,
        rankAfter: finalRank,
        reason: streakReason,
        note: `Thưởng đạt chuỗi ${newStreak} lần trả đồ hoàn hảo`,
        createdBy: adminId
      }, { transaction });
    }

    // Lưu cập nhật
    await student.update({
      trustScore: finalScore,
      trustRank: finalRank,
      goodReturnStreak: newStreak,
      totalLate: (!isOntime) ? student.totalLate + 1 : student.totalLate
    }, { transaction });

    const finalStatus = isOntime ? 'returned_ontime' : 'returned_late';
    await request.update({
      status: finalStatus,
      actualReturnDate: new Date(),
      returnCondition: returnCondition,
      returnCheckedBy: adminId,
      damageNote: damageNote,
      lateDays,
      trustScoreDelta: request.trustScoreDelta + baseScoreDelta + lateScoreDelta + streakDelta
    }, { transaction });

    await transaction.commit();
    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Sinh viên chủ động huỷ đơn
async function cancelRequest(requestId, studentId) {
  const transaction = await sequelize.transaction();

  try {
    const request = await BorrowRequest.findOne({ 
      where: { id: requestId, studentId: studentId },
      transaction 
    });

    if (!request) {
      throw { status: 404, message: 'Không tìm thấy đơn mượn của bạn' };
    }

    if (!['pending', 'approved'].includes(request.status)) {
      throw { status: 400, message: 'Bạn chỉ có thể huỷ đơn khi đang chờ duyệt hoặc đã duyệt' };
    }

    const student = await Student.findByPk(studentId, { transaction });
    let scoreDelta = 0;
    let reason = '';

    if (request.status === 'pending') {
      scoreDelta = 0;
    } 
    else if (request.status === 'approved') {
      scoreDelta = -3;
      reason = 'cancel_approved';
      
      const equipment = await Equipment.findByPk(request.equipmentId, { transaction });
      await equipment.increment('availableQuantity', { by: request.quantity, transaction });
    }

    if (scoreDelta !== 0) {
      let newScore = student.trustScore + scoreDelta;
      if (newScore < 0) newScore = 0;
      const newRank = calculateRank(newScore);

      await student.update({ 
        trustScore: newScore, 
        trustRank: newRank 
      }, { transaction });

      await TrustScoreLog.create({
        studentId: student.id,
        borrowRequestId: request.id,
        delta: scoreDelta,
        scoreBefore: student.trustScore,
        scoreAfter: newScore,
        rankBefore: student.trustRank,
        rankAfter: newRank,
        reason: reason,
        createdBy: 1 
      }, { transaction });
    }

    await request.update({
      status: 'cancelled',
      trustScoreDelta: scoreDelta
    }, { transaction });

    await transaction.commit();
    return request;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { 
  getBorrowRequests,
  getMyBorrowRequests,
  createRequest, 
  approveRequest, 
  rejectRequest, 
  handoverRequest, 
  returnRequest, 
  cancelRequest 
};
