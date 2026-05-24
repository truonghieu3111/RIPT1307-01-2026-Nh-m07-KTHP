import { Button, Card, Table, message } from 'antd';
import PageTitle from '@/components/PageTitle';
import StatusTag from '@/components/StatusTag';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getBorrowRequests, markReturned } from '@/services/borrowRequests';
import { formatDate } from '@/utils/format';
import type { BorrowRequest } from '@/types';

export default function AdminReturnsPage() {
  const { data, loading, refresh } = useAsyncData(getBorrowRequests);
  const borrowedRequests = (data || []).filter((item) => item.status === 'borrowed' || item.status === 'overdue');

  const handleReturn = async (id: string) => {
    await markReturned(id);
    message.success('Đã ghi nhận trả thiết bị');
    refresh();
  };

  return (
    <>
      <PageTitle title="Ghi nhận trả thiết bị" description="Cập nhật yêu cầu đã trả và số lượng trong kho." />
      <Card>
        <Table<BorrowRequest>
          rowKey="id"
          loading={loading}
          dataSource={borrowedRequests}
          columns={[
            { title: 'Sinh viên', dataIndex: 'studentName' },
            { title: 'Thiết bị', dataIndex: 'deviceName' },
            { title: 'Ngày trả dự kiến', dataIndex: 'returnDate', render: formatDate },
            { title: 'Trạng thái', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
            {
              title: 'Thao tác',
              render: (_, record) => (
                <Button type="primary" size="small" onClick={() => handleReturn(record.id)}>
                  Đã trả
                </Button>
              )
            }
          ]}
        />
      </Card>
    </>
  );
}
