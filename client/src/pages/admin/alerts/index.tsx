import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MailOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { history } from 'umi';
import { useAsyncData } from '@/hooks/useAsyncData';
import { BORROW_STATUS_LABEL } from '@/constants/borrowStatus';
import { ROUTES } from '@/constants/routes';
import { getBorrowRequests } from '@/services/borrowRequests';
import type { NormalizedBorrowRequest } from '@/services/borrowRequests';
import { getRequestStats } from '@/services/statistics';
import {
  getEmailTemplates,
  getSystemSettings,
  updateEmailTemplate,
  updateSystemSetting
} from '@/services/alerts';
import type { EmailTemplateRecord, SystemSettingRecord } from '@/services/alerts';

interface TemplateFormValues {
  subject: string;
  body: string;
}

interface SettingFormValues {
  settingValue: string;
}

interface AlertData {
  pendingRequests: NormalizedBorrowRequest[];
  overdueRequests: NormalizedBorrowRequest[];
  borrowingRequests: NormalizedBorrowRequest[];
  recentRequests: NormalizedBorrowRequest[];
  pendingCount?: number;
  overdueCount?: number;
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có dữ liệu';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD/MM/YYYY HH:mm') : value;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function getDaysUntil(dateValue?: string) {
  const date = dayjs(dateValue);
  if (!date.isValid()) return undefined;
  return date.startOf('day').diff(dayjs().startOf('day'), 'day');
}

function getOverdueDays(dateValue?: string) {
  const date = dayjs(dateValue);
  if (!date.isValid()) return undefined;
  return Math.max(dayjs().startOf('day').diff(date.startOf('day'), 'day'), 0);
}

function getRequestTime(request: NormalizedBorrowRequest) {
  return request.updatedAt || request.createdAt || request.returnDate || request.borrowDate;
}

function getActivityTimeLabel(request: NormalizedBorrowRequest) {
  if (request.status === 'overdue' || request.status === 'borrowing') {
    return `Hạn trả: ${formatDateTime(request.returnDate)}`;
  }

  return `Cập nhật: ${formatDateTime(getRequestTime(request))}`;
}

function getActivityPriority(request: NormalizedBorrowRequest) {
  if (request.status === 'overdue') return 1;
  if (request.status === 'pending') return 2;
  if (request.status === 'borrowing') {
    const daysUntil = getDaysUntil(request.returnDate);
    return daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 2 ? 3 : 6;
  }
  if (request.status === 'cancelled' || request.status === 'cancelled_noshow' || request.status === 'rejected') return 4;
  if (request.status === 'returned_late') return 5;
  if (request.status === 'returned' || request.status === 'returned_ontime') return 8;
  return 7;
}

function mergeActivityRequests(...groups: NormalizedBorrowRequest[][]) {
  const requestMap = new Map<string, NormalizedBorrowRequest>();

  groups.flat().forEach((request) => {
    if (!requestMap.has(request.id)) requestMap.set(request.id, request);
  });

  return Array.from(requestMap.values());
}

function getRequestStatusQuery(request: NormalizedBorrowRequest) {
  if (request.status === 'pending') return 'pending';
  if (request.status === 'approved') return 'approved';
  if (request.status === 'borrowed' || request.status === 'borrowing') return 'borrowing';
  if (request.status === 'overdue') return 'overdue';
  if (request.status === 'returned' || request.status === 'returned_ontime' || request.status === 'returned_late') return 'returned';
  if (request.status === 'cancelled' || request.status === 'canceled' || request.status === 'cancelled_noshow' || request.status === 'rejected') return 'cancelled';
  return undefined;
}

function buildRequestsUrl(status?: string, requestId?: string | number) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (requestId !== undefined && requestId !== null && String(requestId)) params.set('requestId', String(requestId));
  const query = params.toString();
  return query ? `${ROUTES.adminRequests}?${query}` : ROUTES.adminRequests;
}

function buildRequestActionUrl(request: NormalizedBorrowRequest) {
  return buildRequestsUrl(getRequestStatusQuery(request), request.id);
}

