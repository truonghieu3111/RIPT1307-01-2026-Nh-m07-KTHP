import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Select, Skeleton, Table, Tag, Tooltip, Typography, message } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FieldTimeOutlined,
  FireOutlined,
  ProfileOutlined,
  TeamOutlined,
  WarningOutlined
} from '@ant-design/icons';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminTableCard from '@/components/admin/AdminTableCard';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  getDeviceStats,
  getRequestStats,
  getStatsStudentSummary,
  getTimeTrendStats
} from '@/services/statistics';
import type { DeviceStats, RequestStats, StudentStatsSummary, TimeTrendStat, TopDeviceStat, TopStudentStat } from '@/services/statistics';
import { getBorrowRequests } from '@/services/borrowRequests';
import type { NormalizedBorrowRequest } from '@/services/borrowRequests';
import { exportToExcel } from '@/utils/exportExcel';

const now = new Date();
const REQUEST_COLORS = ['#2D4A3E', '#C99A3F', '#355D8E', '#9B3E33', '#B05A4D', '#8A8E88', '#6B6F6C'];
type TrendRow = TimeTrendStat & { label: string };
interface StatisticsExportRow {
  group: string;
  metric: string;
  value: string | number;
  note?: string;
}

type StudentRank = 'diamond' | 'gold' | 'silver' | 'bronze' | 'pebble';

const RANK_CONFIG: Record<StudentRank, { label: string; color: string; bg: string }> = {
  diamond: { label: 'Kim cương', color: '#075985', bg: '#E0F2FE' },
  gold: { label: 'Vàng', color: '#8B6A1F', bg: '#F5EBD0' },
  silver: { label: 'Bạc', color: '#4A5568', bg: '#ECEEF2' },
  bronze: { label: 'Đồng', color: '#8C4A36', bg: '#F7E8DF' },
  pebble: { label: 'Đá cuội', color: '#3F403D', bg: '#EFE9DD' }
};

function formatNumber(value?: number) {
  return Number(value ?? 0).toLocaleString('vi-VN');
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function monthLabel(row: TimeTrendStat) {
  if (!row.month || !row.year) return 'Chưa có thời gian';
  return `Tháng ${row.month}/${row.year}`;
}

function selectedPeriodLabel(month: number, year: number) {
  return `Tháng ${month}/${year}`;
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

function RankTag({ score, rank }: { score?: number; rank?: string }) {
  const normalizedRank = typeof score === 'number' ? deriveRankFromTrustScore(score) : normalizeTrustRank(rank);
  if (!normalizedRank) {
    return <Typography.Text type="secondary">Chưa xác định</Typography.Text>;
  }
  const config = RANK_CONFIG[normalizedRank];
  return <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 700 }}>{config.label}</Tag>;
}

