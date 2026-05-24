import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import type { MenuProps } from 'antd';

type StudentRank = 'diamond' | 'gold' | 'silver' | 'bronze' | 'stone';
type StudentStatus = 'active' | 'locked' | 'warning';

interface Student {
  id: string;
  fullName: string;
  mssv: string;
  email: string;
  className: string;
  club: string;
  rank: StudentRank;
  score: number;
  borrowing: number;
  totalBorrow: number;
  onTime: number;
  late: number;
  status: StudentStatus;
  phone: string;
  joinedAt: string;
}

interface RestoreFormValues {
  points: number;
  reason: string;
}

const RANK_CONFIG: Record<StudentRank, { label: string; color: string; bg: string }> = {
  diamond: { label: 'Kim cương', color: '#075985', bg: '#E0F2FE' },
  gold: { label: 'Vàng', color: '#8B6A1F', bg: '#F5EBD0' },
  silver: { label: 'Bạc', color: '#4A5568', bg: '#ECEEF2' },
  bronze: { label: 'Đồng', color: '#8C4A36', bg: '#F7E8DF' },
  stone: { label: 'Đá cuội', color: '#3F403D', bg: '#EFE9DD' }
};

const STATUS_CONFIG: Record<StudentStatus, { label: string; color: string }> = {
  active: { label: 'Hoạt động', color: 'green' },
  locked: { label: 'Bị khoá', color: 'red' },
  warning: { label: 'Có cảnh báo', color: 'gold' }
};

const mockStudents: Student[] = [
  { id: 'u1', fullName: 'Nguyễn Văn A', mssv: '22000123', email: 'a@uet.edu.vn', className: 'CNTT K22', club: 'Truyền thông', rank: 'gold', score: 85, borrowing: 1, totalBorrow: 14, onTime: 12, late: 1, status: 'active', phone: '0987 654 321', joinedAt: '09/2024' },
  { id: 'u2', fullName: 'Trần Thị B', mssv: '22000124', email: 'b@uet.edu.vn', className: 'CNTT K22', club: 'Truyền thông', rank: 'silver', score: 65, borrowing: 0, totalBorrow: 8, onTime: 6, late: 2, status: 'active', phone: '0912 333 444', joinedAt: '10/2024' },
  { id: 'u3', fullName: 'Lê Văn C', mssv: '21000099', email: 'c@uet.edu.vn', className: 'KHMT K21', club: 'Học thuật', rank: 'diamond', score: 98, borrowing: 2, totalBorrow: 25, onTime: 24, late: 0, status: 'active', phone: '0901 222 333', joinedAt: '08/2023' },
  { id: 'u4', fullName: 'Phạm Tùng', mssv: '22000222', email: 'tung@uet.edu.vn', className: 'Marketing K23', club: 'Sự kiện', rank: 'bronze', score: 55, borrowing: 1, totalBorrow: 9, onTime: 6, late: 3, status: 'warning', phone: '0988 111 222', joinedAt: '11/2024' },
  { id: 'u5', fullName: 'Hoàng Lan', mssv: '22000333', email: 'lan@uet.edu.vn', className: 'Truyền thông K22', club: 'Truyền thông', rank: 'diamond', score: 95, borrowing: 0, totalBorrow: 18, onTime: 18, late: 0, status: 'active', phone: '0977 222 111', joinedAt: '09/2024' },
  { id: 'u6', fullName: 'Vũ Khánh', mssv: '22000999', email: 'khanh@uet.edu.vn', className: 'CNTT K23', club: 'Âm nhạc', rank: 'stone', score: 35, borrowing: 0, totalBorrow: 6, onTime: 2, late: 4, status: 'locked', phone: '0966 333 555', joinedAt: '01/2025' },
  { id: 'u7', fullName: 'Đỗ Minh Anh', mssv: '23000444', email: 'anh@uet.edu.vn', className: 'CNTT K23', club: 'Media', rank: 'gold', score: 82, borrowing: 2, totalBorrow: 11, onTime: 10, late: 0, status: 'active', phone: '0934 555 666', joinedAt: '02/2025' },
  { id: 'u8', fullName: 'Bùi Hà My', mssv: '23000555', email: 'my@uet.edu.vn', className: 'KHMT K23', club: 'Học thuật', rank: 'silver', score: 72, borrowing: 1, totalBorrow: 7, onTime: 7, late: 0, status: 'active', phone: '0923 777 888', joinedAt: '03/2025' },
  { id: 'u9', fullName: 'Trần Đức Nam', mssv: '21000678', email: 'nam@uet.edu.vn', className: 'ATTT K21', club: 'Thể thao', rank: 'bronze', score: 58, borrowing: 0, totalBorrow: 5, onTime: 4, late: 1, status: 'warning', phone: '0911 888 999', joinedAt: '07/2023' }
];

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function getInitials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(-2).join('').toUpperCase();
}

