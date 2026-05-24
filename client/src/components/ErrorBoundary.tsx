import React from 'react';
import { Button, Card, Result } from 'antd';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid #E5DECB' }}>
          <Result
            status="error"
            title="Đã có lỗi xảy ra"
            subTitle="Vui lòng tải lại trang hoặc liên hệ admin nếu lỗi vẫn tiếp tục."
            extra={[
              <Button key="reload" type="primary" onClick={() => window.location.reload()}>
                Tải lại trang
              </Button>
            ]}
          />
        </Card>
      );
    }

    return this.props.children;
  }
}
