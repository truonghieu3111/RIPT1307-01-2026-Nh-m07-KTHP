export type UserRole = 'student' | 'admin';

export type BorrowStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'borrowed'
  | 'returned'
  | 'overdue';

export type DeviceStatus = 'available' | 'unavailable' | 'maintenance';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface Device {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  status: DeviceStatus;
  description?: string;
  image?: string;
  images?: string[];
}

export interface BorrowRequest {
  id: string;
  studentId: string;
  studentName: string;
  deviceId: string;
  deviceName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: BorrowStatus;
  note?: string;
}

export interface StatisticItem {
  deviceId: string;
  deviceName: string;
  borrowCount: number;
}
