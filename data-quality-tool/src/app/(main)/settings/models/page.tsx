'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Table, Tag, Space, message,
  Modal, Select, Divider, Tooltip, Popconfirm, Badge, Typography,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
  CheckCircleOutlined, StarOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  model_name: string;
  api_key: string;
  api_base_url: string | null;
  temperature: number;
  max_tokens: number;
  is_default: number;
  is_active: number;
  updated_at: string;
}

const PROVIDER_MAP: Record<string, { label: string; color: string }> = {
  dashscope: { label: '阿里云百炼', color: 'blue' },
  openai: { label: 'OpenAI', color: 'green' },
  local: { label: '本地模型', color: 'purple' },
  custom: { label: '自定义', color: 'default' },
};

const PROVIDER_OPTIONS = [
  { value: 'dashscope', label: '阿里云百炼', icon: '☁️' },
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'local', label: '本地模型', icon: '💻' },
  { value: 'custom', label: '自定义', icon: '⚙️' },
];

export default function ModelManagementPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/models');
      const json = await res.json();
      if (json.success) setModels(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      const isEdit = !!editingModel;

      const res = await fetch(isEdit ? `/api/settings/models/${editingModel.id}` : '/api/settings/models', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          provider: values.provider,
          modelName: values.modelName,
          apiKey: values.apiKey,
          apiBaseUrl: values.apiBaseUrl || null,
          temperature: values.temperature ?? 0.7,
          maxTokens: values.maxTokens ?? 4096,
          isDefault: values.isDefault ?? false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(isEdit ? '模型已更新' : '模型已添加');
        setModalOpen(false);
        setEditingModel(null);
        form.resetFields();
        loadModels();
      } else {
        message.error(json.error?.message || '保存失败');
      }
    } catch {
      // form validation error
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/settings/models/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('模型已删除');
        loadModels();
      }
    } catch {
      message.error('删除失败');
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/settings/models/${id}/default`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        message.success('已设为默认模型');
        loadModels();
      }
    } catch {
      message.error('设置失败');
    }
  }

  async function handleTestConnection(model: ModelConfig) {
    setTestingId(model.id);
    try {
      const res = await fetch('/api/settings/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: model.provider,
          apiKey: model.api_key,
          modelName: model.model_name,
          apiBaseUrl: model.api_base_url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(`连接成功！模型: ${model.model_name}`);
      } else {
        message.error(json.error?.message || '连接失败');
      }
    } catch {
      message.error('连接测试失败');
    } finally {
      setTestingId(null);
    }
  }

  function openAddModal() {
    setEditingModel(null);
    form.resetFields();
    form.setFieldsValue({ temperature: 0.7, maxTokens: 4096 });
    setModalOpen(true);
  }

  function openEditModal(model: ModelConfig) {
    setEditingModel(model);
    form.setFieldsValue({
      name: model.name,
      provider: model.provider,
      modelName: model.model_name,
      apiKey: model.api_key,
      apiBaseUrl: model.api_base_url,
      temperature: model.temperature,
      maxTokens: model.max_tokens,
      isDefault: !!model.is_default,
    });
    setModalOpen(true);
  }

  const defaultModel = models.find(m => m.is_default === 1);

  const columns: ColumnsType<ModelConfig> = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (v: string, r: ModelConfig) => (
        <Space size={8}>
          <GlobalOutlined style={{ color: '#1677ff' }} />
          <Text strong>{v}</Text>
          {r.is_default === 1 && (
            <Tag color="green" icon={<StarOutlined />} style={{ margin: 0 }}>
              默认
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (v: string) => {
        const p = PROVIDER_MAP[v] || { label: v, color: 'default' };
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 160,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: 'API 地址',
      dataIndex: 'api_base_url',
      key: 'api_base_url',
      ellipsis: true,
      render: (v: string | null) => (
        <Text type="secondary">{v || '-'}</Text>
      ),
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 80,
      render: (v: number) => <Text>{v?.toFixed(1)}</Text>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => <Text type="secondary">{v ? new Date(v).toLocaleString('zh-CN') : '-'}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: any, record: ModelConfig) => (
        <Space size={4}>
          <Tooltip title="测试连接">
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={testingId === record.id}
              onClick={() => handleTestConnection(record)}
            >
              测试
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
          </Tooltip>
          {!record.is_default && (
            <Tooltip title="设为默认">
              <Button
                type="text"
                size="small"
                icon={<StarOutlined />}
                onClick={() => handleSetDefault(record.id)}
              >
                设为默认
              </Button>
            </Tooltip>
          )}
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: '0 0 4px 0' }}>
            模型管理
          </Title>
          <Text type="secondary">
            配置云端AI模型和本地模型，支持连接测试与默认设置
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          新增模型
        </Button>
      </div>

      {/* Model list */}
      <Card bordered size="small" bodyStyle={{ padding: 0 }}>
        {models.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <GlobalOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <div>
              <Text type="secondary">暂无模型配置</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">点击"新增模型"添加第一个AI模型</Text>
              </div>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={models}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingModel ? '编辑模型' : '新增模型'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingModel(null); form.resetFields(); }}
        onOk={handleSave}
        width={560}
        okText={editingModel ? '保存' : '添加'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如：Qwen-Plus" />
          </Form.Item>
          <Form.Item name="provider" label="提供商" rules={[{ required: true, message: '请选择提供商' }]}>
            <Select
              options={PROVIDER_OPTIONS.map(p => ({ value: p.value, label: `${p.icon} ${p.label}` }))}
            />
          </Form.Item>
          <Form.Item name="modelName" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="例如：qwen-plus" />
          </Form.Item>
          <Form.Item name="apiBaseUrl" label="API Base URL">
            <Input placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: '请输入 API Key' }]}>
            <Input.Password placeholder="请输入 API Key" />
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          <Form.Item label="高级设置">
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="temperature" style={{ flex: 1, marginBottom: 0 }}>
                <Input type="number" step="0.1" min="0" max="2" addonBefore="Temperature" />
              </Form.Item>
              <Form.Item name="maxTokens" style={{ flex: 1, marginBottom: 0 }}>
                <Input type="number" addonBefore="Max Tokens" />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认模型" valuePropName="checked">
            <Select options={[
              { value: true, label: '是' },
              { value: false, label: '否' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
