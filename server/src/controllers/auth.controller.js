const authService = require('../services/auth.service');
const Student = require('../models/student.model');
const Admin = require('../models/admin.model');
// Đăng nhập
async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
  }

  try {
    const data = await authService.loginUser(email, password);
    res.json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Lỗi đăng nhập:', error.message);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập' });
  }
}

// Đăng ký
async function register(req, res) {
  try {
    const { email, password, fullName, studentCode } = req.body;

    if (!email || !password || !fullName || !studentCode) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ email, mật khẩu, họ tên và mã SV' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const result = await authService.registerStudent(req.body);
    res.status(201).json({ message: 'Đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Lỗi đăng ký:', error.message);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký' });
  }
}

// Quên mật khẩu
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng cung cấp email của bạn' });

    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Lỗi forgotPassword:', error.message);
    res.status(500).json({ message: 'Lỗi hệ thống khi yêu cầu quên mật khẩu' });
  }
}

// Tạo mật khẩu mới
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin token hoặc mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Lỗi resetPassword:', error.message);
    res.status(500).json({ message: 'Lỗi hệ thống khi đặt lại mật khẩu' });
  }
}

async function me(req, res) {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    let userData = {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    };

    if (req.user.role === 'student') {
      const studentInfo = await Student.findOne({ where: { userId: req.user.id } });
      if (studentInfo) {
        userData.studentId = studentInfo.id;
        userData.studentCode = studentInfo.studentCode;
        userData.className = studentInfo.className;
        userData.phone = studentInfo.phone;
        userData.avatarUrl = studentInfo.avatarUrl;
        userData.trustScore = studentInfo.trustScore;
        userData.trustRank = studentInfo.trustRank;
        userData.goodReturnStreak = studentInfo.goodReturnStreak;
        userData.borrowLocked = studentInfo.borrowLocked;
        userData.borrowLockUntil = studentInfo.borrowLockUntil;
        userData.borrowLockReason = studentInfo.borrowLockReason;
        userData.isPermanentlyLocked = studentInfo.isPermanentlyLocked;
        userData.permanentLockReason = studentInfo.permanentLockReason;
      }
    }

    if (req.user.role === 'admin') {
      const adminInfo = await Admin.findOne({ where: { userId: req.user.id } });
      if (adminInfo) {
        userData.fullName = adminInfo.fullName || userData.fullName;
        userData.phone = adminInfo.phone;
        userData.avatarUrl = adminInfo.avatarUrl;
      }
    }

    res.json({ message: 'Thành công', data: userData });
  } catch (error) {
    console.error('Lỗi API /me:', error.message);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin cá nhân' });
  }
}

async function updateMyAvatar(req, res) {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn một bức ảnh để tải lên' });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    if (req.user.role === 'student') {
      const studentInfo = await Student.findOne({ where: { userId: req.user.id } });
      if (!studentInfo) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên' });
      }

      await studentInfo.update({ avatarUrl: fileUrl });
      return res.json({
        message: 'Cập nhật ảnh đại diện thành công',
        avatarUrl: studentInfo.avatarUrl
      });
    }

    if (req.user.role === 'admin') {
      const adminInfo = await Admin.findOne({ where: { userId: req.user.id } });
      if (!adminInfo) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ admin' });
      }

      await adminInfo.update({ avatarUrl: fileUrl });
      return res.json({
        message: 'Cập nhật ảnh đại diện thành công',
        avatarUrl: adminInfo.avatarUrl
      });
    }

    return res.status(403).json({ message: 'Tài khoản không được hỗ trợ cập nhật ảnh đại diện' });
  } catch (error) {
    console.error('Lỗi cập nhật avatar:', error.message);
    return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật ảnh đại diện' });
  }
}

module.exports = { login, register, forgotPassword, resetPassword, me, updateMyAvatar };