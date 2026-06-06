const BorrowRequest = require('../models/borrowRequest.model');
const Equipment = require('../models/equipment.model');
const Student = require('../models/student.model');
const borrowRequestService = require('../services/borrowRequests.service'); 

// Lấy danh sách toàn bộ đơn mượn (Dành cho Admin)
async function getBorrowRequests(req, res) {
  try {
    const { page, limit, status } = req.query;
    
    const result = await borrowRequestService.getBorrowRequests({ page, limit, status });
    
    res.json(result);
  } catch (error) {
    console.error('getBorrowRequests error:', error.message);
    res.status(500).json({ message: 'Lỗi khi tải danh sách đơn mượn' });
  }
}

// Lấy đơn mượn của tôi (Dành cho Sinh viên)
async function getMyBorrowRequests(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });

    const { page, limit, status } = req.query;

    const result = await borrowRequestService.getMyBorrowRequests(userId, { page, limit, status });
    
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('getMyBorrowRequests error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi tải danh sách đơn của bạn' });
  }
}

// Tạo đơn mượn mới
async function createBorrowRequest(req, res) {
  try {
    const userId = req.user?.id;
    const requestData = req.body;

    const newRequest = await borrowRequestService.createRequest(userId, requestData);

    res.status(201).json(newRequest);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('createBorrowRequest error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi tạo đơn mượn' });
  }
}

// Xét duyệt đơn mượn
async function approveBorrowRequest(req, res) {
  try {
    const adminId = req.user.id;
    const request = await borrowRequestService.approveRequest(req.params.id, adminId);
    res.json({ message: 'Duyệt đơn thành công', request });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('approveBorrowRequest error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi duyệt đơn' });
  }
}

//  Từ chối đơn mượn
async function rejectBorrowRequest(req, res) {
  try {
    const adminId = req.user.id;
    const { reason } = req.body;
    const request = await borrowRequestService.rejectRequest(req.params.id, adminId, reason);
    res.json({ message: 'Đã từ chối đơn', request });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('rejectBorrowRequest error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi từ chối đơn' });
  }
}

// Bàn giao thiết bị cho sinh viên
async function handoverBorrowRequest(req, res) {
  try {
    const adminId = req.user.id;
    const request = await borrowRequestService.handoverRequest(req.params.id, adminId);
    res.json({ message: 'Ghi nhận bàn giao thiết bị thành công', request });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('handoverBorrowRequest error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi bàn giao thiết bị' });
  }
}

// Ghi nhận trả đồ
async function markReturned(req, res) {
  try {
    const adminId = req.user.id;
    const { returnCondition, damageNote } = req.body; 

    if (!returnCondition) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tình trạng thiết bị khi trả (returnCondition)' });
    }

    const request = await borrowRequestService.returnRequest(req.params.id, adminId, returnCondition, damageNote);
    res.json({ message: 'Đã hoàn tất quy trình trả đồ và cập nhật điểm/kho', request });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('markReturned error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi ghi nhận trả' });
  }
}

// Sinh viên tự huỷ đơn
async function cancelBorrowRequest(req, res) {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ where: { userId: userId } });
    if (!student) {
      return res.status(403).json({ message: 'Không tìm thấy hồ sơ sinh viên' });
    }

    const request = await borrowRequestService.cancelRequest(req.params.id, student.id);
    res.json({ message: 'Huỷ đơn mượn thành công', request });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('cancelBorrowRequest error:', error.message);
    res.status(500).json({ message: 'Lỗi server khi huỷ đơn' });
  }
}

// Lấy danh sách đơn mượn đang bị quá hạn
async function getOverdueRequests(req, res) {
  try {
    const overdueRequests = await BorrowRequest.findAll({
      where: { status: 'overdue' },
      include: [
        { model: Equipment, as: 'equipment' },
        { model: Student, as: 'student', attributes: ['fullName', 'studentCode', 'phone', 'trustScore', 'trustRank'] }
      ],
      order: [['lateDays', 'DESC']]
    });
    
    res.json({
      message: 'Thành công',
      totalOverdue: overdueRequests.length,
      data: overdueRequests
    });
  } catch (error) {
    console.error('getOverdueRequests error:', error.message);
    res.status(500).json({ message: 'Lỗi khi tải danh sách đơn quá hạn' });
  }
}


module.exports = {
  getBorrowRequests,
  getMyBorrowRequests,
  createBorrowRequest,
  approveBorrowRequest,
  rejectBorrowRequest,
  handoverBorrowRequest,
  markReturned,
  cancelBorrowRequest,
  getOverdueRequests,
};
