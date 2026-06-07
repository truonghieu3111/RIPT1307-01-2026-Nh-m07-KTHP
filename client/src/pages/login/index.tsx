import { Button, Checkbox, Col, Form, Input, message, Row, Typography } from 'antd';
import { history, Link } from 'umi';
import { ROUTES } from '@/constants/routes';
import { getMe, isDemoAuthUser, isDemoLoginEnabled, loginWithDemoFallback } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

interface LoginFormValues {
  email: string;
  password: string;
  role: UserRole;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error ? error.message : fallback;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const signIn = useAuthStore((state) => state.signIn);
  const showDemoHint = isDemoLoginEnabled();

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const user = await loginWithDemoFallback(values);
      signIn(user);
      if (isDemoAuthUser(user)) {
        history.push(user.role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDevices);
        return;
      }
      const latestUser = await getMe();
      const syncedUser = { ...latestUser, token: user.token };
      signIn(syncedUser);
      history.push(syncedUser.role === 'admin' ? ROUTES.adminDashboard : ROUTES.studentDevices);
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.'), 3);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F1E8',
        padding: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Row
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 56px)',
          background: '#FFFFFF',
          border: '1px solid #E5DECB',
          borderRadius: 30,
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(45, 74, 62, 0.08)'
        }}
      >
        <Col
          xs={0}
          md={12}
          style={{
            minHeight: 'calc(100vh - 56px)',
            background: '#183F31',
            color: '#FFFFFF',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              minHeight: 'calc(100vh - 56px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '72px 64px'
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <Typography.Title
                level={1}
                style={{
                  fontFamily: 'var(--app-heading-font)',
                  fontSize: 68,
                  lineHeight: 1.08,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  margin: '0 0 28px',
                  letterSpacing: 0
                }}
              >
                Mượn đồ{' '}
                <span style={{ color: '#D68465', fontStyle: 'italic' }}>thông minh</span>,
                <br />
                quản lý <span style={{ color: '#D68465', fontStyle: 'italic' }}>dễ dàng</span>.
              </Typography.Title>
              <Typography.Paragraph
                style={{ maxWidth: 430, color: 'rgba(255,255,255,0.62)', fontSize: 22, lineHeight: 1.55, margin: 0 }}
              >
                Hệ thống quản lý mượn - trả thiết bị dành cho câu lạc bộ, với cơ chế điểm uy tín giúp xây dựng văn hóa
                mượn trả lành mạnh.
              </Typography.Paragraph>
            </div>
          </div>
        </Col>

        <Col
          xs={24}
          md={12}
          style={{
            minHeight: 'calc(100vh - 56px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            padding: '42px 24px'
          }}
        >
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ marginBottom: 48 }}>
              <Typography.Title
                level={1}
                style={{
                  fontFamily: 'var(--app-heading-font)',
                  fontSize: 48,
                  lineHeight: 1.1,
                  fontWeight: 600,
                  color: '#1A1F1B',
                  margin: '0 0 18px',
                  letterSpacing: 0
                }}
              >
                Chào mừng trở lại
              </Typography.Title>
              <Typography.Text style={{ color: '#7B7F7A', fontSize: 22 }}>
                Đăng nhập bằng tài khoản sinh viên hoặc quản trị viên.
              </Typography.Text>
            </div>

            <Form<LoginFormValues>
              form={form}
              layout="vertical"
              initialValues={{ role: 'student' }}
              onFinish={handleSubmit}
              requiredMark={false}
            >
              <Form.Item name="role" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ fontSize: 18, fontWeight: 700, color: '#1A1F1B' }}>Mã sinh viên / Email</span>}
                rules={[{ required: true, whitespace: true, message: 'Nhập mã sinh viên hoặc email' }]}
                style={{ marginBottom: 28 }}
              >
                <Input
                  size="large"
                  placeholder="Nhập mã sinh viên hoặc email"
                  style={{ height: 58, borderRadius: 12, borderColor: '#E5DECB', fontSize: 20, paddingInline: 20 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontSize: 18, fontWeight: 700, color: '#1A1F1B' }}>Mật khẩu</span>}
                rules={[{ required: true }]}
                style={{ marginBottom: 26 }}
              >
                <Input.Password
                  size="large"
                  placeholder="Nhập mật khẩu"
                  style={{ height: 58, borderRadius: 12, borderColor: '#E5DECB', fontSize: 20, paddingInline: 20 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 34 }}>
                <Checkbox defaultChecked style={{ fontSize: 18, color: '#7B7F7A' }}>
                  Ghi nhớ đăng nhập
                </Checkbox>
                <Link to="/forgot-password" style={{ color: '#2D4A3E', fontSize: 18, fontWeight: 700 }}>
                  Quên mật khẩu?
                </Link>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{ height: 64, background: '#2D4A3E', borderColor: '#2D4A3E', borderRadius: 12, fontSize: 18, fontWeight: 700 }}
              >
                Đăng nhập
              </Button>
            </Form>

            <Typography.Text style={{ display: 'block', textAlign: 'center', color: '#8A8E88', fontSize: 18, marginTop: 34 }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ color: '#2D4A3E', fontWeight: 700, cursor: 'pointer' }}>
                Đăng ký ngay
              </Link>
            </Typography.Text>
            {showDemoHint ? (
              <Typography.Paragraph style={{ textAlign: 'center', color: '#8A8E88', fontSize: 13, margin: '18px auto 0', maxWidth: 500, lineHeight: 1.55 }}>
                Bản demo frontend: Admin dùng admin@school.edu.vn / password. Sinh viên dùng phanhaiduc1262006@gmail.com / 120606 hoặc pdd150999@gmail.com / 654321.
              </Typography.Paragraph>
            ) : null}
          </div>
        </Col>
      </Row>
    </div>
  );
}
