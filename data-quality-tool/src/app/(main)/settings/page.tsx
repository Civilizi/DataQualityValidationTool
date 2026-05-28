'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Typography, Form, Input, Button, Select, Alert, message, Space, List, Tag } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  TagsOutlined,
  DeleteOutlined,
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

export default function SettingsPage() {
  const { currentDomain } = useDomainStore();
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aliasList, setAliasList] = useState<AliasRow[]>([]);
  const [newStandard, setNewStandard] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [aliasLoading, setAliasLoading] = useState(false);
  const [aiForm] = Form.useForm();

  useEffect(() => {
    loadAiConfig();
  }, []);

  useEffect(() => {
    if (currentDomain?.id) loadAliases();
  }, [currentDomain?.id]);

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
