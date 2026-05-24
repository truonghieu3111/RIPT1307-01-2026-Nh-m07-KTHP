import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Upload
} from 'antd';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getDevices } from '@/services/devices';
import type { Device } from '@/types';

type DeviceTier = 'S' | 'A' | 'B' | 'C';
type DeviceCategory = 'Âm thanh' | 'Hình ảnh' | 'Trình chiếu' | 'Phụ kiện';
type StatusFilter = 'all' | 'active' | 'hidden';

interface AdminDevice extends Device {
  code: string;
  tier: DeviceTier;
  active: boolean;
}

interface DeviceFormValues {
  name: string;
  code: string;
  category: DeviceCategory;
  tier: DeviceTier;
  totalQuantity: number;
  availableQuantity: number;
  description?: string;
}

const CATEGORY_OPTIONS: DeviceCategory[] = ['Âm thanh', 'Hình ảnh', 'Trình chiếu', 'Phụ kiện'];
const TIER_OPTIONS: DeviceTier[] = ['S', 'A', 'B', 'C'];
const TIER_COLORS: Record<DeviceTier, { color: string; bg: string }> = {
  S: { color: '#8B6A1F', bg: '#F5EBD0' },
  A: { color: '#B05A4D', bg: '#F7E8DF' },
  B: { color: '#355D8E', bg: '#DCE4F0' },
  C: { color: '#2F6F3E', bg: '#E1EFE3' }
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getDeviceIcon(device: Pick<Device, 'name' | 'category'>) {
  const text = normalizeText(`${device.name} ${device.category}`);
  if (text.includes('micro')) return '🎤';
  if (text.includes('loa') || text.includes('am thanh')) return '🔊';
  if (text.includes('may chieu') || text.includes('trinh chieu')) return '📽️';
  if (text.includes('may anh') || text.includes('camera') || text.includes('canon') || text.includes('sony')) return '📷';
  if (text.includes('tripod') || text.includes('chan may')) return '🎬';
  if (text.includes('den') || text.includes('led')) return '💡';
  if (text.includes('tai nghe')) return '🎧';
  if (text.includes('mixer')) return '🎚️';
  return '📦';
}

function getDeviceTier(device: Pick<Device, 'name' | 'category'>): DeviceTier {
  const text = normalizeText(`${device.name} ${device.category}`);
  if (text.includes('epson') || text.includes('canon') || text.includes('may chieu')) return 'S';
  if (text.includes('shure') || text.includes('jbl') || text.includes('mixer') || text.includes('micro')) return 'A';
  if (text.includes('tripod') || text.includes('den') || text.includes('loa')) return 'B';
  return 'C';
}

function getDeviceCategory(device: Pick<Device, 'name' | 'category'>): DeviceCategory {
  const text = normalizeText(`${device.name} ${device.category}`);
  if (text.includes('am thanh') || text.includes('micro') || text.includes('loa') || text.includes('mixer')) return 'Âm thanh';
  if (text.includes('hinh anh') || text.includes('may anh') || text.includes('camera') || text.includes('den')) return 'Hình ảnh';
  if (text.includes('trinh chieu') || text.includes('may chieu')) return 'Trình chiếu';
  return 'Phụ kiện';
}

function getDeviceCode(device: Device, index: number) {
  const numericId = device.id.replace(/\D/g, '');
  return numericId ? `TB-${numericId.padStart(3, '0').slice(-3)}` : `TB-${String(index + 1).padStart(3, '0')}`;
}

function toAdminDevice(device: Device, index: number): AdminDevice {
  return {
    ...device,
    code: getDeviceCode(device, index),
    category: getDeviceCategory(device),
    tier: getDeviceTier(device),
    active: device.status !== 'unavailable'
  };
}

function StatCard({ title, value, meta, featured }: { title: string; value: number; meta: string; featured?: boolean }) {
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 14,
        border: featured ? '1px solid #2D4A3E' : '1px solid #E5DECB',
        background: featured ? '#2D4A3E' : '#FFFFFF'
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ color: featured ? 'rgba(255,255,255,0.72)' : '#6B6F6C', fontSize: 11, letterSpacing: '0.08em' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, color: featured ? '#FFFFFF' : '#1A1F1B', marginTop: 8 }}>
        {value}
      </div>
      <div style={{ color: featured ? 'rgba(255,255,255,0.72)' : '#6B6F6C', fontSize: 12 }}>{meta}</div>
    </Card>
  );
}

