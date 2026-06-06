import { useMemo, useState } from 'react';
import { Button, Col, Empty, Form, Input, Modal, Row, Select, Space, Table, Typography, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import StatusTag from '@/components/StatusTag';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getReturnableBorrowRequests, markReturned } from '@/services/borrowRequests';
import type { NormalizedBorrowRequest } from '@/services/borrowRequests';
import { BORROW_STATUS_LABEL } from '@/constants/borrowStatus';
import { formatDate } from '@/utils/format';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminTableCard from '@/components/admin/AdminTableCard';
import { exportToExcel } from '@/utils/exportExcel';

interface ReturnFormValues {
  condition: string;
  note?: string;
}

const RETURN_CONDITIONS = [
  { value: 'perfect', label: 'Bình thường' },
  { value: 'minor_damage', label: 'Hư hỏng nhẹ' },
  { value: 'major_damage', label: 'Hư hỏng nặng' },
  { value: 'lost', label: 'Mất thiết bị' }
];

function normalizeText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function renderDate(value?: string) {
  if (!value) return 'Chưa có dữ liệu';

  const formattedDate = formatDate(value);
  return formattedDate === 'Invalid Date' ? 'Chưa có dữ liệu' : formattedDate;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return fallback;
}

export default function AdminReturnsPage() {
  const [returnForm] = Form.useForm<ReturnFormValues>();
  const { data: returnableRequests = [], loading, refresh } = useAsyncData(getReturnableBorrowRequests);
  const [searchText, setSearchText] = useState('');
  const [returnTarget, setReturnTarget] = useState<NormalizedBorrowRequest>();
  const [submitting, setSubmitting] = useState(false);
  const returningStatuses = new Set(['borrowing', 'overdue']);
  const borrowedRequests = returnableRequests.filter((item) => returningStatuses.has(item.status));
  const filteredRequests = useMemo(() => {
    const keyword = normalizeText(searchText.trim());
    if (!keyword) return borrowedRequests;
    return borrowedRequests.filter((request) =>
      normalizeText(`${request.requestCode} ${request.studentName} ${request.studentCode} ${request.deviceName}`).includes(keyword)
    );
  }, [borrowedRequests, searchText]);
  const borrowingCount = borrowedRequests.filter((item) => item.status === 'borrowing').length;
  const overdueCount = borrowedRequests.filter((item) => item.status === 'overdue').length;

  const openReturnModal = (request: NormalizedBorrowRequest) => {
    setReturnTarget(request);
    returnForm.setFieldsValue({ condition: 'perfect', note: '' });
  };

  const closeReturnModal = () => {
    setReturnTarget(undefined);
    returnForm.resetFields();
  };

  const handleReturn = async (values: ReturnFormValues) => {
    if (!returnTarget) return;

    setSubmitting(true);
    try {
      await markReturned(returnTarget.id, {
        returnCondition: values.condition,
        damageNote: values.note?.trim() || undefined
      });
      message.success('Đã ghi nhận trả thiết bị');
      closeReturnModal();
      await refresh();
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể ghi nhận trả thiết bị'), 3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportReturns = () => {
    const exported = exportToExcel<NormalizedBorrowRequest>({
      fileName: 'danh-sach-ghi-nhan-tra',
      sheetName: 'Đơn cần ghi nhận trả',
      rows: filteredRequests,
      columns: [
        { header: 'Mã đơn', value: (request) => request.requestCode, width: 18 },
        { header: 'Sinh viên', value: (request) => request.studentName || `Sinh viên #${request.studentId}`, width: 28 },
        { header: 'MSSV', value: (request) => request.studentCode || 'Chưa có MSSV', width: 16 },
        { header: 'Thiết bị', value: (request) => request.deviceName || `Thiết bị #${request.deviceId}`, width: 28 },
        { header: 'Ngày mượn', value: (request) => renderDate(request.borrowDate), width: 16 },
        { header: 'Ngày trả dự kiến', value: (request) => renderDate(request.returnDate), width: 18 },
        { header: 'Trạng thái', value: (request) => BORROW_STATUS_LABEL[request.status] ?? request.status, width: 16 }
      ]
    });

    if (!exported) message.warning('Không có dữ liệu để xuất.');
  };

  return (
    <div style={{ paddingBottom: 48 }}>
      <AdminPageHeader title="Ghi nhận trả thiết bị" description="Cập nhật các đơn đang mượn hoặc đã quá hạn." />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Tổng cần xử lý" value={borrowedRequests.length} meta="đơn cần ghi nhận trả" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Đang mượn" value={borrowingCount} meta="đơn trong hạn" icon={<ClockCircleOutlined />} accent="#355D8E" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Quá hạn" value={overdueCount} meta="cần ưu tiên xử lý" icon={<WarningOutlined />} accent="#B05A4D" danger={overdueCount > 0} />
        </Col>
      </Row>

      <AdminTableCard
        extra={
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExportReturns}>
              Xuất Excel
            </Button>
            <Input.Search
              allowClear
              placeholder="Tìm mã đơn, sinh viên, thiết bị..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              style={{ width: 320, maxWidth: '100%' }}
            />
          </Space>
        }
      >
        <Table<NormalizedBorrowRequest>
          rowKey="id"
          loading={loading}
          dataSource={filteredRequests}
          locale={{
            emptyText: borrowedRequests.length === 0 ? (
              <AdminEmptyState title="Không có đơn nào cần ghi nhận trả." description="Các đơn đang mượn hoặc quá hạn sẽ xuất hiện tại đây." icon="✓" />
            ) : (
              <Empty description="Không tìm thấy đơn phù hợp" />
            )
          }}
          scroll={{ x: 920 }}
          columns={[
            {
              title: 'Mã đơn',
              dataIndex: 'requestCode',
              width: 140,
              render: (value: string) => (
                <Typography.Text strong title={value} style={{ whiteSpace: 'nowrap' }}>
                  {value}
                </Typography.Text>
              )
            },
            {
              title: 'Sinh viên',
              width: 220,
              render: (_, record) => (
                <div>
                  <Typography.Text strong>{record.studentName || `Sinh viên #${record.studentId}`}</Typography.Text>
                  <div style={{ color: '#8A8E88', fontSize: 12 }}>{record.studentCode || 'Chưa có MSSV'}</div>
                </div>
              )
            },
            {
              title: 'Thiết bị',
              width: 240,
              render: (_, record) => (
                <div>
                  <Typography.Text>{record.deviceName || `Thiết bị #${record.deviceId}`}</Typography.Text>
                  <div style={{ color: '#8A8E88', fontSize: 12 }}>Số lượng: {record.quantity}</div>
                </div>
              )
            },
            { title: 'Ngày mượn', dataIndex: 'borrowDate', width: 140, render: renderDate },
            { title: 'Ngày trả dự kiến', dataIndex: 'returnDate', width: 160, render: renderDate },
            { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (status) => <StatusTag status={status} /> },
            {
              title: 'Thao tác',
              align: 'right',
              width: 140,
              render: (_, record) => (
                <Button type="primary" size="small" onClick={() => openReturnModal(record)} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
                  Ghi nhận trả
                </Button>
              )
            }
          ]}
        />
      </AdminTableCard>

      <Modal
        title={returnTarget ? `Ghi nhận trả ${returnTarget.requestCode}` : 'Ghi nhận trả thiết bị'}
        open={Boolean(returnTarget)}
        onCancel={closeReturnModal}
        onOk={() => returnForm.submit()}
        confirmLoading={submitting}
        okText="Xác nhận trả"
        cancelText="Huỷ"
        okButtonProps={{ style: { background: '#2D4A3E', borderColor: '#2D4A3E' } }}
      >
        {returnTarget ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ border: '1px solid #E5DECB', borderRadius: 12, padding: 14, background: '#FFFDF8' }}>
              <Space direction="vertical" size={4}>
                <Typography.Text>Đơn: <strong>{returnTarget.requestCode}</strong></Typography.Text>
                <Typography.Text>Sinh viên: <strong>{returnTarget.studentName}</strong></Typography.Text>
                <Typography.Text>Thiết bị: <strong>{returnTarget.deviceName} × {returnTarget.quantity}</strong></Typography.Text>
                <Typography.Text>Hạn trả: <strong>{renderDate(returnTarget.returnDate)}</strong></Typography.Text>
              </Space>
            </div>

            <Form<ReturnFormValues> form={returnForm} layout="vertical" onFinish={handleReturn}>
              <Form.Item name="condition" label="Tình trạng thiết bị" rules={[{ required: true, message: 'Chọn tình trạng thiết bị' }]}>
                <Select options={RETURN_CONDITIONS} />
              </Form.Item>
              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea rows={3} placeholder="Ghi chú tình trạng thiết bị nếu cần..." />
              </Form.Item>
            </Form>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
