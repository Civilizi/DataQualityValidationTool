'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, Tag, Space, message, Typography, Select,
  Statistic, Row, Col, Card, Descriptions, Breadcrumb, Spin,
  Collapse, Popconfirm, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, FileExcelOutlined,
  CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
  FileTextOutlined, CloudDownloadOutlined, DeleteOutlined,
  FolderOutlined, FileOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface TaskDetail {
  id: string;
  name: string;
  standard_id: string | null;
  standard_version: number | null;
  status: string;
  progress: number;
  current_phase: string | null;
  asset_ids: string | null;
  total_rules: number;
  total_records: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  pass_rate: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  error: number;
  warning: number;
  info: number;
  total: number;
}

interface AssetInfo {
  id: string;
  display_name: string;
  version: number;
  row_count: number | null;
}

interface StandardInfo {
  id: string;
  display_name: string;
  version: number;
}

interface DeliverableItem {
  id: string;
  task_id: string;
  version: number;
  type: string;
  file_path: string;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

interface ResultRow {
  id: string;
  task_id: string;
  rule_id: string | null;
  phase: string;
  sheet_name: string | null;
  row_index: number | null;
  field_name: string | null;
  original_value: string | null;
  severity: string;
  issue_description: string | null;
  ai_diagnosis: string | null;
  ai_suggestion: string | null;
  created_at: string;
}

const SEVERITY_MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  error: { color: 'red', icon: <WarningOutlined />, label: '严重' },
  warning: { color: 'gold', icon: <WarningOutlined />, label: '警告' },
  info: { color: 'blue', icon: <InfoCircleOutlined />, label: '提示' },
};

