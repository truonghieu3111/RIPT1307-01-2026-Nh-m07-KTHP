import { useMemo, useState } from 'react';
import { Button, Col, Form, Input, InputNumber, message, Modal, Row, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useAsyncData } from '@/hooks/useAsyncData';
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/services/categories';
import type { Category, CategoryPayload } from '@/services/categories';
import { getDevices } from '@/services/equipment';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminTableCard from '@/components/admin/AdminTableCard';

interface CategoryFormValues {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

function normalizeText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function getCategorySymbol(category: Category) {
  const rawIcon = category.icon?.trim();
  if (rawIcon && rawIcon.length <= 2) return rawIcon;

  const text = normalizeText(`${rawIcon ?? ''} ${category.name}`);
  if (text.includes('am thanh') || text.includes('audio') || text.includes('loa') || text.includes('micro')) return '🎧';
  if (text.includes('hinh anh') || text.includes('camera') || text.includes('may anh')) return '📷';
  if (text.includes('trinh chieu') || text.includes('may chieu')) return '📽️';
  if (text.includes('the thao') || text.includes('sport')) return '🏅';
  if (text.includes('in an') || text.includes('print')) return '🖨️';
  if (text.includes('mang') || text.includes('network')) return '🌐';
  if (text.includes('dung cu') || text.includes('tool')) return '🧰';
  return category.name.charAt(0).toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  return fallback;
}

export default function AdminCategoriesPage() {
  const [form] = Form.useForm<CategoryFormValues>();
  const { data: categories = [], loading, refresh } = useAsyncData(getCategories);
  const { data: devices = [], loading: devicesLoading } = useAsyncData(() => getDevices({ limit: 1000, includeInactive: true }), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category>();
  const [saving, setSaving] = useState(false);

  const categoryUsage = useMemo(() => {
    const usage = new Map<string, number>();

    devices.forEach((device) => {
      const categoryId = device.categoryId ? String(device.categoryId) : undefined;
      const categoryName = normalizeText(device.category);
      const matchedCategory = categories.find((category) => String(category.id) === categoryId || normalizeText(category.name) === categoryName);
      if (!matchedCategory) return;
      usage.set(matchedCategory.id, (usage.get(matchedCategory.id) ?? 0) + 1);
    });

    return usage;
  }, [categories, devices]);

  const usedCategoryCount = categories.filter((category) => (categoryUsage.get(category.id) ?? 0) > 0).length;

  const openCreateModal = () => {
    setEditingCategory(undefined);
    form.resetFields();
    form.setFieldsValue({ sortOrder: categories.length + 1 });
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder
    });
    setModalOpen(true);
  };

  const handleSave = async (values: CategoryFormValues) => {
    const payload: CategoryPayload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      icon: values.icon?.trim() || undefined,
      sortOrder: values.sortOrder ?? 0
    };

    setSaving(true);
    try {
      const response = editingCategory
        ? await updateCategory(editingCategory.id, payload)
        : await createCategory(payload);

      message.success(response.message || (editingCategory ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục'), 2);
      setModalOpen(false);
      form.resetFields();
      await refresh();
    } catch (error) {
      message.error(getErrorMessage(error, editingCategory ? 'Không thể cập nhật danh mục' : 'Không thể thêm danh mục'), 3);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    Modal.confirm({
      title: 'Xoá danh mục thiết bị',
      content: 'Không thể xoá nếu danh mục đang được thiết bị sử dụng.',
      okText: 'Xoá danh mục',
      cancelText: 'Huỷ',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await deleteCategory(category.id);
          message.success(response.message || 'Đã xoá danh mục', 2);
          await refresh();
        } catch (error) {
          message.error(getErrorMessage(error, 'Không thể xoá danh mục. Danh mục có thể đang được thiết bị sử dụng.'), 4);
        }
      }
    });
  };

  return (
    <div style={{ paddingBottom: 48 }}>
      <AdminPageHeader
        title="Danh mục thiết bị"
        description="Quản lý nhóm thiết bị dùng trong kho."
        actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
          Thêm danh mục
        </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Tổng danh mục" value={categories.length} meta="loại thiết bị" icon={<AppstoreOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Có mô tả" value={categories.filter((item) => item.description?.trim()).length} meta="danh mục đã bổ sung thông tin" icon={<CheckCircleOutlined />} accent="#2F6F3E" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminStatCard title="Đang sử dụng" value={usedCategoryCount} meta="danh mục có thiết bị" icon={<AppstoreOutlined />} accent="#355D8E" />
        </Col>
      </Row>

      <AdminTableCard>
        <Table<Category>
          rowKey="id"
          loading={loading || devicesLoading}
          dataSource={categories}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 820 }}
          locale={{
            emptyText: (
              <AdminEmptyState
                title="Chưa có danh mục thiết bị"
                description="Thêm danh mục đầu tiên để phân loại thiết bị trong kho."
                icon="📁"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: '#2D4A3E', borderColor: '#2D4A3E' }}>
                  Thêm danh mục
                </Button>
              </AdminEmptyState>
            )
          }}
          columns={[
            {
              title: 'Tên danh mục',
              width: 260,
              render: (_, category) => (
                <Space size={12}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#F8F4EA', color: '#2D4A3E', fontWeight: 800, fontSize: 18 }}>
                    {getCategorySymbol(category)}
                  </span>
                  <div>
                    <Typography.Text strong style={{ color: '#1A1F1B' }}>{category.name}</Typography.Text>
                    <div style={{ color: '#8A8E88', fontSize: 12 }}>
                      {(categoryUsage.get(category.id) ?? 0).toLocaleString('vi-VN')} thiết bị
                    </div>
                  </div>
                </Space>
              )
            },
            {
              title: 'Mô tả',
              dataIndex: 'description',
              render: (value?: string) => value?.trim() || <span style={{ color: '#9A9D98' }}>Chưa có mô tả</span>
            },
            {
              title: 'Thứ tự',
              dataIndex: 'sortOrder',
              width: 110,
              align: 'center',
              render: (value?: number) => <Tag style={{ margin: 0 }}>{value ?? 0}</Tag>
            },
            {
              title: 'Thao tác',
              align: 'right',
              width: 130,
              render: (_, category) => (
                <Space>
                  <Tooltip title="Sửa danh mục">
                    <Button icon={<EditOutlined />} onClick={() => openEditModal(category)} />
                  </Tooltip>
                  <Tooltip title="Xoá danh mục">
                    <Button icon={<DeleteOutlined />} onClick={() => handleDelete(category)} />
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </AdminTableCard>

      <Modal
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okText={editingCategory ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
        confirmLoading={saving}
        onOk={() => form.submit()}
      >
        <Form<CategoryFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, whitespace: true, message: 'Nhập tên danh mục' }]}>
            <Input placeholder="VD: Âm thanh" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về danh mục" />
          </Form.Item>
          <Form.Item name="icon" label="Ký hiệu">
            <Input placeholder="VD: audio, camera..." />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
