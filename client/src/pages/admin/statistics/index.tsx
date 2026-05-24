import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Col, message, Row, Select, Skeleton, Table, Tag, Typography } from 'antd';
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
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type RankTier = 'diamond' | 'gold' | 'silver' | 'bronze';

interface PieLabelProps {
  name?: string;
  percent?: number;
}

const monthlyData = [
  { month: 'T1', borrows: 45, returns: 42 },
  { month: 'T2', borrows: 52, returns: 48 },
  { month: 'T3', borrows: 61, returns: 56 },
  { month: 'T4', borrows: 70, returns: 65 },
  { month: 'T5', borrows: 84, returns: 76 },
  { month: 'T6', borrows: 31, returns: 29 },
  { month: 'T7', borrows: 58, returns: 54 },
  { month: 'T8', borrows: 72, returns: 68 },
  { month: 'T9', borrows: 88, returns: 80 },
  { month: 'T10', borrows: 98, returns: 91 },
  { month: 'T11', borrows: 76, returns: 70 },
  { month: 'T12', borrows: 82, returns: 77 }
];

const statusData = [
  { name: 'Đã trả', value: 145, color: '#4F8B5F' },
  { name: 'Đang mượn', value: 24, color: '#9B6BBF' },
  { name: 'Chờ duyệt', value: 8, color: '#C99A3F' },
  { name: 'Quá hạn', value: 8, color: '#B05A4D' },
  { name: 'Đã huỷ', value: 5, color: '#6B6F6C' }
];

const topDevices = [
  { name: 'Micro Shure SM58', count: 45 },
  { name: 'Máy chiếu Epson', count: 38 },
  { name: 'Loa kéo JBL', count: 29 },
  { name: 'Sony A7 III', count: 22 },
  { name: 'Tripod Manfrotto', count: 18 }
];

const topStudents = [
  { rank: 1, name: 'Lê Văn C', mssv: '21000099', score: 98, rank_tier: 'diamond' as RankTier },
  { rank: 2, name: 'Nguyễn Văn A', mssv: '22000123', score: 85, rank_tier: 'gold' as RankTier },
  { rank: 3, name: 'Hoàng Lan', mssv: '22000333', score: 82, rank_tier: 'gold' as RankTier },
  { rank: 4, name: 'Bùi Hà My', mssv: '23000555', score: 76, rank_tier: 'silver' as RankTier },
  { rank: 5, name: 'Trần Đức Nam', mssv: '21000678', score: 66, rank_tier: 'silver' as RankTier }
];

const overdueRequests = [
  { id: 'REQ-2026-0098', student: 'Phạm Tùng', device: 'Loa JBL × 1', daysOverdue: 5 },
  { id: 'REQ-2026-0102', student: 'Lê Minh', device: 'Máy chiếu Epson × 1', daysOverdue: 4 },
  { id: 'REQ-2026-0105', student: 'Vũ Khánh', device: 'Tripod Manfrotto × 1', daysOverdue: 3 },
  { id: 'REQ-2026-0110', student: 'Trần Thị B', device: 'Micro Shure × 2', daysOverdue: 2 },
  { id: 'REQ-2026-0114', student: 'Hoàng Anh', device: 'Sony A7 III × 1', daysOverdue: 1 }
];

const RANK_CONFIG: Record<RankTier, { label: string; color: string; bg: string }> = {
  diamond: { label: 'Kim cương', color: '#075985', bg: '#E0F2FE' },
  gold: { label: 'Vàng', color: '#8B6A1F', bg: '#F5EBD0' },
  silver: { label: 'Bạc', color: '#4A5568', bg: '#ECEEF2' },
  bronze: { label: 'Đồng', color: '#8C4A36', bg: '#F7E8DF' }
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

function RankTag({ rank }: { rank: RankTier }) {
  const config = RANK_CONFIG[rank];
  return (
    <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 700 }}>
      {config.label}
    </Tag>
  );
}

function StatCard({
  title,
  value,
  meta,
  tone = 'default'
}: {
  title: string;
  value: string;
  meta: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const color = tone === 'success' ? '#4F8B5F' : tone === 'danger' ? '#B05A4D' : '#1A1F1B';
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 14,
        border: tone === 'danger' ? '1px solid #B05A4D' : '1px solid #E5DECB',
        boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)'
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ color: '#6B6F6C', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 36, color, marginTop: 8, lineHeight: 1 }}>{value}</div>
      <div style={{ color: tone === 'danger' ? '#B05A4D' : tone === 'success' ? '#4F8B5F' : '#6B6F6C', fontSize: 12, marginTop: 8 }}>
        {meta}
      </div>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card
      title={<span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 500 }}>{title}</span>}
      variant="borderless"
      style={{ borderRadius: 14, border: '1px solid #E5DECB', height: '100%' }}
    >
      {children}
    </Card>
  );
}

function pieLabel({ name, percent }: PieLabelProps) {
  return `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`;
}