const PHASE_MAP: Record<string, string> = {
  field_level: '字段级',
  record_level: '记录级',
  cross_level: '跨数据级',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([]);
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [standard, setStandard] = useState<StandardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>();
  const [filterPhase, setFilterPhase] = useState<string>();

  const loadTask = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (json.success) setTask(json.data);
    } catch {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadResults = useCallback(async () => {
    setResultLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/results`);
      const json = await res.json();
      if (json.success) setResults(json.data);
    } catch {
      message.error('加载校验结果失败');
    } finally {
      setResultLoading(false);
    }
  }, [taskId]);

  const loadDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/report`);
      const json = await res.json();
      if (json.success) setDeliverables(json.data);
    } catch {
      // ignore
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    loadResults();
    loadDeliverables();
  }, [loadTask, loadResults, loadDeliverables]);

  // Load asset info
  useEffect(() => {
    if (!task?.asset_ids) return;
    try {
      const ids: string[] = JSON.parse(task.asset_ids);
      Promise.all(ids.map(id => fetch(`/api/assets/${id}`).then(r => r.json())))
        .then(resps => {
          const valid = resps.filter(r => r.success).map(r => r.data);
          setAssets(valid);
        });
    } catch {
      // ignore
    }
  }, [task?.asset_ids]);

  const filteredResults = results.filter(r => {
    if (filterSeverity && r.severity !== filterSeverity) return false;
    if (filterPhase && r.phase !== filterPhase) return false;
    return true;
  }).sort((a, b) => {
    const sevOrder = { error: 0, warning: 1, info: 2 };
    return (sevOrder[a.severity as keyof typeof sevOrder] ?? 3) - (sevOrder[b.severity as keyof typeof sevOrder] ?? 3);
  });

  const columns: ColumnsType<ResultRow> = [
    {
      title: '严重等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (v: string) => {
        const m = SEVERITY_MAP[v] || { color: 'default', icon: null, label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '校验阶段',
      dataIndex: 'phase',
      key: 'phase',
      width: 90,
      render: (v: string) => PHASE_MAP[v] || v,
    },
    {
      title: '工作表',
      dataIndex: 'sheet_name',
      key: 'sheet_name',
      width: 120,
    },
    {
      title: '行号',
      dataIndex: 'row_index',
      key: 'row_index',
      width: 70,
      render: (v: number | null) => v ?? '-',
    },
    {
      title: '字段名',
      dataIndex: 'field_name',
      key: 'field_name',
      width: 100,
    },
    {
      title: '原始值',
      dataIndex: 'original_value',
      key: 'original_value',
      width: 120,
      ellipsis: true,
    },
    {
      title: '问题描述',
      dataIndex: 'issue_description',
      key: 'issue_description',
      ellipsis: true,
    },
    {
      title: 'AI 诊断',
      dataIndex: 'ai_diagnosis',
      key: 'ai_diagnosis',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v || <Text type="secondary">分析中...</Text>,
    },
    {
      title: 'AI 建议',
      dataIndex: 'ai_suggestion',
      key: 'ai_suggestion',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
  ];

  const deliverableColumns: ColumnsType<DeliverableItem> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'report' ? 'purple' : 'blue'}>
          {v === 'report' ? '报告' : v}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (v: string | null) => v || '-',
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (v: number | null) => formatBytes(v),
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: DeliverableItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => {
              router.push(`/tasks/${taskId}/report`);
            }}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>任务不存在</Title>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item onClick={() => router.push('/validation')} style={{ cursor: 'pointer' }}>
          数据校验
        </Breadcrumb.Item>
        <Breadcrumb.Item>{task.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/validation')}>返回</Button>
          <Title level={3} style={{ margin: 0 }}>{task.name}</Title>
          <Tag color={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'processing'}>
            {task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '执行中'}
          </Tag>
        </Space>
        <Space>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => router.push(`/tasks/${taskId}/report`)}
          >
            质量分析报告
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const res = await fetch(`/api/tasks/${taskId}/export`);
                if (!res.ok) {
                  message.error('导出失败');
                  return;
                }
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${task.name}_校验结果.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                message.success('导出成功');
              } catch {
                message.error('导出失败');
              }
            }}
          >
            导出 Excel
          </Button>
        </Space>
      </div>

      {/* 四元版本绑定 */}
      <Card
        size="small"
        style={{ marginBottom: 24, background: '#fafafa' }}
        title={<Space><LinkOutlined /> 版本追溯</Space>}
      >
        <Descriptions column={4} size="small">
          <Descriptions.Item label="标准版本">
            <Tag color="blue">v{task.standard_version || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="数据资产">
            {assets.length > 0 ? (
              <Space>
                {assets.map(a => (
                  <Tag key={a.id} color="green">
                    <FolderOutlined /> {a.display_name} v{a.version}
                  </Tag>
                ))}
              </Space>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="任务版本">
            <Tag color="purple">v{Math.ceil((new Date(task.created_at).getTime()) / 1000)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="成果数量">
            <Tag color="orange">{deliverables.length} 份</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Descriptions column={4} style={{ marginBottom: 24 }} bordered size="small">
        <Descriptions.Item label="状态">{task.status}</Descriptions.Item>
        <Descriptions.Item label="规则数">{task.total_rules}</Descriptions.Item>
        <Descriptions.Item label="进度">{task.progress}%</Descriptions.Item>
        <Descriptions.Item label="当前阶段">{task.current_phase || '-'}</Descriptions.Item>
        {task.completed_at && (
          <Descriptions.Item label="完成时间">{new Date(task.completed_at).toLocaleString('zh-CN')}</Descriptions.Item>
        )}
        {task.started_at && (
          <Descriptions.Item label="开始时间">{new Date(task.started_at).toLocaleString('zh-CN')}</Descriptions.Item>
        )}
      </Descriptions>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="严重"
              value={task.error_count || task.error || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="警告"
              value={task.warning_count || task.warning || 0}
              valueStyle={{ color: '#d48806' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提示"
              value={task.info_count || task.info || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<InfoCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总计问题"
              value={task.total || (task.error_count || 0) + (task.warning_count || 0) + (task.info_count || 0)}
              prefix={<FileExcelOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 成果列表 */}
      {deliverables.length > 0 && (
        <>
          <Title level={4} style={{ marginBottom: 12 }}>
            <CloudDownloadOutlined style={{ marginRight: 8 }} />
            成果文件 ({deliverables.length})
          </Title>
          <Table
            columns={deliverableColumns}
            dataSource={deliverables}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />
          <Divider />
        </>
      )}

      <div style={{ marginBottom: 16 }}>
        <Text>筛选：</Text>
        <Space style={{ marginLeft: 8 }}>
          <Select
            style={{ width: 120 }}
            placeholder="严重等级"
            allowClear
            value={filterSeverity}
            onChange={setFilterSeverity}
            options={[
              { value: 'error', label: '严重' },
              { value: 'warning', label: '警告' },
              { value: 'info', label: '提示' },
            ]}
          />
          <Select
            style={{ width: 120 }}
            placeholder="校验阶段"
            allowClear
            value={filterPhase}
            onChange={setFilterPhase}
            options={[
              { value: 'field_level', label: '字段级' },
              { value: 'record_level', label: '记录级' },
              { value: 'cross_level', label: '跨数据级' },
            ]}
          />
          <Text type="secondary">共 {filteredResults.length} / {results.length} 条结果</Text>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredResults}
        rowKey="id"
        loading={resultLoading}
        locale={{ emptyText: task.total_rules === 0 ? '任务尚未执行，请先点击执行校验' : '未发现数据质量问题' }}
        pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
