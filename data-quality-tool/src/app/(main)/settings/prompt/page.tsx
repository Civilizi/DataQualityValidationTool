'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Space, message, List, Tag, Popconfirm, Select, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PromptTemplate {
  id: string;
  name: string;
  type: string;
  system_prompt: string;
  user_prompt_template: string | null;
  version: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  standard_parse: { label: '标准解析', color: 'blue' },
  field_match: { label: '字段匹配', color: 'green' },
  issue_diagnosis: { label: '问题诊断', color: 'orange' },
  report_gen: { label: '报告生成', color: 'purple' },
};

export default function PromptManagementPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/settings/prompt-templates');
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch {
      // ignore
    }
  }

  async function handleAdd() {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const res = await fetch('/api/settings/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('模板已添加');
        form.resetFields();
        setEditingPrompt(null);
        loadTemplates();
      }
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!editingPrompt) return;
    setLoading(true);
    try {
      const values = await form.validateFields();
      const res = await fetch(`/api/settings/prompt-templates/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, isActive: !!values.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('模板已更新');
        form.resetFields();
        setEditingPrompt(null);
        loadTemplates();
      }
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/settings/prompt-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('模板已删除');
        loadTemplates();
      }
    } catch {
      message.error('删除失败');
    }
  }

  function handleEdit(template: PromptTemplate) {
    setEditingPrompt(template);
    form.setFieldsValue({
      name: template.name,
      type: template.type,
      systemPrompt: template.system_prompt,
      userPromptTemplate: template.user_prompt_template,
      isActive: !!template.is_active,
    });
  }

  function handleCancel() {
    setEditingPrompt(null);
    form.resetFields();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: '0 0 4px 0' }}>Prompt 管理</Title>
        <Text type="secondary">
          管理 AI 服务使用的 Prompt 模板，支持标准解析、字段匹配、问题诊断、报告生成等场景
        </Text>
      </div>

      {/* Add/Edit Form */}
      <Card bordered size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong>
            {editingPrompt ? '编辑模板' : '新增模板'}
          </Text>
          {editingPrompt && (
            <Button size="small" type="link" onClick={handleCancel}>
              取消编辑
            </Button>
          )}
        </div>
        <Form form={form} layout="vertical">
          <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="例如：标准解析 Prompt" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]} style={{ flex: 1 }}>
              <Select
                options={Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            </Form.Item>
            {editingPrompt && (
              <Form.Item label="启用" name="isActive" valuePropName="checked" style={{ flex: 0 }}>
                <Select style={{ width: 100 }} options={[{ value: true, label: '启用' }, { value: false, label: '禁用' }]} />
              </Form.Item>
            )}
          </div>
          <Form.Item label="System Prompt" name="systemPrompt" rules={[{ required: true, message: '请输入 System Prompt' }]}>
            <TextArea rows={3} placeholder="系统提示词..." />
          </Form.Item>
          <Form.Item label="User Prompt 模板" name="userPromptTemplate" style={{ marginBottom: editingPrompt ? 16 : 0 }}>
            <TextArea rows={2} placeholder="用户提示词模板（可选）..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={editingPrompt ? handleUpdate : handleAdd}
              loading={loading}
            >
              {editingPrompt ? '保存更新' : '添加模板'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Template List */}
      <Card bordered size="small" bodyStyle={{ padding: 0 }}>
        {templates.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Tag color="purple" style={{ fontSize: 32, width: 48, height: 48, lineHeight: '48px', borderRadius: 24 }}>P</Tag>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">暂无 Prompt 模板</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">请添加第一个模板</Text>
              </div>
            </div>
          </div>
        ) : (
          <List
            dataSource={templates}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '16px 24px' }}
                actions={[
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>编辑</Button>,
                  <Popconfirm title="确认删除" onConfirm={() => handleDelete(item.id)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>,
                ]}
              >
                <div style={{ width: '100%' }}>
                  <Space size={8}>
                    <Tag color={TYPE_MAP[item.type]?.color || 'default'}>
                      {TYPE_MAP[item.type]?.label || item.type}
                    </Tag>
                    <Text strong>{item.name}</Text>
                    <Tag color={item.is_active ? 'success' : 'default'}>
                      {item.is_active ? '启用' : '禁用'}
                    </Tag>
                    <Text type="secondary">v{item.version}</Text>
                  </Space>
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" ellipsis style={{ maxWidth: 600 }}>
                      {item.system_prompt.substring(0, 100)}...
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
