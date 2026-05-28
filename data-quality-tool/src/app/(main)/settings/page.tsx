'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Typography, Form, Input, Button, Select, Alert, message, Space, List, Tag } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  TagsOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useDomainStore } from '@/lib/stores/domainStore';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface AiConfig {
  id: string;
  api_key: string;
  api_base_url: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: number;
  updated_at: string;
}

interface AliasRow {
  id: string;
  standard_name: string;
  alias: string;
  domain_id: string | null;
  created_at: string;
}

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

export default function SettingsPage() {
  const { currentDomain } = useDomainStore();
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aliasList, setAliasList] = useState<AliasRow[]>([]);
  const [newStandard, setNewStandard] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [aliasLoading, setAliasLoading] = useState(false);
  const [aiForm] = Form.useForm();
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [promptForm] = Form.useForm();

  useEffect(() => {
    loadAiConfig();
  }, []);

  useEffect(() => {
    if (currentDomain?.id) loadAliases();
  }, [currentDomain?.id]);

  useEffect(() => {
    loadPromptTemplates();
  }, []);

  async function loadAiConfig() {
    try {
      const res = await fetch('/api/settings/ai-config');
      const json = await res.json();
      if (json.success) {
        setAiConfig(json.data);
        aiForm.setFieldsValue({
          apiKey: json.data.api_key,
          apiBaseUrl: json.data.api_base_url,
          modelName: json.data.model,
          temperature: json.data.temperature,
          maxTokens: json.data.max_tokens,
        });
      }
    } catch {
      // ignore
    }
  }

  async function handleSaveAi(values: any) {
    setAiLoading(true);
    try {
      const res = await fetch('/api/settings/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: values.apiKey,
          apiBaseUrl: values.apiBaseUrl,
          model: values.modelName,
          temperature: values.temperature,
          maxTokens: values.maxTokens,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('AI 配置已保存');
        loadAiConfig();
      } else {
        message.error(json.error?.message || '保存失败');
      }
    } catch {
      message.error('保存失败');
    } finally {
      setAiLoading(false);
    }
  }

  async function loadAliases() {
    try {
      const res = await fetch('/api/settings/aliases');
      const json = await res.json();
      if (json.success) setAliasList(json.data);
    } catch {
      // ignore
    }
  }

  async function handleAddAlias() {
    if (!newStandard || !newAlias) {
      message.warning('请填写标准名称和别名');
      return;
    }
    setAliasLoading(true);
    try {
      const res = await fetch('/api/settings/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardName: newStandard,
          alias: newAlias,
          domainId: currentDomain?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('别名已添加');
        setNewStandard('');
        setNewAlias('');
        loadAliases();
      } else {
        message.error(json.error?.message || '添加失败');
      }
    } catch {
      message.error('添加失败');
    } finally {
      setAliasLoading(false);
    }
  }

  async function handleDeleteAlias(id: string) {
    try {
      const res = await fetch(`/api/settings/aliases?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('别名已删除');
        loadAliases();
      }
    } catch {
      message.error('删除失败');
    }
  }

  async function loadPromptTemplates() {
    try {
      const res = await fetch('/api/settings/prompt-templates');
      const json = await res.json();
      if (json.success) setPromptTemplates(json.data);
    } catch {
      // ignore
    }
  }

  async function handleAddPrompt() {
    setPromptLoading(true);
    try {
      const res = await fetch('/api/settings/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promptForm.getFieldValue('name'),
          type: promptForm.getFieldValue('type'),
          systemPrompt: promptForm.getFieldValue('systemPrompt'),
          userPromptTemplate: promptForm.getFieldValue('userPromptTemplate'),
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Prompt 模板已添加');
        promptForm.resetFields();
        setEditingPrompt(null);
        loadPromptTemplates();
      } else {
        message.error(json.error?.message || '添加失败');
      }
    } catch {
      message.error('添加失败');
    } finally {
      setPromptLoading(false);
    }
  }

  async function handleUpdatePrompt(id: string) {
    setPromptLoading(true);
    try {
      const res = await fetch(`/api/settings/prompt-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promptForm.getFieldValue('name'),
          type: promptForm.getFieldValue('type'),
          systemPrompt: promptForm.getFieldValue('systemPrompt'),
          userPromptTemplate: promptForm.getFieldValue('userPromptTemplate'),
          isActive: promptForm.getFieldValue('isActive'),
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Prompt 模板已更新');
        promptForm.resetFields();
        setEditingPrompt(null);
        loadPromptTemplates();
      } else {
        message.error(json.error?.message || '更新失败');
      }
    } catch {
      message.error('更新失败');
    } finally {
      setPromptLoading(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    try {
      const res = await fetch(`/api/settings/prompt-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('模板已删除');
        loadPromptTemplates();
      }
    } catch {
      message.error('删除失败');
    }
  }

  function handleEditPrompt(template: PromptTemplate) {
    setEditingPrompt(template);
    promptForm.setFieldsValue({
      name: template.name,
      type: template.type,
      systemPrompt: template.system_prompt,
      userPromptTemplate: template.user_prompt_template,
      isActive: !!template.is_active,
    });
  }

  function handleCancelEdit() {
    setEditingPrompt(null);
    promptForm.resetFields();
  }

  const items = [
    {
      key: 'ai',
      label: (
        <span>
          <SettingOutlined /> AI 配置
        </span>
      ),
      children: (
        <Card bordered={false} style={{ maxWidth: 700 }}>
          <Title level={5} style={{ marginBottom: 4 }}>AI 模型配置</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            配置阿里百炼 DashScope API 连接信息，用于数据标准解析和规则自动生成
          </Paragraph>
          {aiConfig?.is_active && (
            <Alert
              message={`当前已激活：${aiConfig.model}`}
              description={`最后更新：${new Date(aiConfig.updated_at).toLocaleString('zh-CN')}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form form={aiForm} layout="vertical" onFinish={handleSaveAi}>
            <Form.Item label="API Base URL" name="apiBaseUrl">
              <Input placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1" />
            </Form.Item>
            <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: '请输入 API Key' }]}>
              <Input.Password placeholder="请输入 DashScope API Key" />
            </Form.Item>
            <Form.Item label="模型名称" name="modelName" rules={[{ required: true, message: '请输入模型名称' }]}>
              <Input placeholder="例如：qwen-plus" />
            </Form.Item>
            <Form.Item label="Temperature" name="temperature">
              <Input type="number" step="0.1" min="0" max="1" />
            </Form.Item>
            <Form.Item label="Max Tokens" name="maxTokens">
              <Input type="number" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={aiLoading}>保存配置</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'alias',
      label: (
        <span>
          <TagsOutlined /> 别名配置
        </span>
      ),
      children: (
        <Card bordered={false} style={{ maxWidth: 700 }}>
          <Title level={5} style={{ marginBottom: 4 }}>字段别名配置</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            配置字段别名映射，用于统一不同数据源的字段命名差异
          </Paragraph>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="标准名称"
                value={newStandard}
                onChange={e => setNewStandard(e.target.value)}
                style={{ width: 150 }}
              />
              <Input
                placeholder="别名"
                value={newAlias}
                onChange={e => setNewAlias(e.target.value)}
                style={{ width: 150 }}
              />
              <Button type="primary" onClick={handleAddAlias} loading={aliasLoading}>
                添加
              </Button>
            </Space>
          </div>
          <List
            dataSource={aliasList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteAlias(item.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <Tag color="blue">{item.standard_name}</Tag>
                <Text>=</Text>
                <Tag color="green">{item.alias}</Tag>
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'prompt',
      label: (
        <span>
          <FileTextOutlined /> Prompt 管理
        </span>
      ),
      children: (
        <Card bordered={false} style={{ maxWidth: 900 }}>
          <Title level={5} style={{ marginBottom: 4 }}>Prompt 模板管理</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            管理 AI 服务使用的 Prompt 模板，支持标准解析、字段匹配、问题诊断、报告生成等场景
          </Paragraph>

          <div style={{ marginBottom: 16 }}>
            <Form form={promptForm} layout="vertical">
              <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
                <Input placeholder="例如：标准解析 Prompt" />
              </Form.Item>
              <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
                <Select
                  options={[
                    { value: 'standard_parse', label: '标准解析' },
                    { value: 'field_match', label: '字段匹配' },
                    { value: 'issue_diagnosis', label: '问题诊断' },
                    { value: 'report_gen', label: '报告生成' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="System Prompt" name="systemPrompt" rules={[{ required: true, message: '请输入 System Prompt' }]}>
                <TextArea rows={4} placeholder="系统提示词..." />
              </Form.Item>
              <Form.Item label="User Prompt 模板" name="userPromptTemplate">
                <TextArea rows={3} placeholder="用户提示词模板（可选）..." />
              </Form.Item>
              {editingPrompt && (
                <Form.Item label="启用" name="isActive" valuePropName="checked">
                  <Select options={[
                    { value: true, label: '启用' },
                    { value: false, label: '禁用' },
                  ]} />
                </Form.Item>
              )}
              <Form.Item>
                <Space>
                  <Button type="primary" onClick={() => {
                    if (editingPrompt) {
                      handleUpdatePrompt(editingPrompt.id);
                    } else {
                      handleAddPrompt();
                    }
                  }} loading={promptLoading}>
                    {editingPrompt ? '更新' : '添加'}
                  </Button>
                  {editingPrompt && (
                    <Button onClick={handleCancelEdit}>取消编辑</Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </div>

          <List
            dataSource={promptTemplates}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditPrompt(item)}
                  >
                    编辑
                  </Button>,
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeletePrompt(item.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <div style={{ width: '100%' }}>
                  <Space>
                    <Tag color="purple">{item.type}</Tag>
                    <Text strong>{item.name}</Text>
                    <Tag color={item.is_active ? 'green' : 'default'}>
                      {item.is_active ? '启用' : '禁用'}
                    </Tag>
                    <Text type="secondary">v{item.version}</Text>
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" ellipsis={{ tooltip: item.system_prompt }} style={{ maxWidth: 600 }}>
                      {item.system_prompt.substring(0, 80)}...
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 8 }}>系统设置</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        配置 AI 模型和字段别名
      </Text>
      <Card>
        <Tabs defaultActiveKey="ai" items={items} size="large" />
      </Card>
    </div>
  );
}