function getTemplateDescription(template: EmailTemplateRecord) {
  const value = `${template.code} ${template.name}`.toLowerCase();

  if (value.includes('approve') || value.includes('duyet') || value.includes('duyệt')) return 'Gửi khi yêu cầu mượn được duyệt.';
  if (value.includes('reject') || value.includes('tu_choi') || value.includes('từ chối')) return 'Gửi khi yêu cầu mượn bị từ chối.';
  if (value.includes('reminder') || value.includes('nhac') || value.includes('nhắc')) return 'Nhắc sinh viên trước thời hạn trả.';
  if (value.includes('overdue') || value.includes('qua_han') || value.includes('quá hạn')) return 'Cảnh báo khi đơn mượn đã quá hạn.';
  if (value.includes('deduct') || value.includes('tru_diem') || value.includes('trừ điểm')) return 'Thông báo khi điểm uy tín bị trừ.';
  if (value.includes('added') || value.includes('cong_diem') || value.includes('cộng điểm')) return 'Thông báo khi điểm uy tín được cộng.';
  if (value.includes('lock') || value.includes('khoa') || value.includes('khoá')) return 'Thông báo khi tài khoản bị khoá mượn.';
  if (value.includes('forgot') || value.includes('password') || value.includes('mật khẩu')) return 'Hỗ trợ đặt lại mật khẩu tài khoản.';

  return 'Mẫu thông báo đang được sử dụng trong hệ thống.';
}

function getActivityConfig(request: NormalizedBorrowRequest) {
  if (request.status === 'overdue') {
    const overdueDays = getOverdueDays(request.returnDate);
    return {
      tone: 'danger',
      icon: <ExclamationCircleOutlined />,
      title: `${request.studentName} đang quá hạn${overdueDays ? ` ${overdueDays} ngày` : ''}`,
      description: `${request.requestCode} · ${request.deviceName}`,
      action: 'Xử lý'
    };
  }

  if (request.status === 'pending') {
    return {
      tone: 'info',
      icon: <FileTextOutlined />,
      title: `Yêu cầu mới chờ duyệt`,
      description: `${request.studentName} · ${request.deviceName}`,
      action: 'Xử lý'
    };
  }

  if (request.status === 'borrowing') {
    const daysUntil = getDaysUntil(request.returnDate);
    if (daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 2) {
      return {
        tone: 'warning',
        icon: <ClockCircleOutlined />,
        title: `Đơn mượn sắp đến hạn trả`,
        description: `${request.studentName} · ${request.deviceName} · còn ${daysUntil} ngày`,
        action: 'Chi tiết'
      };
    }

    return {
      tone: 'warning',
      icon: <ClockCircleOutlined />,
      title: `${request.studentName} đang mượn thiết bị`,
      description: `${request.requestCode} · ${request.deviceName}`,
      action: 'Chi tiết'
    };
  }

  if (request.status === 'cancelled' || request.status === 'cancelled_noshow' || request.status === 'rejected') {
    return {
      tone: 'warning',
      icon: <AlertOutlined />,
      title: BORROW_STATUS_LABEL[request.status] || 'Yêu cầu đã được cập nhật',
      description: `${request.studentName} · ${request.deviceName}`,
      action: 'Chi tiết'
    };
  }

  if (request.status === 'returned' || request.status === 'returned_ontime' || request.status === 'returned_late') {
    return {
      tone: request.status === 'returned_late' ? 'warning' : 'success',
      icon: <CheckCircleOutlined />,
      title: request.status === 'returned_late' ? 'Đơn mượn đã trả trễ' : 'Đơn mượn đã được ghi nhận trả',
      description: `${request.studentName} · ${request.deviceName}`,
      action: 'Chi tiết'
    };
  }

  return {
    tone: 'neutral',
    icon: <AlertOutlined />,
    title: BORROW_STATUS_LABEL[request.status] || 'Cập nhật yêu cầu mượn',
    description: `${request.studentName} · ${request.deviceName}`,
    action: 'Chi tiết'
  };
}

async function loadAlertData(): Promise<AlertData> {
  const [pendingRequests, overdueRequests, borrowingRequests, recentRequests, requestStats] = await Promise.all([
    getBorrowRequests({ status: 'pending', page: 1, limit: 1000 }),
    getBorrowRequests({ status: 'overdue', page: 1, limit: 1000 }),
    getBorrowRequests({ status: 'borrowing', page: 1, limit: 1000 }),
    getBorrowRequests({ page: 1, limit: 50 }),
    getRequestStats().catch(() => undefined)
  ]);

  return {
    pendingRequests,
    overdueRequests,
    borrowingRequests,
    recentRequests,
    pendingCount: requestStats?.pendingCount,
    overdueCount: requestStats?.overdueCount
  };
}

