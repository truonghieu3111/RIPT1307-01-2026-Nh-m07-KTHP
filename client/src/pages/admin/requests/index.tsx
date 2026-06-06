import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { history } from 'umi';
import { approveBorrowRequest, getBorrowRequests, handoverBorrowRequest, markReturned, rejectBorrowRequest } from '@/services/borrowRequests';
import type { NormalizedBorrowRequest } from '@/services/borrowRequests';
import { useAsyncData } from '@/hooks/useAsyncData';
import { BORROW_STATUS_COLOR } from '@/constants/borrowStatus';
import { ROUTES } from '@/constants/routes';
import type { BorrowRequest } from '@/types';
import { exportToExcel } from '@/utils/exportExcel';
type RequestStatus = BorrowRequest['status'];
type RequestTab = 'all' | 'pending' | 'approved' | 'borrowing' | 'overdue' | 'returned' | 'closed';
type AdminActionType = 'approve' | 'reject' | 'handover' | 'return';
interface AdminRequest extends Omit<BorrowRequest, 'id' | 'status'> {
  id: string | number;
  status: RequestStatus;
  studentCode: string;
  requestCode?: string;
  request_code?: string;
  purpose?: string;
  eventName?: string;
  createdAt?: string;
  trustScore?: number;
  trustRank?: string;
  rejectReason?: string;
  returnCondition?: string;
  returnNote?: string;
}
interface RejectFormValues {
  reason: string;
  note?: string;
}
interface ReturnFormValues {
  condition: string;
  note?: string;
}
const { RangePicker } = DatePicker;
const STATUS_DESCRIPTION: Record<RequestStatus, string> = {
  pending: 'Cần admin xét duyệt',
  approved: 'Chờ bàn giao',
  borrowed: 'Chờ ghi nhận trả',
  borrowing: 'Chờ ghi nhận trả',
  returned: 'Đã trả / Đã hoàn tất',
  returned_ontime: 'Đã trả / Đã hoàn tất',
  returned_late: 'Đã trả / Đã hoàn tất',
  cancelled: 'Đã huỷ / Từ chối',
  canceled: 'Đã huỷ / Từ chối',
  cancelled_noshow: 'Đã huỷ / Từ chối',
  rejected: 'Đã huỷ / Từ chối',
  overdue: 'Cần ghi nhận trả'
};
const STATUS_TONE: Record<RequestStatus, { color: string; bg: string; label?: string; description?: string }> = {
  pending: { label: 'Chờ duyệt', description: 'Cần admin xét duyệt', color: '#8B6A1F', bg: '#F5EBD0' },
  approved: { label: 'Đã duyệt / Chờ bàn giao', description: 'Chờ bàn giao', color: '#2563EB', bg: '#DCE4F0' },
  borrowed: { label: 'Đang mượn', description: 'Chờ ghi nhận trả', color: '#6D4A8F', bg: '#E8DEF0' },
  borrowing: { label: 'Đang mượn', description: 'Chờ ghi nhận trả', color: '#6D4A8F', bg: '#E8DEF0' },
  returned: { label: 'Đã trả / Đã hoàn tất', description: 'Hoàn tất', color: '#2F6F3E', bg: '#E1EFE3' },
  returned_ontime: { label: 'Đã trả / Đã hoàn tất', description: 'Trả đúng hạn', color: '#2F6F3E', bg: '#E1EFE3' },
  returned_late: { label: 'Đã trả / Đã hoàn tất', description: 'Trả trễ hạn', color: '#8B6A1F', bg: '#F5EBD0' },
  cancelled: { label: 'Đã huỷ / Từ chối', description: 'Sinh viên đã huỷ', color: '#6B6F6C', bg: '#ECEEF2' },
  canceled: { label: 'Đã huỷ / Từ chối', description: 'Sinh viên đã huỷ', color: '#6B6F6C', bg: '#ECEEF2' },
  cancelled_noshow: { label: 'Đã huỷ / Từ chối', description: 'Không đến nhận', color: '#6B6F6C', bg: '#ECEEF2' },
  rejected: { label: 'Đã huỷ / Từ chối', description: 'Admin đã từ chối', color: '#9B3E33', bg: '#F2DDD7' },
  overdue: { label: 'Quá hạn', description: 'Cần ghi nhận trả', color: '#7A241B', bg: '#F2DDD7' }
};
const BORROWING_STATUSES: RequestStatus[] = ['borrowing'];
const RETURNABLE_STATUSES: RequestStatus[] = ['borrowing', 'overdue'];
const RETURNED_STATUSES: RequestStatus[] = ['returned', 'returned_ontime', 'returned_late'];
const CLOSED_STATUSES: RequestStatus[] = ['cancelled', 'canceled', 'cancelled_noshow', 'rejected'];
type StudentRank = 'diamond' | 'gold' | 'silver' | 'bronze' | 'pebble';
const RANK_CONFIG: Record<StudentRank, { label: string; color: string; bg: string }> = {
  diamond: { label: 'Kim cương', color: '#075985', bg: '#E0F2FE' },
  gold: { label: 'Vàng', color: '#8B6A1F', bg: '#F5EBD0' },
  silver: { label: 'Bạc', color: '#4A5568', bg: '#ECEEF2' },
  bronze: { label: 'Đồng', color: '#8C4A36', bg: '#F7E8DF' },
  pebble: { label: 'Đá cuội', color: '#3F403D', bg: '#EFE9DD' }
};
const REJECT_REASONS = [
  { value: 'not_enough_quantity', label: 'Thiết bị không còn đủ số lượng' },
  { value: 'invalid_purpose', label: 'Mục đích mượn chưa phù hợp' },
  { value: 'unclear_information', label: 'Thông tin yêu cầu chưa rõ ràng' },
  { value: 'student_not_eligible', label: 'Sinh viên chưa đủ điều kiện mượn' },
  { value: 'other', label: 'Khác' }
];
const RETURN_CONDITIONS = [
  { value: 'perfect', label: 'Bình thường', points: '+2đ uy tín', tone: '#2F6F3E' },
  { value: 'minor_damage', label: 'Hư hỏng nhẹ', points: '0đ uy tín', tone: '#6B6F6C' },
  { value: 'major_damage', label: 'Hư hỏng nặng', points: '-3đ uy tín', tone: '#B05A4D' },
  { value: 'lost', label: 'Mất thiết bị', points: '-10đ uy tín', tone: '#9B3E33' }
];
function normalizeText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
function getRequestCode(request: AdminRequest) {
  const requestCode = request.requestCode ?? request.request_code;
  if (requestCode) return requestCode.startsWith('#') ? requestCode : `#${requestCode}`;

  const id = String(request.id ?? '');
  const fallbackId = typeof request.id === 'number' ? id.padStart(4, '0') : id;
  return `#REQ-${fallbackId}`;
}
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
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
function getNormalizedRank(score?: number, rank?: string) {
  return typeof score === 'number' ? deriveRankFromTrustScore(score) : normalizeTrustRank(rank);
}
function getRankLabel(score?: number, rank?: string) {
  const normalizedRank = getNormalizedRank(score, rank);
  return normalizedRank ? RANK_CONFIG[normalizedRank].label : 'Chưa xác định';
}
function RankTag({ score, rank }: { score?: number; rank?: string }) {
  const normalizedRank = getNormalizedRank(score, rank);
  if (!normalizedRank) return <Typography.Text type="secondary">—</Typography.Text>;
  const config = RANK_CONFIG[normalizedRank];
  return (
    <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 700, margin: 0 }}>
      {typeof score === 'number' ? `${config.label} · ${score}` : config.label}
    </Tag>
  );
}
function RequestCodeCell({ request }: { request: AdminRequest }) {
  const code = getRequestCode(request);
  return (
    <Typography.Text
      strong
      title={code}
      style={{ display: 'inline-block', maxWidth: 118, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}
    >
      {code}
    </Typography.Text>
  );
}
function getDeviceIcon(deviceName?: string | null) {
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
  if (!value) return 'Chưa cập nhật';
  return date.isValid() ? date.format(pattern) : value;
}
function ellipsisText(value = '', max = 50) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
function getPurpose(request: AdminRequest) {
  return request.purpose?.trim() || request.note?.trim() || 'Chưa cập nhật';
}
function getStatusLabel(status: RequestStatus) {
  return STATUS_TONE[status]?.label ?? status;
}
function statusMatchesTab(status: RequestStatus, tab: RequestTab) {
  if (tab === 'all') return true;
  if (tab === 'borrowing') return BORROWING_STATUSES.includes(status);
  if (tab === 'returned') return RETURNED_STATUSES.includes(status);
  if (tab === 'closed') return CLOSED_STATUSES.includes(status);
  return status === tab;
}
function getTabFromStatusQuery(status?: string | null): RequestTab {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'approved':
      return 'approved';
    case 'borrowed':
    case 'borrowing':
      return 'borrowing';
    case 'overdue':
      return 'overdue';
    case 'returned':
    case 'returned_ontime':
    case 'returned_late':
      return 'returned';
    case 'cancelled':
    case 'canceled':
    case 'cancelled_noshow':
    case 'rejected':
      return 'closed';
    default:
      return 'all';
  }
}
function getStatusQueryFromTab(tab: RequestTab) {
  if (tab === 'all') return undefined;
  if (tab === 'closed') return 'cancelled';
  return tab;
}
function getRequestQueryState() {
  if (typeof window === 'undefined') return { tab: 'all' as RequestTab, requestId: undefined as string | undefined };

  const params = new URLSearchParams(window.location.search);
  return {
    tab: getTabFromStatusQuery(params.get('status')),
    requestId: params.get('requestId') || undefined
  };
}
function buildRequestsUrl(tab: RequestTab, requestId?: string | number) {
  const params = new URLSearchParams();
  const status = getStatusQueryFromTab(tab);
  if (status) params.set('status', status);
  if (requestId !== undefined && requestId !== null && String(requestId)) params.set('requestId', String(requestId));
  const query = params.toString();
  return query ? `${ROUTES.adminRequests}?${query}` : ROUTES.adminRequests;
}
function requestMatchesFilters(
  request: AdminRequest,
  keyword: string,
  dateRange: [Dayjs, Dayjs] | null,
  returnDateRange: [Dayjs, Dayjs] | null,
  rankFilter: StudentRank | 'all'
) {
  const matchesSearch =
    !keyword ||
    normalizeText(`${getRequestCode(request)} ${request.studentName} ${request.studentCode} ${request.deviceName} ${getPurpose(request)}`).includes(keyword);
  const borrowDate = dayjs(request.borrowDate);
  const matchesDate =
    !dateRange ||
    !borrowDate.isValid() ||
    ((borrowDate.isSame(dateRange[0], 'day') || borrowDate.isAfter(dateRange[0], 'day')) &&
      (borrowDate.isSame(dateRange[1], 'day') || borrowDate.isBefore(dateRange[1], 'day')));
  const returnDate = dayjs(request.returnDate);
  const matchesReturnDate =
    !returnDateRange ||
    !returnDate.isValid() ||
    ((returnDate.isSame(returnDateRange[0], 'day') || returnDate.isAfter(returnDateRange[0], 'day')) &&
      (returnDate.isSame(returnDateRange[1], 'day') || returnDate.isBefore(returnDateRange[1], 'day')));
  const requestRank = typeof request.trustScore === 'number' ? deriveRankFromTrustScore(request.trustScore) : normalizeTrustRank(request.trustRank);
  const matchesRank = rankFilter === 'all' || requestRank === rankFilter;

  return matchesSearch && matchesDate && matchesReturnDate && matchesRank;
}
function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error ? error.message : fallback;
}
function toAdminRequest(request: NormalizedBorrowRequest): AdminRequest {
  return {
    ...request,
    status: request.status as RequestStatus,
    studentCode: request.studentCode || 'Chưa có MSSV'
  };
}
function StatusTag({ status }: { status: RequestStatus }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  return (
    <div style={{ display: 'grid', gap: 4, justifyItems: 'start' }}>
      <Tag color={BORROW_STATUS_COLOR[status]} style={{ border: 'none', borderRadius: 999, color: tone.color, background: tone.bg, fontWeight: 700, margin: 0 }}>
        {tone.label ?? status}
      </Tag>
      <span style={{ color: '#8A8E88', fontSize: 12 }}>{STATUS_DESCRIPTION[status] ?? 'Chưa có dữ liệu'}</span>
    </div>
  );
}
function RequestDetailPanel({ request, actions }: { request?: AdminRequest; actions: (request: AdminRequest) => ReactNode }) {
  if (!request) {
    return (
      <Empty
        image={<div style={{ fontSize: 60 }}>📄</div>}
        styles={{ image: { height: 80, marginBottom: 14 } }}
        description={
          <div>
            <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Chọn một đơn để xem chi tiết</h3>
            <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>Bấm vào một dòng trong bảng để xem thông tin xử lý.</p>
          </div>
        }
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#8A8E88', fontSize: 12, marginBottom: 4 }}>Mã đơn</div>
          <div style={{ fontFamily: 'var(--app-heading-font)', fontSize: 24, color: '#1A1F1B' }}>{getRequestCode(request)}</div>
        </div>
        <StatusTag status={request.status} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, background: '#F8F4EA', borderRadius: 14 }}>
        <Avatar size={46} style={{ background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>
          {getInitials(request.studentName)}
        </Avatar>
        <div>
          <div style={{ fontWeight: 700 }}>{request.studentName}</div>
          <div style={{ color: '#6B6F6C', fontSize: 13 }}>{request.studentCode}</div>
          <div style={{ marginTop: 6 }}>
            <RankTag score={request.trustScore} rank={request.trustRank} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ color: '#6B6F6C', fontSize: 12 }}>Thiết bị</div>
        <div style={{ fontWeight: 700, color: '#1A1F1B' }}>
          {getDeviceIcon(request.deviceName)} {request.deviceName} × {request.quantity}
        </div>
        <div style={{ color: '#6B6F6C', fontSize: 13 }}>
          {formatDate(request.borrowDate, 'DD/MM/YYYY')} → {formatDate(request.returnDate, 'DD/MM/YYYY')}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #EFEADA', paddingTop: 14 }}>
        <div style={{ color: '#6B6F6C', fontSize: 12, marginBottom: 6 }}>Mục đích</div>
        <div style={{ color: '#1A1F1B', lineHeight: 1.6 }}>{getPurpose(request)}</div>
      </div>

      {request.rejectReason ? (
        <div style={{ borderTop: '1px solid #EFEADA', paddingTop: 14 }}>
          <div style={{ color: '#6B6F6C', fontSize: 12, marginBottom: 6 }}>Lý do từ chối</div>
          <div style={{ color: '#1A1F1B', lineHeight: 1.6 }}>{request.rejectReason}</div>
        </div>
      ) : null}

      <div style={{ borderTop: '1px solid #EFEADA', paddingTop: 14 }}>{actions(request)}</div>
    </div>
  );
}
export default function AdminRequestsPage() {
  const [rejectForm] = Form.useForm<RejectFormValues>();
  const [returnForm] = Form.useForm<ReturnFormValues>();
  const { data, loading, refresh } = useAsyncData(() => getBorrowRequests({ page: 1, limit: 1000 }));
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestTab>(() => getRequestQueryState().tab);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | undefined>(() => getRequestQueryState().requestId);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [returnDateRange, setReturnDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rankFilter, setRankFilter] = useState<StudentRank | 'all'>('all');
  const [selectedId, setSelectedId] = useState<AdminRequest['id']>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [actionKey, setActionKey] = useState<string>();
  const [rejectTarget, setRejectTarget] = useState<AdminRequest>();
  const [handoverTarget, setHandoverTarget] = useState<AdminRequest>();
  const [returnTarget, setReturnTarget] = useState<AdminRequest>();
  const [handoverChecked, setHandoverChecked] = useState(false);

  useEffect(() => {
    if (!data) return;

    const nextRequests = data.map(toAdminRequest);
    setRequests(nextRequests);
    setSelectedId((currentId) => {
      const highlightedRequest = highlightedRequestId
        ? nextRequests.find((request) => String(request.id) === highlightedRequestId)
        : undefined;
      if (highlightedRequest) return highlightedRequest.id;
      if (currentId && nextRequests.some((request) => request.id === currentId)) return currentId;
      return nextRequests[0]?.id;
    });
  }, [data, highlightedRequestId]);

  useEffect(() => {
    const syncQueryState = () => {
      const queryState = getRequestQueryState();
      setActiveTab(queryState.tab);
      setHighlightedRequestId(queryState.requestId);
    };

    const unlisten = history.listen(syncQueryState);
    return unlisten;
  }, []);
  const keyword = useMemo(() => normalizeText(searchText.trim()), [searchText]);
  const baseFilteredRequests = useMemo(
    () => requests.filter((request) => requestMatchesFilters(request, keyword, dateRange, returnDateRange, rankFilter)),
    [dateRange, keyword, rankFilter, requests, returnDateRange]
  );
  const counts = useMemo(
    () => ({
      all: baseFilteredRequests.length,
      pending: baseFilteredRequests.filter((item) => item.status === 'pending').length,
      approved: baseFilteredRequests.filter((item) => item.status === 'approved').length,
      borrowing: baseFilteredRequests.filter((item) => BORROWING_STATUSES.includes(item.status)).length,
      overdue: baseFilteredRequests.filter((item) => item.status === 'overdue').length,
      returned: baseFilteredRequests.filter((item) => RETURNED_STATUSES.includes(item.status)).length,
      closed: baseFilteredRequests.filter((item) => CLOSED_STATUSES.includes(item.status)).length
    }),
    [baseFilteredRequests]
  );
  const filteredRequests = useMemo(() => {
    return baseFilteredRequests.filter((request) => statusMatchesTab(request.status, activeTab));
  }, [activeTab, baseFilteredRequests]);
  const selectedRequest = requests.find((request) => request.id === selectedId) ?? filteredRequests[0];

  useEffect(() => {
    if (filteredRequests.length && !filteredRequests.some((request) => request.id === selectedId)) {
      setSelectedId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedId]);

  const isActionLoading = (type: AdminActionType, requestId?: AdminRequest['id']) => actionKey === `${type}:${requestId}`;
  const isAnyActionLoading = Boolean(actionKey);
  const handleTabChange = (key: string) => {
    const nextTab = key as RequestTab;
    setActiveTab(nextTab);
    setHighlightedRequestId(undefined);
    history.replace(buildRequestsUrl(nextTab));
  };
  const runAction = async (type: AdminActionType, request: AdminRequest, action: () => Promise<unknown>, successMessage: string) => {
    setActionKey(`${type}:${request.id}`);
    setSelectedId(request.id);

    try {
      await action();
      await refresh();
      message.success(successMessage, 2);
      return true;
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể thực hiện thao tác. Vui lòng thử lại.'), 3);
      return false;
    } finally {
      setActionKey(undefined);
    }
  };

  const handleApprove = (request: AdminRequest) => {
    setSelectedId(request.id);
    Modal.confirm({
      title: `Xác nhận duyệt yêu cầu ${getRequestCode(request)}`,
      okText: 'Xác nhận duyệt',
      cancelText: 'Huỷ',
      content: (
        <div style={{ lineHeight: 1.8 }}>
          <div>
            Sinh viên: <strong>{request.studentName}</strong>
          </div>
          <div>
            Thiết bị: <strong>{request.deviceName} × {request.quantity}</strong>
          </div>
          <div>
            Ngày mượn: <strong>{formatDate(request.borrowDate, 'DD/MM/YYYY')}</strong>
          </div>
          <div>
            Ngày trả dự kiến: <strong>{formatDate(request.returnDate, 'DD/MM/YYYY')}</strong>
          </div>
        </div>
      ),
      onOk: () => runAction('approve', request, () => approveBorrowRequest(String(request.id)), 'Đã duyệt đơn')
    });
  };
  const handleReject = async (values: RejectFormValues) => {
    if (!rejectTarget) return;

    const reasonLabel = REJECT_REASONS.find((item) => item.value === values.reason)?.label ?? values.reason;
    const finalReason = values.note?.trim() ? `${reasonLabel}. ${values.note.trim()}` : reasonLabel;
    const success = await runAction('reject', rejectTarget, () => rejectBorrowRequest(String(rejectTarget.id), finalReason), 'Đã từ chối đơn');
    if (success) {
      setRejectTarget(undefined);
      rejectForm.resetFields();
    }
  };
  const handleHandOver = async () => {
    if (!handoverTarget) return;

    const success = await runAction('handover', handoverTarget, () => handoverBorrowRequest(String(handoverTarget.id)), 'Đã ghi nhận bàn giao');
    if (success) {
      setHandoverTarget(undefined);
      setHandoverChecked(false);
    }
  };
  const handleReturn = (values: ReturnFormValues) => {
    if (!returnTarget) return;

    const condition = RETURN_CONDITIONS.find((item) => item.value === values.condition);

    Modal.confirm({
      title: 'Xác nhận ghi nhận hoàn trả',
      okText: 'Xác nhận trả',
      cancelText: 'Quay lại',
      content: (
        <div style={{ lineHeight: 1.7 }}>
          <div>Đơn: <strong>{getRequestCode(returnTarget)}</strong></div>
          <div>Thiết bị: <strong>{returnTarget.deviceName} × {returnTarget.quantity}</strong></div>
          <div>Tình trạng: <strong>{condition?.label}</strong> ({condition?.points})</div>
          {values.note ? <div>Ghi chú: {values.note}</div> : null}
        </div>
      ),
      onOk: async () => {
        const success = await runAction(
          'return',
          returnTarget,
          () => markReturned(String(returnTarget.id), { returnCondition: values.condition, damageNote: values.note }),
          'Đã ghi nhận trả thiết bị'
        );

        if (success) {
          setReturnTarget(undefined);
          returnForm.resetFields();
        }
      }
    });
  };
  const openRejectModal = (request: AdminRequest) => {
    setSelectedId(request.id);
    setRejectTarget(request);
    rejectForm.resetFields();
  };
  const openHandOverModal = (request: AdminRequest) => {
    setSelectedId(request.id);
    setHandoverTarget(request);
    setHandoverChecked(false);
  };
  const openReturnModal = (request: AdminRequest) => {
    setSelectedId(request.id);
    setReturnTarget(request);
    returnForm.setFieldsValue({ condition: 'perfect', note: '' });
  };
  const showDetail = (request: AdminRequest) => {
    setSelectedId(request.id);
    setDetailModalOpen(true);
  };
  const actionButtons = (request: AdminRequest, includeDetail = true) => {
    const selected = selectedRequest?.id === request.id;
    const detailButton = includeDetail ? (
      <Button
        size="small"
        type={selected ? 'primary' : 'default'}
        onClick={(event) => {
          event.stopPropagation();
          showDetail(request);
        }}
      >
        Chi tiết
      </Button>
    ) : null;

    if (request.status === 'pending') {
      return (
        <Space size={6} style={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            type="primary"
            loading={isActionLoading('approve', request.id)}
            disabled={isAnyActionLoading && !isActionLoading('approve', request.id)}
            onClick={(event) => {
              event.stopPropagation();
              handleApprove(request);
            }}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            disabled={isAnyActionLoading}
            onClick={(event) => {
              event.stopPropagation();
              openRejectModal(request);
            }}
          >
            Từ chối
          </Button>
          {detailButton}
        </Space>
      );
    }
    if (request.status === 'approved') {
      return (
        <Space size={6} style={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            type="primary"
            disabled={isAnyActionLoading}
            onClick={(event) => {
              event.stopPropagation();
              openHandOverModal(request);
            }}
          >
            Ghi nhận mượn
          </Button>
          {detailButton}
        </Space>
      );
    }
    if (RETURNABLE_STATUSES.includes(request.status)) {
      return (
        <Space size={6} style={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            type="primary"
            disabled={isAnyActionLoading}
            onClick={(event) => {
              event.stopPropagation();
              openReturnModal(request);
            }}
          >
            Ghi nhận trả
          </Button>
          {request.status === 'overdue' ? (
            <Tooltip title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
              <span title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
                <Button size="small" disabled>
                  Nhắc nhở
                </Button>
              </span>
            </Tooltip>
          ) : null}
          {detailButton}
        </Space>
      );
    }
    return detailButton;
  };
  const tabItems = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'pending', label: `Chờ duyệt (${counts.pending})` },
    { key: 'approved', label: `Đã duyệt (${counts.approved})` },
    { key: 'borrowing', label: `Đang mượn (${counts.borrowing})` },
    { key: 'overdue', label: `Quá hạn (${counts.overdue})` },
    { key: 'returned', label: `Đã trả / Đã hoàn tất (${counts.returned})` },
    ...(counts.closed > 0 || activeTab === 'closed' ? [{ key: 'closed', label: `Đã huỷ / Từ chối (${counts.closed})` }] : [])
  ];
  const handleExportRequests = () => {
    const exported = exportToExcel<AdminRequest>({
      fileName: 'danh-sach-yeu-cau',
      sheetName: 'Danh sách yêu cầu',
      rows: filteredRequests,
      columns: [
        { header: 'Mã đơn', value: (request) => getRequestCode(request), width: 18 },
        { header: 'Sinh viên', value: (request) => request.studentName, width: 28 },
        { header: 'MSSV', value: (request) => request.studentCode, width: 16 },
        { header: 'Hạng', value: (request) => getRankLabel(request.trustScore, request.trustRank), width: 14 },
        { header: 'Thiết bị', value: (request) => request.deviceName, width: 28 },
        { header: 'Số lượng', value: (request) => request.quantity, width: 12 },
        { header: 'Ngày mượn', value: (request) => formatDate(request.borrowDate, 'DD/MM/YYYY'), width: 16 },
        { header: 'Ngày trả dự kiến', value: (request) => formatDate(request.returnDate, 'DD/MM/YYYY'), width: 18 },
        { header: 'Mục đích', value: (request) => getPurpose(request), width: 36 },
        { header: 'Trạng thái', value: (request) => getStatusLabel(request.status), width: 24 }
      ]
    });

    if (!exported) message.warning('Không có dữ liệu để xuất.');
  };
  return (
    <div className="admin-requests-page">
      <style>
        {`
          .admin-requests-page {
            display: grid;
            gap: 20px;
            padding-bottom: 48px;
          }
          .admin-requests-page__hero {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            align-items: flex-end;
            padding: 28px;
            border: 1px solid #E5DECB;
            border-radius: 16px;
            background: linear-gradient(135deg, #FFFCF4 0%, #F3F7F0 100%);
            box-shadow: 0 8px 24px rgba(45, 74, 62, 0.06);
          }
          .admin-requests-page__title {
            margin: 0 !important;
            color: #1A1F1B !important;
            font-family: var(--app-heading-font);
            font-weight: 600 !important;
          }
          .admin-requests-page__title em {
            color: #2D4A3E;
            font-style: normal;
          }
          .admin-requests-page__subtitle {
            display: block;
            color: #6B6F6C;
            font-size: 15px;
            margin-top: 8px;
          }
          .admin-requests-page__actions {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .admin-requests-page__tabs .ant-tabs-nav {
            margin-bottom: 0;
          }
          .admin-requests-page__toolbar {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 18px;
          }
          .admin-request-row-selected > td {
            background: #F8F4EA !important;
            border-top: 1px solid rgba(45, 74, 62, 0.22) !important;
            border-bottom: 1px solid rgba(45, 74, 62, 0.22) !important;
          }
          .admin-request-row-selected > td:first-child {
            border-left: 3px solid #2D4A3E !important;
          }
          @media (max-width: 768px) {
            .admin-requests-page__hero {
              align-items: stretch;
              flex-direction: column;
              padding: 22px;
            }
            .admin-requests-page__actions {
              justify-content: flex-start;
            }
          }
        `}
      </style>

      <header className="admin-requests-page__hero">
        <div>
          <Typography.Title level={1} className="admin-requests-page__title">
            Yêu cầu <em>mượn - trả</em>
          </Typography.Title>
          <Typography.Text className="admin-requests-page__subtitle">Theo dõi và xử lý tất cả yêu cầu trong hệ thống</Typography.Text>
        </div>
        <div className="admin-requests-page__actions">
          <Button onClick={() => setFilterModalOpen(true)}>Lọc nâng cao</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportRequests}>
            Xuất Excel
          </Button>
        </div>
      </header>

      <Tabs className="admin-requests-page__tabs" activeKey={activeTab} items={tabItems} onChange={handleTabChange} />

      <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB', overflow: 'hidden' }}>
            <div className="admin-requests-page__toolbar">
              <div>
                <Typography.Title level={4} style={{ margin: 0, fontFamily: 'var(--app-heading-font)', fontWeight: 600 }}>
                  Danh sách yêu cầu
                </Typography.Title>
                <Typography.Text style={{ color: '#6B6F6C', fontSize: 13 }}>
                  Đang hiển thị {filteredRequests.length.toLocaleString('vi-VN')} / {requests.length.toLocaleString('vi-VN')} yêu cầu
                </Typography.Text>
              </div>
              <Input.Search
                allowClear
                placeholder="Tìm tên, MSSV, mã đơn..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: 320, maxWidth: '100%' }}
              />
            </div>
            <Table<AdminRequest>
              rowKey="id"
              loading={{ spinning: loading, tip: 'Đang tải yêu cầu...' }}
              dataSource={filteredRequests}
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1620 }}
              rowClassName={(request) => (selectedRequest?.id === request.id ? 'admin-request-row-selected' : '')}
              onRow={(request) => ({
                onClick: () => showDetail(request),
                style: { cursor: 'pointer' }
              })}
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
            {
              title: 'Mã đơn',
              width: 140,
              fixed: 'left',
              render: (_, request) => <RequestCodeCell request={request} />
            },
            {
              title: 'Sinh viên',
              width: 230,
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
              title: 'Hạng',
              width: 150,
              render: (_, request) => <RankTag score={request.trustScore} rank={request.trustRank} />
            },
            {
              title: 'Thiết bị',
              width: 210,
              render: (_, request) => (
                <div>
                  <Typography.Text strong>
                    {getDeviceIcon(request.deviceName)} {request.deviceName}
                  </Typography.Text>
                  <div style={{ color: '#8A8E88', fontSize: 12 }}>Số lượng: {request.quantity}</div>
                </div>
              )
            },
            {
              title: 'Ngày mượn',
              width: 130,
              render: (_, request) => formatDate(request.borrowDate, 'DD/MM/YYYY')
            },
            {
              title: 'Ngày trả dự kiến',
              width: 150,
              render: (_, request) => formatDate(request.returnDate, 'DD/MM/YYYY')
            },
            {
              title: 'Mục đích',
              width: 220,
              render: (_, request) => <Typography.Text style={{ color: '#6B6F6C' }}>{ellipsisText(getPurpose(request), 72)}</Typography.Text>
            },
            { title: 'Trạng thái', width: 190, dataIndex: 'status', render: (status: RequestStatus) => <StatusTag status={status} /> },
            { title: 'Hành động', width: 330, align: 'right', render: (_, request) => <div style={{ whiteSpace: 'nowrap' }}>{actionButtons(request)}</div> }
          ]}
            />
      </Card>
      <Modal
        title="Lọc nâng cao"
        open={filterModalOpen}
        okText="Áp dụng"
        cancelText="Đặt lại"
        onOk={() => setFilterModalOpen(false)}
        onCancel={() => {
          handleTabChange('all');
          setSearchText('');
          setDateRange(null);
          setReturnDateRange(null);
          setRankFilter('all');
          setFilterModalOpen(false);
        }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <Typography.Text strong>Trạng thái</Typography.Text>
            <Select
              value={activeTab}
              onChange={(value) => handleTabChange(value as RequestTab)}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'borrowing', label: 'Đang mượn' },
                { value: 'overdue', label: 'Quá hạn' },
                { value: 'returned', label: 'Đã trả / Đã hoàn tất' },
                ...(counts.closed > 0 || activeTab === 'closed' ? [{ value: 'closed', label: 'Đã huỷ / Từ chối' }] : [])
              ]}
            />
          </div>
          <div>
            <Typography.Text strong>Từ khoá</Typography.Text>
            <Input
              allowClear
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tên sinh viên, MSSV, mã đơn, thiết bị..."
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Khoảng ngày mượn</Typography.Text>
            <RangePicker
              value={dateRange}
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Khoảng ngày trả dự kiến</Typography.Text>
            <RangePicker
              value={returnDateRange}
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              onChange={(dates) => setReturnDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Hạng sinh viên</Typography.Text>
            <Select
              value={rankFilter}
              onChange={(value) => setRankFilter(value as StudentRank | 'all')}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: 'all', label: 'Tất cả hạng' },
                { value: 'diamond', label: 'Kim cương' },
                { value: 'gold', label: 'Vàng' },
                { value: 'silver', label: 'Bạc' },
                { value: 'bronze', label: 'Đồng' },
                { value: 'pebble', label: 'Đá cuội' }
              ]}
            />
          </div>
        </div>
      </Modal>
      <Modal
        title={
          selectedRequest ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', paddingRight: 24 }}>
              <span style={{ fontFamily: 'var(--app-heading-font)', fontSize: 20, fontWeight: 500 }}>Chi tiết yêu cầu {getRequestCode(selectedRequest)}</span>
              <StatusTag status={selectedRequest.status} />
            </div>
          ) : (
            'Chi tiết đơn'
          )
        }
        open={detailModalOpen && Boolean(selectedRequest)}
        footer={null}
        width={720}
        centered
        onCancel={() => setDetailModalOpen(false)}
      >
        <RequestDetailPanel request={selectedRequest} actions={(request) => actionButtons(request, false)} />
        <Button block style={{ marginTop: 14, height: 42 }} onClick={() => setDetailModalOpen(false)}>
          Quay lại danh sách
        </Button>
      </Modal>
      <Modal
        title={`Từ chối yêu cầu ${rejectTarget ? getRequestCode(rejectTarget) : ''}`}
        open={Boolean(rejectTarget)}
        okText="Xác nhận từ chối"
        cancelText="Huỷ"
        confirmLoading={Boolean(rejectTarget && isActionLoading('reject', rejectTarget.id))}
        okButtonProps={{ danger: true, disabled: isAnyActionLoading && !Boolean(rejectTarget && isActionLoading('reject', rejectTarget.id)) }}
        onOk={() => rejectForm.submit()}
        onCancel={() => {
          setRejectTarget(undefined);
          rejectForm.resetFields();
        }}
      >
        <Alert
          showIcon
          type="warning"
          message="Sinh viên sẽ nhận được thông báo kèm lý do từ chối."
          style={{ marginBottom: 16, borderRadius: 12 }}
        />
        <Form<RejectFormValues> form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item name="reason" label="Lý do từ chối" rules={[{ required: true, message: 'Chọn lý do từ chối' }]}>
            <Select
              placeholder="Chọn lý do"
              options={REJECT_REASONS.map((reason) => ({ value: reason.value, label: reason.label }))}
            />
          </Form.Item>
          <Form.Item
            name="note"
            label="Ghi chú thêm"
            dependencies={['reason']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue('reason') !== 'other' || String(value ?? '').trim()) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Nhập ghi chú khi chọn lý do Khác'));
                }
              })
            ]}
          >
            <Input.TextArea rows={3} placeholder="Giải thích chi tiết để sinh viên hiểu..." />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Ghi nhận bàn giao thiết bị"
        open={Boolean(handoverTarget)}
        okText="Xác nhận"
        cancelText="Huỷ"
        confirmLoading={Boolean(handoverTarget && isActionLoading('handover', handoverTarget.id))}
        okButtonProps={{ disabled: !handoverChecked || (isAnyActionLoading && !Boolean(handoverTarget && isActionLoading('handover', handoverTarget.id))) }}
        onOk={handleHandOver}
        onCancel={() => setHandoverTarget(undefined)}
      >
        {handoverTarget && (
          <div style={{ lineHeight: 1.8 }}>
            <div>Đơn: <strong>{getRequestCode(handoverTarget)}</strong></div>
            <div>Sinh viên: <strong>{handoverTarget.studentName}</strong></div>
            <div>Thiết bị: <strong>{handoverTarget.deviceName} × {handoverTarget.quantity}</strong></div>
            <div>Ngày mượn: <strong>{formatDate(handoverTarget.borrowDate, 'DD/MM/YYYY')}</strong></div>
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
        confirmLoading={Boolean(returnTarget && isActionLoading('return', returnTarget.id))}
        onOk={() => returnForm.submit()}
        onCancel={() => setReturnTarget(undefined)}
      >
        {returnTarget && (
          <div style={{ lineHeight: 1.8, marginBottom: 12 }}>
            <div>Đơn: <strong>{getRequestCode(returnTarget)}</strong></div>
            <div>Sinh viên: <strong>{returnTarget.studentName}</strong></div>
            <div>Thiết bị: <strong>{returnTarget.deviceName} × {returnTarget.quantity}</strong></div>
            <div>Hạn trả: <strong>{formatDate(returnTarget.returnDate, 'DD/MM/YYYY')}</strong></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              Trạng thái: <StatusTag status={returnTarget.status} />
            </div>
          </div>
        )}
        <Form<ReturnFormValues> form={returnForm} layout="vertical" onFinish={handleReturn}>
          <Form.Item name="condition" label="Tình trạng thiết bị" rules={[{ required: true, message: 'Chọn tình trạng thiết bị' }]}>
            <Radio.Group>
              <Space direction="vertical">
                {RETURN_CONDITIONS.map((condition) => (
                  <Radio key={condition.label} value={condition.value}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span>{condition.label}</span>
                      <Tag style={{ margin: 0, color: condition.tone, borderColor: condition.tone }}>{condition.points}</Tag>
                    </span>
                  </Radio>
                ))}
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
