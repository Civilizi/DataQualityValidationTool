'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Empty,
  Divider,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useDomainStore } from '@/lib/stores/domainStore';
import { DomainManager } from '@/components/dashboard/DomainManager';

const { Title, Paragraph, Text } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { currentDomain, domains, loadDomains } = useDomainStore();
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDomains().then(() => setLoading(false));
  }, [loadDomains]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Title level={3} className="mb-6">工作台</Title>
        <Paragraph className="text-gray-500 text-lg mb-8">数据质量治理概览</Paragraph>
        <Empty description="加载中..." />
      </div>
    );
  }

  if (!currentDomain) {
    return (
      <div className="max-w-7xl mx-auto">
        <Title level={3} className="mb-6">工作台</Title>
        <Card
          bordered={false}
          className="shadow-sm"
          styles={{ body: { padding: '64px' } }}
        >
          <Empty
            description={
              <div className="text-center">
                <Text className="text-gray-500 text-base block mb-4">
                  {domains.length === 0
                    ? '请先创建业务域，然后开始数据质量治理'
                    : '请选择或创建一个业务域'}
                </Text>
                <Space>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    创建业务域
                  </Button>
                  {domains.length > 0 && (
                    <Button
                      size="large"
                      onClick={() => setManagerOpen(true)}
                    >
                      管理业务域
                    </Button>
                  )}
                </Space>
              </div>
            }
          />
        </Card>

        <Modal
          title="创建业务域"
          open={createModalOpen}
          onCancel={() => {
            setCreateModalOpen(false);
            form.resetFields();
          }}
          onOk={async () => {
            try {
              const values = await form.validateFields();
              const { useDomainStore: _ } = await import('@/lib/stores/domainStore');
              const store = useDomainStore.getState();
              const created = await store.createDomain(values.name, values.description || undefined);
              if (created) {
                message.success('业务域创建成功');
                setCreateModalOpen(false);
                form.resetFields();
              } else {
                message.error('业务域创建失败，请检查名称是否重复');
              }
            } catch {
              // validation error
            }
          }}
        >
          <Form form={form} layout="vertical">
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

        <DomainManager open={managerOpen} onClose={() => setManagerOpen(false)} />
      </div>
    );
  }

  const stats = [
    {
      title: '数据标准',
      value: currentDomain.standardCount,
      icon: <FileTextOutlined />,
      color: '#1677ff',
      suffix: '个',
    },
    {
      title: '素材数量',
      value: currentDomain.assetCount,
      icon: <FolderOutlined />,
      color: '#52c41a',
      suffix: '个',
    },
    {
      title: '校验规则',
      value: currentDomain.standardCount, // TODO: fetch actual rule count
      icon: <CheckCircleOutlined />,
      color: '#faad14',
      suffix: '条',
    },
    {
      title: '校验任务',
      value: currentDomain.taskCount,
      icon: <CloudServerOutlined />,
      color: '#722ed1',
      suffix: '个',
    },
  ];

  const quickActions = [
    {
      label: '导入数据标准',
      desc: '上传并解析数据标准文件',
      icon: <FileTextOutlined />,
      color: '#1677ff',
      path: '/standards',
    },
    {
      label: '上传数据集',
      desc: '上传待校验的数据素材',
      icon: <FolderOutlined />,
      color: '#52c41a',
      path: '/assets',
    },
    {
      label: '创建业务域',
      desc: '新增一个业务域分类',
      icon: <PlusOutlined />,
      color: '#722ed1',
      action: () => setCreateModalOpen(true),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={3} className="mb-1">工作台</Title>
          <Paragraph className="text-gray-500 text-lg mb-0">
            当前业务域：<Text strong>{currentDomain.name}</Text>
            {currentDomain.description && (
              <Text className="text-gray-400 ml-2">— {currentDomain.description}</Text>
            )}
          </Paragraph>
        </div>
      </div>

      {/* Stat Cards */}
      <Row gutter={[24, 24]} className="mb-8">
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card
              bordered={false}
              hoverable
              className="stat-card"
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                suffix={stat.suffix}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Title level={4} className="mb-4">快捷操作</Title>
      <Row gutter={[16, 16]} className="mb-8">
        {quickActions.map((action) => (
          <Col xs={24} sm={12} lg={8} key={action.label}>
            <Card
              hoverable
              bordered
              onClick={
                'path' in action && action.path
                  ? () => router.push(action.path)
                  : action.action
              }
              className="cursor-pointer transition-shadow"
              styles={{ body: { padding: '20px' } }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: action.color }}
                >
                  {action.icon}
                </div>
                <div className="flex-1">
                  <Text strong className="text-base">{action.label}</Text>
                  <Paragraph className="text-gray-400 text-sm mb-0 mt-1">
                    {action.desc}
                  </Paragraph>
                </div>
                <ArrowRightOutlined className="text-gray-300" />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      {/* Recent Tasks Placeholder */}
      <Title level={4} className="mb-4">最近任务</Title>
      <Card
        bordered={false}
        className="shadow-sm"
        styles={{ body: { padding: '48px' } }}
      >
        <Empty
          description={
            <div>
              <span className="text-gray-500 text-base">
                当前业务域暂无校验任务
              </span>
              <div className="mt-2 text-gray-400 text-sm">
                导入数据标准和素材后，可创建校验任务
              </div>
            </div>
          }
        />
      </Card>

      {/* Create Domain Modal */}
      <Modal
        title="创建业务域"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            const store = useDomainStore.getState();
            const created = await store.createDomain(values.name, values.description || undefined);
            if (created) {
              message.success('业务域创建成功');
              setCreateModalOpen(false);
              form.resetFields();
            } else {
              message.error('业务域创建失败，请检查名称是否重复');
            }
          } catch {
            // validation error
          }
        }}
      >
        <Form form={form} layout="vertical">
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

      <DomainManager open={managerOpen} onClose={() => setManagerOpen(false)} />
    </div>
  );
}
