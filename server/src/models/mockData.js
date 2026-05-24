const users = [
  {
    id: 'u1',
    fullName: 'Nguyễn Văn A',
    email: 'student@example.com',
    role: 'student'
  },
  {
    id: 'admin1',
    fullName: 'Quản trị viên',
    email: 'admin@example.com',
    role: 'admin'
  }
];

const devices = [
  {
    id: 'd1',
    name: 'Máy chiếu',
    category: 'Thiết bị trình chiếu',
    totalQuantity: 5,
    availableQuantity: 3,
    status: 'available',
    description: 'Dùng cho phòng học và sự kiện câu lạc bộ'
  },
  {
    id: 'd2',
    name: 'Micro không dây',
    category: 'Âm thanh',
    totalQuantity: 10,
    availableQuantity: 6,
    status: 'available'
  },
  {
    id: 'd3',
    name: 'Loa kéo',
    category: 'Âm thanh',
    totalQuantity: 2,
    availableQuantity: 1,
    status: 'available'
  }
];

const borrowRequests = [
  {
    id: 'br1',
    studentId: 'u1',
    studentName: 'Nguyễn Văn A',
    deviceId: 'd1',
    deviceName: 'Máy chiếu',
    quantity: 1,
    borrowDate: '2026-05-12',
    returnDate: '2026-05-15',
    status: 'pending',
    note: 'Mượn cho sự kiện CLB'
  },
  {
    id: 'br2',
    studentId: 'u1',
    studentName: 'Nguyễn Văn A',
    deviceId: 'd2',
    deviceName: 'Micro không dây',
    quantity: 2,
    borrowDate: '2026-05-01',
    returnDate: '2026-05-03',
    status: 'returned'
  }
];

module.exports = {
  users,
  devices,
  borrowRequests
};
