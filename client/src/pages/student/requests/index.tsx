import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Modal, Row, Skeleton, Steps, Tabs, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { history } from '@umijs/max';
import { getMyBorrowRequests } from '@/services/borrowRequests';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { BorrowRequest } from '@/types';

type RequestStatus = BorrowRequest['status'] | 'cancelled';
type RequestItem = Omit<BorrowRequest, 'status'> & { status: RequestStatus };
type RequestTab = 'all' | 'pending' | 'borrowed' | 'completed';
type DeviceTier = 'S' | 'A' | 'B' | 'C';

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Chờ duyệt', color: '#8B6A1F', bg: '#F5EBD0', dot: '#C99A3F' },
  approved: { label: 'Đã duyệt', color: '#2563EB', bg: '#DCE4F0', dot: '#5C7BA8' },
  borrowed: { label: 'Đang mượn', color: '#6D4A8F', bg: '#E8DEF0', dot: '#8A6CA8' },
  returned: { label: 'Đã hoàn trả', color: '#2F6F3E', bg: '#E1EFE3', dot: '#4F8B5F' },
  cancelled: { label: 'Đã huỷ', color: '#6B6F6C', bg: '#ECEEF2', dot: '#9A9D98' },
  rejected: { label: 'Đã từ chối', color: '#9B3E33', bg: '#F2DDD7', dot: '#B05A4D' },
  overdue: { label: 'Quá hạn', color: '#9B3E33', bg: '#F2DDD7', dot: '#B05A4D' }
};

const COMPLETED_STATUSES: RequestStatus[] = ['returned', 'cancelled', 'rejected'];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function formatDate(value: string, pattern = 'DD/MM') {
  const date = dayjs(value);
  return date.isValid() ? date.format(pattern) : value;
}

function getRequestCode(request: RequestItem, short = false) {
  const digits = request.id.replace(/\D/g, '');
  const suffix = digits ? digits.slice(-4).padStart(4, '0') : request.id.slice(-4).toUpperCase();
  return short ? `#${suffix}` : `#REQ-2026-${suffix}`;
}

function getDeviceIcon(deviceName: string) {
  const text = normalizeText(deviceName);

  if (text.includes('micro')) return '🎤';
  if (text.includes('loa')) return '🔊';
  if (text.includes('may chieu')) return '📽️';
  if (text.includes('may anh') || text.includes('camera') || text.includes('canon') || text.includes('sony')) return '📷';
  if (text.includes('tripod') || text.includes('chan may')) return '🎬';
  if (text.includes('den') || text.includes('led')) return '💡';
  if (text.includes('tai nghe')) return '🎧';
  if (text.includes('mixer')) return '🎚️';
  return '📦';
}

function getDeviceTier(deviceName: string): DeviceTier {
  const text = normalizeText(deviceName);

  if (text.includes('epson') || text.includes('canon') || text.includes('may chieu')) return 'S';
  if (text.includes('shure') || text.includes('jbl') || text.includes('mixer') || text.includes('micro')) return 'A';
  if (text.includes('tripod') || text.includes('den') || text.includes('loa')) return 'B';
  return 'C';
}

function getPurpose(request: RequestItem) {
  return request.note?.trim() || 'Chưa có mô tả mục đích mượn.';
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <Tag
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        borderRadius: 999,
        color: config.color,
        background: config.bg,
        fontSize: 12,
        fontWeight: 600,
        margin: 0,
        padding: '4px 10px'
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.dot }} />
      {config.label}
    </Tag>
  );
}

function getFilteredRequests(requests: RequestItem[], activeTab: RequestTab) {
  if (activeTab === 'pending') return requests.filter((request) => request.status === 'pending');
  if (activeTab === 'borrowed') return requests.filter((request) => request.status === 'borrowed');
  if (activeTab === 'completed') return requests.filter((request) => COMPLETED_STATUSES.includes(request.status));
  return requests;
}

