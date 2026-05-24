import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, InputNumber, message, Row, Select, Spin, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { history, useLocation } from '@umijs/max';
import { createBorrowRequest } from '@/services/borrowRequests';
import { getDeviceById } from '@/services/devices';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/stores/authStore';
import type { Device } from '@/types';

type DeviceTier = 'S' | 'A' | 'B' | 'C';
type TrustRank = 'diamond' | 'gold' | 'silver' | 'bronze' | 'stone';

interface BorrowFormValues {
  borrowDate: Dayjs;
  returnDate: Dayjs;
  quantity: number;
  eventName: string;
  purpose: string;
}

const EVENT_OPTIONS = ['Đêm nhạc CLB tháng 5', 'Sự kiện khác', 'Học tập'];

const RANK_LABEL: Record<TrustRank, string> = {
  diamond: 'Kim cương',
  gold: 'Vàng',
  silver: 'Bạc',
  bronze: 'Đồng',
  stone: 'Đá'
};

const RANK_SCORE: Record<TrustRank, number> = {
  stone: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  diamond: 5
};

const REQUIRED_RANK_BY_TIER: Record<DeviceTier, TrustRank> = {
  S: 'gold',
  A: 'gold',
  B: 'silver',
  C: 'stone'
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getDeviceIcon(device: Device) {
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

function getDeviceTier(device: Device): DeviceTier {
  const text = normalizeText(`${device.name} ${device.category}`);

  if (text.includes('epson') || text.includes('canon') || text.includes('may chieu')) return 'S';
  if (text.includes('shure') || text.includes('jbl') || text.includes('mixer') || text.includes('micro')) return 'A';
  if (text.includes('tripod') || text.includes('den') || text.includes('loa')) return 'B';
  return 'C';
}

function getDeviceDescription(device: Device) {
  if (device.description?.trim()) return device.description;

  const text = normalizeText(`${device.name} ${device.category}`);

  if (text.includes('micro')) return 'Micro chuyên dụng cho sự kiện, thuyết trình và biểu diễn live.';
  if (text.includes('loa')) return 'Loa di động phục vụ sinh hoạt câu lạc bộ và sự kiện nhỏ.';
  if (text.includes('may chieu') || text.includes('trinh chieu')) return 'Thiết bị trình chiếu cho họp nhóm, workshop và thuyết trình.';
  if (text.includes('may anh') || text.includes('camera')) return 'Thiết bị ghi hình cho truyền thông, sự kiện và dự án học tập.';
  if (text.includes('tripod') || text.includes('chan may')) return 'Phụ kiện hỗ trợ quay chụp ổn định trong nhiều bối cảnh.';
  if (text.includes('den') || text.includes('led')) return 'Đèn hỗ trợ quay chụp trong không gian trong nhà.';
  return 'Thiết bị sẵn sàng cho sinh viên đăng ký mượn theo lịch sử dụng.';
}

function EmptyBorrowState() {
  return (
    <Empty
      description="Không tìm thấy thiết bị cần mượn"
      style={{ padding: '72px 0' }}
    >
      <Button type="link" onClick={() => history.push('/student/devices')}>
        ← Quay lại danh sách
      </Button>
    </Empty>
  );
}

export default function StudentBorrowPage() {
  const [form] = Form.useForm<BorrowFormValues>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const location = useLocation();
  const { currentUser } = useAuthStore();
  const deviceId = useMemo(() => new URLSearchParams(location.search).get('deviceId'), [location.search]);
  const { data: device, loading } = useAsyncData<Device | undefined>(
    () => (deviceId ? getDeviceById(deviceId) : Promise.resolve(undefined)),
    [deviceId]
  );

  useEffect(() => {
    setActiveImageIndex(0);
  }, [deviceId]);

  const userMeta = currentUser as (typeof currentUser & {
    trustRank?: TrustRank;
    trustScore?: number;
  });
  const currentRank = userMeta?.trustRank ?? 'gold';
  const currentScore = userMeta?.trustScore ?? 85;

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!deviceId || !device) {
    return <EmptyBorrowState />;
  }

  const icon = getDeviceIcon(device);
  const tier = getDeviceTier(device);
  const description = getDeviceDescription(device);
  const requiredRank = REQUIRED_RANK_BY_TIER[tier];
  const hasRequiredRank = RANK_SCORE[currentRank] >= RANK_SCORE[requiredRank];
  const hasStock = device.availableQuantity > 0;
  const formDisabled = !hasRequiredRank || !hasStock;
  const borrowedQuantity = Math.max(device.totalQuantity - device.availableQuantity, 0);
  const galleryItems = device.images?.length ? device.images : device.image ? [device.image] : ['icon-1', 'icon-2', 'icon-3'];
  const activeGalleryItem = galleryItems[Math.min(activeImageIndex, galleryItems.length - 1)];
  const hasRealImages = Boolean(device.images?.length || device.image);

  const handleSubmit = async (values: BorrowFormValues) => {
    const hideLoading = message.loading('Đang gửi yêu cầu mượn...', 0);

    try {
      await createBorrowRequest({
        deviceId: device.id,
        quantity: values.quantity,
        borrowDate: values.borrowDate.format('YYYY-MM-DD'),
        returnDate: values.returnDate.format('YYYY-MM-DD'),
        note: `[${values.eventName}] ${values.purpose}`
      });

      hideLoading();
      message.success('Đã gửi yêu cầu mượn', 2);
      history.push('/student/requests');
    } catch (error) {
      hideLoading();
      console.error('Create borrow request failed:', error);
      message.error('Không thể gửi yêu cầu mượn. Vui lòng thử lại.', 3);
    }
  };

  return (
    <div style={{ paddingBottom: 48 }}>
      <Button type="link" onClick={() => history.push('/student/devices')} style={{ padding: 0, marginBottom: 20 }}>
        ← Quay lại danh sách
      </Button>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={10}>
          <Card
            variant="borderless"
            style={{ borderRadius: 16, border: '1px solid #E5DECB', background: '#EFE9DD' }}
            styles={{ body: { minHeight: 420, display: 'grid', placeItems: 'center', position: 'relative', padding: 18 } }}
          >
            {hasRealImages ? (
              <img
                key={activeGalleryItem}
                src={activeGalleryItem}
                alt={device.name}
                style={{
                  width: '100%',
                  height: 360,
                  objectFit: 'cover',
                  borderRadius: 14,
                  display: 'block',
                  transition: 'opacity 0.2s ease'
                }}
              />
            ) : (
              <div
                key={activeGalleryItem}
                style={{
                  width: '100%',
                  height: 360,
                  borderRadius: 14,
                  background: '#F5F1E8',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 118,
                  lineHeight: 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                {icon}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#FFFFFF',
                color: '#C99A3F',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'Georgia, serif',
                fontWeight: 700,
                border: '1px solid rgba(201, 154, 63, 0.25)'
              }}
            >
              {tier}
            </div>
          </Card>

          {galleryItems.length > 1 && (
            <Row gutter={10} style={{ marginTop: 12 }}>
              {galleryItems.map((item, index) => {
                const active = activeImageIndex === index;

                return (
                  <Col span={8} key={`${item}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 10,
                        border: active ? '2px solid #2D4A3E' : '1px solid #E5E5E5',
                        background: active ? '#EFE9DD' : '#F5F1E8',
                        padding: 4,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        opacity: active ? 1 : 0.78,
                        transition: 'border-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease'
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.borderColor = '#6BA67B';
                        event.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.borderColor = active ? '#2D4A3E' : '#E5E5E5';
                        event.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {hasRealImages ? (
                        <img
                          src={item}
                          alt={`${device.name} ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7, display: 'block' }}
                        />
                      ) : (
                        <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 34, lineHeight: 1 }}>
                          {icon}
                        </span>
                      )}
                    </button>
                  </Col>
                );
              })}
            </Row>
          )}
        </Col>

        <Col xs={24} lg={14}>
          <Tag
            style={{
              marginBottom: 12,
              border: 'none',
              borderRadius: 100,
              color: '#075985',
              background: '#E0F2FE',
              padding: '4px 12px'
            }}
          >
            Yêu cầu hạng {RANK_LABEL[requiredRank]} · Thiết bị hạng {tier}
          </Tag>

          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1.1,
              color: '#1A1F1B',
              margin: '0 0 10px'
            }}
          >
            {device.name}
          </h1>
          <p style={{ color: '#6B6F6C', fontSize: 14, lineHeight: 1.6, maxWidth: 720, marginBottom: 22 }}>
            {description}
          </p>

          <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
            {[
              ['TỔNG SỐ', device.totalQuantity, '#1A1F1B'],
              ['ĐANG SẴN CÓ', device.availableQuantity, '#4F8B5F'],
              ['ĐANG CHO MƯỢN', borrowedQuantity, '#1A1F1B']
            ].map(([label, value, color]) => (
              <Col xs={24} sm={8} key={String(label)}>
                <Card variant="borderless" style={{ borderRadius: 12, border: '1px solid #E5DECB' }} styles={{ body: { padding: 16 } }}>
                  <div style={{ fontSize: 11, color: '#6B6F6C', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: String(color) }}>{value}</div>
                </Card>
              </Col>
            ))}
          </Row>

          <Alert
            showIcon
            icon={<span>⚠</span>}
            type={hasRequiredRank && hasStock ? 'warning' : 'error'}
            style={{ marginBottom: 18, borderRadius: 12, background: hasRequiredRank && hasStock ? '#F5EBD0' : '#F2DDD7' }}
            message={
              hasStock
                ? `Bạn cần đạt hạng ${RANK_LABEL[requiredRank]} để mượn thiết bị hạng ${tier}. Hạng hiện tại: ${RANK_LABEL[currentRank]} (${currentScore}đ) ${hasRequiredRank ? '✓' : ''}`
                : 'Thiết bị hiện đã hết hàng, chưa thể gửi yêu cầu mượn.'
            }
          />

          <Card
            title={<span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 500 }}>Đăng ký mượn</span>}
            variant="borderless"
            style={{ borderRadius: 14, border: '1px solid #E5DECB' }}
          >
            <Form<BorrowFormValues>
              form={form}
              layout="vertical"
              disabled={formDisabled}
              initialValues={{
                borrowDate: dayjs(),
                returnDate: dayjs().add(3, 'day'),
                quantity: 1,
                eventName: EVENT_OPTIONS[0]
              }}
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="borrowDate" label="Ngày bắt đầu mượn" rules={[{ required: true, message: 'Chọn ngày bắt đầu mượn' }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="returnDate"
                    label="Ngày dự kiến trả"
                    rules={[
                      { required: true, message: 'Chọn ngày dự kiến trả' },
                      ({ getFieldValue }) => ({
                        validator(_, value: Dayjs) {
                          const borrowDate = getFieldValue('borrowDate') as Dayjs | undefined;
                          if (!value || !borrowDate || value.isAfter(borrowDate, 'day')) return Promise.resolve();
                          return Promise.reject(new Error('Ngày trả phải sau ngày mượn'));
                        }
                      })
                    ]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]}>
                    <InputNumber min={1} max={device.availableQuantity} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="eventName" label="Sự kiện sử dụng" rules={[{ required: true, message: 'Chọn sự kiện sử dụng' }]}>
                    <Select options={EVENT_OPTIONS.map((eventName) => ({ value: eventName, label: eventName }))} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="purpose" label="Mục đích mượn" rules={[{ required: true, whitespace: true, message: 'Nhập mục đích mượn' }]}>
                <Input.TextArea rows={4} placeholder="Quay phim sự kiện đêm nhạc của CLB..." />
              </Form.Item>

              <Row gutter={10}>
                <Col flex="auto">
                  <Button type="primary" htmlType="submit" block style={{ height: 44, background: '#2D4A3E', borderColor: '#2D4A3E' }}>
                    Gửi yêu cầu mượn
                  </Button>
                </Col>
                <Col>
                  <Button style={{ height: 44 }} disabled={formDisabled}>
                    Lưu nháp
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
