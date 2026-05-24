export const BORROW_STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  borrowed: 'Đang mượn',
  returned: 'Đã trả',
  overdue: 'Quá hạn'
} as const;

export const BORROW_STATUS_COLOR = {
  pending: 'gold',
  approved: 'blue',
  rejected: 'red',
  borrowed: 'processing',
  returned: 'green',
  overdue: 'volcano'
} as const;
