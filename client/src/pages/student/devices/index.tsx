import { useMemo, useState } from 'react';
import { Button, Col, Empty, Grid, Input, Row, Skeleton } from 'antd';
import { history } from '@umijs/max';
import EquipmentCard from '@/components/EquipmentCard';
import StatsCard from '@/components/StatsCard';
import TrustRankBadge from '@/components/TrustRankBadge';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getDevices } from '@/services/devices';
import { useAuthStore } from '@/stores/authStore';
import type { Device } from '@/types';

type TrustRankValue = 'diamond' | 'gold' | 'silver' | 'bronze' | 'stone';
type DeviceTier = 'S' | 'A' | 'B' | 'C';
type DisplayDevice = Device & {
  icon?: string;
  tier?: DeviceTier;
};

const FILTERS = ['Tất cả', 'Âm thanh', 'Hình ảnh', 'Trình chiếu', 'Phụ kiện', '⚡ Còn hàng'];

const MOCK_STATS = {
  borrowing: 1,
  pending: 1,
  returned: 12,
  streak: 5
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getDisplayName(fullName?: string) {
  const name = fullName?.trim();
  if (!name) return 'bạn';

  const legacyNames: Record<string, string> = {
    'Nguyen Van A': 'Nguyễn Văn A',
    'Quan tri vien': 'Quản trị viên'
  };

  return legacyNames[name] ?? name;
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

  if (text.includes('micro')) return 'Micro chuyên dụng cho sự kiện và thuyết trình';
  if (text.includes('loa')) return 'Loa di động phục vụ sinh hoạt câu lạc bộ';
  if (text.includes('may chieu') || text.includes('trinh chieu')) return 'Thiết bị trình chiếu cho họp nhóm và workshop';
  if (text.includes('may anh') || text.includes('camera')) return 'Thiết bị ghi hình cho truyền thông và sự kiện';
  if (text.includes('tripod') || text.includes('chan may')) return 'Phụ kiện hỗ trợ quay chụp ổn định';
  if (text.includes('den') || text.includes('led')) return 'Đèn hỗ trợ quay chụp trong không gian trong nhà';
  if (text.includes('tai nghe')) return 'Tai nghe kiểm âm, dựng video và luyện tập';
  return 'Thiết bị sẵn sàng cho sinh viên đăng ký mượn';
}

function matchFilter(device: Device, filter: string) {
  if (filter === 'Tất cả') return true;
  if (filter === '⚡ Còn hàng') return device.availableQuantity > 0;

  const text = normalizeText(`${device.name} ${device.category}`);

  if (filter === 'Âm thanh') return text.includes('am thanh') || text.includes('micro') || text.includes('loa');
  if (filter === 'Hình ảnh') return text.includes('hinh anh') || text.includes('may anh') || text.includes('camera');
  if (filter === 'Trình chiếu') return text.includes('trinh chieu') || text.includes('may chieu');
  if (filter === 'Phụ kiện') return text.includes('phu kien') || text.includes('tripod') || text.includes('den') || text.includes('tai nghe');

  return true;
}

export default function StudentDevicesPage() {
  const { currentUser } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { data: devices = [], loading } = useAsyncData(getDevices);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  const userMeta = currentUser as (typeof currentUser & {
    trustScore?: number;
    trustRank?: TrustRankValue;
  });

  const displayDevices = useMemo<DisplayDevice[]>(
    () =>
      devices.map((device) => ({
        ...device,
        icon: getDeviceIcon(device),
        tier: getDeviceTier(device),
        description: getDeviceDescription(device)
      })),
    [devices]
  );

  const availableCount = useMemo(
    () => displayDevices.reduce((total, device) => total + device.availableQuantity, 0),
    [displayDevices]
  );

  const filteredDevices = useMemo(() => {
    const keyword = normalizeText(searchText.trim());

    return displayDevices.filter((device) => {
      const searchableText = normalizeText(`${device.name} ${device.category} ${device.description ?? ''}`);
      const matchesSearch = !keyword || searchableText.includes(keyword);
      return matchesSearch && matchFilter(device, activeFilter);
    });
  }, [activeFilter, displayDevices, searchText]);

  const handleBorrow = (device: Device) => {
    history.push(`/student/borrow?deviceId=${device.id}`);
  };

  return (
    <div style={{ paddingBottom: 48, maxWidth: 1280, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          gap: 24,
          marginBottom: 32,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 34,
              fontWeight: 500,
              lineHeight: 1.1,
              color: '#1A1F1B',
              margin: '0 0 8px'
            }}
          >
            Xin chào, <em style={{ color: '#2D4A3E' }}>{getDisplayName(currentUser?.fullName)}</em>
          </h1>
          <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
            Có {availableCount} thiết bị đang sẵn sàng cho bạn mượn hôm nay.
          </p>
        </div>

        <TrustRankBadge rank={userMeta?.trustRank ?? 'stone'} score={userMeta?.trustScore ?? 0} />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} md={12} xl={6}>
          <StatsCard title="ĐANG MƯỢN" value={MOCK_STATS.borrowing} meta="thiết bị" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatsCard title="CHỜ DUYỆT" value={MOCK_STATS.pending} meta="yêu cầu" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatsCard title="ĐÃ TỪNG MƯỢN" value={MOCK_STATS.returned} meta="lượt thành công" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatsCard title="CHUỖI TỐT" value={MOCK_STATS.streak} meta="+7đ thưởng 🎉" featured />
        </Col>
      </Row>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 28
        }}
      >
        <Input.Search
          allowClear
          placeholder="Tìm thiết bị: micro, máy chiếu, máy ảnh..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: 360, maxWidth: '100%' }}
        />

        {FILTERS.map((filter) => {
          const active = activeFilter === filter;

          return (
            <Button
              key={filter}
              type={active ? 'primary' : 'default'}
              onClick={() => setActiveFilter(filter)}
              style={{
                borderRadius: 100,
                height: 36,
                paddingInline: 16,
                background: active ? '#2D4A3E' : '#FFFFFF',
                borderColor: active ? '#2D4A3E' : '#E5DECB',
                color: active ? '#FFFFFF' : '#1A1F1B'
              }}
            >
              {filter}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <Row gutter={[18, 18]}>
          {Array.from({ length: 8 }, (_, index) => (
            <Col key={index} xs={24} sm={12} md={8} lg={6}>
              <div
                style={{
                  borderRadius: 16,
                  border: '1px solid #E5DECB',
                  background: '#FFFFFF',
                  padding: 18
                }}
              >
                <Skeleton.Image active style={{ width: '100%', height: 150, borderRadius: 12 }} />
                <Skeleton active paragraph={{ rows: 2 }} title={{ width: '70%' }} style={{ marginTop: 16 }} />
                <Skeleton.Button active block style={{ height: 40, borderRadius: 10 }} />
              </div>
            </Col>
          ))}
        </Row>
      ) : filteredDevices.length === 0 ? (
        <Empty
          image={<div style={{ fontSize: 60 }}>🔍</div>}
          styles={{ image: { height: 80, marginBottom: 16 } }}
          description={
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không tìm thấy thiết bị nào</h3>
              <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc khác
              </p>
            </div>
          }
          style={{ padding: '70px 0' }}
        >
          <Button
            onClick={() => {
              setSearchText('');
              setActiveFilter(FILTERS[0]);
            }}
          >
            Xoá bộ lọc
          </Button>
        </Empty>
      ) : (
        <Row gutter={[18, 18]}>
          {filteredDevices.map((device) => (
            <Col key={device.id} xs={24} sm={12} md={8} lg={6}>
              <EquipmentCard device={device} onBorrow={handleBorrow} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
