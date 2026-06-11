import { Tag } from 'antd';
import { DEVICE_STATUS_COLOR, DEVICE_STATUS_LABEL } from '@/constants/deviceStatus';
import type { DeviceStatus } from '@/types';

interface DeviceStatusTagProps {
  status: DeviceStatus;
}

export default function DeviceStatusTag({ status }: DeviceStatusTagProps) {
  return <Tag color={DEVICE_STATUS_COLOR[status]}>{DEVICE_STATUS_LABEL[status]}</Tag>;
}
