import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileExcelOutlined,
  PlusOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Form, Input, message, Modal, Progress, Row, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { history } from 'umi';
import { BORROW_STATUS_COLOR, BORROW_STATUS_LABEL } from '@/constants/borrowStatus';
import { ROUTES } from '@/constants/routes';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  approveBorrowRequest,
  getBorrowRequests,
  getBorrowRequestStatusCounts,
  rejectBorrowRequest
} from '@/services/borrowRequests';
import type { NormalizedBorrowRequest } from '@/services/borrowRequests';
import { getDeviceStats, getRequestStats, getTimeTrendStats } from '@/services/statistics';
import type { TimeTrendStat } from '@/services/statistics';
import { exportToExcel } from '@/utils/exportExcel';

type RejectFormValues = {
  reason: string;
  note?: string;
};

interface DashboardExportRow {
  group: string;
  item: string;
  value: string | number;
  student?: string;
  device?: string;
  time?: string;
  rank?: string;
  status?: string;
  note?: string;
}

type StudentRank = 'diamond' | 'gold' | 'silver' | 'bronze' | 'pebble';

const RETURNED_STATUSES = ['returned', 'returned_ontime', 'returned_late'];
const CLOSED_STATUSES = ['cancelled', 'canceled', 'cancelled_noshow', 'rejected'];

const REJECT_REASONS = [
  { value: 'not_enough_quantity', label: 'Thiết bị không còn đủ số lượng' },
  { value: 'invalid_purpose', label: 'Mục đích mượn chưa phù hợp' },
  { value: 'unclear_information', label: 'Thông tin yêu cầu chưa rõ ràng' },
  { value: 'student_not_eligible', label: 'Sinh viên chưa đủ điều kiện mượn' },
  { value: 'other', label: 'Khác' }
];

const RANK_CONFIG: Record<StudentRank, { label: string; color: string; bg: string }> = {
  diamond: { label: 'Kim cương', color: '#075985', bg: '#E0F2FE' },
  gold: { label: 'Vàng', color: '#8B6A1F', bg: '#F5EBD0' },
  silver: { label: 'Bạc', color: '#4A5568', bg: '#ECEEF2' },
  bronze: { label: 'Đồng', color: '#8C4A36', bg: '#F7E8DF' },
  pebble: { label: 'Đá cuội', color: '#3F403D', bg: '#EFE9DD' }
};

const DONUT_SEGMENTS = [
  { key: 'returned', label: 'Đã trả / Đã hoàn tất', color: '#2F6F3E' },
  { key: 'borrowing', label: 'Đang mượn', color: '#355D8E' },
  { key: 'approved', label: 'Đã duyệt / Chờ bàn giao', color: '#2563EB' },
  { key: 'pending', label: 'Chờ duyệt', color: '#8B6A1F' },
  { key: 'closed', label: 'Từ chối / Đã huỷ', color: '#8A8E88' },
  { key: 'overdue', label: 'Quá hạn', color: '#B05A4D' }
] as const;

function formatDateTime(value?: string) {
  if (!value) return 'Chưa cập nhật';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD/MM/YYYY HH:mm') : value;
}

function formatShortTime(value?: string) {
  if (!value) return 'Chưa cập nhật';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD/MM HH:mm') : value;
}

