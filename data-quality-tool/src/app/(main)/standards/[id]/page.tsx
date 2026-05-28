'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Tag, Space, message, Typography, Spin, Select, Modal, Input, Form, Alert } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, ReloadOutlined, EditOutlined, WarningOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

interface RuleRow {
  id: string;
  table_name: string;
  field_name: string;
  dimension: string;
  level: string;
  original_text: string;
  executable_type: string;
  executable_params: string;
  severity: string;
  confidence: string;
  status: string;
  sort_order: number;
}

const DIMENSION_COLORS: Record<string, string> = {
  完整性: 'blue',
  准确性: 'green',
  有效性: 'orange',
  唯一性: 'purple',
  一致性: 'cyan',
  及时性: 'gold',
};

const CONFIDENCE_MAP: Record<string, { color: string; label: string }> = {
  high: { color: 'success', label: '高' },
  medium: { color: 'warning', label: '中' },
  low: { color: 'error', label: '低' },
};

const LEVEL_MAP: Record<string, { color: string; label: string }> = {
  field: { color: 'blue', label: '字段级' },
  record: { color: 'orange', label: '记录级' },
  cross_dataset: { color: 'purple', label: '跨数据集级' },
};

const SEVERITY_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: '严重' },
  warning: { color: 'gold', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

const RULE_TYPES = [
  { value: 'not_null', label: '非空校验' },
  { value: 'regex', label: '格式校验' },
  { value: 'length_range', label: '长度范围' },
  { value: 'enum_check', label: '枚举校验' },
  { value: 'unique', label: '唯一性校验' },
  { value: 'date_format', label: '日期格式' },
  { value: 'value_range', label: '值域范围' },
  { value: 'cross_field', label: '跨字段逻辑' },
  { value: 'cross_table', label: '跨表关联' },
];

const CONFLICT_TYPE_MAP: Record<string, string> = {
  duplicate_rule: '重复规则',
  range_overlap: '范围冲突',
  format_conflict: '格式冲突',
  nullability_conflict: '非空冲突',
};

export default function StandardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const standardId = params.id as string;

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [standardName, setStandardName] = useState('');
  const [parseStatus, setParseStatus] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>();
  const [filterConfidence, setFilterConfidence] = useState<string>();
  const [conflicts, setConflicts] = useState<Array<{ ruleA: string; ruleB: string; conflictType: string; description: string; severity: string }>>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [editForm] = Form.useForm();

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/standards/${standardId}`);
      const json = await res.json();
      if (json.success) {
        setStandardName(json.data.standard?.display_name || '');
        setParseStatus(json.data.standard?.parse_status || '');
        setRules(json.data.rules || []);
        // Auto-detect conflicts
        checkConflicts();
      }
    } catch {
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  }, [standardId]);

  async function checkConflicts() {
    setConflictLoading(true);
    try {
      const res = await fetch(`/api/rules/conflicts?standardId=${standardId}`);
      const json = await res.json();
      if (json.success) setConflicts(json.data);
    } catch {
      // ignore
    } finally {
      setConflictLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  async function handleParse() {
    setParsing(true);
    try {
      const res = await fetch(`/api/standards/${standardId}/parse`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        message.success(`AI 解析完成，共解析 ${json.data.rules?.length || 0} 条规则`);
        loadRules();
      } else {
        message.error(json.error?.message || '解析失败');
      }
    } catch {
      message.error('解析失败');
    } finally {
      setParsing(false);
    }
  }

  async function handleBatchConfirm() {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要确认的规则');
      return;
    }
    try {
      const res = await fetch('/api/rules/batch-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleIds: selectedRowKeys }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(`已确认 ${json.data.confirmedCount || 0} 条规则`);
        setSelectedRowKeys([]);
        loadRules();
      }
    } catch {
      message.error('确认失败');
    }
  }

  async function handleEditRule(values: any) {
    if (!editingRule) return;
    try {
      const res = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('规则已更新');
        setEditModalOpen(false);
        setEditingRule(null);
        loadRules();
      }
    } catch {
      message.error('更新失败');
    }
  }

  function openEditModal(rule: RuleRow) {
    setEditingRule(rule);
    try {
      const params = rule.executable_params ? JSON.parse(rule.executable_params) : {};
      editForm.setFieldsValue({
        executable_type: rule.executable_type,
        executable_params: JSON.stringify(params, null, 2),
        severity: rule.severity,
      });
    } catch {
      editForm.setFieldsValue({
        executable_type: rule.executable_type,
        executable_params: rule.executable_params,
        severity: rule.severity,
      });
    }
    setEditModalOpen(true);
  }

  // Build conflict set for quick lookup
  const conflictRuleIds = new Set<string>();
  for (const c of conflicts) {
    conflictRuleIds.add(c.ruleA);
    conflictRuleIds.add(c.ruleB);
  }

  // Filter rules
  const filteredRules = rules.filter(r => {
    if (filterLevel && r.level !== filterLevel) return false;
    if (filterConfidence && r.confidence !== filterConfidence) return false;
    return true;
  });

  // Sort: low confidence first
  const sortedRules = [...filteredRules].sort((a, b) => {
    const order = { low: 0, medium: 1, high: 2 };
    return (order[a.confidence as keyof typeof order] ?? 1) - (order[b.confidence as keyof typeof order] ?? 1);
  });

  const columns: ColumnsType<RuleRow> = [
    {
      title: '表单名称',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 120,
    },
    {
      title: '字段名',
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
      render: (v: string) => {
        const m = LEVEL_MAP[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '原始规则',
      dataIndex: 'original_text',
      key: 'original_text',
      ellipsis: true,
    },
    {
      title: '可执行类型',
      dataIndex: 'executable_type',
      key: 'executable_type',
      width: 100,
      render: (v: string) => {
        const found = RULE_TYPES.find(t => t.value === v);
        return found?.label || v;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 80,
      render: (v: string) => {
        const m = CONFIDENCE_MAP[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '严重等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 70,
      render: (v: string) => {
        const m = SEVERITY_MAP[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (v: string, record) => (
        <Space size={4}>
          <Tag color={v === 'confirmed' ? 'success' : v === 'rejected' ? 'error' : 'default'}>
            {v === 'confirmed' ? '已确认' : v === 'rejected' ? '已拒绝' : '待确认'}
          </Tag>
          {conflictRuleIds.has(record.id) && (
            <Tag color="red" style={{ margin: 0 }}>
              <WarningOutlined /> 冲突
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/standards')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>{standardName}</Title>
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleParse}
            loading={parsing}
            disabled={parseStatus === 'confirmed'}
          >
            AI 解析规则
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleBatchConfirm}
            disabled={selectedRowKeys.length === 0}
          >
            批量确认 ({selectedRowKeys.length})
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text>筛选：</Text>
        <Space style={{ marginLeft: 8 }}>
          <Select
            style={{ width: 120 }}
            placeholder="级别"
            allowClear
            value={filterLevel}
            onChange={setFilterLevel}
            options={[
              { value: 'field', label: '字段级' },
              { value: 'record', label: '记录级' },
              { value: 'cross_dataset', label: '跨数据集级' },
            ]}
          />
          <Select
            style={{ width: 120 }}
            placeholder="置信度"
            allowClear
            value={filterConfidence}
            onChange={setFilterConfidence}
            options={[
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
            ]}
          />
        </Space>
      </div>

      {conflicts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`检测到 ${conflicts.length} 组规则冲突`}
          description={
            <div style={{ marginTop: 8 }}>
              {conflicts.map((c, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <Tag color={c.severity === 'error' ? 'red' : 'gold'}>{CONFLICT_TYPE_MAP[c.conflictType] || c.conflictType}</Tag>
                  <Text>{c.description}</Text>
                </div>
              ))}
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={sortedRules}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        locale={{ emptyText: '暂无规则，请点击 "AI 解析规则"' }}
        pagination={{ pageSize: 30, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title="编辑规则"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingRule(null); }}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditRule}>
          <Form.Item name="executable_type" label="可执行类型" rules={[{ required: true }]}>
            <Select options={RULE_TYPES} />
          </Form.Item>
          <Form.Item name="executable_params" label="规则参数 (JSON)">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="severity" label="严重等级">
            <Select>
              <Select.Option value="error">严重</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="info">提示</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => { setEditModalOpen(false); setEditingRule(null); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
