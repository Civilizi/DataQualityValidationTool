'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, Tag, Space, message, Typography, Modal, Form,
  Select, Input, Progress, Statistic, Row, Col, Popconfirm, Empty,
} from 'antd';
import {
  PlayCircleOutlined, PlusOutlined, DeleteOutlined, EyeOutlined,
  CheckCircleOutlined, SyncOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface TaskRow {
  id: string;
  name: string;
  standard_id: string | null;
  standard_version: number | null;
  status: string;
  progress: number;
  current_phase: string | null;
  asset_ids: string | null;
  total_records: number;
  total_rules: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  pass_rate: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface StandardOption {
  id: string;
  display_name: string;
  version: number;
  parse_status: string;
  total_rules: number;
}

interface AssetOption {
  id: string;
  display_name: string;
  sheet_names: string | null;
  row_count: number | null;
}

const STATUS_MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  draft: { color: 'default', icon: <SyncOutlined />, label: '草稿' },
  pending: { color: 'blue', icon: <SyncOutlined />, label: '待执行' },
  running: { color: 'processing', icon: <SyncOutlined spin />, label: '执行中' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: '失败' },
};

export default function ValidationPage() {
  const router = useRouter();
  const { currentDomain } = useDomainStore();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [standards, setStandards] = useState<StandardOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadTasks = useCallback(async () => {
    if (!currentDomain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentDomain]);

  useEffect(() => {
    if (currentDomain?.id) loadTasks();
  }, [currentDomain?.id, loadTasks]);

  async function loadOptions() {
    if (!currentDomain) return;
    try {
      const [stdRes, assetRes] = await Promise.all([
        fetch(`/api/standards?domainId=${currentDomain.id}`),
        fetch(`/api/assets?domainId=${currentDomain.id}`),
      ]);
      const stdJson = await stdRes.json();
      const assetJson = await assetRes.json();
      if (stdJson.success) setStandards(stdJson.data);
      if (assetJson.success) setAssets(assetJson.data);
    } catch {
      // ignore
    }
  }

  async function handleCreate(values: any) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          domainId: currentDomain!.id,
          standardId: values.standardId,
          assetIds: values.assetIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('任务创建成功');
        setCreateModalOpen(false);
        form.resetFields();
        loadTasks();
      } else {
        message.error(json.error?.message || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  }

  async function handleExecute(id: string) {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}/execute`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        message.success(
          `校验完成，共发现 ${json.data.issueCount} 个问题（${json.data.errorCount} 严重，${json.data.warningCount} 警告）`,
        );
        loadTasks();
      } else {
        message.error(json.error?.message || '执行失败');
        loadTasks();
      }
    } catch {
      message.error('执行失败');
      loadTasks();
    } finally {
      setExecutingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('删除成功');
        loadTasks();
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }

  const columns: ColumnsType<TaskRow> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const s = STATUS_MAP[status] || { color: 'default', icon: null, label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: TaskRow) => (
        <div>
          <Progress
            percent={progress}
            size="small"
            status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
          />
          {record.current_phase && (
            <Text type="secondary" style={{ fontSize: 11 }}>{record.current_phase}</Text>
          )}
        </div>
      ),
    },
    {
      title: '规则数',
      dataIndex: 'total_rules',
      key: 'total_rules',
      width: 70,
      render: (val: number) => val || 0,
    },
    {
      title: '问题数',
      key: 'issues',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          {record.error_count > 0 && <Tag color="red">{record.error_count} 严重</Tag>}
          {record.warning_count > 0 && <Tag color="gold">{record.warning_count} 警告</Tag>}
          {record.info_count > 0 && <Tag color="blue">{record.info_count} 提示</Tag>}
          {record.error_count === 0 && record.warning_count === 0 && record.info_count === 0 && <Text type="secondary">0</Text>}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => (val ? new Date(val).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record.id)}
              loading={executingId === record.id}
            >
              执行
            </Button>
          )}
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record.id)}
              loading={executingId === record.id}
            >
              重试
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/tasks/${record.id}`)}
            >
              查看
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!currentDomain) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>数据校验</Title>
        <Empty description="请先在顶部选择业务域" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>数据校验</Title>
          <Text type="secondary">创建校验任务，选择标准和数据资产，执行数据质量校验</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            loadOptions();
            setCreateModalOpen(true);
          }}
        >
          创建任务
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无校验任务，请点击 "创建任务"' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title="创建校验任务"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：2024年Q1数据质量校验" />
          </Form.Item>
          <Form.Item name="standardId" label="选择标准" rules={[{ required: true, message: '请选择标准' }]}>
            <Select
              placeholder="请选择数据标准"
              options={standards
                .filter(s => s.total_rules > 0)
                .map(s => ({
                  label: `${s.display_name} (v${s.version}, ${s.total_rules} 条规则)`,
                  value: s.id,
                }))}
            />
          </Form.Item>
          <Form.Item name="assetIds" label="选择数据资产" rules={[{ required: true, message: '请至少选择一个资产' }]}>
            <Select
              mode="multiple"
              placeholder="请选择要校验的数据资产"
              options={assets.map(a => ({
                label: `${a.display_name} (${a.row_count || 0} 行)`,
                value: a.id,
              }))}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setCreateModalOpen(false); form.resetFields(); }}>取消</Button>
              <Button type="primary" htmlType="submit">创建任务</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
