'use client';

import { Card, Tabs, Typography, Form, Input, Button, Select, Alert } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  TagsOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function SettingsPage() {
  const items = [
    {
      key: 'ai',
      label: (
        <span>
          <SettingOutlined /> AI 配置
        </span>
      ),
      children: (
        <Card bordered={false} className="shadow-sm max-w-2xl">
          <Title level={5} className="mb-4">
            AI 模型配置
          </Title>
          <Alert
            message="提示"
            description="配置 AI 模型连接信息，用于数据标准解析和规则自动生成"
            type="info"
            showIcon
            className="mb-6"
          />
          <Form layout="vertical">
            <Form.Item label="API 地址" name="apiUrl">
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>
            <Form.Item label="API Key" name="apiKey">
              <Input.Password placeholder="请输入 API Key" />
            </Form.Item>
            <Form.Item label="模型名称" name="modelName">
              <Input placeholder="例如：gpt-4o" />
            </Form.Item>
            <Form.Item>
              <Button type="primary">保存配置</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'prompts',
      label: (
        <span>
          <FileTextOutlined /> Prompt 管理
        </span>
      ),
      children: (
        <Card bordered={false} className="shadow-sm max-w-2xl">
          <Title level={5} className="mb-4">
            Prompt 模板管理
          </Title>
          <Alert
            message="提示"
            description="管理用于 AI 解析数据标准和生成校验规则的 Prompt 模板"
            type="info"
            showIcon
            className="mb-6"
          />
          <Form layout="vertical">
            <Form.Item label="标准解析 Prompt" name="parsePrompt">
              <TextArea
                rows={6}
                placeholder="请输入用于解析数据标准的 Prompt 模板..."
              />
            </Form.Item>
            <Form.Item label="规则生成 Prompt" name="rulePrompt">
              <TextArea
                rows={6}
                placeholder="请输入用于生成校验规则的 Prompt 模板..."
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary">保存模板</Button>
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
        <Card bordered={false} className="shadow-sm max-w-2xl">
          <Title level={5} className="mb-4">
            字段别名配置
          </Title>
          <Alert
            message="提示"
            description="配置字段别名映射，用于统一不同数据源的字段命名差异"
            type="info"
            showIcon
            className="mb-6"
          />
          <Form layout="vertical">
            <Form.Item label="别名映射（JSON格式）" name="aliasConfig">
              <TextArea
                rows={8}
                placeholder={`{\n  "emp_id": ["employee_id", "staff_no", "工号"],\n  "dept_name": ["department", "部门名称"]\n}`}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary">保存配置</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-2">
        系统设置
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        配置 AI 模型、Prompt 模板和别名映射
      </Paragraph>

      <Card bordered={false} className="shadow-sm">
        <Tabs defaultActiveKey="ai" items={items} size="large" />
      </Card>
    </div>
  );
}