function getTimelineItems(request: RequestItem) {
  const isRejected = request.status === 'rejected';
  const isCancelled = request.status === 'cancelled';
  const isApproved = ['approved', 'borrowed', 'returned'].includes(request.status);
  const isBorrowed = ['borrowed', 'returned'].includes(request.status);
  const isReturned = request.status === 'returned';

  return [
    {
      title: 'Gửi yêu cầu',
      description: formatDate(request.borrowDate, 'DD/MM/YYYY'),
      status: 'finish' as const
    },
    {
      title: isRejected ? 'Đã từ chối' : isCancelled ? 'Đã huỷ' : isApproved ? 'Đã duyệt' : 'Chờ Admin duyệt',
      description: isApproved ? 'Admin đã xác nhận yêu cầu' : 'Dự kiến: trong 24h',
      status: isRejected || isCancelled ? ('error' as const) : isApproved ? ('finish' as const) : ('process' as const)
    },
    {
      title: 'Đến nhận thiết bị',
      description: isBorrowed ? 'Đã nhận thiết bị' : 'Sau khi được duyệt',
      status: isBorrowed ? ('finish' as const) : ('wait' as const)
    },
    {
      title: 'Hoàn trả thiết bị',
      description: isReturned ? 'Đã hoàn trả' : `Trước ${formatDate(request.returnDate, 'DD/MM/YYYY')}`,
      status: isReturned ? ('finish' as const) : ('wait' as const)
    }
  ];
}