function getRankLabel(score?: number, rank?: string) {
  const normalizedRank = typeof score === 'number' ? deriveRankFromTrustScore(score) : normalizeTrustRank(rank);
  return normalizedRank ? RANK_CONFIG[normalizedRank].label : 'Chưa xác định';
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

function getOverdueDays(returnDate?: string) {
  if (!returnDate) return undefined;
  const dueDate = new Date(returnDate);
  if (Number.isNaN(dueDate.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function optionalCount(value?: number) {
  return value === undefined ? 'Chưa có dữ liệu' : value;
}

function getCompletedReturns(student: TopStudentStat) {
  return student.completedReturns ?? student.totalBorrowed ?? 0;
}

function getLateReturns(student: TopStudentStat) {
  return student.lateReturns ?? student.totalLate ?? 0;
}

function getOnTimeRate(student: TopStudentStat) {
  const completedReturns = getCompletedReturns(student);
  if (completedReturns <= 0) return undefined;
  if (student.onTimeRate !== undefined) return Math.max(0, Math.min(100, student.onTimeRate));
  if (student.onTimeReturns !== undefined) return Math.max(0, Math.min(100, (student.onTimeReturns / completedReturns) * 100));
  return Math.max(0, Math.min(100, ((completedReturns - getLateReturns(student)) / completedReturns) * 100));
}

function getOnTimeAssessment(rate?: number) {
  if (rate === undefined) return { label: 'Chưa có dữ liệu', color: 'default' };
  if (rate >= 90) return { label: 'Tốt', color: 'green' };
  if (rate >= 70) return { label: 'Theo dõi', color: 'gold' };
  return { label: 'Cần chú ý', color: 'orange' };
}

function getStudentAssessment(student: TopStudentStat) {
  const completedReturns = getCompletedReturns(student);
  if (completedReturns <= 0) return { label: 'Chưa có dữ liệu', color: 'default' };
  return getOnTimeAssessment(getOnTimeRate(student));
}

function getOnTimeReturnedCount(student: TopStudentStat) {
  const completedReturns = getCompletedReturns(student);
  if (completedReturns <= 0) return 0;
  if (student.onTimeReturns !== undefined) return student.onTimeReturns;
  return Math.max(0, completedReturns - getLateReturns(student));
}

function getRateTooltip(student: TopStudentStat) {
  const completedReturns = getCompletedReturns(student);
  if (completedReturns <= 0) return 'Chưa có đơn đã hoàn tất để tính tỉ lệ đúng hạn.';
  return `${formatNumber(getOnTimeReturnedCount(student))}/${formatNumber(completedReturns)} đơn đã hoàn tất`;
}

function getStudentReturnMeta(student: TopStudentStat) {
  const totalRequests = student.totalBorrowRequests;
  const completedReturns = getCompletedReturns(student);
  if (totalRequests === undefined || totalRequests === completedReturns) return null;
  return `${formatNumber(totalRequests)} yêu cầu phát sinh`;
}

function getStudentLateMeta(student: TopStudentStat) {
  const completedReturns = getCompletedReturns(student);
  if (completedReturns <= 0) return 'Chưa có đơn đã hoàn tất';
  return undefined;
}

function SectionBlock({ marker, title, subtitle, children }: { marker: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="admin-statistics-page__section">
      <div className="admin-statistics-page__section-header">
        <div>
          <Typography.Title level={3} className="admin-statistics-page__section-title">
            <span>{marker}.</span> {title}
          </Typography.Title>
          {subtitle ? <Typography.Text className="admin-statistics-page__section-subtitle">{subtitle}</Typography.Text> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function SectionCard({ title, subtitle, children }: { title: ReactNode; subtitle?: string; children: ReactNode }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontFamily: 'var(--app-heading-font)', fontSize: 20, fontWeight: 500, color: '#1A1F1B' }}>{title}</div>
          {subtitle ? <div style={{ color: '#6B6F6C', fontSize: 12, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
      }
      variant="borderless"
      style={{ borderRadius: 14, border: '1px solid #E5DECB', height: '100%', boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)' }}
      styles={{ body: { padding: 18 } }}
    >
      {children}
    </Card>
  );
}

function InsightCard({ title, value, description, tone = '#2D4A3E' }: { title: string; value: string; description: string; tone?: string }) {
  return (
    <div style={{ border: '1px solid #E5DECB', borderRadius: 12, padding: 16, background: '#FFFFFF' }}>
      <div style={{ color: '#6B6F6C', fontSize: 12, marginBottom: 8 }}>{title}</div>
      <div style={{ color: tone, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: '#6B6F6C', fontSize: 12, marginTop: 8 }}>{description}</div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </Card>
  );
}

function RankedDeviceList({ devices }: { devices: TopDeviceStat[] }) {
  const maxBorrows = Math.max(...devices.map((device) => device.totalBorrows), 1);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {devices.map((device, index) => {
        const percent = Math.round((device.totalBorrows / maxBorrows) * 100);
        return (
          <div key={device.equipmentId || device.name} style={{ border: '1px solid #E5DECB', borderRadius: 12, padding: 16, background: '#FFFDF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <Tag color={index === 0 ? 'gold' : 'default'} style={{ marginBottom: 8 }}>
                  Hạng {index + 1}
                </Tag>
                <Typography.Text strong ellipsis style={{ display: 'block', color: '#1A1F1B', fontSize: 15 }}>
                  {device.name}
                </Typography.Text>
                <Typography.Text style={{ color: '#6B6F6C', fontSize: 12 }}>
                  {device.code || 'Chưa có mã thiết bị'}
                </Typography.Text>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#2D4A3E' }}>{formatNumber(device.totalBorrows)}</div>
                <div style={{ color: '#6B6F6C', fontSize: 12 }}>lượt mượn</div>
              </div>
            </div>
            <Progress percent={percent} showInfo={false} strokeColor="#2D4A3E" trailColor="#EFEADA" style={{ marginTop: 12 }} />
          </div>
        );
      })}
    </div>
  );
}

function DeviceSection({ data, loading, periodLabel }: { data?: DeviceStats; loading: boolean; periodLabel: string }) {
  const topDevices = data?.topDevices ?? [];
  const hasSummary = Boolean((data?.totalDeviceTypes ?? 0) || (data?.sumTotal ?? 0) || (data?.sumBorrowing ?? 0));
  const useChart = topDevices.length >= 3;
  const usageRate = (data?.sumTotal ?? 0) > 0 ? formatPercent(((data?.sumBorrowing ?? 0) / (data?.sumTotal ?? 0)) * 100) : '0%';
  const maxTopDeviceBorrows = Math.max(...topDevices.map((device) => device.totalBorrows), 1);

  if (loading) return <LoadingBlock />;

  if (!hasSummary && topDevices.length === 0) {
    return <AdminEmptyState title="Chưa có thống kê thiết bị." description="Khi có thiết bị hoặc lượt mượn mới, thống kê sẽ được cập nhật tại đây." />;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: '#1A1F1B', fontFamily: 'var(--app-heading-font)' }}>
            Tình trạng kho hiện tại
          </Typography.Title>
          <Typography.Text style={{ color: '#6B6F6C', fontSize: 13 }}>
            Các chỉ số tồn kho đang phản ánh trạng thái hiện tại, không phụ thuộc tháng/năm đã chọn.
          </Typography.Text>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <AdminStatCard title="Tổng loại thiết bị" value={data?.totalDeviceTypes ?? 0} meta="toàn hệ thống" icon={<DatabaseOutlined />} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <AdminStatCard title="Đang được mượn" value={data?.sumBorrowing ?? 0} meta="số lượng hiện tại đang sử dụng" icon={<FireOutlined />} danger={(data?.sumBorrowing ?? 0) > 0} accent="#B05A4D" />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <AdminStatCard title="Tỉ lệ sử dụng" value={usageRate} meta="hiện tại: đang mượn / tổng số lượng" icon={<BarChartOutlined />} accent="#C99A3F" />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <AdminStatCard title="Hỏng / bảo trì" value={data?.sumUnavailable === undefined ? 'Chưa có dữ liệu' : data.sumUnavailable} meta={(data?.sumUnavailable ?? 0) > 0 ? 'thiết bị cần theo dõi hiện tại' : 'Chưa ghi nhận thiết bị hỏng/bảo trì hiện tại'} icon={<WarningOutlined />} danger={(data?.sumUnavailable ?? 0) > 0} accent="#9B3E33" />
          </Col>
        </Row>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0, color: '#1A1F1B', fontFamily: 'var(--app-heading-font)' }}>
            Lượt mượn thiết bị trong {periodLabel}
          </Typography.Title>
          <Typography.Text style={{ color: '#6B6F6C', fontSize: 13 }}>
            Chỉ tính các yêu cầu mượn phát sinh trong kỳ đang chọn.
          </Typography.Text>
        </div>

        {topDevices.length === 0 ? (
          <AdminEmptyState title="Chưa có lượt mượn trong tháng đã chọn." description={`Top thiết bị sẽ xuất hiện khi có yêu cầu mượn phát sinh trong ${periodLabel}.`} />
        ) : (
          <Row gutter={[18, 18]} align="top">
            <Col xs={24} xl={useChart ? 14 : 10}>
              <SectionCard
                title="Top thiết bị được mượn trong tháng"
                subtitle={`Chỉ hiển thị thiết bị có lượt mượn trong ${periodLabel}.`}
              >
                {useChart ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topDevices} layout="vertical" margin={{ left: 18, right: 16 }}>
                      <CartesianGrid stroke="#EFEADA" strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                      <ChartTooltip />
                      <Bar dataKey="totalBorrows" name="Lượt mượn" fill="#2D4A3E" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <RankedDeviceList devices={topDevices} />
                )}
              </SectionCard>
            </Col>
            <Col xs={24} xl={useChart ? 10 : 14}>
              <AdminTableCard title="Lượt mượn theo thiết bị trong tháng">
                <Table<TopDeviceStat>
                  rowKey={(record) => record.equipmentId || record.name}
                  dataSource={topDevices}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 560 }}
                  locale={{
                    emptyText: <AdminEmptyState title="Chưa có lượt mượn trong tháng đã chọn." />
                  }}
                  columns={[
                    {
                      title: 'Thiết bị',
                      render: (_, record) => (
                        <div>
                          <Typography.Text strong>{record.name}</Typography.Text>
                          <div style={{ color: '#8A8E88', fontSize: 12 }}>{record.code || 'Chưa có mã thiết bị'}</div>
                        </div>
                      )
                    },
                    {
                      title: 'Lượt trong tháng',
                      width: 220,
                      render: (_, record) => {
                        const percent = Math.round((record.totalBorrows / maxTopDeviceBorrows) * 100);
                        return (
                          <div>
                            <Typography.Text strong>{formatNumber(record.totalBorrows)} lượt</Typography.Text>
                            <Progress percent={percent} showInfo={false} strokeColor="#2D4A3E" trailColor="#EFEADA" size="small" />
                          </div>
                        );
                      }
                    }
                  ]}
                />
              </AdminTableCard>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
}

function getRequestBreakdown(data?: RequestStats) {
  const totalRequests = data?.totalRequests ?? 0;
  const knownStatusCount =
    (data?.approvedCount ?? 0) +
    (data?.rejectedCount ?? 0) +
    (data?.pendingCount ?? 0) +
    (data?.borrowingCount ?? 0) +
    (data?.overdueCount ?? 0);
  const otherCount = Math.max(totalRequests - knownStatusCount, 0);

  return [
    { key: 'approved', name: 'Đã duyệt', value: data?.approvedCount ?? 0, color: '#2D4A3E' },
    { key: 'rejected', name: 'Từ chối', value: data?.rejectedCount ?? 0, color: '#9B3E33' },
    { key: 'pending', name: 'Chờ xử lý', value: data?.pendingCount ?? 0, color: '#C99A3F' },
    { key: 'borrowing', name: 'Đang mượn', value: data?.borrowingCount ?? 0, color: '#355D8E' },
    { key: 'overdue', name: 'Quá hạn', value: data?.overdueCount ?? 0, color: '#B05A4D' },
    ...(otherCount > 0 ? [{ key: 'other', name: 'Khác', value: otherCount, color: '#8A8E88' }] : [])
  ];
}

function RequestBreakdownList({ rows, totalRequests }: { rows: ReturnType<typeof getRequestBreakdown>; totalRequests: number }) {
  const visibleRows = rows.filter((row) => row.value > 0);
  const displayRows = visibleRows.length > 0 ? visibleRows : rows.filter((row) => row.key !== 'other');

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {displayRows.map((row) => {
        const percent = totalRequests > 0 ? Math.round((row.value / totalRequests) * 100) : 0;
        return (
          <div key={row.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <Typography.Text style={{ color: '#1A1F1B' }}>{row.name}</Typography.Text>
              <Typography.Text strong>{formatNumber(row.value)} lượt</Typography.Text>
            </div>
            <Progress percent={percent} showInfo={false} strokeColor={row.color} trailColor="#EFEADA" />
          </div>
        );
      })}
    </div>
  );
}

function RequestInsight({ data, activeStatusCount }: { data?: RequestStats; activeStatusCount: number }) {
  const totalRequests = data?.totalRequests ?? 0;
  const approvedCount = data?.approvedCount ?? 0;
  const rejectedCount = data?.rejectedCount ?? 0;
  const approvalRate = totalRequests > 0 ? formatPercent((approvedCount / totalRequests) * 100) : 'Chưa có dữ liệu';
  let description = 'Chưa có dữ liệu đủ để so sánh nhiều trạng thái.';

  if (totalRequests > 0 && activeStatusCount > 1) {
    description = 'Phân bổ trạng thái trong tháng đã chọn đang rõ ràng hơn.';
  } else if (totalRequests > 0 && rejectedCount === 0) {
    description = 'Chưa có đơn bị từ chối trong kỳ này.';
  }

  return <InsightCard title="Nhận định nhanh" value={`Tỉ lệ duyệt trong tháng: ${approvalRate}`} description={description} tone={rejectedCount > 0 ? '#B05A4D' : '#2D4A3E'} />;
}

function RequestSection({
  data,
  loading,
  overdueRequests,
  overdueLoading,
  periodLabel
}: {
  data?: RequestStats;
  loading: boolean;
  overdueRequests: NormalizedBorrowRequest[];
  overdueLoading: boolean;
  periodLabel: string;
}) {
  const totalRequests = data?.totalRequests ?? 0;
  const breakdownRows = getRequestBreakdown(data);
  const chartData = breakdownRows.filter((item) => item.value > 0);
  const showPie = chartData.length >= 2;
  const approvedCount = data?.approvedCount ?? 0;
  const rejectedCount = data?.rejectedCount ?? 0;
  const currentOverdueCount = overdueRequests.length;
  const approvalRate = totalRequests > 0 ? formatPercent((approvedCount / totalRequests) * 100) : '0%';
  const rejectedRate = totalRequests > 0 ? formatPercent((rejectedCount / totalRequests) * 100) : '0%';
  const sortedOverdueRequests = [...overdueRequests].sort((a, b) => (getOverdueDays(b.returnDate) ?? 0) - (getOverdueDays(a.returnDate) ?? 0));

  if (loading) return <LoadingBlock />;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Yêu cầu trong tháng" value={totalRequests} meta={`phát sinh trong ${periodLabel}`} icon={<ProfileOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Tỉ lệ duyệt" value={approvalRate} meta={`${formatNumber(approvedCount)} yêu cầu trong tháng đã chọn`} icon={<CheckCircleOutlined />} accent="#2D4A3E" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Tỉ lệ từ chối" value={rejectedRate} meta={`${formatNumber(rejectedCount)} yêu cầu bị từ chối hoặc huỷ trong tháng`} icon={<WarningOutlined />} danger={rejectedCount > 0} accent="#9B3E33" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Quá hạn hiện tại" value={currentOverdueCount} meta={currentOverdueCount > 0 ? 'đơn quá hạn hiện tại, không lọc theo tháng' : 'không có đơn quá hạn hiện tại, không lọc theo tháng'} icon={<WarningOutlined />} danger={currentOverdueCount > 0} accent="#B05A4D" />
        </Col>
      </Row>

      <Row gutter={[18, 18]} align="top">
        <Col xs={24} xl={showPie ? 12 : 14}>
          <SectionCard title="Phân bổ trạng thái yêu cầu trong tháng" subtitle={showPie ? `Biểu đồ chỉ tính các yêu cầu phát sinh trong ${periodLabel}.` : `Dữ liệu trong ${periodLabel} hiện ít nên hiển thị dạng thanh để dễ đọc hơn.`}>
            {totalRequests === 0 ? (
              <AdminEmptyState title="Chưa có dữ liệu yêu cầu trong tháng đã chọn." />
            ) : showPie ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={86} label>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={REQUEST_COLORS[index % REQUEST_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <RequestBreakdownList rows={breakdownRows} totalRequests={totalRequests} />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={showPie ? 12 : 10}>
          <div style={{ display: 'grid', gap: 14 }}>
            <RequestInsight data={data} activeStatusCount={chartData.length} />
            {showPie ? (
              <SectionCard title="Chi tiết trạng thái trong tháng">
                <RequestBreakdownList rows={breakdownRows} totalRequests={totalRequests} />
              </SectionCard>
            ) : null}
          </div>
        </Col>
      </Row>

      <AdminTableCard
        title={
          <div>
            <div>Đơn đang quá hạn hiện tại</div>
            <div style={{ color: '#6B6F6C', fontSize: 12, fontWeight: 400, marginTop: 4 }}>Bao gồm cả các đơn từ kỳ trước nếu vẫn chưa được xử lý.</div>
          </div>
        }
      >
        <Table<NormalizedBorrowRequest>
          rowKey="id"
          dataSource={sortedOverdueRequests}
          loading={overdueLoading}
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
          scroll={{ x: 880 }}
          locale={{ emptyText: <AdminEmptyState title="Không có đơn quá hạn hiện tại." description="Khi phát sinh đơn quá hạn chưa xử lý, danh sách sẽ hiển thị tại đây." /> }}
          columns={[
            {
              title: 'Sinh viên',
              minWidth: 220,
              render: (_, request) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>
                    {getInitials(request.studentName || request.studentCode || 'SV')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1A1F1B' }}>{request.studentName}</div>
                    <div style={{ color: '#8A8E88', fontSize: 12 }}>{request.studentCode || 'Chưa có mã sinh viên'}</div>
                  </div>
                </div>
              )
            },
            {
              title: 'Hạng',
              width: 120,
              render: (_, request) => <RankTag score={request.trustScore} rank={request.trustRank} />
            },
            {
              title: 'Thiết bị',
              render: (_, request) => (
                <div>
                  <Typography.Text strong>{request.deviceName}</Typography.Text>
                  <div style={{ color: '#8A8E88', fontSize: 12 }}>Số lượng: {formatNumber(request.quantity)}</div>
                </div>
              )
            },
            {
              title: 'Hạn trả',
              dataIndex: 'returnDate',
              width: 140,
              render: (value: string) => formatDate(value)
            },
            {
              title: 'Trễ',
              width: 120,
              align: 'right',
              render: (_, request) => {
                const days = getOverdueDays(request.returnDate);
                return days === undefined ? <Typography.Text type="secondary">—</Typography.Text> : <Tag color={days > 3 ? 'red' : 'gold'}>{days} ngày</Tag>;
              }
            },
            {
              title: 'Hành động',
              width: 150,
              align: 'right',
              render: () => (
                <Tooltip title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
                  <span title="Chức năng nhắc nhở sẽ khả dụng khi hệ thống hỗ trợ.">
                    <Button disabled>Nhắc nhở</Button>
                  </span>
                </Tooltip>
              )
            }
          ]}
        />
      </AdminTableCard>
    </div>
  );
}

function StudentSection({ data, loading }: { data?: StudentStatsSummary; loading: boolean }) {
  const topStudents = data?.topStudents ?? [];
  const totalStudents = data?.totalStudents ?? 0;
  const currentlyBorrowing = data?.currentlyBorrowing ?? 0;
  const borrowedStudents = data?.borrowedStudents;
  const lateStudents = data?.lateStudents;
  const borrowedMeta = borrowedStudents !== undefined ? 'sinh viên từng gửi yêu cầu toàn hệ thống' : 'Chưa có sinh viên phát sinh lịch sử mượn';
  const lateMeta = lateStudents !== undefined && lateStudents > 0 ? 'lịch sử trễ hạn toàn hệ thống' : 'Chưa ghi nhận trễ hạn toàn hệ thống';

  if (loading) return <LoadingBlock />;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Tổng sinh viên" value={totalStudents} meta="toàn hệ thống" icon={<TeamOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Đang giữ đồ" value={currentlyBorrowing} meta="sinh viên đang mượn hoặc quá hạn hiện tại" icon={<FieldTimeOutlined />} danger={currentlyBorrowing > 0} accent="#355D8E" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Đã phát sinh yêu cầu" value={optionalCount(borrowedStudents)} meta={borrowedMeta} icon={<BarChartOutlined />} accent="#C99A3F" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Có lịch sử trễ" value={optionalCount(lateStudents)} meta={lateMeta} icon={<WarningOutlined />} danger={(lateStudents ?? 0) > 0} accent="#B05A4D" />
        </Col>
      </Row>

      <Alert
        showIcon
        type="info"
        message="Điểm uy tín được lấy theo hồ sơ hiện tại. Tỉ lệ đúng hạn được tính từ các đơn đã hoàn tất."
        style={{ borderRadius: 12, border: '1px solid #D9E6DD', background: '#F7FBF8' }}
      />

      <AdminTableCard title="Tổng hợp lịch sử mượn theo sinh viên">
        {topStudents.length === 0 ? (
          <AdminEmptyState title="Chưa có sinh viên phát sinh lịch sử mượn." description="Bảng xếp hạng sẽ xuất hiện khi có yêu cầu mượn được ghi nhận." />
        ) : (
          <Table<TopStudentStat>
            rowKey={(student, index) => student.id || `${student.studentCode}-${index}`}
            dataSource={topStudents}
            pagination={false}
            scroll={{ x: 980 }}
            columns={[
              {
                title: '#',
                width: 64,
                render: (_, __, index) => <Typography.Text strong>{index + 1}</Typography.Text>
              },
              {
                title: 'Sinh viên',
                minWidth: 240,
                render: (_, student) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>
                      {getInitials(student.fullName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1A1F1B' }}>{student.fullName}</div>
                      <div style={{ color: '#8A8E88', fontSize: 12 }}>{student.studentCode}</div>
                    </div>
                  </div>
                )
              },
              {
                title: 'Hạng',
                dataIndex: 'trustScore',
                width: 140,
                render: (value: number, student) => <RankTag score={value} rank={student.trustRank} />
              },
              {
                title: 'Đã hoàn tất',
                width: 130,
                render: (_, student) => (
                  <div>
                    <Typography.Text strong>{formatNumber(getCompletedReturns(student))}</Typography.Text>
                    {getStudentReturnMeta(student) ? (
                      <div style={{ color: '#8A8E88', fontSize: 12 }}>{getStudentReturnMeta(student)}</div>
                    ) : null}
                  </div>
                )
              },
              {
                title: 'Lần trễ',
                width: 110,
                render: (_, student) => {
                  const lateReturns = getLateReturns(student);
                  return (
                    <div>
                      <Tag color={lateReturns > 0 ? 'red' : 'green'}>{formatNumber(lateReturns)}</Tag>
                      {getStudentLateMeta(student) ? (
                        <div style={{ color: '#8A8E88', fontSize: 12 }}>{getStudentLateMeta(student)}</div>
                      ) : null}
                    </div>
                  );
                }
              },
              {
                title: 'Tỉ lệ đúng hạn',
                width: 190,
                render: (_, student) => {
                  const onTimeRate = getOnTimeRate(student);
                  if (onTimeRate === undefined) {
                    return (
                      <div>
                        <Typography.Text type="secondary">—</Typography.Text>
                        <div style={{ color: '#8A8E88', fontSize: 12 }}>Chưa có đơn hoàn tất</div>
                      </div>
                    );
                  }
                  return (
                    <Tooltip title={getRateTooltip(student)}>
                      <div>
                        <Typography.Text strong>{formatPercent(onTimeRate)}</Typography.Text>
                        <Progress percent={Math.round(onTimeRate)} showInfo={false} strokeColor={onTimeRate < 70 ? '#B05A4D' : '#2D4A3E'} trailColor="#EFEADA" size="small" />
                      </div>
                    </Tooltip>
                  );
                }
              },
              {
                title: 'Đánh giá lịch sử',
                width: 140,
                render: (_, student) => {
                  const assessment = getStudentAssessment(student);
                  return <Tag color={assessment.color}>{assessment.label}</Tag>;
                }
              },
              {
                title: 'Điểm uy tín hiện tại',
                dataIndex: 'trustScore',
                width: 150,
                render: (value: number) => (
                  <div>
                    <Typography.Text strong>{formatNumber(value)} điểm</Typography.Text>
                    <Progress percent={Math.max(0, Math.min(100, value))} showInfo={false} strokeColor="#C99A3F" trailColor="#EFEADA" size="small" />
                  </div>
                )
              }
            ]}
          />
        )}
      </AdminTableCard>
    </div>
  );
}

function TrendMonthList({ rows }: { rows: TrendRow[] }) {
  const maxRequests = Math.max(...rows.map((row) => row.totalRequests), 1);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map((row) => {
        const percent = Math.round((row.totalRequests / maxRequests) * 100);
        return (
          <div key={`${row.year}-${row.month}`} style={{ border: '1px solid #E5DECB', borderRadius: 12, padding: 14, background: '#FFFDF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <Typography.Text strong>{row.label}</Typography.Text>
              <Typography.Text strong>{formatNumber(row.totalRequests)} yêu cầu</Typography.Text>
            </div>
            <Progress percent={percent} showInfo={false} strokeColor="#2D4A3E" trailColor="#EFEADA" />
          </div>
        );
      })}
    </div>
  );
}

function TimeSection({ data, loading, selectedMonth, selectedYear }: { data?: TimeTrendStat[]; loading: boolean; selectedMonth: number; selectedYear: number }) {
  const trendData = useMemo(
    () =>
      [...(data ?? [])]
        .filter((row) => row.month && row.year === selectedYear)
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map((row) => ({ ...row, label: monthLabel(row) })),
    [data, selectedYear]
  );
  const hasEnoughTrend = trendData.length >= 3;
  const peakMonth = trendData.reduce<TrendRow | undefined>((best, row) => (!best || row.totalRequests > best.totalRequests ? row : best), undefined);
  const lowMonth = trendData.reduce<TrendRow | undefined>((best, row) => (!best || row.totalRequests < best.totalRequests ? row : best), undefined);
  const selectedMonthRow = trendData.find((row) => row.month === selectedMonth && row.year === selectedYear);
  const periodLabel = selectedPeriodLabel(selectedMonth, selectedYear);

  if (loading) return <LoadingBlock />;

  if (trendData.length === 0) {
    return <AdminEmptyState title={`Chưa có dữ liệu thống kê trong năm ${selectedYear}.`} description="Khi có yêu cầu phát sinh trong năm này, xu hướng sẽ được cập nhật tại đây." />;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <AdminStatCard title="Tháng cao điểm" value={peakMonth ? `T${peakMonth.month}` : '—'} meta={peakMonth ? `${formatNumber(peakMonth.totalRequests)} yêu cầu - cao nhất trong năm ${selectedYear}` : 'Chưa có dữ liệu xu hướng'} icon={<FireOutlined />} accent="#B05A4D" />
        </Col>
        <Col xs={24} md={8}>
          <AdminStatCard title="Tháng thấp điểm" value={lowMonth ? `T${lowMonth.month}` : '—'} meta={lowMonth ? `${formatNumber(lowMonth.totalRequests)} yêu cầu - thấp nhất trong năm ${selectedYear}` : 'Chưa có dữ liệu xu hướng'} icon={<BarChartOutlined />} accent="#C99A3F" />
        </Col>
        <Col xs={24} md={8}>
          <AdminStatCard title="Tháng đang chọn" value={selectedMonthRow?.totalRequests ?? 0} meta={periodLabel} icon={<ClockCircleOutlined />} accent="#355D8E" />
        </Col>
      </Row>

      <Row gutter={[18, 18]} align="top">
        <Col xs={24} xl={hasEnoughTrend ? 15 : 11}>
          <SectionCard title="Xu hướng yêu cầu theo thời gian" subtitle={hasEnoughTrend ? `Theo dõi biến động yêu cầu trong năm ${selectedYear}.` : `Dữ liệu năm ${selectedYear} hiện ít nên hiển thị theo danh sách tháng.`}>
            {hasEnoughTrend ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#EFEADA" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="totalRequests" name="Tổng yêu cầu" stroke="#2D4A3E" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <TrendMonthList rows={trendData} />
            )}
          </SectionCard>
        </Col>
        <Col xs={24} xl={hasEnoughTrend ? 9 : 13}>
          <div style={{ display: 'grid', gap: 14 }}>
            {!hasEnoughTrend ? (
              <Alert
                showIcon
                type="info"
                message="Chưa đủ dữ liệu để phân tích xu hướng dài hạn"
                description="Hệ thống sẽ hiển thị biểu đồ rõ hơn khi có thêm dữ liệu các tháng tiếp theo."
                style={{ borderRadius: 12, border: '1px solid #D9E6DD', background: '#F7FBF8' }}
              />
            ) : null}
            <AdminTableCard title={`Dữ liệu theo tháng trong năm ${selectedYear}`}>
              <Table<TrendRow>
                rowKey={(record) => `${record.year}-${record.month}`}
                dataSource={trendData}
                pagination={false}
                size="middle"
                columns={[
                  { title: 'Tháng', dataIndex: 'label' },
                  { title: 'Tổng yêu cầu', dataIndex: 'totalRequests', align: 'right', render: (value: number) => <Typography.Text strong>{formatNumber(value)}</Typography.Text> }
                ]}
              />
            </AdminTableCard>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default function AdminStatisticsPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const monthParams = useMemo(() => ({ month, year }), [month, year]);
  const { data: deviceStats, loading: deviceLoading } = useAsyncData(() => getDeviceStats(monthParams), [month, year]);
  const { data: requestStats, loading: requestLoading } = useAsyncData(() => getRequestStats(monthParams), [month, year]);
  const { data: studentStats, loading: studentLoading } = useAsyncData(getStatsStudentSummary, []);
  const { data: timeStats, loading: timeLoading } = useAsyncData(() => getTimeTrendStats({ year }), [year]);
  const { data: overdueRequests = [], loading: overdueLoading } = useAsyncData(() => getBorrowRequests({ status: 'overdue', page: 1, limit: 1000 }), []);
  const periodLabel = selectedPeriodLabel(month, year);
  const yearOptions = Array.from({ length: 4 }, (_, index) => {
    const value = now.getFullYear() - index;
    return { value, label: String(value) };
  });
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }));
  const statsLoading = deviceLoading || requestLoading || studentLoading || timeLoading || overdueLoading;

  const handleExportStatistics = () => {
    const hasDataForExport = Boolean(deviceStats || requestStats || studentStats || timeStats?.length || overdueRequests.length);
    if (!hasDataForExport) {
      message.warning('Không có dữ liệu để xuất.');
      return;
    }

    const rows: StatisticsExportRow[] = [
      { group: 'Tổng quan', metric: 'Kỳ thống kê', value: periodLabel, note: 'Dữ liệu theo tháng/năm đang chọn khi có áp dụng bộ lọc thời gian.' },
      { group: 'Tổng quan', metric: 'Năm xu hướng', value: year, note: `Phần theo thời gian chỉ dùng dữ liệu năm ${year}.` }
    ];

    if (deviceStats) {
      const usageRate = deviceStats.sumTotal > 0 ? `${Math.round((deviceStats.sumBorrowing / deviceStats.sumTotal) * 100)}%` : '0%';
      rows.push(
        { group: 'Theo thiết bị', metric: 'Tổng loại thiết bị', value: deviceStats.totalDeviceTypes, note: 'Toàn hệ thống hiện tại' },
        { group: 'Theo thiết bị', metric: 'Tổng số lượng thiết bị', value: deviceStats.sumTotal, note: 'Toàn hệ thống hiện tại' },
        { group: 'Theo thiết bị', metric: 'Đang được mượn', value: deviceStats.sumBorrowing, note: 'Số lượng hiện tại đang sử dụng' },
        { group: 'Theo thiết bị', metric: 'Tỉ lệ sử dụng', value: usageRate, note: 'Hiện tại: đang mượn / tổng số lượng' },
        { group: 'Theo thiết bị', metric: 'Hỏng / bảo trì', value: deviceStats.sumUnavailable ?? 'Chưa có dữ liệu', note: 'Tình trạng hiện tại' }
      );
      deviceStats.topDevices.forEach((device, index) => {
        rows.push({
          group: 'Theo thiết bị',
          metric: `Top ${index + 1}: ${device.name}`,
          value: device.totalBorrows,
          note: `Lượt mượn trong ${periodLabel}${device.code ? ` · ${device.code}` : ''}`
        });
      });
    }

    if (requestStats) {
      const approvalRate = requestStats.totalRequests > 0 ? `${Math.round((requestStats.approvedCount / requestStats.totalRequests) * 100)}%` : '0%';
      const rejectedRate = requestStats.totalRequests > 0 ? `${Math.round((requestStats.rejectedCount / requestStats.totalRequests) * 100)}%` : '0%';
      rows.push(
        { group: 'Theo yêu cầu', metric: 'Yêu cầu trong tháng', value: requestStats.totalRequests, note: `Phát sinh trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Đã duyệt / Chờ bàn giao', value: requestStats.approvedCount, note: `Trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Chờ duyệt', value: requestStats.pendingCount ?? 0, note: `Trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Đang mượn', value: requestStats.borrowingCount ?? 0, note: `Yêu cầu phát sinh trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Quá hạn theo kỳ', value: requestStats.overdueCount ?? 0, note: `Yêu cầu phát sinh trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Từ chối / huỷ', value: requestStats.rejectedCount, note: `Trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Tỉ lệ duyệt', value: approvalRate, note: `Tính trên yêu cầu trong ${periodLabel}` },
        { group: 'Theo yêu cầu', metric: 'Tỉ lệ từ chối', value: rejectedRate, note: `Tính trên yêu cầu trong ${periodLabel}` }
      );
    }
    rows.push({ group: 'Theo yêu cầu', metric: 'Quá hạn hiện tại', value: overdueRequests.length, note: 'Đơn quá hạn hiện tại, không lọc theo tháng' });

    if (studentStats) {
      rows.push(
        { group: 'Theo sinh viên', metric: 'Tổng sinh viên', value: studentStats.totalStudents, note: 'Toàn hệ thống' },
        { group: 'Theo sinh viên', metric: 'Đang giữ đồ', value: studentStats.currentlyBorrowing, note: 'Sinh viên đang mượn hoặc quá hạn hiện tại' },
        { group: 'Theo sinh viên', metric: 'Đã phát sinh yêu cầu', value: studentStats.borrowedStudents ?? 'Chưa có dữ liệu', note: 'Sinh viên từng gửi yêu cầu toàn hệ thống' },
        { group: 'Theo sinh viên', metric: 'Có lịch sử trễ', value: studentStats.lateStudents ?? 'Chưa có dữ liệu', note: 'Lịch sử trễ hạn toàn hệ thống' }
      );
      studentStats.topStudents.forEach((student, index) => {
        const rate = getOnTimeRate(student);
        const assessment = getStudentAssessment(student);
        rows.push({
          group: 'Theo sinh viên',
          metric: `${index + 1}. ${student.fullName}`,
          value: student.totalBorrowRequests ?? getCompletedReturns(student),
          note: `${student.studentCode} · ${getRankLabel(student.trustScore, student.trustRank)} · ${student.trustScore} điểm · Tỉ lệ đúng hạn: ${rate === undefined ? 'Chưa có đơn hoàn tất' : formatPercent(rate)} · ${assessment.label}`
        });
      });
    }

    [...(timeStats ?? [])]
      .filter((row) => row.year === year)
      .sort((a, b) => a.month - b.month)
      .forEach((row) => {
        rows.push({
          group: 'Theo thời gian',
          metric: `Tháng ${row.month}/${row.year}`,
          value: row.totalRequests,
          note: `Tổng yêu cầu trong năm ${year}`
        });
      });

    const exported = exportToExcel<StatisticsExportRow>({
      fileName: `bao-cao-thong-ke-thang-${month}-${year}`,
      sheetName: 'Báo cáo thống kê',
      rows,
      columns: [
        { header: 'Nhóm', key: 'group', width: 18 },
        { header: 'Chỉ số', key: 'metric', width: 34 },
        { header: 'Giá trị', key: 'value', width: 18 },
        { header: 'Ghi chú', key: 'note', width: 48 }
      ]
    });

    if (!exported) message.warning('Không có dữ liệu để xuất.');
  };

  return (
    <div className="admin-statistics-page">
      <style>
        {`
          .admin-statistics-page {
            display: grid;
            gap: 24px;
            padding-bottom: 48px;
          }

          .admin-statistics-page__hero {
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

          .admin-statistics-page__title {
            margin: 0 !important;
            color: #1A1F1B !important;
            font-family: var(--app-heading-font);
            font-weight: 600 !important;
          }

          .admin-statistics-page__title em {
            color: #2D4A3E;
            font-style: normal;
          }

          .admin-statistics-page__subtitle {
            display: block;
            color: #6B6F6C;
            font-size: 15px;
            margin-top: 8px;
          }

          .admin-statistics-page__actions {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .admin-statistics-page__section {
            display: grid;
            gap: 16px;
          }

          .admin-statistics-page__section-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-end;
          }

          .admin-statistics-page__section-title {
            margin: 0 !important;
            color: #1A1F1B !important;
            font-family: var(--app-heading-font);
            font-weight: 600 !important;
          }

          .admin-statistics-page__section-title span {
            color: #C99A3F;
          }

          .admin-statistics-page__section-subtitle {
            display: block;
            color: #6B6F6C;
            font-size: 13px;
            margin-top: 4px;
          }

          @media (max-width: 768px) {
            .admin-statistics-page__hero {
              align-items: stretch;
              flex-direction: column;
              padding: 22px;
            }

            .admin-statistics-page__actions {
              justify-content: flex-start;
            }
          }
        `}
      </style>

      <header className="admin-statistics-page__hero">
        <div>
          <Typography.Title level={1} className="admin-statistics-page__title">
            Thống kê <em>chi tiết</em>
          </Typography.Title>
          <Typography.Text className="admin-statistics-page__subtitle">Phân tích hoạt động mượn - trả của hệ thống theo thiết bị, yêu cầu, sinh viên và thời gian.</Typography.Text>
        </div>
        <div className="admin-statistics-page__actions">
          <Select value={month} onChange={setMonth} style={{ width: 130 }} options={monthOptions} />
          <Select value={year} onChange={setYear} style={{ width: 120 }} options={yearOptions} />
          <Button icon={<DownloadOutlined />} loading={statsLoading} onClick={handleExportStatistics}>
            Xuất Excel
          </Button>
        </div>
      </header>

      <SectionBlock marker="a" title="Theo thiết bị" subtitle="Tình trạng kho hiện tại và lượt mượn theo kỳ được trình bày thành hai nhóm riêng.">
        <DeviceSection data={deviceStats} loading={deviceLoading} periodLabel={periodLabel} />
      </SectionBlock>

      <SectionBlock marker="b" title="Theo yêu cầu" subtitle={`Tổng hợp yêu cầu phát sinh trong ${periodLabel}; đơn quá hạn hiện tại được theo dõi riêng.`}>
        <RequestSection data={requestStats} loading={requestLoading} overdueRequests={overdueRequests} overdueLoading={overdueLoading} periodLabel={periodLabel} />
      </SectionBlock>

      <SectionBlock marker="c" title="Theo sinh viên" subtitle="Nhìn nhanh dữ liệu toàn hệ thống về mức độ tham gia, lịch sử trễ hạn và uy tín của sinh viên.">
        <StudentSection data={studentStats} loading={studentLoading} />
      </SectionBlock>

      <SectionBlock marker="d" title="Theo thời gian" subtitle={`Quan sát biến động yêu cầu trong năm ${year}.`}>
        <TimeSection data={timeStats} loading={timeLoading} selectedMonth={month} selectedYear={year} />
      </SectionBlock>
    </div>
  );
}
