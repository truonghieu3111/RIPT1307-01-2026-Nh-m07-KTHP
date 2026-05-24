const { borrowRequests, devices } = require('../models/mockData');

function getBorrowRequests(_req, res) {
  res.json(borrowRequests);
}

function getMyBorrowRequests(_req, res) {
  res.json(borrowRequests.filter((item) => item.studentId === 'u1'));
}

function createBorrowRequest(req, res) {
  const device = devices.find((item) => item.id === req.body.deviceId);

  const newRequest = {
    id: `br${Date.now()}`,
    studentId: 'u1',
    studentName: 'Nguyễn Văn A',
    deviceId: req.body.deviceId,
    deviceName: device?.name || 'Thiết bị đang chọn',
    quantity: Number(req.body.quantity || 1),
    borrowDate: req.body.borrowDate,
    returnDate: req.body.returnDate,
    status: 'pending',
    note: req.body.note
  };

  borrowRequests.unshift(newRequest);
  res.json(newRequest);
}

function approveBorrowRequest(req, res) {
  const request = borrowRequests.find((item) => item.id === req.params.id);

  if (!request) {
    res.status(404).json({ message: 'Borrow request not found' });
    return;
  }

  const device = devices.find((item) => item.id === request.deviceId);
  if (!device || device.availableQuantity < request.quantity) {
    res.status(400).json({ message: 'Not enough device quantity' });
    return;
  }

  device.availableQuantity -= request.quantity;
  request.status = 'borrowed';
  res.json(request);
}

function rejectBorrowRequest(req, res) {
  const request = borrowRequests.find((item) => item.id === req.params.id);

  if (!request) {
    res.status(404).json({ message: 'Borrow request not found' });
    return;
  }

  request.status = 'rejected';
  res.json(request);
}

function markReturned(req, res) {
  const request = borrowRequests.find((item) => item.id === req.params.id);

  if (!request) {
    res.status(404).json({ message: 'Borrow request not found' });
    return;
  }

  const device = devices.find((item) => item.id === request.deviceId);
  if (device && request.status !== 'returned') {
    device.availableQuantity += request.quantity;
  }

  request.status = 'returned';
  request.actualReturnDate = new Date().toISOString().slice(0, 10);
  res.json(request);
}

module.exports = {
  getBorrowRequests,
  getMyBorrowRequests,
  createBorrowRequest,
  approveBorrowRequest,
  rejectBorrowRequest,
  markReturned
};