export default function AdminAlertsPage() {
  const [templateForm] = Form.useForm<TemplateFormValues>();
  const [settingForm] = Form.useForm<SettingFormValues>();
  const { data: alertData, loading: alertLoading } = useAsyncData(loadAlertData, []);
  const { data: templates = [], loading: templatesLoading, error: templatesError, refresh: refreshTemplates } = useAsyncData(getEmailTemplates, []);
  const { data: settings = [], loading: settingsLoading, error: settingsError, refresh: refreshSettings } = useAsyncData(getSystemSettings, []);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRecord>();
  const [editingSetting, setEditingSetting] = useState<SystemSettingRecord>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pendingRequests = alertData?.pendingRequests ?? [];
  const overdueRequests = alertData?.overdueRequests ?? [];
  const borrowingRequests = alertData?.borrowingRequests ?? [];
  const recentRequests = alertData?.recentRequests ?? [];
  const pendingCount = alertData?.pendingCount ?? pendingRequests.length;

  const dueSoonRequests = useMemo(
    () => borrowingRequests.filter((request) => {
      const daysUntil = getDaysUntil(request.returnDate);
      return daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 2;
    }),
    [borrowingRequests]
  );

  const severeOverdueRequests = useMemo(() => {
    const requestsWithReturnDate = overdueRequests.filter((request) => getOverdueDays(request.returnDate) !== undefined);
    if (requestsWithReturnDate.length === 0) return overdueRequests;
    return requestsWithReturnDate.filter((request) => (getOverdueDays(request.returnDate) ?? 0) > 5);
  }, [overdueRequests]);

  const activities = useMemo(
    () =>
      mergeActivityRequests(overdueRequests, pendingRequests, dueSoonRequests, recentRequests)
        .slice()
        .sort((a, b) => {
          const priorityDiff = getActivityPriority(a) - getActivityPriority(b);
          if (priorityDiff !== 0) return priorityDiff;
          return dayjs(getRequestTime(b)).valueOf() - dayjs(getRequestTime(a)).valueOf();
        })
        .slice(0, 6),
    [dueSoonRequests, overdueRequests, pendingRequests, recentRequests]
  );
  const overdueTarget = severeOverdueRequests[0] ?? overdueRequests[0];
  const pendingTarget = pendingRequests[0];

  const openTemplateModal = (template: EmailTemplateRecord) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({ subject: template.subject, body: template.body });
  };

  const openSettingModal = (setting: SystemSettingRecord) => {
    setEditingSetting(setting);
    settingForm.setFieldsValue({ settingValue: setting.settingValue });
  };

  const handleTemplateSubmit = async (values: TemplateFormValues) => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      const response = await updateEmailTemplate(editingTemplate.id, values);
      await refreshTemplates();
      message.success(response.message || 'Đã cập nhật mẫu email');
      setEditingTemplate(undefined);
      templateForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể cập nhật mẫu email'), 3);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingSubmit = async (values: SettingFormValues) => {
    if (!editingSetting) return;

    setSaving(true);
    try {
      const response = await updateSystemSetting(editingSetting.settingKey, values.settingValue);
      await refreshSettings();
      message.success(response.message || 'Đã cập nhật cấu hình');
      setEditingSetting(undefined);
      settingForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể cập nhật cấu hình'), 3);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-alerts-page">
      <style>{`
        .admin-alerts-page {
          padding-bottom: 48px;
          color: #1A1F1B;
          font-family: var(--app-font);
        }

        .admin-alerts-page__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .admin-alerts-page__title {
          margin: 0 0 8px;
          font-family: var(--app-heading-font);
          font-size: clamp(30px, 4vw, 42px);
          font-weight: 760;
          line-height: 1.12;
          letter-spacing: 0;
        }

        .admin-alerts-page__title-accent {
          color: #2D4A3E;
          font-style: italic;
        }

        .admin-alerts-page__subtitle {
          margin: 0;
          color: #6B6F6C;
          font-size: 15px;
        }

        .admin-alerts-page__summary-grid,
        .admin-alerts-page__template-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .admin-alerts-page__summary-grid {
          margin-bottom: 24px;
        }

        .admin-alerts-page__alert-card,
        .admin-alerts-page__panel,
        .admin-alerts-page__template-card {
          border-radius: 14px;
          border: 1px solid #E5DECB;
          box-shadow: 0 16px 42px rgba(45, 74, 62, 0.05);
        }

        .admin-alerts-page__alert-card--danger {
          background: #FCEBE8;
          border-color: #E5C6BE;
        }

        .admin-alerts-page__alert-card--warning {
          background: #FFF7DD;
          border-color: #E5D0A0;
        }

        .admin-alerts-page__alert-card--info {
          background: #EAF3F8;
          border-color: #C2D2E5;
        }

        .admin-alerts-page__alert-content {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .admin-alerts-page__alert-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: rgba(255,255,255,.72);
        }

        .admin-alerts-page__alert-title {
          font-weight: 800;
          margin-bottom: 4px;
        }

        .admin-alerts-page__alert-title--danger { color: #9B3E33; }
        .admin-alerts-page__alert-title--warning { color: #8B6A1F; }
        .admin-alerts-page__alert-title--info { color: #2D4A6B; }

        .admin-alerts-page__alert-count {
          font-family: var(--app-heading-font);
          font-size: 32px;
          font-weight: 800;
          line-height: 1.1;
          margin: 6px 0;
        }

        .admin-alerts-page__alert-meta {
          color: #5F6762;
          font-size: 13px;
          line-height: 1.45;
        }

        .admin-alerts-page__panel {
          background: #FFFDF8;
          overflow: hidden;
          margin-bottom: 28px;
        }

        .admin-alerts-page__panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 22px;
          border-bottom: 1px solid #E5DECB;
        }

        .admin-alerts-page__panel-title {
          font-size: 17px;
          font-weight: 800;
        }

        .admin-alerts-page__activity-item {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid #EFEADA;
        }

        .admin-alerts-page__activity-item:last-child {
          border-bottom: 0;
        }

        .admin-alerts-page__activity-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2D4A3E;
          background: #E1EFE3;
        }

        .admin-alerts-page__activity-icon--danger { color: #9B3E33; background: #F2DDD7; }
        .admin-alerts-page__activity-icon--warning { color: #8B6A1F; background: #F5EBD0; }
        .admin-alerts-page__activity-icon--info { color: #2D4A6B; background: #E0EEF8; }
        .admin-alerts-page__activity-icon--success { color: #2F6F3E; background: #E1EFE3; }

        .admin-alerts-page__activity-title {
          font-weight: 800;
          margin-bottom: 3px;
        }

        .admin-alerts-page__activity-text {
          color: #6B6F6C;
          font-size: 13px;
          line-height: 1.45;
        }

        .admin-alerts-page__activity-time {
          color: #8A8E88;
          font-size: 12px;
          margin-top: 4px;
        }

        .admin-alerts-page__section-title {
          margin: 0 0 14px;
          font-size: 17px;
          font-weight: 800;
          color: #1A1F1B;
        }

        .admin-alerts-page__template-card {
          background: #FFFDF8;
        }

        .admin-alerts-page__template-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }

        .admin-alerts-page__template-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #E1EFE3;
          color: #2D4A3E;
          flex: 0 0 auto;
        }

        .admin-alerts-page__template-name {
          font-weight: 800;
          line-height: 1.35;
        }

        .admin-alerts-page__template-description {
          color: #6B6F6C;
          font-size: 13px;
          line-height: 1.45;
          min-height: 38px;
          margin-bottom: 14px;
        }

        @media (max-width: 980px) {
          .admin-alerts-page__summary-grid,
          .admin-alerts-page__template-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .admin-alerts-page__activity-item {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .admin-alerts-page__activity-item .ant-btn {
            grid-column: 2;
            justify-self: start;
          }
        }
      `}</style>

      <div className="admin-alerts-page__header">
        <div>
          <h1 className="admin-alerts-page__title">
            Trung tâm <span className="admin-alerts-page__title-accent">cảnh báo</span>
          </h1>
          <p className="admin-alerts-page__subtitle">Theo dõi các vấn đề cần xử lý ngay</p>
        </div>
        <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
          Cài đặt thông báo
        </Button>
      </div>

      <section className="admin-alerts-page__summary-grid">
        <Card variant="borderless" loading={alertLoading} className="admin-alerts-page__alert-card admin-alerts-page__alert-card--danger">
          <div className="admin-alerts-page__alert-content">
            <span className="admin-alerts-page__alert-icon"><ExclamationCircleOutlined /></span>
            <div>
              <div className="admin-alerts-page__alert-title admin-alerts-page__alert-title--danger">Quá hạn nghiêm trọng</div>
              <div className="admin-alerts-page__alert-count">{severeOverdueRequests.length}</div>
              <div className="admin-alerts-page__alert-meta">
                {overdueRequests.length > 0 ? `${alertData?.overdueCount ?? overdueRequests.length} đơn quá hạn cần theo dõi` : 'Không có đơn quá hạn cần xử lý'}
              </div>
              <Button
                type="primary"
                danger
                style={{ marginTop: 12 }}
                onClick={() => history.push(overdueTarget ? buildRequestActionUrl(overdueTarget) : buildRequestsUrl('overdue'))}
              >
                Xem chi tiết
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="borderless" loading={alertLoading} className="admin-alerts-page__alert-card admin-alerts-page__alert-card--warning">
          <div className="admin-alerts-page__alert-content">
            <span className="admin-alerts-page__alert-icon"><ClockCircleOutlined /></span>
            <div>
              <div className="admin-alerts-page__alert-title admin-alerts-page__alert-title--warning">Sắp đến hạn trả</div>
              <div className="admin-alerts-page__alert-count">{dueSoonRequests.length}</div>
              <div className="admin-alerts-page__alert-meta">
                {dueSoonRequests.length > 0 ? 'Đơn cần được nhắc trong 2 ngày tới' : 'Chưa có đơn sắp đến hạn trả'}
              </div>
              <Tooltip title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
                <span>
                  <Button disabled style={{ marginTop: 12 }} title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
                    Gửi nhắc nhở
                  </Button>
                </span>
              </Tooltip>
            </div>
          </div>
        </Card>

        <Card variant="borderless" loading={alertLoading} className="admin-alerts-page__alert-card admin-alerts-page__alert-card--info">
          <div className="admin-alerts-page__alert-content">
            <span className="admin-alerts-page__alert-icon"><FileTextOutlined /></span>
            <div>
              <div className="admin-alerts-page__alert-title admin-alerts-page__alert-title--info">Yêu cầu chờ duyệt</div>
              <div className="admin-alerts-page__alert-count">{pendingCount}</div>
              <div className="admin-alerts-page__alert-meta">
                {pendingCount > 0 ? 'Đơn mượn đang chờ quản trị viên xử lý' : 'Không có yêu cầu đang chờ duyệt'}
              </div>
              <Button type="primary" style={{ marginTop: 12, background: '#2D4A3E' }} onClick={() => history.push(pendingTarget ? buildRequestActionUrl(pendingTarget) : buildRequestsUrl('pending'))}>
                Xử lý ngay
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="admin-alerts-page__panel">
        <div className="admin-alerts-page__panel-header">
          <div className="admin-alerts-page__panel-title">Nhật ký hoạt động gần đây</div>
          <Button onClick={() => history.push(ROUTES.adminRequests)}>Xem tất cả</Button>
        </div>
        {activities.length === 0 ? (
          <Empty description="Chưa có cảnh báo cần xử lý." style={{ padding: '52px 0' }} />
        ) : (
          activities.map((request) => {
            const activity = getActivityConfig(request);
            return (
              <div className="admin-alerts-page__activity-item" key={request.id}>
                <span className={`admin-alerts-page__activity-icon admin-alerts-page__activity-icon--${activity.tone}`}>{activity.icon}</span>
                <div>
                  <div className="admin-alerts-page__activity-title">{activity.title}</div>
                  <div className="admin-alerts-page__activity-text">{activity.description}</div>
                  <div className="admin-alerts-page__activity-time">{getActivityTimeLabel(request)}</div>
                </div>
                <Button onClick={() => history.push(buildRequestActionUrl(request))}>{activity.action}</Button>
              </div>
            );
          })
        )}
      </section>

      <section>
        <h2 className="admin-alerts-page__section-title">Mẫu email thông báo</h2>
        {templatesError ? (
          <Alert type="warning" showIcon message="Chưa thể tải mẫu thông báo." />
        ) : templates.length === 0 && !templatesLoading ? (
          <Card variant="borderless" className="admin-alerts-page__template-card">
            <Empty description="Chưa có mẫu thông báo nào." />
          </Card>
        ) : (
          <div className="admin-alerts-page__template-grid">
            {templates.map((template) => (
              <Card
                variant="borderless"
                loading={templatesLoading}
                className="admin-alerts-page__template-card"
                key={template.id}
              >
                <div className="admin-alerts-page__template-head">
                  <span className="admin-alerts-page__template-icon"><MailOutlined /></span>
                  <div>
                    <div className="admin-alerts-page__template-name">{template.name}</div>
                    <Tag style={{ marginTop: 6, border: 'none', borderRadius: 999, color: template.isActive ? '#2F6F3E' : '#6B6F6C', background: template.isActive ? '#E1EFE3' : '#ECEEF2', fontWeight: 700 }}>
                      {template.isActive ? 'Đang dùng' : 'Tạm tắt'}
                    </Tag>
                  </div>
                </div>
                <div className="admin-alerts-page__template-description">{getTemplateDescription(template)}</div>
                <Button icon={<EditOutlined />} block onClick={() => openTemplateModal(template)}>
                  Chỉnh sửa
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        title={editingTemplate ? `Chỉnh sửa mẫu: ${editingTemplate.name}` : 'Chỉnh sửa mẫu email'}
        open={Boolean(editingTemplate)}
        okText="Lưu mẫu"
        cancelText="Huỷ"
        width={760}
        confirmLoading={saving}
        onOk={() => templateForm.submit()}
        onCancel={() => setEditingTemplate(undefined)}
      >
        <Form<TemplateFormValues> form={templateForm} layout="vertical" onFinish={handleTemplateSubmit}>
          <Form.Item name="subject" label="Tiêu đề email" rules={[{ required: true, whitespace: true, message: 'Nhập tiêu đề email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="body" label="Nội dung" rules={[{ required: true, whitespace: true, message: 'Nhập nội dung email' }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
          <div style={{ border: '1px solid #E5DECB', borderRadius: 12, padding: 14, background: '#FFFDF8' }}>
            <Typography.Text strong>Xem trước nội dung</Typography.Text>
            <div style={{ marginTop: 10, color: '#6B6F6C', whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>
              {templateForm.getFieldValue('body') || editingTemplate?.body || 'Chưa có nội dung xem trước.'}
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Cài đặt thông báo"
        open={settingsOpen}
        width={820}
        footer={<Button onClick={() => setSettingsOpen(false)}>Đóng</Button>}
        onCancel={() => setSettingsOpen(false)}
      >
        {settingsError ? (
          <Empty description="Chưa thể tải cài đặt thông báo." style={{ padding: '44px 0' }} />
        ) : (
          <Table<SystemSettingRecord>
            rowKey="settingKey"
            loading={settingsLoading}
            dataSource={settings}
            pagination={{ pageSize: 6, showSizeChanger: false }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="Chưa có cài đặt thông báo." /> }}
            columns={[
              {
                title: 'Cài đặt',
                render: (_, setting) => (
                  <div>
                    <Typography.Text strong>{setting.description || setting.settingKey}</Typography.Text>
                    <div style={{ color: '#8A8E88', fontSize: 12 }}>{setting.settingKey}</div>
                  </div>
                )
              },
              { title: 'Giá trị', dataIndex: 'settingValue' },
              { title: 'Cập nhật', render: (_, setting) => formatDateTime(setting.updatedAt) },
              {
                title: 'Thao tác',
                align: 'right',
                render: (_, setting) => <Button onClick={() => openSettingModal(setting)}>Chỉnh sửa</Button>
              }
            ]}
          />
        )}
      </Modal>

      <Modal
        title={editingSetting ? `Chỉnh sửa cài đặt` : 'Chỉnh sửa cài đặt'}
        open={Boolean(editingSetting)}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={saving}
        onOk={() => settingForm.submit()}
        onCancel={() => setEditingSetting(undefined)}
      >
        {editingSetting ? (
          <Form<SettingFormValues> form={settingForm} layout="vertical" onFinish={handleSettingSubmit}>
            <Typography.Paragraph style={{ color: '#6B6F6C' }}>{editingSetting.description || editingSetting.settingKey}</Typography.Paragraph>
            <Form.Item name="settingValue" label="Giá trị" rules={[{ required: true, whitespace: true, message: 'Nhập giá trị' }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </div>
  );
}