export default function AdminDevicesPage() {
  const [form] = Form.useForm<DeviceFormValues>();
  const { data, loading } = useAsyncData(getDevices);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DeviceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AdminDevice>();

  useEffect(() => {
    if (data) setDevices(data.map(toAdminDevice));
  }, [data]);

  const stats = useMemo(() => {
    const borrowed = devices.reduce((total, device) => total + Math.max(device.totalQuantity - device.availableQuantity, 0), 0);
    return {
      totalTypes: devices.length,
      borrowed,
      lowStock: devices.filter((device) => device.availableQuantity <= 2 && device.availableQuantity > 0).length,
      active: devices.filter((device) => device.active).length
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const keyword = normalizeText(searchText.trim());
    return devices.filter((device) => {
      const matchesSearch =
        !keyword ||
        normalizeText(`${device.name} ${device.code} ${device.category} ${device.description ?? ''}`).includes(keyword);
      const matchesCategory = categoryFilter === 'all' || device.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? device.active : !device.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, devices, searchText, statusFilter]);

  const openAddModal = () => {
    setEditingDevice(undefined);
    form.resetFields();
    form.setFieldsValue({ category: 'Âm thanh', tier: 'C', totalQuantity: 1, availableQuantity: 1 });
    setModalOpen(true);
  };

  const openEditModal = (device: AdminDevice) => {
    setEditingDevice(device);
    form.setFieldsValue({
      name: device.name,
      code: device.code,
      category: device.category as DeviceCategory,
      tier: device.tier,
      totalQuantity: device.totalQuantity,
      availableQuantity: device.availableQuantity,
      description: device.description
    });
    setModalOpen(true);
  };

  const handleSave = (values: DeviceFormValues) => {
    const isEditing = Boolean(editingDevice);

    try {
      // TODO: Kết nối API khi BE2 ready
      if (editingDevice) {
        setDevices((current) =>
          current.map((device) =>
            device.id === editingDevice.id
              ? {
                  ...device,
                  ...values,
                  status: values.availableQuantity > 0 ? 'available' : device.status
                }
              : device
          )
        );
        message.success('Đã cập nhật', 2);
      } else {
        const newDevice: AdminDevice = {
          id: `local-${Date.now()}`,
          name: values.name,
          code: values.code,
          category: values.category,
          tier: values.tier,
          totalQuantity: values.totalQuantity,
          availableQuantity: values.availableQuantity,
          description: values.description,
          status: 'available',
          active: true
        };
        setDevices((current) => [newDevice, ...current]);
        message.success('Đã thêm thiết bị', 2);
      }
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Save device failed:', error);
      message.error(`Không thể ${isEditing ? 'cập nhật' : 'thêm'} thiết bị. Vui lòng thử lại.`, 3);
    }
  };

  const handleDelete = (device: AdminDevice) => {
    Modal.confirm({
      title: 'Xác nhận xoá thiết bị',
      content: 'Bạn có chắc muốn xoá thiết bị này? Hành động không thể hoàn tác.',
      okText: 'Đồng ý xoá',
      cancelText: 'Huỷ',
      okButtonProps: { danger: true },
      onOk: () => {
        try {
          // TODO: Kết nối API khi BE2 ready
          setDevices((current) => current.filter((item) => item.id !== device.id));
          message.success('Đã xoá', 2);
        } catch (error) {
          console.error('Delete device failed:', error);
          message.error('Không thể xoá thiết bị. Vui lòng thử lại.', 3);
        }
      }
    });
  };

  const handleToggleStatus = (device: AdminDevice, active: boolean) => {
    try {
      // TODO: Kết nối API khi BE2 ready
      setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, active } : item)));
      message.success('Đã cập nhật trạng thái', 2);
    } catch (error) {
      console.error('Toggle device status failed:', error);
      message.error('Không thể cập nhật trạng thái. Vui lòng thử lại.', 3);
    }
  };

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', color: '#1A1F1B' }}>
            Quản lý kho thiết bị
          </h1>
          <p style={{ color: '#6B6F6C', margin: 0 }}>Thêm, sửa, xoá thiết bị và quản lý số lượng tồn kho</p>
        </div>
        <Button type="primary" onClick={openAddModal} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
          + Thêm thiết bị
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="TỔNG THIẾT BỊ" value={stats.totalTypes} meta="loại thiết bị" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="ĐANG CHO MƯỢN" value={stats.borrowed} meta="đơn đang hoạt động" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="SẮP HẾT" value={stats.lowStock} meta="loại tồn kho thấp" featured />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="HOẠT ĐỘNG" value={stats.active} meta="đang bật cho mượn" />
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <Input.Search
            allowClear
            placeholder="Tìm thiết bị..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 300, maxWidth: '100%' }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 180 }}
            options={[{ value: 'all', label: 'Tất cả' }, ...CATEGORY_OPTIONS.map((category) => ({ value: category, label: category }))]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'hidden', label: 'Đã ẩn' }
            ]}
          />
        </div>

        <Table<AdminDevice>
          rowKey="id"
          loading={{ spinning: loading, tip: 'Đang tải thiết bị...' }}
          dataSource={filteredDevices}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: devices.length === 0 ? (
              <Empty
                image={<div style={{ fontSize: 80 }}>📦</div>}
                styles={{ image: { height: 96, marginBottom: 16 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Chưa có thiết bị trong kho</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Thêm thiết bị đầu tiên để CLB bắt đầu cho mượn.
                    </p>
                  </div>
                }
                style={{ padding: '64px 0' }}
              >
                <Button type="primary" onClick={openAddModal} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
                  + Thêm thiết bị
                </Button>
              </Empty>
            ) : (
              <Empty
                image={<div style={{ fontSize: 64 }}>🔍</div>}
                styles={{ image: { height: 84, marginBottom: 14 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không tìm thấy thiết bị nào</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc khác.
                    </p>
                  </div>
                }
                style={{ padding: '60px 0' }}
              />
            )
          }}
          columns={[
            {
              title: 'Tên thiết bị',
              render: (_, device) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFE9DD', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                    {getDeviceIcon(device)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1A1F1B' }}>{device.name}</div>
                    <div style={{ color: '#9A9D98', fontSize: 12 }}>{device.code}</div>
                  </div>
                </div>
              )
            },
            {
              title: 'Loại',
              dataIndex: 'category',
              render: (category: DeviceCategory) => <Tag color="default">{category}</Tag>
            },
            {
              title: 'Hạng',
              dataIndex: 'tier',
              render: (tier: DeviceTier) => (
                <Tag style={{ border: 'none', color: TIER_COLORS[tier].color, background: TIER_COLORS[tier].bg, fontWeight: 700 }}>
                  {tier}
                </Tag>
              )
            },
            {
              title: 'Số lượng',
              render: (_, device) => (
                <div>
                  <div>
                    Còn <strong>{device.availableQuantity}</strong> / Tổng {device.totalQuantity}
                  </div>
                  {device.availableQuantity <= 2 && device.availableQuantity > 0 && <Badge color="#B05A4D" text="Sắp hết" />}
                </div>
              )
            },
            {
              title: 'Tình trạng',
              render: (_, device) => <Switch checked={device.active} onChange={(checked) => handleToggleStatus(device, checked)} />
            },
            {
              title: 'Hành động',
              align: 'right',
              render: (_, device) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button icon={<EditOutlined />} onClick={() => openEditModal(device)} />
                  <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(device)} />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingDevice ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}
        open={modalOpen}
        width={600}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Huỷ
          </Button>,
          <Button key="save" type="primary" onClick={() => form.submit()} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
            Lưu thiết bị
          </Button>
        ]}
      >
        <Form<DeviceFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={14}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Tên thiết bị" rules={[{ required: true, message: 'Nhập tên thiết bị' }]}>
                <Input placeholder="VD: Micro Shure SM58" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="Mã thiết bị" rules={[{ required: true, message: 'Nhập mã thiết bị' }]}>
                <Input placeholder="TB-001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col xs={24} md={12}>
              <Form.Item name="category" label="Loại" rules={[{ required: true }]}>
                <Select options={CATEGORY_OPTIONS.map((category) => ({ value: category, label: category }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tier" label="Hạng" rules={[{ required: true }]}>
                <Select options={TIER_OPTIONS.map((tier) => ({ value: tier, label: tier }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col xs={24} md={12}>
              <Form.Item name="totalQuantity" label="Tổng số lượng" rules={[{ required: true, message: 'Nhập tổng số lượng' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="availableQuantity"
                label="Số lượng còn"
                rules={[
                  { required: true, message: 'Nhập số lượng còn' },
                  ({ getFieldValue }) => ({
                    validator(_, value: number) {
                      const total = getFieldValue('totalQuantity') as number | undefined;
                      if (value === undefined || total === undefined || value <= total) return Promise.resolve();
                      return Promise.reject(new Error('Số lượng còn không được vượt tổng số'));
                    }
                  })
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Thông tin chi tiết, hướng dẫn sử dụng, lưu ý..." />
          </Form.Item>
          <Form.Item label="Hình ảnh">
            <Upload listType="picture-card" maxCount={1} beforeUpload={() => false}>
              Chọn ảnh
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
