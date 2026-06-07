import { useState } from 'react';
import { Button, Checkbox, Col, Form, Input, message, Row, Typography } from 'antd';
import { history, Link } from 'umi';
import { register } from '@/services/auth';

interface RegisterFormValues {
  fullName: string;
  studentCode: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error ? error.message : fallback;
}

export default function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFailed = () => {
    message.error('Vui lòng kiểm tra lại thông tin', 3);
  };

  const handleSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);

    try {
      const response = await register({
        fullName: values.fullName,
        studentCode: values.studentCode,
        email: values.email,
        phone: values.phone,
        password: values.password
      });

      message.success(response.message || 'Đăng ký thành công! Vui lòng đăng nhập.', 2);
      history.push('/login');
    } catch (error) {
      message.error(getErrorMessage(error, 'Đăng ký thất bại. Vui lòng thử lại.'), 3);
    } finally {
      setSubmitting(false);
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
            padding: '36px 24px'
          }}
        >
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ marginBottom: 30 }}>
              <Typography.Title
                level={1}
                style={{
                  fontFamily: 'var(--app-heading-font)',
                  fontSize: 44,
                  lineHeight: 1.1,
                  fontWeight: 600,
                  color: '#1A1F1B',
                  margin: '0 0 14px',
                  letterSpacing: 0
                }}
              >
                Tạo tài khoản mới
              </Typography.Title>
              <Typography.Text style={{ color: '#7B7F7A', fontSize: 18 }}>
                Đăng ký tài khoản sinh viên CLB để bắt đầu mượn thiết bị
              </Typography.Text>
            </div>

            <Form<RegisterFormValues>
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{ agreed: false }}
              onFinish={handleSubmit}
              onFinishFailed={handleSubmitFailed}
              scrollToFirstError
            >
              <Form.Item
                name="fullName"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Họ và tên</span>}
                rules={[{ required: true, whitespace: true, message: 'Nhập họ và tên' }]}
                style={{ marginBottom: 14 }}
              >
                <Input placeholder="Nhập họ và tên" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="studentCode"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Mã sinh viên</span>}
                rules={[
                  { required: true, whitespace: true, message: 'Nhập mã sinh viên' },
                  { pattern: /^[A-Za-z0-9]+$/, message: 'Mã sinh viên chỉ chứa chữ và số' }
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input placeholder="22000123" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Email</span>}
                rules={[
                  { required: true, message: 'Nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' }
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input placeholder="student@university.edu.vn" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="phone"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Số điện thoại</span>}
                rules={[{ pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' }]}
                style={{ marginBottom: 14 }}
              >
                <Input placeholder="0987654321" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Mật khẩu</span>}
                rules={[
                  { required: true, message: 'Nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password placeholder="Tối thiểu 6 ký tự" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F1B' }}>Xác nhận mật khẩu</span>}
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Nhập lại mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value: string) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    }
                  })
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input.Password placeholder="Nhập lại mật khẩu" style={{ height: 48, borderRadius: 12, borderColor: '#E5DECB', fontSize: 16 }} />
              </Form.Item>

              <Form.Item
                name="agreed"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value: boolean) =>
                      value ? Promise.resolve() : Promise.reject(new Error('Bạn cần đồng ý với điều khoản để tiếp tục'))
                  }
                ]}
                style={{ marginBottom: 20 }}
              >
                <Checkbox style={{ fontSize: 15, color: '#6B6F6C' }}>
                  Tôi đồng ý với điều khoản sử dụng của CLB
                </Checkbox>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                disabled={submitting}
                loading={submitting}
                style={{ height: 56, background: '#2D4A3E', borderColor: '#2D4A3E', borderRadius: 12, fontSize: 17, fontWeight: 700 }}
              >
                Đăng ký
              </Button>
            </Form>

            <Typography.Text style={{ display: 'block', textAlign: 'center', color: '#8A8E88', fontSize: 16, marginTop: 24 }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: '#2D4A3E', fontWeight: 700, cursor: 'pointer' }}>
                Đăng nhập
              </Link>
            </Typography.Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}
