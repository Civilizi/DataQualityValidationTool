'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button, Table, Tag, Space, Typography, Select, message, Spin, Empty, Card, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface StandardOption {
  id: string;
  display_name: string;
  version: number;
  name: string;
}

interface RuleDiff {
  id: string;
  table_name: string | null;
  field_name: string | null;
  dimension: string | null;
  level: string | null;
  original_text: string | null;
  executable_type: string | null;
  severity: string;
  status: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  oldSeverity?: string;
  oldType?: string;
  oldStatus?: string;
}

const DIMENSION_COLORS: Record<string, string> = {
  完整性: 'blue',
  准确性: 'green',
  有效性: 'orange',
  唯一性: 'purple',
  一致性: 'cyan',
  及时性: 'gold',
};

const LEVEL_MAP: Record<string, string> = {
  field: '字段级',
  record: '记录级',
  cross_dataset: '跨数据集级',
};

const RULE_TYPES: Record<string, string> = {
  not_null: '非空',
  regex: '格式',
  length_range: '长度范围',
  enum_check: '枚举',
  unique: '唯一性',
  date_format: '日期格式',
  value_range: '值域范围',
  cross_field: '跨字段',
  cross_table: '跨表关联',
};

function CompareStandardsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultId = searchParams.get('id');

  const [standards, setStandards] = useState<StandardOption[]>([]);
  const [idA, setIdA] = useState(defaultId || '');
  const [idB, setIdB] = useState('');
  const [loading, setLoading] = useState(false);
  const [diffs, setDiffs] = useState<RuleDiff[]>([]);
  const [summary, setSummary] = useState<{ added: number; removed: number; modified: number; unchanged: number } | null>(null);
  const [filterChange, setFilterChange] = useState<string>();

  useEffect(() => {
    loadStandards();
  }, []);

  useEffect(() => {
    if (defaultId) setIdA(defaultId);
  }, [defaultId]);

  async function loadStandards() {
    try {
      const res = await fetch('/api/standards?domainId=all');
      const json = await res.json();
      if (json.success) setStandards(json.data);
    } catch {
      // ignore
    }
  }

  async function handleCompare() {
    if (!idA || !idB) {
      message.warning('请选择两个版本进行对比');
      return;
    }
    if (idA === idB) {
      message.warning('请选择不同的版本');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/standards/compare?idA=${idA}&idB=${idB}`);
      const json = await res.json();
      if (json.success) {
        setDiffs(json.data.diffs);
        setSummary(json.data.summary);
      } else {
        message.error(json.error?.message || '对比失败');
      }
    } catch {
      message.error('对比失败');
    } finally {
      setLoading(false);
    }
  }

  const filteredDiffs = diffs.filter(d => {
    if (filterChange && d.changeType !== filterChange) return false;
    return true;
  });

  const columns: ColumnsType<RuleDiff> = [
    {
      title: '变更',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 60,
      render: (v: string) => {
        const map: Record<string, { color: string; label: string }> = {
          added: { color: 'green', label: '+' },
          removed: { color: 'red', label: '-' },
          modified: { color: 'orange', label: '~' },
          unchanged: { color: 'default', label: '=' },
        };
        const m = map[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '表单',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 100,
    },
    {
      title: '字段',
      dataIndex: 'field_name',
      key: 'field_name',
      width: 100,
    },
    {
      title: '维度',
      dataIndex: 'dimension',
      key: 'dimension',
      width: 80,
      render: (v: string) => <Tag color={DIMENSION_COLORS[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v: string) => LEVEL_MAP[v] || v,
    },
    {
      title: '规则类型',
      dataIndex: 'executable_type',
      key: 'executable_type',
      width: 100,
      render: (v: string, record) => {
        const label = RULE_TYPES[v] || v;
        return record.oldType ? (
          <Text delete style={{ marginRight: 4 }}>{RULE_TYPES[record.oldType] || record.oldType}</Text>
        ) : label;
      },
    },
    {
      title: '严重等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 70,
      render: (v: string, record) => (
        <Space size={2}>
          {record.oldSeverity && record.oldSeverity !== v && (
            <Tag color="default" style={{ margin: 0, fontSize: 10 }}>{record.oldSeverity}</Tag>
          )}
          <Tag color={v === 'error' ? 'red' : v === 'warning' ? 'gold' : 'blue'}>{v}</Tag>
        </Space>
      ),
    },
    {
      title: '原始规则',
      dataIndex: 'original_text',
      key: 'original_text',
      ellipsis: true,
    },
  ];

  const nameA = standards.find(s => s.id === idA);
  const nameB = standards.find(s => s.id === idB);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/standards')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>标准版本对比</Title>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="选择版本 A"
            value={idA || undefined}
            onChange={setIdA}
            options={standards.map(s => ({
              value: s.id,
              label: `${s.display_name} v${s.version}`,
            }))}
          />
          <SwapOutlined style={{ fontSize: 16, color: '#1677ff' }} />
          <Select
            style={{ width: 200 }}
            placeholder="选择版本 B"
            value={idB || undefined}
            onChange={setIdB}
            options={standards.map(s => ({
              value: s.id,
              label: `${s.display_name} v${s.version}`,
            }))}
          />
          <Button type="primary" icon={<SwapOutlined />} onClick={handleCompare} loading={loading}>
            对比
          </Button>
        </Space>
      </Card>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="新增" value={summary.added} valueStyle={{ color: '#389e0d' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="删除" value={summary.removed} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="修改" value={summary.modified} valueStyle={{ color: '#d48806' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="未变" value={summary.unchanged} />
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ marginBottom: 16 }}>
        <Text>筛选：</Text>
        <Select
          style={{ width: 120, marginLeft: 8 }}
          placeholder="变更类型"
          allowClear
          value={filterChange}
          onChange={setFilterChange}
          options={[
            { value: 'added', label: '新增' },
            { value: 'removed', label: '删除' },
            { value: 'modified', label: '修改' },
            { value: 'unchanged', label: '未变' },
          ]}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : diffs.length > 0 ? (
        <Table
          columns={columns}
          dataSource={filteredDiffs}
          rowKey="id"
          locale={{ emptyText: '无符合条件的差异' }}
          pagination={{ pageSize: 30, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1000 }}
        />
      ) : (
        <Empty description={summary ? '两个版本完全一致' : '请选择版本后点击对比'} />
      )}
    </div>
  );
}

export default function CompareStandardsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>}>
      <CompareStandardsInner />
    </Suspense>
  );
}