function getRequestCode(request: NormalizedBorrowRequest) {
  return request.requestCode?.startsWith('#') ? request.requestCode : `#${request.requestCode}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return fallback;
}

function deriveRankFromTrustScore(score: number): StudentRank {
  if (score >= 90) return 'diamond';
  if (score >= 80) return 'gold';
  if (score >= 66) return 'silver';
  if (score >= 50) return 'bronze';
  return 'pebble';
}

function normalizeTrustRank(rank?: string): StudentRank | undefined {
  const normalized = rank?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['diamond', 'kim cương', 'kim cuong'].includes(normalized)) return 'diamond';
  if (['gold', 'vàng', 'vang'].includes(normalized)) return 'gold';
  if (['silver', 'bạc', 'bac'].includes(normalized)) return 'silver';
  if (['bronze', 'đồng', 'dong'].includes(normalized)) return 'bronze';
  if (['pebble', 'stone', 'rock', 'đá cuội', 'da cuoi', 'da_cuoi'].includes(normalized)) return 'pebble';
  return undefined;
}

function RankTag({ score, rank }: { score?: number; rank?: string }) {
  const normalizedRank = typeof score === 'number' ? deriveRankFromTrustScore(score) : normalizeTrustRank(rank);
  if (!normalizedRank) return <Typography.Text type="secondary">—</Typography.Text>;

  const config = RANK_CONFIG[normalizedRank];
  return (
    <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 700, margin: 0 }}>
      {typeof score === 'number' ? `${config.label} · ${score}` : config.label}
    </Tag>
  );
}

function getRankLabel(score?: number, rank?: string) {
  const normalizedRank = typeof score === 'number' ? deriveRankFromTrustScore(score) : normalizeTrustRank(rank);
  return normalizedRank ? RANK_CONFIG[normalizedRank].label : 'Chưa xác định';
}

function getStatusLabel(status: string) {
  const key = status as keyof typeof BORROW_STATUS_LABEL;
  return BORROW_STATUS_LABEL[key] ?? 'Chưa xác định';
}

function StatusTag({ status }: { status: string }) {
  const key = status as keyof typeof BORROW_STATUS_LABEL;
  return <Tag color={BORROW_STATUS_COLOR[key] ?? 'default'}>{BORROW_STATUS_LABEL[key] ?? 'Chưa xác định'}</Tag>;
}

function MetricCard({
  title,
  value,
  meta,
  icon,
  featured,
  danger,
  onClick
}: {
  title: string;
  value: ReactNode;
  meta: string;
  icon: ReactNode;
  featured?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const background = featured ? '#2D4A3E' : '#FFFFFF';
  const foreground = featured ? '#FFFFFF' : danger ? '#B05A4D' : '#1A1F1B';
  const muted = featured ? 'rgba(255,255,255,0.74)' : '#6B6F6C';

  return (
    <Card
      hoverable={Boolean(onClick)}
      onClick={onClick}
      variant="borderless"
      style={{
        borderRadius: 14,
        border: danger ? '1px solid #B05A4D' : featured ? '1px solid #2D4A3E' : '1px solid #E5DECB',
        background,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default'
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ color: muted, fontSize: 11, letterSpacing: 0, textTransform: 'uppercase', fontWeight: 700 }}>{title}</div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            color: featured ? '#FFFFFF' : '#2D4A3E',
            background: featured ? 'rgba(255,255,255,0.14)' : '#E8EFE8',
            fontSize: 18
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--app-heading-font)', fontSize: 34, lineHeight: 1.1, color: foreground, marginTop: 12, fontWeight: 600 }}>
        {value}
      </div>
      <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{meta}</div>
    </Card>
  );
}

function buildTrendSeries(data: TimeTrendStat[]) {
  const start = dayjs().startOf('month').subtract(11, 'month');
  const byMonth = new Map(data.map((item) => [`${item.year}-${item.month}`, item.totalRequests]));

  return Array.from({ length: 12 }, (_, index) => {
    const month = start.add(index, 'month');
    const monthNumber = month.month() + 1;
    return {
      key: `${month.year()}-${monthNumber}`,
      label: `T${monthNumber}`,
      fullLabel: `Tháng ${monthNumber}/${month.year()}`,
      value: byMonth.get(`${month.year()}-${monthNumber}`) ?? 0
    };
  });
}

function TrendChart({ data }: { data: TimeTrendStat[] }) {
  const hasLongTrend = data.length >= 3;

  if (!hasLongTrend) {
    const sortedRows = [...data].sort((left, right) => left.year - right.year || left.month - right.month);
    const maxValue = Math.max(...sortedRows.map((item) => item.totalRequests), 1);

    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <Typography.Text style={{ color: '#6B6F6C' }}>Chưa đủ dữ liệu để phân tích xu hướng dài hạn.</Typography.Text>
        {sortedRows.length === 0 ? (
          <Empty description="Chưa có dữ liệu xu hướng" style={{ padding: '28px 0' }} />
        ) : (
          sortedRows.map((item) => (
            <div key={`${item.year}-${item.month}`} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Typography.Text>Tháng {item.month}/{item.year}</Typography.Text>
                <Typography.Text strong>{item.totalRequests.toLocaleString('vi-VN')}</Typography.Text>
              </div>
              <Progress percent={Math.round((item.totalRequests / maxValue) * 100)} showInfo={false} strokeColor="#2D4A3E" trailColor="#EFEADA" />
            </div>
          ))
        )}
      </div>
    );
  }

  const series = buildTrendSeries(data);
  const maxValue = Math.max(...series.map((item) => item.value), 1);
  const chartWidth = 640;
  const chartHeight = 190;
  const paddingX = 32;
  const paddingTop = 20;
  const paddingBottom = 34;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const points = series.map((item, index) => {
    const x = paddingX + (index / Math.max(series.length - 1, 1)) * innerWidth;
    const y = paddingTop + innerHeight - (item.value / maxValue) * innerHeight;
    return { ...item, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${paddingX},${chartHeight - paddingBottom} ${linePoints} ${chartWidth - paddingX},${chartHeight - paddingBottom}`;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} role="img" aria-label="Xu hướng lượt mượn 12 tháng">
        <defs>
          <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D4A3E" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2D4A3E" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + innerHeight * ratio;
          return <line key={ratio} x1={paddingX} x2={chartWidth - paddingX} y1={y} y2={y} stroke="#EFEADA" strokeWidth="1" />;
        })}
        <polygon points={areaPoints} fill="url(#dashboardTrendFill)" />
        <polyline points={linePoints} fill="none" stroke="#2D4A3E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="4" fill="#2D4A3E" />
            {index % 2 === 0 || index === points.length - 1 ? (
              <text x={point.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#6B6F6C">
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DonutDistribution({ counts }: { counts: Record<(typeof DONUT_SEGMENTS)[number]['key'], number> }) {
  const total = DONUT_SEGMENTS.reduce((sum, segment) => sum + counts[segment.key], 0);

  if (total === 0) {
    return <Empty description="Chưa có dữ liệu phân bổ trạng thái" style={{ padding: '38px 0' }} />;
  }

  let cursor = 0;
  const gradient = DONUT_SEGMENTS
    .filter((segment) => counts[segment.key] > 0)
    .map((segment) => {
      const start = cursor;
      const end = cursor + (counts[segment.key] / total) * 100;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 220px) 1fr', gap: 22, alignItems: 'center' }}>
      <div
        style={{
          width: 200,
          maxWidth: '100%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto'
        }}
      >
        <div style={{ width: '58%', aspectRatio: '1', borderRadius: '50%', background: '#FFFFFF', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--app-heading-font)', fontSize: 30, fontWeight: 700, color: '#1A1F1B' }}>
              {total.toLocaleString('vi-VN')}
            </div>
            <div style={{ color: '#6B6F6C', fontSize: 12 }}>yêu cầu</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {DONUT_SEGMENTS.map((segment) => (
          <div key={segment.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: segment.color, flex: '0 0 auto' }} />
              <Typography.Text style={{ color: '#3E453F' }}>{segment.label}</Typography.Text>
            </div>
            <Typography.Text strong>{counts[segment.key].toLocaleString('vi-VN')}</Typography.Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [rejectForm] = Form.useForm<RejectFormValues>();
  const [rejectTarget, setRejectTarget] = useState<NormalizedBorrowRequest>();
  const [actionKey, setActionKey] = useState<string>();

  const now = useMemo(() => dayjs(), []);
  const { data: deviceStats, loading: deviceLoading } = useAsyncData(getDeviceStats, []);
  const { data: requestStats, loading: requestStatsLoading, refresh: refreshRequestStats } = useAsyncData(getRequestStats, []);
  const { data: statusCounts, loading: statusCountsLoading, refresh: refreshStatusCounts } = useAsyncData(getBorrowRequestStatusCounts, []);
  const { data: timeTrend = [], loading: trendLoading } = useAsyncData(getTimeTrendStats, []);
  const {
    data: allRequests = [],
    loading: allRequestsLoading,
    refresh: refreshAllRequests
  } = useAsyncData(() => getBorrowRequests({ page: 1, limit: 1000 }), []);
  const {
    data: pendingRequests = [],
    loading: pendingLoading,
    refresh: refreshPendingRequests
  } = useAsyncData(() => getBorrowRequests({ status: 'pending', page: 1, limit: 6 }), []);

  const countsFromRequests = useMemo(() => {
    return allRequests.reduce(
      (summary, request) => {
        if (request.status === 'pending') summary.pending += 1;
        if (request.status === 'approved') summary.approved += 1;
        if (request.status === 'borrowing' || request.status === 'borrowed') summary.borrowing += 1;
        if (request.status === 'overdue') summary.overdue += 1;
        if (RETURNED_STATUSES.includes(request.status)) summary.returned += 1;
        if (CLOSED_STATUSES.includes(request.status)) summary.closed += 1;
        return summary;
      },
      { pending: 0, approved: 0, borrowing: 0, overdue: 0, returned: 0, closed: 0 }
    );
  }, [allRequests]);

  const pendingCount = requestStats?.pendingCount ?? statusCounts?.pendingCount ?? countsFromRequests.pending;
  const borrowingCount = requestStats?.borrowingCount ?? statusCounts?.borrowingCount ?? countsFromRequests.borrowing;
  const overdueCount = requestStats?.overdueCount ?? statusCounts?.overdueCount ?? countsFromRequests.overdue;
  const utilization =
    deviceStats?.sumTotal && deviceStats.sumTotal > 0 ? Math.round(((deviceStats.sumBorrowing ?? 0) / deviceStats.sumTotal) * 100) : undefined;
  const distributionCounts = {
    returned: countsFromRequests.returned,
    borrowing: countsFromRequests.borrowing,
    approved: countsFromRequests.approved,
    pending: countsFromRequests.pending,
    closed: countsFromRequests.closed,
    overdue: countsFromRequests.overdue
  };
  const statsLoading = deviceLoading || requestStatsLoading || statusCountsLoading || allRequestsLoading;
  const reportLoading = statsLoading || trendLoading || pendingLoading;
  const isActionLoading = Boolean(actionKey);

  const refreshDashboardRequests = async () => {
    await Promise.all([refreshPendingRequests(), refreshAllRequests(), refreshStatusCounts(), refreshRequestStats()]);
  };

  const runAction = async (request: NormalizedBorrowRequest, action: () => Promise<unknown>, successMessage: string, type: 'approve' | 'reject') => {
    setActionKey(`${type}:${request.id}`);
    try {
      await action();
      await refreshDashboardRequests();
      message.success(successMessage, 2);
      return true;
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể thực hiện thao tác. Vui lòng thử lại.'), 3);
      return false;
    } finally {
      setActionKey(undefined);
    }
  };

  const handleApprove = (request: NormalizedBorrowRequest) => {
    Modal.confirm({
      title: `Duyệt yêu cầu ${getRequestCode(request)}`,
      okText: 'Xác nhận duyệt',
      cancelText: 'Huỷ',
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <div>Sinh viên: <strong>{request.studentName}</strong></div>
          <div>Thiết bị: <strong>{request.deviceName} × {request.quantity}</strong></div>
          <div>Ngày mượn: <strong>{formatDateTime(request.borrowDate)}</strong></div>
          <div>Ngày trả dự kiến: <strong>{formatDateTime(request.returnDate)}</strong></div>
        </div>
      ),
      onOk: () => runAction(request, () => approveBorrowRequest(String(request.id)), 'Đã duyệt yêu cầu', 'approve')
    });
  };

  const openRejectModal = (request: NormalizedBorrowRequest) => {
    setRejectTarget(request);
    rejectForm.resetFields();
  };

  const handleReject = async (values: RejectFormValues) => {
    if (!rejectTarget) return;

    const reasonLabel = REJECT_REASONS.find((item) => item.value === values.reason)?.label ?? values.reason;
    const finalReason = values.note?.trim() ? `${reasonLabel}. ${values.note.trim()}` : reasonLabel;
    const success = await runAction(rejectTarget, () => rejectBorrowRequest(String(rejectTarget.id), finalReason), 'Đã từ chối yêu cầu', 'reject');
    if (success) {
      setRejectTarget(undefined);
      rejectForm.resetFields();
    }
  };

  const handleExportDashboard = () => {
    const hasReportData = Boolean(deviceStats || requestStats || statusCounts || timeTrend.length || allRequests.length || pendingRequests.length);
    if (!hasReportData) {
      message.warning('Chưa có dữ liệu để xuất báo cáo.');
      return;
    }

    const exportedAt = dayjs();
    const rows: DashboardExportRow[] = [
      {
        group: 'Thông tin chung',
        item: 'Thời điểm xuất báo cáo',
        value: exportedAt.format('DD/MM/YYYY HH:mm'),
        note: 'Dữ liệu lấy từ dashboard hiện tại'
      },
      {
        group: 'Thông tin chung',
        item: 'Tháng/năm đang hiển thị',
        value: `Tháng ${now.month() + 1}/${now.year()}`,
        note: `Cập nhật lúc ${now.format('HH:mm')}`
      },
      {
        group: 'Chỉ số tổng quan',
        item: 'Yêu cầu chờ duyệt',
        value: pendingCount,
        status: 'Chờ duyệt'
      },
      {
        group: 'Chỉ số tổng quan',
        item: 'Đang cho mượn',
        value: borrowingCount,
        status: 'Đang mượn'
      },
      {
        group: 'Chỉ số tổng quan',
        item: 'Đang quá hạn',
        value: overdueCount,
        status: 'Quá hạn'
      },
      {
        group: 'Chỉ số tổng quan',
        item: 'Tỉ lệ sử dụng kho',
        value: utilization === undefined ? 'Chưa có dữ liệu' : `${utilization}%`,
        note: `${(deviceStats?.sumBorrowing ?? 0).toLocaleString('vi-VN')} / ${(deviceStats?.sumTotal ?? 0).toLocaleString('vi-VN')} thiết bị`
      }
    ];

    if (timeTrend.length > 0) {
      buildTrendSeries(timeTrend).forEach((trend) => {
        rows.push({
          group: 'Xu hướng lượt mượn 12 tháng',
          item: trend.fullLabel,
          value: trend.value,
          note: 'Tổng yêu cầu trong tháng'
        });
      });
    } else {
      rows.push({ group: 'Xu hướng lượt mượn 12 tháng', item: 'Chưa có dữ liệu', value: 'Chưa có dữ liệu' });
    }

    const distributionTotal = DONUT_SEGMENTS.reduce((sum, segment) => sum + distributionCounts[segment.key], 0);
    if (distributionTotal > 0) {
      DONUT_SEGMENTS.forEach((segment) => {
        rows.push({
          group: 'Phân bố trạng thái yêu cầu',
          item: segment.label,
          value: distributionCounts[segment.key],
          note: `${Math.round((distributionCounts[segment.key] / distributionTotal) * 100)}% tổng yêu cầu`
        });
      });
    } else {
      rows.push({ group: 'Phân bố trạng thái yêu cầu', item: 'Chưa có dữ liệu', value: 'Chưa có dữ liệu' });
    }

    if (pendingRequests.length > 0) {
      pendingRequests.forEach((request) => {
        rows.push({
          group: 'Danh sách yêu cầu chờ duyệt',
          item: getRequestCode(request),
          value: request.quantity,
          student: `${request.studentName}${request.studentCode ? ` · ${request.studentCode}` : ''}`,
          device: request.deviceName,
          time: formatDateTime(request.createdAt || request.borrowDate),
          rank: getRankLabel(request.trustScore, request.trustRank),
          status: getStatusLabel(request.status),
          note: request.purpose || request.note || 'Chưa cập nhật mục đích'
        });
      });
    } else {
      rows.push({ group: 'Danh sách yêu cầu chờ duyệt', item: 'Chưa có dữ liệu', value: 'Chưa có dữ liệu' });
    }

    const exported = exportToExcel<DashboardExportRow>({
      fileName: 'bao-cao-tong-quan-dashboard',
      sheetName: 'Tổng quan dashboard',
      rows,
      columns: [
        { header: 'Nhóm', key: 'group', width: 28 },
        { header: 'Chỉ số / Mã đơn', key: 'item', width: 30 },
        { header: 'Giá trị / Số lượng', key: 'value', width: 18 },
        { header: 'Sinh viên', key: 'student', width: 30 },
        { header: 'Thiết bị', key: 'device', width: 28 },
        { header: 'Thời gian', key: 'time', width: 18 },
        { header: 'Hạng sinh viên', key: 'rank', width: 16 },
        { header: 'Trạng thái', key: 'status', width: 24 },
        { header: 'Ghi chú', key: 'note', width: 42 }
      ]
    });

    if (!exported) message.warning('Chưa có dữ liệu để xuất báo cáo.');
  };

  return (
    <div style={{ paddingBottom: 48, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ minWidth: 260 }}>
          <h1 style={{ fontFamily: 'var(--app-heading-font)', fontSize: 34, fontWeight: 600, margin: '0 0 8px', color: '#1A1F1B' }}>
            Tổng quan hệ thống
          </h1>
          <p style={{ color: '#6B6F6C', margin: 0 }}>
            Tháng {now.month() + 1} / {now.year()} · Cập nhật lúc {now.format('HH:mm')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button icon={<FileExcelOutlined />} loading={reportLoading} onClick={handleExportDashboard}>
            Xuất báo cáo
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push(ROUTES.adminDevices)} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
            Thêm thiết bị
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            featured
            title="Yêu cầu chờ duyệt"
            value={statsLoading ? <Skeleton.Input active size="small" style={{ width: 70 }} /> : pendingCount.toLocaleString('vi-VN')}
            meta="đơn cần xét duyệt"
            icon={<ClockCircleOutlined />}
            onClick={() => history.push(`${ROUTES.adminRequests}?status=pending`)}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Đang cho mượn"
            value={statsLoading ? <Skeleton.Input active size="small" style={{ width: 70 }} /> : borrowingCount.toLocaleString('vi-VN')}
            meta="đơn đang hoạt động"
            icon={<AppstoreOutlined />}
            onClick={() => history.push(`${ROUTES.adminRequests}?status=borrowing`)}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            danger={overdueCount > 0}
            title="Đang quá hạn"
            value={statsLoading ? <Skeleton.Input active size="small" style={{ width: 70 }} /> : overdueCount.toLocaleString('vi-VN')}
            meta="cần nhắc nhở"
            icon={<WarningOutlined />}
            onClick={() => history.push(`${ROUTES.adminRequests}?status=overdue`)}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            title="Tỉ lệ sử dụng kho"
            value={deviceLoading ? <Skeleton.Input active size="small" style={{ width: 80 }} /> : utilization === undefined ? 'Chưa có dữ liệu' : `${utilization}%`}
            meta={`${(deviceStats?.sumBorrowing ?? 0).toLocaleString('vi-VN')} / ${(deviceStats?.sumTotal ?? 0).toLocaleString('vi-VN')} thiết bị`}
            icon={<CheckCircleOutlined />}
            onClick={() => history.push(ROUTES.adminDevices)}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ fontFamily: 'var(--app-heading-font)', fontSize: 20, fontWeight: 600 }}>Xu hướng lượt mượn 12 tháng</span>}
            variant="borderless"
            style={{ borderRadius: 14, border: '1px solid #E5DECB', height: '100%' }}
          >
            {trendLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : <TrendChart data={timeTrend} />}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ fontFamily: 'var(--app-heading-font)', fontSize: 20, fontWeight: 600 }}>Phân bổ trạng thái yêu cầu</span>}
            variant="borderless"
            style={{ borderRadius: 14, border: '1px solid #E5DECB', height: '100%' }}
          >
            {statsLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : <DonutDistribution counts={distributionCounts} />}
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ fontFamily: 'var(--app-heading-font)', fontSize: 20, fontWeight: 600 }}>Yêu cầu chờ duyệt</span>}
        extra={<Button onClick={() => history.push(`${ROUTES.adminRequests}?status=pending`)}>Xem tất cả</Button>}
        variant="borderless"
        style={{ borderRadius: 14, border: '1px solid #E5DECB' }}
      >
        {pendingLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : pendingRequests.length === 0 ? (
          <Empty description="Không có yêu cầu chờ duyệt" style={{ padding: '48px 0' }} />
        ) : (
          <Table<NormalizedBorrowRequest>
            rowKey="id"
            dataSource={pendingRequests}
            pagination={false}
            scroll={{ x: 920 }}
            columns={[
              {
                title: 'Mã đơn',
                width: 130,
                render: (_, request) => (
                  <Typography.Text strong title={getRequestCode(request)} style={{ whiteSpace: 'nowrap' }}>
                    {getRequestCode(request)}
                  </Typography.Text>
                )
              },
              {
                title: 'Sinh viên',
                width: 210,
                render: (_, request) => (
                  <div>
                    <Typography.Text strong>{request.studentName}</Typography.Text>
                    <div style={{ color: '#8A8E88', fontSize: 12 }}>{request.studentCode || 'Chưa có MSSV'}</div>
                  </div>
                )
              },
              {
                title: 'Thiết bị',
                width: 220,
                render: (_, request) => (
                  <div>
                    <Typography.Text>{request.deviceName}</Typography.Text>
                    <div style={{ color: '#8A8E88', fontSize: 12 }}>Số lượng: {request.quantity}</div>
                  </div>
                )
              },
              {
                title: 'Thời gian',
                width: 150,
                render: (_, request) => formatShortTime(request.createdAt || request.borrowDate)
              },
              {
                title: 'Hạng SV',
                width: 140,
                render: (_, request) => <RankTag score={request.trustScore} rank={request.trustRank} />
              },
              {
                title: 'Trạng thái',
                width: 120,
                render: (_, request) => <StatusTag status={request.status} />
              },
              {
                title: 'Hành động',
                align: 'right',
                width: 230,
                render: (_, request) => (
                  <Space size={6} style={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      type="primary"
                      loading={actionKey === `approve:${request.id}`}
                      disabled={isActionLoading && actionKey !== `approve:${request.id}`}
                      onClick={() => handleApprove(request)}
                    >
                      Duyệt
                    </Button>
                    <Button size="small" danger disabled={isActionLoading} onClick={() => openRejectModal(request)}>
                      Từ chối
                    </Button>
                    <Button size="small" onClick={() => history.push(`${ROUTES.adminRequests}?requestId=${request.id}`)}>
                      Chi tiết
                    </Button>
                  </Space>
                )
              }
            ]}
          />
        )}
      </Card>

      <Modal
        title={rejectTarget ? `Từ chối yêu cầu ${getRequestCode(rejectTarget)}` : 'Từ chối yêu cầu'}
        open={Boolean(rejectTarget)}
        onCancel={() => {
          setRejectTarget(undefined);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        confirmLoading={actionKey === `reject:${rejectTarget?.id}`}
        okText="Xác nhận từ chối"
        cancelText="Huỷ"
        okButtonProps={{ danger: true }}
      >
        {rejectTarget ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ border: '1px solid #F5EBD0', background: '#FFFBEB', borderRadius: 10, padding: 12, color: '#8B6A1F' }}>
              Sinh viên sẽ nhận được thông báo kèm lý do từ chối.
            </div>
            <Form<RejectFormValues> form={rejectForm} layout="vertical" onFinish={handleReject}>
              <Form.Item name="reason" label="Lý do từ chối" rules={[{ required: true, message: 'Chọn lý do từ chối' }]}>
                <Select options={REJECT_REASONS} placeholder="Chọn lý do" />
              </Form.Item>
              <Form.Item
                name="note"
                label="Ghi chú thêm"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value: string) {
                      if (getFieldValue('reason') !== 'other' || value?.trim()) return Promise.resolve();
                      return Promise.reject(new Error('Nhập ghi chú khi chọn lý do Khác'));
                    }
                  })
                ]}
              >
                <Input.TextArea rows={3} placeholder="Ghi chú ngắn cho sinh viên nếu cần..." />
              </Form.Item>
            </Form>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
