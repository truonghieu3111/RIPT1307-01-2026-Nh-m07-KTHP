import { useMemo, useState } from 'react';
import { Avatar, Badge, Button, Empty, List, Space, Tabs, Tag, Typography } from 'antd';
type NotificationCategory = 'request' | 'trust' | 'system';
type NotificationType = 'approved' | 'reminder' | 'streak' | 'returned' | 'rejected' | 'system';
type NotificationTab = 'all' | 'unread' | NotificationCategory;
interface NotificationItem {
  id: string;
  type: NotificationType;
  icon: string;
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  category: NotificationCategory;
}
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'approved',
    icon: '✓',
    title: 'Yêu cầu #REQ-2026-0140 đã được duyệt',
    content:
      'Đơn mượn Micro Shure SM58 x 2 đã được Admin duyệt. Vui lòng đến phòng CLB nhận thiết bị trước 11/05/2026 (còn 1 ngày).',
    time: '2 giờ trước',
    isRead: false,
    category: 'request'
  },
  {
    id: '2',
    type: 'reminder',
    icon: '⏰',
    title: 'Sắp đến hạn trả thiết bị',
    content:
      'Đơn mượn Loa kéo JBL x 1 (đơn #0138) sẽ đến hạn trả vào 11/05/2026 (còn 1 ngày). Vui lòng mang đồ đến CLB đúng hẹn.',
    time: '5 giờ trước',
    isRead: false,
    category: 'request'
  },
  {
    id: '3',
    type: 'streak',
    icon: '🎉',
    title: 'Bạn đã đạt chuỗi mượn trả tốt 5 lần',
    content:
      'Cảm ơn ý thức tốt của bạn! Bạn được cộng +7 điểm uy tín. Tiếp tục giữ chuỗi để nhận thêm phần thưởng.',
    time: '1 ngày trước',
    isRead: false,
    category: 'trust'
  },
  {
    id: '4',
    type: 'returned',
    icon: '✓',
    title: 'Đã ghi nhận trả thiết bị',
    content: 'Đơn #0131 (Máy chiếu Epson) đã được trả đúng hạn. Bạn được cộng +2 điểm uy tín.',
    time: '3 ngày trước',
    isRead: true,
    category: 'trust'
  },
  {
    id: '5',
    type: 'rejected',
    icon: '✗',
    title: 'Yêu cầu #REQ-2026-0125 đã bị từ chối',
    content:
      'Lý do: Thiết bị Sony A7 III đã được CLB lên lịch sử dụng cho sự kiện cùng thời điểm. Bạn có thể đặt lại với thời gian khác.',
    time: '5 ngày trước',
    isRead: true,
    category: 'request'
  },
  {
    id: '6',
    type: 'system',
    icon: '📢',
    title: 'Cập nhật quy định mượn trả',
    content:
      'CLB đã cập nhật quy định: thời gian giữ chỗ sau khi duyệt được rút xuống còn 48h. Vui lòng đến nhận thiết bị đúng hẹn.',
    time: '1 tuần trước',
    isRead: true,
    category: 'system'
  }
];
const TYPE_STYLE: Record<NotificationType, { color: string; bg: string }> = {
  approved: { color: '#2F6F3E', bg: '#E1EFE3' },
  reminder: { color: '#8B6A1F', bg: '#F5EBD0' },
  streak: { color: '#2563EB', bg: '#DCE4F0' },
  returned: { color: '#2F6F3E', bg: '#E1EFE3' },
  rejected: { color: '#9B3E33', bg: '#F2DDD7' },
  system: { color: '#2563EB', bg: '#DCE4F0' }
};
const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  request: 'Đơn mượn',
  trust: 'Điểm uy tín',
  system: 'Hệ thống'
};
function getFilteredNotifications(notifications: NotificationItem[], activeTab: NotificationTab) {
  if (activeTab === 'unread') return notifications.filter((item) => !item.isRead);
  if (activeTab === 'request' || activeTab === 'trust' || activeTab === 'system') {
    return notifications.filter((item) => item.category === activeTab);
  }
  return notifications;
}
function HighlightContent({ item }: { item: NotificationItem }) {
  if (item.id === '1') {
    return (
      <>
        Đơn mượn Micro Shure SM58 x 2 đã được Admin duyệt. Vui lòng đến phòng CLB nhận thiết bị trước{' '}
        <Typography.Text strong>11/05/2026 (còn 1 ngày)</Typography.Text>.
      </>
    );
  }
  if (item.id === '2') {
    return (
      <>
        Đơn mượn Loa kéo JBL x 1 (đơn #0138) sẽ đến hạn trả vào{' '}
        <Typography.Text strong>11/05/2026</Typography.Text> (còn 1 ngày). Vui lòng mang đồ đến CLB đúng hẹn.
      </>
    );
  }
  if (item.id === '3') {
    return (
      <>
        Cảm ơn ý thức tốt của bạn! Bạn được cộng <Typography.Text strong>+7 điểm uy tín</Typography.Text>. Tiếp tục
        giữ chuỗi để nhận thêm phần thưởng.
      </>
    );
  }
  if (item.id === '4') {
    return (
      <>
        Đơn #0131 (Máy chiếu Epson) đã được trả đúng hạn. Bạn được cộng{' '}
        <Typography.Text strong>+2 điểm uy tín</Typography.Text>.
      </>
    );
  }
  return <>{item.content}</>;
}
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [notifications, setNotifications] = useState(mockNotifications);
  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      request: notifications.filter((item) => item.category === 'request').length,
      trust: notifications.filter((item) => item.category === 'trust').length,
      system: notifications.filter((item) => item.category === 'system').length
    }),
    [notifications]
  );
  const filteredNotifications = useMemo(
    () => getFilteredNotifications(notifications, activeTab),
    [activeTab, notifications]
  );
  const markAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };
  const markAllAsRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };
  const tabItems = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'unread', label: `Chưa đọc (${counts.unread})` },
    { key: 'request', label: `Đơn mượn (${counts.request})` },
    { key: 'trust', label: `Điểm uy tín (${counts.trust})` },
    { key: 'system', label: `Hệ thống (${counts.system})` }
  ];
  return (
    <div style={{ paddingBottom: 48 }}>
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
        <div>
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
            Thông báo của tôi
          </h1>
          <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
            Cập nhật về các đơn mượn và điểm uy tín
          </p>
        </div>
        <Button disabled={counts.unread === 0} onClick={markAllAsRead}>
          Đánh dấu đã đọc tất cả
        </Button>
      </div>
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => setActiveTab(key as NotificationTab)}
        style={{ marginBottom: 18 }}
      />
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5DECB',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(45, 74, 62, 0.04)'
        }}
      >
        {filteredNotifications.length === 0 ? (
          <Empty
            image={<div style={{ fontSize: notifications.length === 0 ? 80 : 64 }}>{notifications.length === 0 ? '🔔' : activeTab === 'unread' ? '✅' : '📭'}</div>}
            styles={{ image: { height: 96, marginBottom: 16 } }}
            description={
              <div>
                <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                  {notifications.length === 0
                    ? 'Chưa có thông báo nào'
                    : activeTab === 'unread'
                      ? 'Bạn đã đọc hết thông báo'
                      : 'Không có thông báo trong mục này'}
                </h3>
                <p style={{ color: '#6B6F6C', fontSize: 14, margin: 0 }}>
                  {notifications.length === 0
                    ? 'Khi có cập nhật về đơn mượn hoặc điểm uy tín, bạn sẽ thấy ở đây.'
                    : activeTab === 'unread'
                      ? 'Tuyệt vời! Không còn thông báo chưa đọc nào.'
                      : 'Chuyển sang tab khác để xem các thông báo phù hợp.'}
                </p>
              </div>
            }
            style={{ padding: '72px 0' }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            split={false}
            renderItem={(item) => {
              const typeStyle = TYPE_STYLE[item.type];
              return (
                <List.Item
                  onClick={() => markAsRead(item.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '18px 20px',
                    background: item.isRead ? '#FFFFFF' : '#FBF8F2',
                    borderBottom: '1px solid #EFEADA',
                    alignItems: 'flex-start'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={48}
                        style={{
                          background: typeStyle.bg,
                          color: typeStyle.color,
                          fontWeight: 700,
                          fontSize: 22
                        }}
                      >
                        {item.icon}
                      </Avatar>
                    }
                    title={
                      <Space size={8} wrap>
                        <Typography.Text strong={!item.isRead} style={{ color: '#1A1F1B' }}>
                          {item.title}
                        </Typography.Text>
                        <Tag style={{ margin: 0, borderRadius: 999, borderColor: '#E5DECB', color: '#6B6F6C' }}>
                          {CATEGORY_LABEL[item.category]}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Typography.Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ color: '#6B6F6C', fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}
                        >
                          <HighlightContent item={item} />
                        </Typography.Paragraph>
                        <Typography.Text style={{ color: '#9A9D98', fontSize: 12 }}>{item.time}</Typography.Text>
                      </div>
                    }
                  />
                  {!item.isRead && <Badge color="#B05A4D" style={{ marginTop: 8 }} />}
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
