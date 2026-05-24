import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getBorrowRequests } from '@/services/borrowRequests';
import { useAsyncData } from '@/hooks/useAsyncData';
import type { BorrowRequest } from '@/types';
type RequestStatus = BorrowRequest['status'] | 'cancelled';
type RequestTab = 'all' | 'pending' | 'approved' | 'borrowed' | 'returned' | 'overdue';
interface AdminRequest extends Omit<BorrowRequest, 'status'> {
  status: RequestStatus;
  studentCode: string;
  rejectReason?: string;
  returnCondition?: string;
  returnNote?: string;
}
interface RejectFormValues {
  reason: string;
}
interface ReturnFormValues {
  condition: string;
  note?: string;
}
const { RangePicker } = DatePicker;
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ duyệt', color: '#8B6A1F', bg: '#F5EBD0' },
  approved: { label: 'Đã duyệt', color: '#2563EB', bg: '#DCE4F0' },
  borrowed: { label: 'Đang mượn', color: '#6D4A8F', bg: '#E8DEF0' },
  returned: { label: 'Đã trả', color: '#2F6F3E', bg: '#E1EFE3' },
  cancelled: { label: 'Đã huỷ', color: '#6B6F6C', bg: '#ECEEF2' },
  rejected: { label: 'Đã từ chối', color: '#9B3E33', bg: '#F2DDD7' },
  overdue: { label: 'Quá hạn', color: '#7A241B', bg: '#F2DDD7' }
};
const FALLBACK_REQUESTS: AdminRequest[] = [
  {
    id: '142',
    studentId: 'sv1',
    studentName: 'Nguyễn Văn A',
    studentCode: '22000123',
    deviceId: 'd1',
    deviceName: 'Máy ảnh Canon EOS 90D',
    quantity: 1,
    borrowDate: '2026-05-12',
    returnDate: '2026-05-15',
    status: 'pending',
    note: 'Quay phim sự kiện đêm nhạc CLB Truyền thông'
  },
  {
    id: '140',
    studentId: 'sv2',
    studentName: 'Trần Hương',
    studentCode: '22000456',
    deviceId: 'd2',
    deviceName: 'Micro Shure SM58',
    quantity: 2,
    borrowDate: '2026-05-10',
    returnDate: '2026-05-12',
    status: 'approved',
    note: 'Workshop hát nhóm CLB Âm nhạc'
  },
  {
    id: '138',
    studentId: 'sv3',
    studentName: 'Phạm Tùng',
    studentCode: '22000222',
    deviceId: 'd3',
    deviceName: 'Loa kéo JBL',
    quantity: 1,
    borrowDate: '2026-05-05',
    returnDate: '2026-05-11',
    status: 'borrowed',
    note: 'Sự kiện thể thao khoa CNTT'
  },
  {
    id: '131',
    studentId: 'sv4',
    studentName: 'Lê Minh',
    studentCode: '22000789',
    deviceId: 'd4',
    deviceName: 'Máy chiếu Epson EB-X51',
    quantity: 1,
    borrowDate: '2026-04-22',
    returnDate: '2026-04-25',
    status: 'returned',
    note: 'Buổi training nội bộ CLB'
  },
  {
    id: '125',
    studentId: 'sv5',
    studentName: 'Hoàng Lan',
    studentCode: '22000333',
    deviceId: 'd5',
    deviceName: 'Máy ảnh Sony A7 III',
    quantity: 1,
    borrowDate: '2026-04-15',
    returnDate: '2026-04-18',
    status: 'rejected',
    note: 'Quay video promotion CLB'
  },
  {
    id: '119',
    studentId: 'sv6',
    studentName: 'Đỗ An',
    studentCode: '22000666',
    deviceId: 'd6',
    deviceName: 'Tripod Manfrotto',
    quantity: 1,
    borrowDate: '2026-04-01',
    returnDate: '2026-04-04',
    status: 'overdue',
    note: 'Chụp ảnh truyền thông sự kiện'
  }
];
function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
function getRequestCode(request: AdminRequest) {
  const digits = request.id.replace(/\D/g, '');
  const suffix = digits ? digits.slice(-4).padStart(4, '0') : request.id.slice(-4).toUpperCase();
  return `#REQ-2026-${suffix}`;
}
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}
function getDeviceIcon(deviceName: string) {
  const text = normalizeText(deviceName);
  if (text.includes('micro')) return '🎤';
  if (text.includes('loa')) return '🔊';
  if (text.includes('may chieu')) return '📽️';
  if (text.includes('may anh') || text.includes('camera') || text.includes('canon') || text.includes('sony')) return '📷';
  if (text.includes('tripod') || text.includes('chan may')) return '🎬';
  if (text.includes('den') || text.includes('led')) return '💡';
  return '📦';
}
function formatDate(value: string, pattern = 'DD/MM') {
  const date = dayjs(value);
  return date.isValid() ? date.format(pattern) : value;
}
function ellipsisText(value = '', max = 50) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
function toAdminRequest(request: BorrowRequest, index: number): AdminRequest {
  return {
    ...request,
    status: request.status as RequestStatus,
    studentCode: `22000${String(index + 123).padStart(3, '0')}`
  };
}
function StatusTag({ status }: { status: RequestStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 600, margin: 0 }}>
      {config.label}
    </Tag>
  );
}
function StatCard({ title, value, meta, danger, featured }: { title: string; value: number; meta: string; danger?: boolean; featured?: boolean }) {
  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 14, border: featured ? '1px solid #2D4A3E' : '1px solid #E5DECB', background: featured ? '#2D4A3E' : '#FFFFFF' }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ color: featured ? 'rgba(255,255,255,0.72)' : '#6B6F6C', fontSize: 11, letterSpacing: '0.08em' }}>{title}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, color: danger ? '#B05A4D' : featured ? '#FFFFFF' : '#1A1F1B', marginTop: 8 }}>
        {value}
      </div>
      <div style={{ color: featured ? 'rgba(255,255,255,0.72)' : '#6B6F6C', fontSize: 12 }}>{meta}</div>
    </Card>
  );
}
export default function AdminRequestsPage() {
  const [rejectForm] = Form.useForm<RejectFormValues>();
  const [returnForm] = Form.useForm<ReturnFormValues>();
  const { data, loading } = useAsyncData(getBorrowRequests);
  const [requests, setRequests] = useState<AdminRequest[]>(FALLBACK_REQUESTS);
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminRequest>();
  const [handoverTarget, setHandoverTarget] = useState<AdminRequest>();
  const [returnTarget, setReturnTarget] = useState<AdminRequest>();
  const [handoverChecked, setHandoverChecked] = useState(false);
  useEffect(() => {
    if (data?.length) setRequests(data.map(toAdminRequest));
  }, [data]);
  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((item) => item.status === 'pending').length,
      approved: requests.filter((item) => item.status === 'approved').length,
      borrowed: requests.filter((item) => item.status === 'borrowed').length,
      returned: requests.filter((item) => item.status === 'returned').length,
      overdue: requests.filter((item) => item.status === 'overdue').length
    }),
    [requests]
  );
  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(searchText.trim());
    return requests.filter((request) => {
      const matchesTab = activeTab === 'all' || request.status === activeTab;
      const matchesSearch =
        !keyword ||
        normalizeText(`${getRequestCode(request)} ${request.studentName} ${request.studentCode} ${request.deviceName}`).includes(keyword);
      const borrowDate = dayjs(request.borrowDate);
      const matchesDate =
        !dateRange ||
        !borrowDate.isValid() ||
        (borrowDate.isSame(dateRange[0], 'day') || borrowDate.isAfter(dateRange[0], 'day')) &&
          (borrowDate.isSame(dateRange[1], 'day') || borrowDate.isBefore(dateRange[1], 'day'));
      return matchesTab && matchesSearch && matchesDate;
    });
  }, [activeTab, dateRange, requests, searchText]);
  const updateStatus = (id: string, patch: Partial<AdminRequest>) => {
    setRequests((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const handleApprove = (request: AdminRequest) => {
    try {
      // TODO: Kết nối API khi BE2 ready
      updateStatus(request.id, { status: 'approved' });
      message.success('Đã duyệt đơn', 2);
    } catch (error) {
      console.error('Approve request failed:', error);
      message.error('Không thể duyệt đơn. Vui lòng thử lại.', 3);
    }
  };
  const handleReject = (values: RejectFormValues) => {
    if (!rejectTarget) return;

    try {
      // TODO: Kết nối API khi BE2 ready
      updateStatus(rejectTarget.id, { status: 'rejected', rejectReason: values.reason });
      setRejectTarget(undefined);
      rejectForm.resetFields();
      message.success('Đã từ chối', 2);
    } catch (error) {
      console.error('Reject request failed:', error);
      message.error('Không thể từ chối đơn. Vui lòng thử lại.', 3);
    }
  };
  const handleHandOver = () => {
    if (!handoverTarget) return;

    try {
      // TODO: Kết nối API khi BE2 ready
      updateStatus(handoverTarget.id, { status: 'borrowed' });
      setHandoverTarget(undefined);
      setHandoverChecked(false);
      message.success('Đã ghi nhận bàn giao', 2);
    } catch (error) {
      console.error('Hand over request failed:', error);
      message.error('Không thể ghi nhận bàn giao. Vui lòng thử lại.', 3);
    }
  };
  const handleReturn = (values: ReturnFormValues) => {
    if (!returnTarget) return;

    try {
      // TODO: Kết nối API khi BE2 ready
      updateStatus(returnTarget.id, { status: 'returned', returnCondition: values.condition, returnNote: values.note });
      setReturnTarget(undefined);
      returnForm.resetFields();
      message.success('Đã ghi nhận trả', 2);
    } catch (error) {
      console.error('Return request failed:', error);
      message.error('Không thể ghi nhận trả. Vui lòng thử lại.', 3);
    }
  };
  const openRejectModal = (request: AdminRequest) => {
    setRejectTarget(request);
    rejectForm.resetFields();
  };
  const openHandOverModal = (request: AdminRequest) => {
    setHandoverTarget(request);
    setHandoverChecked(false);
  };
  const openReturnModal = (request: AdminRequest) => {
    setReturnTarget(request);
    returnForm.setFieldsValue({ condition: 'perfect', note: '' });
  };
  const showDetail = (request: AdminRequest) => {
    Modal.info({
      title: `Chi tiết đơn ${getRequestCode(request)}`,
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <div>Sinh viên: {request.studentName} ({request.studentCode})</div>
          <div>Thiết bị: {request.deviceName} × {request.quantity}</div>
          <div>Thời gian: {formatDate(request.borrowDate, 'DD/MM/YYYY')} → {formatDate(request.returnDate, 'DD/MM/YYYY')}</div>
          <div>Mục đích: {request.note || 'Chưa có ghi chú'}</div>
        </div>
      )
    });
  };
  const actionButtons = (request: AdminRequest) => {
    if (request.status === 'pending') {
      return (
        <Space>
          <Button type="primary" onClick={() => handleApprove(request)}>Duyệt</Button>
          <Button danger onClick={() => openRejectModal(request)}>Từ chối</Button>
        </Space>
      );
    }
    if (request.status === 'approved') return <Button type="primary" onClick={() => openHandOverModal(request)}>Ghi nhận mượn</Button>;
    if (request.status === 'borrowed' || request.status === 'overdue') return <Button type="primary" onClick={() => openReturnModal(request)}>Ghi nhận trả</Button>;
    return <Button onClick={() => showDetail(request)}>Chi tiết</Button>;
  };
  const tabItems = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'pending', label: `Chờ duyệt (${counts.pending})` },
    { key: 'approved', label: `Đã duyệt (${counts.approved})` },
    { key: 'borrowed', label: `Đang mượn (${counts.borrowed})` },
    { key: 'returned', label: `Đã trả (${counts.returned})` },
    { key: 'overdue', label: `Quá hạn (${counts.overdue})` }
  ];
  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', color: '#1A1F1B' }}>
          Xử lý yêu cầu mượn
        </h1>
        <p style={{ color: '#6B6F6C', margin: 0 }}>Duyệt đơn, ghi nhận bàn giao và hoàn trả thiết bị</p>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="CHỜ DUYỆT" value={counts.pending} meta="đơn cần xử lý" featured={counts.pending > 0} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="ĐÃ DUYỆT" value={counts.approved} meta="chờ bàn giao" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="ĐANG MƯỢN" value={counts.borrowed} meta="đơn đang hoạt động" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="QUÁ HẠN" value={counts.overdue} meta="đơn cần nhắc nhở" danger />
        </Col>
      </Row>
      <Tabs activeKey={activeTab} items={tabItems} onChange={(key) => setActiveTab(key as RequestTab)} />
      <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <Input.Search
            allowClear
            placeholder="Tìm theo tên SV hoặc mã đơn..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: 320, maxWidth: '100%' }}
          />
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          />
        </div>
        <Table<AdminRequest>
          rowKey="id"
          loading={{ spinning: loading, tip: 'Đang tải yêu cầu...' }}
          dataSource={filteredRequests}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: requests.length === 0 ? (
              <Empty
                image={<div style={{ fontSize: 80 }}>✅</div>}
                styles={{ image: { height: 96, marginBottom: 16 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không có yêu cầu cần xử lý</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Tất cả yêu cầu mượn đã được xử lý xong.
                    </p>
                  </div>
                }
                style={{ padding: '64px 0' }}
              />
            ) : activeTab === 'pending' ? (
              <Empty
                image={<div style={{ fontSize: 70 }}>✅</div>}
                styles={{ image: { height: 90, marginBottom: 14 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không có đơn chờ duyệt</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Tất cả đơn đã được duyệt hoặc xử lý.
                    </p>
                  </div>
                }
                style={{ padding: '60px 0' }}
              />
            ) : (
              <Empty
                image={<div style={{ fontSize: 64 }}>🔍</div>}
                styles={{ image: { height: 84, marginBottom: 14 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không tìm thấy yêu cầu nào</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Thử đổi tab, từ khoá tìm kiếm hoặc khoảng thời gian khác.
                    </p>
                  </div>
                }
                style={{ padding: '60px 0' }}
              />
            )
          }}
          columns={[
            { title: 'Mã đơn', render: (_, request) => <Typography.Text strong>{getRequestCode(request)}</Typography.Text> },
            {
              title: 'Sinh viên',
              render: (_, request) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar style={{ background: '#2D4A3E', color: '#F5EBD0' }}>{getInitials(request.studentName)}</Avatar>
                  <div>
                    <div style={{ fontWeight: 600 }}>{request.studentName}</div>
                    <div style={{ color: '#9A9D98', fontSize: 12 }}>{request.studentCode}</div>
                  </div>
                </div>
              )
            },
            {
              title: 'Thiết bị',
              render: (_, request) => (
                <span>{getDeviceIcon(request.deviceName)} {request.deviceName} × {request.quantity}</span>
              )
            },
            {
              title: 'Ngày mượn → trả',
              render: (_, request) => `${formatDate(request.borrowDate)} → ${formatDate(request.returnDate)}`
            },
            {
              title: 'Mục đích',
              render: (_, request) => <Typography.Text style={{ color: '#6B6F6C' }}>{ellipsisText(request.note || '—')}</Typography.Text>
            },
            { title: 'Trạng thái', dataIndex: 'status', render: (status: RequestStatus) => <StatusTag status={status} /> },
            { title: 'Hành động', align: 'right', render: (_, request) => actionButtons(request) }
          ]}
        />
      </Card>
      <Modal
        title={`Từ chối yêu cầu ${rejectTarget ? getRequestCode(rejectTarget) : ''}`}
        open={Boolean(rejectTarget)}
        okText="Xác nhận từ chối"
        cancelText="Huỷ"
        okButtonProps={{ danger: true }}
        onOk={() => rejectForm.submit()}
        onCancel={() => setRejectTarget(undefined)}
      >
        <Form<RejectFormValues> form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item name="reason" label="Lý do từ chối" rules={[{ required: true, whitespace: true, message: 'Nhập lý do từ chối' }]}>
            <Input.TextArea rows={4} placeholder="Nhập lý do từ chối..." />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Ghi nhận bàn giao thiết bị"
        open={Boolean(handoverTarget)}
        okText="Xác nhận"
        cancelText="Huỷ"
        okButtonProps={{ disabled: !handoverChecked }}
        onOk={handleHandOver}
        onCancel={() => setHandoverTarget(undefined)}
      >
        {handoverTarget && (
          <div style={{ lineHeight: 1.8 }}>
            <div>Sinh viên: <strong>{handoverTarget.studentName}</strong></div>
            <div>Thiết bị: <strong>{handoverTarget.deviceName} × {handoverTarget.quantity}</strong></div>
            <div>Ngày trả dự kiến: <strong>{formatDate(handoverTarget.returnDate, 'DD/MM/YYYY')}</strong></div>
          </div>
        )}
        <Checkbox checked={handoverChecked} onChange={(event) => setHandoverChecked(event.target.checked)} style={{ marginTop: 16 }}>
          Tôi xác nhận đã bàn giao đầy đủ thiết bị cho sinh viên
        </Checkbox>
      </Modal>
      <Modal
        title="Ghi nhận hoàn trả thiết bị"
        open={Boolean(returnTarget)}
        okText="Xác nhận trả"
        cancelText="Huỷ"
        onOk={() => returnForm.submit()}
        onCancel={() => setReturnTarget(undefined)}
      >
        {returnTarget && (
          <div style={{ lineHeight: 1.8, marginBottom: 12 }}>
            <div>Sinh viên: <strong>{returnTarget.studentName}</strong></div>
            <div>Thiết bị: <strong>{returnTarget.deviceName} × {returnTarget.quantity}</strong></div>
          </div>
        )}
        <Form<ReturnFormValues> form={returnForm} layout="vertical" onFinish={handleReturn}>
          <Form.Item name="condition" label="Tình trạng thiết bị" rules={[{ required: true, message: 'Chọn tình trạng thiết bị' }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="perfect">Hoàn hảo (+2đ uy tín)</Radio>
                <Radio value="scratch">Trầy xước nhẹ (0đ)</Radio>
                <Radio value="minor">Hỏng nhẹ (-3đ)</Radio>
                <Radio value="lost">Hỏng nặng / mất (-10đ)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Ghi chú tình trạng thực tế..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
