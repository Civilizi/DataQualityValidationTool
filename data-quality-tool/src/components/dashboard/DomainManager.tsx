'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  Space,
  Tag,
  Popconfirm,
  message,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDomainStore, type DomainInfo } from '@/lib/stores/domainStore';

const { Text } = Typography;

interface DomainManagerProps {
  open: boolean;
  onClose: () => void;
}

interface CreateFormValues {
  name: string;
  description?: string;
}

interface EditFormValues {
  name: string;
  description?: string;
}

export function DomainManager({ open, onClose }: DomainManagerProps) {
  const { domains, currentDomain, loadDomains, setCurrentDomain, createDomain, updateDomain, deleteDomain } =
    useDomainStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainInfo | null>(null);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  useEffect(() => {
    if (open) {
      loadDomains();
    }
  }, [open, loadDomains]);

  const columns: ColumnsType<DomainInfo> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DomainInfo) => (
        <Space>
          {record.id === currentDomain?.id && (
            <CheckCircleOutlined className="text-green-500" />
          )}
          <Text strong>{text}</Text>
          {record.id === currentDomain?.id && (
            <Tag color="green" className="ml-1">当前</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string | null) => text || <Text type="secondary">—</Text>,
    },
    {
      title: '标准数',
      dataIndex: 'standardCount',
      key: 'standardCount',
      width: 90,
      align: 'center',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: '素材数',
      dataIndex: 'assetCount',
      key: 'assetCount',
      width: 90,
      align: 'center',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: '任务数',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 90,
      align: 'center',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: DomainInfo) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentDomain(record);
              message.success(`已切换到 ${record.name}`);
            }}
            disabled={record.id === currentDomain?.id}
          >
            选择
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setEditingDomain(record);
              editForm.setFieldsValue({
                name: record.name,
                description: record.description ?? undefined,
              });
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除业务域「${record.name}」吗？此操作不可撤销。`}
            onConfirm={async (e) => {
              e?.stopPropagation();
              await deleteDomain(record.id);
              message.success('已删除');
            }}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="业务域管理"
        open={open}
        onCancel={onClose}
        footer={
          <div className="flex justify-between">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              新增业务域
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </div>
        }
        width={800}
      >
        {domains.length === 0 ? (
          <div className="text-center py-8">
            <Text type="secondary">暂无业务域，请点击下方"新增业务域"创建</Text>
          </div>
        ) : (
          <Table<DomainInfo>
            columns={columns}
            dataSource={domains}
            rowKey="id"
            rowClassName={(record) =>
              record.id === currentDomain?.id ? 'bg-blue-50' : ''
            }
            pagination={false}
            size="middle"
            onRow={(record) => ({
              onClick: () => {
                setCurrentDomain(record);
              },
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        title="新增业务域"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();
            const created = await createDomain(values.name, values.description);
            if (created) {
              message.success('业务域创建成功');
              setCreateModalOpen(false);
              createForm.resetFields();
            } else {
              message.error('业务域创建失败，请检查名称是否重复');
            }
          } catch {
            // validation error
          }
        }}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="业务域名称"
            rules={[{ required: true, message: '请输入业务域名称' }]}
          >
            <Input placeholder="例如：人力资源、财务、销售" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选，简要描述该业务域的用途" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑业务域"
        open={!!editingDomain}
        onCancel={() => {
          setEditingDomain(null);
          editForm.resetFields();
        }}
        onOk={async () => {
          if (!editingDomain) return;
          try {
            const values = await editForm.validateFields();
            const updated = await updateDomain(editingDomain.id, values);
            if (updated) {
              message.success('业务域更新成功');
              setEditingDomain(null);
              editForm.resetFields();
            } else {
              message.error('更新失败');
            }
          } catch {
            // validation error
          }
        }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="业务域名称"
            rules={[{ required: true, message: '请输入业务域名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