function RankTag({ rank }: { rank: StudentRank }) {
  const config = RANK_CONFIG[rank];
  return <Tag style={{ border: 'none', borderRadius: 999, color: config.color, background: config.bg, fontWeight: 700 }}>{config.label}</Tag>;
}

function StatCard({ title, value, meta, danger }: { title: string; value: number; meta: string; danger?: boolean }) {
  return (
    <Card variant="borderless" style={{ borderRadius: 14, border: danger ? '1px solid #B05A4D' : '1px solid #E5DECB' }} styles={{ body: { padding: 20 } }}>
      <div style={{ color: '#6B6F6C', fontSize: 11, letterSpacing: '0.08em' }}>{title}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, color: danger ? '#B05A4D' : '#1A1F1B', marginTop: 8 }}>{value}</div>
      <div style={{ color: '#6B6F6C', fontSize: 12 }}>{meta}</div>
    </Card>
  );
}

export default function AdminStudentsPage() {
  const [restoreForm] = Form.useForm<RestoreFormValues>();
  const [students, setStudents] = useState(mockStudents);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [rankFilter, setRankFilter] = useState<StudentRank | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'all'>('all');
  const [detailStudent, setDetailStudent] = useState<Student>();
  const [restoreStudent, setRestoreStudent] = useState<Student>();

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword = normalizeText(searchText.trim());
    return students.filter((student) => {
      const matchesSearch = !keyword || normalizeText(`${student.fullName} ${student.mssv} ${student.email}`).includes(keyword);
      const matchesRank = rankFilter === 'all' || student.rank === rankFilter;
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      return matchesSearch && matchesRank && matchesStatus;
    });
  }, [rankFilter, searchText, statusFilter, students]);

  const handleRestore = (values: RestoreFormValues) => {
    if (!restoreStudent) return;
    // TODO: Kết nối API khi BE2 ready
    setStudents((current) =>
      current.map((student) => student.id === restoreStudent.id ? { ...student, score: Math.min(100, student.score + values.points) } : student)
    );
    setRestoreStudent(undefined);
    restoreForm.resetFields();
    message.success('Đã phục hồi điểm');
  };

  const handleLock = (student: Student) => {
    let days = 7;
    Modal.confirm({
      title: `Khoá tài khoản ${student.fullName}`,
      content: (
        <div>
          <p>Sinh viên sẽ không thể mượn đồ trong thời gian bị khoá.</p>
          <InputNumber min={1} defaultValue={7} addonAfter="ngày" onChange={(value) => { days = Number(value || 7); }} />
        </div>
      ),
      okText: 'Đồng ý',
      cancelText: 'Huỷ',
      okButtonProps: { danger: true },
      onOk: () => {
        // TODO: Kết nối API khi BE2 ready
        setStudents((current) => current.map((item) => item.id === student.id ? { ...item, status: 'locked' } : item));
        message.success(`Đã khoá tài khoản ${days} ngày`);
      }
    });
  };

  const studentMenu = (student: Student): MenuProps['items'] => [
    { key: 'lock', label: 'Khoá tài khoản', danger: true, onClick: () => handleLock(student) },
    { key: 'restore', label: 'Phục hồi điểm', onClick: () => setRestoreStudent(student) }
  ];

  const borrowHistory = [
    { id: '0138', device: 'Loa kéo JBL', date: '05/05 → 11/05', status: 'Đang mượn' },
    { id: '0131', device: 'Máy chiếu Epson', date: '22/04 → 25/04', status: 'Đã trả' },
    { id: '0119', device: 'Tripod Manfrotto', date: '01/04 → 04/04', status: 'Trễ hạn' }
  ];
  const scoreHistory = [
    { id: '1', time: '09/05 14:32', action: '🎉 Chuỗi tốt đạt mốc 5', points: '+7', balance: 85 },
    { id: '2', time: '25/04 16:10', action: '✓ Trả đúng hạn', points: '+2', balance: 78 },
    { id: '3', time: '04/04 09:00', action: '⚠ Trả trễ 2 ngày', points: '-6', balance: 76 }
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 500, margin: '0 0 8px', color: '#1A1F1B' }}>Quản lý sinh viên</h1>
          <p style={{ color: '#6B6F6C', margin: 0 }}>Theo dõi điểm uy tín và lịch sử vi phạm</p>
        </div>
        <Button>Xuất Excel</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}><StatCard title="TỔNG SINH VIÊN" value={124} meta="đã đăng ký" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="ĐANG MƯỢN" value={18} meta="có đơn hoạt động" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="QUÁ HẠN" value={3} meta="cần nhắc nhở" danger /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard title="HẠNG VÀNG TRỞ LÊN" value={45} meta="uy tín cao" /></Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <Input.Search allowClear placeholder="Tìm theo MSSV, tên, email..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 320, maxWidth: '100%' }} />
          <Select
            value={rankFilter}
            onChange={setRankFilter}
            style={{ width: 170 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'diamond', label: 'Kim cương' },
              { value: 'gold', label: 'Vàng' },
              { value: 'silver', label: 'Bạc' },
              { value: 'bronze', label: 'Đồng' },
              { value: 'stone', label: 'Đá cuội' }
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Hoạt động' },
              { value: 'locked', label: 'Bị khoá' },
              { value: 'warning', label: 'Có cảnh báo' }
            ]}
          />
        </div>

        <Table<Student>
          rowKey="id"
          loading={loading}
          dataSource={filteredStudents}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <Empty
                image={<div style={{ fontSize: 64 }}>🔍</div>}
                styles={{ image: { height: 84, marginBottom: 14 } }}
                description={
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Không tìm thấy sinh viên nào</h3>
                    <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                      Thử thay đổi từ khoá hoặc bộ lọc khác.
                    </p>
                  </div>
                }
                style={{ padding: '60px 0' }}
              >
                <Button
                  onClick={() => {
                    setSearchText('');
                    setRankFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Xoá bộ lọc
                </Button>
              </Empty>
            )
          }}
          columns={[
            {
              title: 'Sinh viên',
              render: (_, student) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar style={{ background: '#2D4A3E', color: '#F5EBD0' }}>{getInitials(student.fullName)}</Avatar>
                  <div><div style={{ fontWeight: 700 }}>{student.fullName}</div><div style={{ color: '#9A9D98', fontSize: 12 }}>{student.mssv}</div></div>
                </div>
              )
            },
            { title: 'Email', dataIndex: 'email' },
            { title: 'CLB / Lớp', render: (_, student) => `${student.club} · ${student.className}` },
            { title: 'Hạng', dataIndex: 'rank', render: (rank: StudentRank) => <RankTag rank={rank} /> },
            {
              title: 'Điểm',
              render: (_, student) => (
                <div style={{ minWidth: 100 }}>
                  <Typography.Text strong>{student.score}</Typography.Text>
                  <Progress percent={student.score} size="small" showInfo={false} strokeColor="#C99A3F" />
                </div>
              )
            },
            { title: 'Đang mượn', render: (_, student) => `${student.borrowing} đơn` },
            {
              title: 'Lịch sử',
              render: (_, student) => (
                <Tooltip title={`${student.totalBorrow} mượn / ${student.onTime} đúng hạn / ${student.late} trễ`}>
                  <Tag>{student.totalBorrow} lượt</Tag>
                </Tooltip>
              )
            },
            {
              title: 'Hành động',
              align: 'right',
              render: (_, student) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={() => setDetailStudent(student)}>Chi tiết</Button>
                  <Dropdown menu={{ items: studentMenu(student) }} trigger={['click']}>
                    <Button>...</Button>
                  </Dropdown>
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="Chi tiết sinh viên"
        open={Boolean(detailStudent)}
        width={860}
        onCancel={() => setDetailStudent(undefined)}
        footer={[
          <Button key="close" onClick={() => setDetailStudent(undefined)}>Đóng</Button>,
          <Button key="restore" type="primary" onClick={() => detailStudent && setRestoreStudent(detailStudent)}>Phục hồi điểm</Button>
        ]}
      >
        {detailStudent && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <Avatar size={72} style={{ background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>{getInitials(detailStudent.fullName)}</Avatar>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{detailStudent.fullName}</div>
                <div style={{ color: '#6B6F6C' }}>{detailStudent.mssv} · {detailStudent.email}</div>
              </div>
            </div>
            <Tabs
              items={[
                {
                  key: 'overview',
                  label: 'Tổng quan',
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={10}>
                        <Card style={{ background: '#2D4A3E', color: '#fff', borderRadius: 14 }}>
                          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>HẠNG HIỆN TẠI</div>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#F5EBD0', marginTop: 8 }}>★ {RANK_CONFIG[detailStudent.rank].label}</div>
                          <div style={{ fontFamily: 'Georgia, serif', fontSize: 48 }}>{detailStudent.score}</div>
                          <Progress percent={detailStudent.score} showInfo={false} strokeColor="#C99A3F" />
                        </Card>
                      </Col>
                      <Col xs={24} md={14}>
                        <Row gutter={[12, 12]}>
                          <Col span={8}><StatCard title="Tổng mượn" value={detailStudent.totalBorrow} meta="lượt" /></Col>
                          <Col span={8}><StatCard title="Đúng hạn" value={detailStudent.onTime} meta="lượt" /></Col>
                          <Col span={8}><StatCard title="Trễ" value={detailStudent.late} meta="lượt" danger={detailStudent.late > 0} /></Col>
                        </Row>
                        <Card style={{ marginTop: 12 }}>
                          <div>SĐT: {detailStudent.phone}</div>
                          <div>Lớp: {detailStudent.className}</div>
                          <div>CLB: {detailStudent.club}</div>
                          <div>Ngày tham gia: {detailStudent.joinedAt}</div>
                        </Card>
                      </Col>
                    </Row>
                  )
                },
                {
                  key: 'borrow',
                  label: 'Lịch sử mượn',
                  children: <Table rowKey="id" pagination={false} dataSource={borrowHistory} scroll={{ x: 'max-content' }} columns={[
                    { title: 'Đơn', dataIndex: 'id' },
                    { title: 'Thiết bị', dataIndex: 'device' },
                    { title: 'Ngày', dataIndex: 'date' },
                    { title: 'Trạng thái', dataIndex: 'status' }
                  ]} />
                },
                {
                  key: 'score',
                  label: 'Lịch sử điểm',
                  children: <Table rowKey="id" pagination={false} dataSource={scoreHistory} scroll={{ x: 'max-content' }} columns={[
                    { title: 'Thời gian', dataIndex: 'time' },
                    { title: 'Hành động', dataIndex: 'action' },
                    { title: '+/-', dataIndex: 'points' },
                    { title: 'Số dư', dataIndex: 'balance' }
                  ]} />
                }
              ]}
            />
          </>
        )}
      </Modal>

      <Modal
        title={`Phục hồi điểm uy tín${restoreStudent ? ` cho SV ${restoreStudent.fullName}` : ''}`}
        open={Boolean(restoreStudent)}
        okText="Phục hồi"
        cancelText="Huỷ"
        onOk={() => restoreForm.submit()}
        onCancel={() => setRestoreStudent(undefined)}
      >
        {restoreStudent && (
          <Form<RestoreFormValues> form={restoreForm} layout="vertical" onFinish={handleRestore}>
            <p>Điểm hiện tại: <strong>{restoreStudent.score}</strong> / 100</p>
            <Form.Item name="points" label="Số điểm muốn cộng" rules={[{ required: true, message: 'Nhập số điểm' }]}>
              <InputNumber min={1} max={100 - restoreStudent.score} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="reason" label="Lý do phục hồi" rules={[{ required: true, whitespace: true, message: 'Nhập lý do phục hồi' }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