export default function StudentRequestsPage() {
  const { data, loading } = useAsyncData(getMyBorrowRequests);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const [cancelTarget, setCancelTarget] = useState<RequestItem>();

  useEffect(() => {
    if (!data) return;

    const nextRequests = data as RequestItem[];
    setRequests(nextRequests);
    setSelectedId((currentId) => {
      if (currentId && nextRequests.some((request) => request.id === currentId)) return currentId;
      return nextRequests[0]?.id;
    });
  }, [data]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((request) => request.status === 'pending').length,
      borrowed: requests.filter((request) => request.status === 'borrowed').length,
      completed: requests.filter((request) => COMPLETED_STATUSES.includes(request.status)).length
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => getFilteredRequests(requests, activeTab), [activeTab, requests]);
  const selectedRequest = requests.find((request) => request.id === selectedId) ?? filteredRequests[0];

  useEffect(() => {
    if (filteredRequests.length && !filteredRequests.some((request) => request.id === selectedId)) {
      setSelectedId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedId]);

  const handleCancel = () => {
    if (!cancelTarget) return;

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === cancelTarget.id ? { ...request, status: 'cancelled' } : request
      )
    );
    setCancelTarget(undefined);
    message.success('Đã huỷ yêu cầu');
  };

  const tabItems = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'pending', label: `Đang xử lý (${counts.pending})` },
    { key: 'borrowed', label: `Đang mượn (${counts.borrowed})` },
    { key: 'completed', label: `Đã hoàn tất (${counts.completed})` }
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 24 }}>
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
          Yêu cầu của tôi
        </h1>
        <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
          Theo dõi trạng thái các đơn mượn thiết bị
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => setActiveTab(key as RequestTab)}
        style={{ marginBottom: 18 }}
      />

      {loading ? (
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} xl={14}>
            <div style={{ display: 'grid', gap: 12 }}>
              {Array.from({ length: 4 }, (_, index) => (
                <Card key={index} variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }} styles={{ body: { padding: 18 } }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 92px', gap: 14, alignItems: 'center' }}>
                    <Skeleton.Avatar active shape="square" size={44} />
                    <Skeleton active paragraph={{ rows: 1 }} title={{ width: '62%' }} />
                    <Skeleton.Button active block style={{ height: 34 }} />
                  </div>
                </Card>
              ))}
            </div>
          </Col>
          <Col xs={24} xl={10}>
            <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
              <Skeleton active paragraph={{ rows: 7 }} title={{ width: '58%' }} />
            </Card>
          </Col>
        </Row>
      ) : requests.length === 0 ? (
        <Empty
          image={<div style={{ fontSize: 80 }}>📋</div>}
          styles={{ image: { height: 96, marginBottom: 16 } }}
          description={
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Chưa có yêu cầu nào</h3>
              <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                Bạn chưa gửi yêu cầu mượn nào. Hãy bắt đầu bằng việc chọn thiết bị!
              </p>
            </div>
          }
          style={{ padding: '76px 0' }}
        >
          <Button type="primary" onClick={() => history.push('/student/devices')}>
            Xem danh sách thiết bị
          </Button>
        </Empty>
      ) : (
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} xl={14}>
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredRequests.length === 0 ? (
                <Empty
                  image={<div style={{ fontSize: 64 }}>📭</div>}
                  styles={{ image: { height: 84, marginBottom: 14 } }}
                  description={
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không có đơn nào trong mục này</h3>
                      <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                        Chuyển sang tab khác để xem các đơn mượn của bạn
                      </p>
                    </div>
                  }
                  style={{ padding: '64px 0' }}
                />
              ) : (
                filteredRequests.map((request) => {
                  const selected = selectedRequest?.id === request.id;

                  return (
                    <Card
                      key={request.id}
                      hoverable
                      variant="borderless"
                      onClick={() => setSelectedId(request.id)}
                      style={{
                        borderRadius: 14,
                        border: selected ? '1px solid #2D4A3E' : '1px solid #E5DECB',
                        boxShadow: selected ? '0 8px 24px rgba(45, 74, 62, 0.08)' : '0 1px 2px rgba(45, 74, 62, 0.04)',
                        opacity: ['cancelled', 'rejected'].includes(request.status) ? 0.72 : 1
                      }}
                      styles={{ body: { padding: 18 } }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 14, alignItems: 'center' }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>{getDeviceIcon(request.deviceName)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#9A9D98', marginBottom: 3 }}>
                            {getRequestCode(request)}
                          </div>
                          <Typography.Text strong style={{ display: 'block', color: '#1A1F1B' }}>
                            {request.deviceName} × {request.quantity}
                          </Typography.Text>
                          <div
                            style={{
                              color: '#6B6F6C',
                              fontSize: 13,
                              marginTop: 4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {formatDate(request.borrowDate)} → {formatDate(request.returnDate)} · {getPurpose(request)}
                          </div>
                        </div>
                        <StatusBadge status={request.status} />
                        <Button
                          danger={request.status === 'pending'}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (request.status === 'pending') setCancelTarget(request);
                            else setSelectedId(request.id);
                          }}
                        >
                          {request.status === 'pending' ? 'Huỷ đơn' : 'Chi tiết'}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </Col>

          <Col xs={24} xl={10}>
            {selectedRequest ? (
              <Card
                variant="borderless"
                style={{
                  borderRadius: 14,
                  border: '1px solid #E5DECB',
                  position: 'sticky',
                  top: 24
                }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 500 }}>
                      Chi tiết đơn {getRequestCode(selectedRequest, true)}
                    </span>
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 14,
                      background: '#EFE9DD',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 36
                    }}
                  >
                    {getDeviceIcon(selectedRequest.deviceName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1A1F1B' }}>{selectedRequest.deviceName}</div>
                    <div style={{ color: '#6B6F6C', fontSize: 13, marginTop: 4 }}>
                      Số lượng: {selectedRequest.quantity} · Hạng {getDeviceTier(selectedRequest.deviceName)}
                    </div>
                  </div>
                </div>

                <Steps direction="vertical" size="small" items={getTimelineItems(selectedRequest)} />

                <div style={{ borderTop: '1px solid #EFEADA', marginTop: 18, paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#6B6F6C', marginBottom: 6 }}>Mục đích mượn</div>
                  <div style={{ fontSize: 13, color: '#1A1F1B', lineHeight: 1.6 }}>
                    {getPurpose(selectedRequest)}
                  </div>
                </div>

                {selectedRequest.status === 'pending' && (
                  <Button danger block style={{ marginTop: 20, height: 42 }} onClick={() => setCancelTarget(selectedRequest)}>
                    Huỷ yêu cầu
                  </Button>
                )}
              </Card>
            ) : (
              <Empty
                image={<div style={{ fontSize: 60 }}>📄</div>}
                styles={{ image: { height: 80, marginBottom: 14 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Chọn một đơn để xem chi tiết</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Nhấn vào một thẻ yêu cầu bên trái để xem tiến trình và thông tin mượn.
                    </p>
                  </div>
                }
                style={{ padding: '48px 0' }}
              />
            )}
          </Col>
        </Row>
      )}

      <Modal
        title="Xác nhận huỷ đơn"
        open={Boolean(cancelTarget)}
        okText="Đồng ý huỷ"
        cancelText="Quay lại"
        okButtonProps={{ danger: true }}
        onOk={handleCancel}
        onCancel={() => setCancelTarget(undefined)}
      >
        <p style={{ marginTop: 12 }}>
          Huỷ đơn sau khi đã duyệt sẽ trừ 3 điểm uy tín. Bạn có chắc muốn huỷ đơn này không?
        </p>
      </Modal>
    </div>
  );
}
