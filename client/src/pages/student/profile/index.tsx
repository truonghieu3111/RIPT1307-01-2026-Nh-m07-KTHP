import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Col, Form, Input, Modal, Progress, Row, Skeleton, Table, Tag, Typography, message } from 'antd';

interface TrustHistoryRow {
  id: string;
  time: string;
  action: string;
  requestCode: string;
  points: number;
  balance: number;
  type: 'good' | 'bad' | 'neutral';
}

const profile = {
  initials: 'NA',
  name: 'Nguyễn Văn A',
  studentCode: '22000123',
  className: 'CNTT K22',
  email: 'nva@uet.edu.vn',
  phone: '0987 654 321',
  club: 'Truyền thông',
  joinedAt: '09/2024',
  trustRank: '★ Hạng Vàng',
  trustScore: 85,
  nextRank: 'Kim cương'
};

const trustHistory: TrustHistoryRow[] = [
  {
    id: '1',
    time: '09/05 14:32',
    action: '🎉 Chuỗi tốt đạt mốc 5',
    requestCode: '—',
    points: 7,
    balance: 85,
    type: 'good'
  },
  {
    id: '2',
    time: '25/04 16:10',
    action: '✓ Trả đúng hạn, đồ hoàn hảo',
    requestCode: '#0131',
    points: 2,
    balance: 78,
    type: 'good'
  },
  {
    id: '3',
    time: '04/04 09:00',
    action: '⚠ Trả trễ 2 ngày',
    requestCode: '#0119',
    points: -6,
    balance: 76,
    type: 'bad'
  },
  {
    id: '4',
    time: '28/03 11:20',
    action: '✓ Trả đúng hạn, đồ hoàn hảo',
    requestCode: '#0115',
    points: 2,
    balance: 82,
    type: 'good'
  },
  {
    id: '5',
    time: '15/02 —',
    action: '🛡 Khởi tạo tài khoản',
    requestCode: '—',
    points: 100,
    balance: 100,
    type: 'neutral'
  }
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: '#6B6F6C' }}>{label}</span>
      <span style={{ color: '#1A1F1B', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SmallStatCard({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 14, border: '1px solid #E5DECB', boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)' }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ fontSize: 11, color: '#6B6F6C', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, lineHeight: 1, color: '#1A1F1B', marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ color: '#6B6F6C', fontSize: 12 }}>{meta}</div>
    </Card>
  );
}

export default function StudentProfilePage() {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSaveProfile = () => {
    setEditOpen(false);
    message.success('Đã lưu nháp hồ sơ');
  };

  if (loading) {
    return (
      <div style={{ paddingBottom: 48 }}>
        <div style={{ marginBottom: 28 }}>
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
            Hồ sơ cá nhân
          </h1>
          <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
            Quản lý thông tin tài khoản và theo dõi điểm uy tín
          </p>
        </div>

        <Row gutter={[24, 24]} align="top">
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 18, background: '#2D4A3E' }} styles={{ body: { padding: 26 } }}>
              <Skeleton.Input active size="small" style={{ width: 120, marginBottom: 18 }} />
              <Skeleton.Input active style={{ width: 180, height: 36, marginBottom: 26 }} />
              <Skeleton.Input active style={{ width: 132, height: 70, marginBottom: 18 }} />
              <Skeleton.Input active block style={{ height: 12 }} />
            </Card>

            <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB', marginTop: 16 }} styles={{ body: { padding: 22 } }}>
              <Skeleton active avatar={{ size: 64 }} paragraph={{ rows: 4 }} title={{ width: '55%' }} />
              <Skeleton.Button active block style={{ height: 40, marginTop: 18 }} />
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {Array.from({ length: 3 }, (_, index) => (
                <Col xs={24} lg={8} key={index}>
                  <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }} styles={{ body: { padding: 20 } }}>
                    <Skeleton.Input active size="small" style={{ width: 120, marginBottom: 12 }} />
                    <Skeleton.Input active style={{ width: 72, height: 38, marginBottom: 12 }} />
                    <Skeleton.Input active size="small" block />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card
              variant="borderless"
              style={{ borderRadius: 14, border: '1px solid #E5DECB' }}
              title={<Skeleton.Input active style={{ width: 180 }} />}
              extra={<Skeleton.Button active />}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} active paragraph={{ rows: 1 }} title={{ width: '70%' }} style={{ marginBottom: 18 }} />
              ))}
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 28 }}>
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
          Hồ sơ cá nhân
        </h1>
        <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
          Quản lý thông tin tài khoản và theo dõi điểm uy tín
        </p>
      </div>

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} md={8}>
          <Card
            variant="borderless"
            style={{ borderRadius: 18, background: '#2D4A3E', color: '#FFFFFF', overflow: 'hidden' }}
            styles={{ body: { padding: 26 } }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.58)' }}>
              HẠNG HIỆN TẠI
            </div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, color: '#F5EBD0', marginTop: 10 }}>
              {profile.trustRank}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 22 }}>
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: 64, lineHeight: 1 }}>{profile.trustScore}</strong>
              <span style={{ color: 'rgba(255,255,255,0.68)' }}>/100 điểm uy tín</span>
            </div>
            <Progress percent={profile.trustScore} showInfo={false} strokeColor="#C99A3F" trailColor="rgba(255,255,255,0.18)" />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
              <span>Cần thêm 5đ để lên {profile.nextRank}</span>
              <span>90+</span>
            </div>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB', marginTop: 16 }} styles={{ body: { padding: 22 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <Avatar size={64} style={{ background: '#2D4A3E', color: '#F5EBD0', fontWeight: 700 }}>
                {profile.initials}
              </Avatar>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1F1B' }}>{profile.name}</div>
                <div style={{ color: '#6B6F6C', fontSize: 12, marginTop: 3 }}>
                  {profile.studentCode} · {profile.className}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 11 }}>
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="SĐT" value={profile.phone} />
              <InfoRow label="CLB" value={profile.club} />
              <InfoRow label="Tham gia từ" value={profile.joinedAt} />
            </div>
            <Button block style={{ marginTop: 18, height: 40 }} onClick={() => setEditOpen(true)}>
              Chỉnh sửa hồ sơ
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={8}>
              <SmallStatCard title="Tổng lượt mượn" value="14" meta="12 thành công · 1 từ chối · 1 quá hạn" />
            </Col>
            <Col xs={24} lg={8}>
              <SmallStatCard title="Tỷ lệ đúng hạn" value="92%" meta="Trên trung bình CLB (78%)" />
            </Col>
            <Col xs={24} lg={8}>
              <SmallStatCard title="Chuỗi tốt" value="5" meta="🔥 đang giữ chuỗi" />
            </Col>
          </Row>

          <Card
            variant="borderless"
            style={{ borderRadius: 14, border: '1px solid #E5DECB' }}
            title={<span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 500 }}>Lịch sử điểm uy tín</span>}
            extra={<Button>Xem tất cả</Button>}
          >
            <Table<TrustHistoryRow>
              rowKey="id"
              pagination={false}
              dataSource={trustHistory}
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Thời gian',
                  dataIndex: 'time',
                  render: (time: string) => <Typography.Text style={{ color: '#6B6F6C', fontSize: 12 }}>{time}</Typography.Text>
                },
                {
                  title: 'Hành động',
                  dataIndex: 'action',
                  render: (action: string, row) => (
                    <Typography.Text style={{ color: row.type === 'bad' ? '#B05A4D' : '#1A1F1B' }}>{action}</Typography.Text>
                  )
                },
                {
                  title: 'Đơn liên quan',
                  dataIndex: 'requestCode',
                  render: (code: string) => (
                    <Tag style={{ borderRadius: 999, margin: 0, color: '#6B6F6C', borderColor: '#E5DECB' }}>{code}</Tag>
                  )
                },
                {
                  title: 'Điểm',
                  dataIndex: 'points',
                  align: 'right',
                  render: (points: number, row) => (
                    <Typography.Text strong style={{ color: row.type === 'bad' ? '#B05A4D' : row.type === 'good' ? '#4F8B5F' : '#6B6F6C' }}>
                      {points > 0 ? `+${points}` : points}
                    </Typography.Text>
                  )
                },
                {
                  title: 'Số dư',
                  dataIndex: 'balance',
                  align: 'right',
                  render: (balance: number) => <Typography.Text strong>{balance}</Typography.Text>
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Chỉnh sửa hồ sơ"
        open={editOpen}
        okText="Lưu nháp"
        cancelText="Huỷ"
        onOk={handleSaveProfile}
        onCancel={() => setEditOpen(false)}
      >
        <Form layout="vertical" initialValues={{ phone: profile.phone, class_name: profile.className, avatar_url: '' }}>
          <Form.Item label="Email">
            <Input value={profile.email} disabled />
          </Form.Item>
          <Form.Item label="Mã sinh viên">
            <Input value={profile.studentCode} disabled />
          </Form.Item>
          <Form.Item label="Điểm uy tín">
            <Input value={`${profile.trustScore}/100`} disabled />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input />
          </Form.Item>
          <Form.Item name="class_name" label="Lớp">
            <Input />
          </Form.Item>
          <Form.Item name="avatar_url" label="Avatar URL">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
