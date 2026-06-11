import type { DeviceStatus } from '@/types';

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  available: 'San sang',
  unavailable: 'Ngung su dung',
  maintenance: 'Bao tri'
};

export const DEVICE_STATUS_COLOR: Record<DeviceStatus, string> = {
  available: 'green',
  unavailable: 'default',
  maintenance: 'orange'
};
