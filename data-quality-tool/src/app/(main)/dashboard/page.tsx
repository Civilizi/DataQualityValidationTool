'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Tag,
  Table,
} from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useDomainStore, type DomainInfo } from '@/lib/stores/domainStore';
import { DomainManager } from '@/components/dashboard/DomainManager';

const { Title, Paragraph, Text } = Typography;

interface RecentTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  total_rules: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  created_at: string;
  completed_at: string | null;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'blue', label: '待执行' },
  running: { color: 'processing', label: '执行中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentDomain, domains, loadDomains, setCurrentDomain } = useDomainStore();
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDomains().then(() => setLoading(false));
  }, [loadDomains]);

  const loadRecentTasks = useCallback(async () => {
    if (!currentDomain) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`/api/tasks?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) {
        setRecentTasks((json.data as RecentTask[]).slice(0, 10));
      }
    } catch {
      // ignore
    } finally {
      setTaskLoading(false);
    }
  }, [currentDomain]);

  useEffect(() => {
    loadRecentTasks();
  }, [currentDomain?.id, loadRecentTasks]);

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3}>工作台</Title>
        <Empty description="加载中..." />
      </div>
    );
  }

  if (!currentDomain) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3}>工作台</Title>
        <Card bordered={false} style={{ padding: 48, textAlign: 'center' }}>
          <Empty
            description={
              <div>
                <Text style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
                  {domains.length === 0
                    ? '请先创建业务域，然后开始数据质量治理'
                    : '请选择或创建一个业务域'}
                </Text>
                <Space>
                  <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                    创建业务域
                  </Button>
                  {domains.length > 0 && (
                    <Button size="large" onClick={() => setManagerOpen(true)}>
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
          onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
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
            <Form.Item name="name" label="业务域名称" rules={[{ required: true, message: '请输入业务域名称' }]}>
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

  const quickActions = [
    { label: '导入数据标准', desc: '上传并解析数据标准文件', icon: <FileTextOutlined />, color: '#1677ff', path: '/standards' },
    { label: '上传数据集', desc: '上传待校验的数据素材', icon: <FolderOutlined />, color: '#52c41a', path: '/assets' },
    { label: '创建业务域', desc: '新增一个业务域分类', icon: <PlusOutlined />, color: '#722ed1', action: () => setCreateModalOpen(true) },
  ];

  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => { const s = STATUS_MAP[v] || { color: 'default', label: v }; return <Tag color={s.color}>{s.label}</Tag>; },
    },
    {
      title: '问题数', key: 'issues', width: 150,
      render: (_: any, record: RecentTask) => (
        <Space size={4}>
          {record.error_count > 0 && <Tag color="red">{record.error_count}</Tag>}
          {record.warning_count > 0 && <Tag color="gold">{record.warning_count}</Tag>}
          {record.info_count > 0 && <Tag color="blue">{record.info_count}</Tag>}
          {record.error_count === 0 && record.warning_count === 0 && record.info_count === 0 && <Text type="secondary">0</Text>}
        </Space>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-') },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: RecentTask) => (
        <Button type="link" size="small" onClick={() => router.push(`/tasks/${record.id}`)}>查看</Button>
      ),
    },
  ];

  // All domains table columns
  const domainColumns = [
    {
      title: '业务域', key: 'name', width: 160,
      render: (_: any, d: DomainInfo & { _raw?: boolean }) => (
        <Space>
          <Tag color={d.id === currentDomain.id ? 'blue' : 'default'}>
            {d.id === currentDomain.id ? '当前' : ''}
          </Tag>
          <Text strong>{d.name}</Text>
        </Space>
      ),
    },
    {
      title: '数据标准', dataIndex: 'standardCount', key: 'standardCount', width: 90, align: 'center' as const,
      render: (v: number) => <Text style={{ color: '#1677ff', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '素材', dataIndex: 'assetCount', key: 'assetCount', width: 70, align: 'center' as const,
      render: (v: number) => <Text style={{ color: '#52c41a', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '规则', key: 'ruleCount', width: 70, align: 'center' as const,
      render: (_: any, d: DomainInfo) => <Text style={{ color: '#faad14', fontWeight: 600 }}>{d.ruleCount}</Text>,
    },
    {
      title: '任务', dataIndex: 'taskCount', key: 'taskCount', width: 70, align: 'center' as const,
      render: (v: number) => <Text style={{ color: '#722ed1', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, d: DomainInfo) =>
        d.id === currentDomain.id ? (
          <Text type="secondary" style={{ fontSize: 12 }}>已选中</Text>
        ) : (
          <Button type="link" size="small" icon={<SwapOutlined />} onClick={() => setCurrentDomain(d)}>
            切换
          </Button>
        ),
    },
  ];

  // Totals across all domains
  const totalStats = domains.reduce(
    (acc, d) => ({
      standards: acc.standards + (d.standardCount || 0),
      assets: acc.assets + (d.assetCount || 0),
      rules: acc.rules + (d.ruleCount || 0),
      tasks: acc.tasks + (d.taskCount || 0),
    }),
    { standards: 0, assets: 0, rules: 0, tasks: 0 },
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px 0' }}>工作台</Title>
        <Text type="secondary">
          当前业务域：<Text strong>{currentDomain.name}</Text>
          {currentDomain.description && <Text style={{ marginLeft: 8 }}>({currentDomain.description})</Text>}
        </Text>
      </div>

      {/* Current domain stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ textAlign: 'center' }}>
            <Statistic
              title="数据标准"
              value={currentDomain.standardCount}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
              suffix="个"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ textAlign: 'center' }}>
            <Statistic
              title="素材数量"
              value={currentDomain.assetCount}
              prefix={<FolderOutlined style={{ color: '#52c41a' }} />}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ textAlign: 'center' }}>
            <Statistic
              title="校验规则"
              value={currentDomain.ruleCount}
              prefix={<CheckCircleOutlined style={{ color: '#faad14' }} />}
              suffix="条"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ textAlign: 'center' }}>
            <Statistic
              title="校验任务"
              value={currentDomain.taskCount}
              prefix={<CloudServerOutlined style={{ color: '#722ed1' }} />}
              suffix="个"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* All domains summary */}
      {domains.length > 1 && (
        <>
          <Card
            size="small"
            title="全部业务域概览"
            style={{ marginBottom: 24 }}
            bodyStyle={{ padding: '12px 24px' }}
          >
            <Row gutter={32}>
              <Col>
                <Text type="secondary">共 </Text>
                <Text strong style={{ color: '#1677ff' }}>{domains.length}</Text>
                <Text type="secondary"> 个业务域</Text>
              </Col>
              <Col>
                <Text type="secondary">累计 </Text>
                <Text strong style={{ color: '#1677ff' }}>{totalStats.standards}</Text>
                <Text type="secondary"> 个标准</Text>
              </Col>
              <Col>
                <Text type="secondary">累计 </Text>
                <Text strong style={{ color: '#52c41a' }}>{totalStats.assets}</Text>
                <Text type="secondary"> 个素材</Text>
              </Col>
              <Col>
                <Text type="secondary">累计 </Text>
                <Text strong style={{ color: '#faad14' }}>{totalStats.rules}</Text>
                <Text type="secondary"> 条规则</Text>
              </Col>
              <Col>
                <Text type="secondary">累计 </Text>
                <Text strong style={{ color: '#722ed1' }}>{totalStats.tasks}</Text>
                <Text type="secondary"> 个任务</Text>
              </Col>
            </Row>
          </Card>

          <Card
            size="small"
            title="业务域详情"
            style={{ marginBottom: 24 }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={domainColumns}
              dataSource={domains.map(d => ({ ...d, key: d.id }))}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </>
      )}

      {/* Quick Actions */}
      <Title level={5} style={{ marginBottom: 16 }}>快捷操作</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {quickActions.map((action) => (
          <Col xs={24} sm={12} lg={8} key={action.label}>
            <Card
              hoverable
              bordered
              onClick={'path' in action && action.path ? () => router.push(action.path) : action.action}
              style={{ cursor: 'pointer' }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18,
                  backgroundColor: action.color,
                }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>{action.label}</Text>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{action.desc}</Text></div>
                </div>
                <ArrowRightOutlined style={{ color: '#d9d9d9' }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: '16px 0 24px' }} />

      {/* Recent Tasks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>最近任务</Title>
        <Button type="link" onClick={() => router.push('/validation')}>
          查看全部 <ArrowRightOutlined />
        </Button>
      </div>
      <Card bordered={false}>
        <Table
          columns={taskColumns}
          dataSource={recentTasks}
          rowKey="id"
          loading={taskLoading}
          locale={{ emptyText: '暂无校验任务，导入数据标准和素材后可创建校验任务' }}
          pagination={{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      {/* Create Domain Modal */}
      <Modal
        title="创建业务域"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
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
          <Form.Item name="name" label="业务域名称" rules={[{ required: true, message: '请输入业务域名称' }]}>
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