export default function AdminStatisticsPage() {
  const [range, setRange] = useState('30');
  const [month, setMonth] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', color: '#1A1F1B' }}>
              Bảng điều khiển thống kê
            </h1>
            <p style={{ color: '#6B6F6C', margin: 0 }}>Tổng quan hoạt động mượn-trả của CLB</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Select disabled value={range} style={{ width: 150 }} options={[{ value: '30', label: '30 ngày' }]} />
            <Select disabled value={month} style={{ width: 130 }} options={[{ value: month, label: `Tháng ${month}` }]} />
          </div>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {Array.from({ length: 4 }, (_, index) => (
            <Col xs={24} sm={12} xl={6} key={index}>
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }} styles={{ body: { padding: 20 } }}>
                <Skeleton.Input active size="small" style={{ width: 130, marginBottom: 14 }} />
                <Skeleton.Input active style={{ width: 88, height: 42, marginBottom: 14 }} />
                <Skeleton.Input active size="small" block />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[20, 20]}>
          {['Xu hướng mượn 12 tháng', 'Top 5 thiết bị mượn nhiều', 'Phân bổ trạng thái đơn', 'Top 5 sinh viên uy tín cao'].map((title) => (
            <Col xs={24} xl={12} key={title}>
              <ChartCard title={title}>
                <Skeleton.Input active block style={{ height: 300 }} />
              </ChartCard>
            </Col>
          ))}
        </Row>

        <Card
          title={<Skeleton.Input active style={{ width: 230 }} />}
          variant="borderless"
          style={{ borderRadius: 14, border: '1px solid #E5DECB', marginTop: 20 }}
        >
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', color: '#1A1F1B' }}>
            Bảng điều khiển thống kê
          </h1>
          <p style={{ color: '#6B6F6C', margin: 0 }}>Tổng quan hoạt động mượn-trả của CLB</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Select
            value={range}
            onChange={setRange}
            style={{ width: 150 }}
            options={[
              { value: '7', label: '7 ngày' },
              { value: '30', label: '30 ngày' },
              { value: '90', label: '90 ngày' },
              { value: 'year', label: 'Năm này' }
            ]}
          />
          <Select
            value={month}
            onChange={setMonth}
            style={{ width: 130 }}
            options={Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }))}
          />
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="TỔNG LƯỢT MƯỢN" value="156" meta="↑ 12% so với tháng trước" tone="success" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="ĐANG HOẠT ĐỘNG" value="24" meta="đơn đang mượn" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="TỶ LỆ DUYỆT" value="87%" meta="thấp hơn 3% so với tháng trước" tone="danger" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="SV QUÁ HẠN" value="8" meta="↑ 2 so với tháng trước" tone="danger" />
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <ChartCard title="Xu hướng mượn 12 tháng">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid stroke="#EFEADA" strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="borrows" name="Lượt mượn" stroke="#2D4A3E" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="returns" name="Trả đúng hạn" stroke="#6BA67B" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} xl={12}>
          <ChartCard title="Top 5 thiết bị mượn nhiều">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDevices} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="#EFEADA" strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="count" name="Lượt mượn" fill="#2D4A3E" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} xl={12}>
          <ChartCard title="Phân bổ trạng thái đơn">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label={pieLabel} labelLine>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} xl={12}>
          <ChartCard title="Top 5 sinh viên uy tín cao">
            <div style={{ display: 'grid', gap: 12 }}>
              {topStudents.map((student) => (
                <Card key={student.mssv} variant="borderless" style={{ border: '1px solid #EFEADA', borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '34px 48px 1fr auto', alignItems: 'center', gap: 12 }}>
                    <Typography.Text strong style={{ color: '#C99A3F', fontSize: 18 }}>#{student.rank}</Typography.Text>
                    <Avatar size={42} style={{ background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>
                      {getInitials(student.name)}
                    </Avatar>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1A1F1B' }}>{student.name}</div>
                      <div style={{ color: '#9A9D98', fontSize: 12 }}>{student.mssv}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Typography.Text strong style={{ display: 'block', color: '#2D4A3E' }}>{student.score}đ</Typography.Text>
                      <RankTag rank={student.rank_tier} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ChartCard>
        </Col>
      </Row>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 500 }}>Đơn quá hạn cần xử lý</span>
            <Tag color="red">8 đơn</Tag>
          </div>
        }
        variant="borderless"
        style={{ borderRadius: 14, border: '1px solid #E5DECB', marginTop: 20 }}
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={overdueRequests}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Mã đơn', dataIndex: 'id', render: (id: string) => <Typography.Text strong>{id}</Typography.Text> },
            { title: 'Sinh viên', dataIndex: 'student' },
            { title: 'Thiết bị', dataIndex: 'device' },
            {
              title: 'Số ngày trễ',
              dataIndex: 'daysOverdue',
              render: (days: number) => <Tag color="red">{days} ngày</Tag>
            },
            {
              title: 'Hành động',
              align: 'right',
              render: () => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={() => message.success('Đã gửi nhắc nhở liên hệ')}>Liên hệ</Button>
                  <Button type="primary" onClick={() => message.success('Đã ghi nhận trả')} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
                    Ghi nhận trả
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
