'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Tag, Space, Upload, message, Typography, Empty, Tabs, Modal, Form, Input, Select, Popconfirm } from 'antd';
import { UploadOutlined, EyeOutlined, DeleteOutlined, DiffOutlined, EditOutlined, WarningOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import { DIMENSION_COLORS, LEVEL_MAP, SEVERITY_MAP, CONFIDENCE_MAP, RULE_TYPES } from '@/lib/constants';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface StandardRow {
  id: string;
  name: string;
  display_name: string;
  version: number;
  file_path: string;
  parse_status: string;
  total_rules: number;
  confirmed_rules: number;
  created_at: string;
}

interface RuleRow {
  id: string;
  standard_id: string;
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
  standard_name: string;
  standard_display_name: string;
  standard_version: number;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待解析' },
  parsing: { color: 'processing', label: '解析中' },
  parsed: { color: 'warning', label: '待确认' },
  confirmed: { color: 'success', label: '已确认' },
  failed: { color: 'error', label: '解析失败' },
};

// imported from @/lib/constants

export default function StandardsPage() {
  const router = useRouter();
  const { currentDomain } = useDomainStore();
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
  const [editForm] = Form.useForm();
  const [filterStandard, setFilterStandard] = useState<string>();
  const [filterDimension, setFilterDimension] = useState<string>();

  useEffect(() => {
    if (currentDomain?.id) {
      loadStandards();
      loadRules();
    }
  }, [currentDomain?.id]);

  async function loadStandards() {
    if (!currentDomain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/standards?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) setStandards(json.data);
    } catch {
      message.error('加载标准列表失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadRules() {
    if (!currentDomain) return;
    setRulesLoading(true);
    try {
      const res = await fetch(`/api/rules/pool?domainId=${currentDomain.id}&status=confirmed`);
      const json = await res.json();
      if (json.success) setRules(json.data);
    } catch {
      message.error('加载规则池失败');
    } finally {
      setRulesLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!currentDomain) {
      message.error('请先选择业务域');
      return false;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('domainId', currentDomain.id);
      const res = await fetch('/api/standards', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        message.success(`标准 "${json.data.display_name}" 上传成功`);
        loadStandards();
      } else {
        message.error(json.error?.message || '上传失败');
      }
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/standards/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('删除成功');
        loadStandards();
        loadRules();
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }

  async function handleDeleteRule(id: string) {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('规则已删除');
        loadRules();
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
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
      setEditModalOpen(false);
      setEditingRule(null);
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

  const standardColumns: ColumnsType<StandardRow> = [
    {
      title: '标准名称',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '解析状态',
      dataIndex: 'parse_status',
      key: 'parse_status',
      render: (status: string) => {
        const s = STATUS_MAP[status] || { color: 'default', label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '规则数',
      dataIndex: 'total_rules',
      key: 'total_rules',
      render: (val: number) => val || 0,
    },
    {
      title: '已确认',
      dataIndex: 'confirmed_rules',
      key: 'confirmed_rules',
      render: (val: number, record: StandardRow) => `${val || 0} / ${record.total_rules || 0}`,
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/standards/${record.id}`)}
          >
            查看规则
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除标准将同时删除关联的所有规则"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredRules = rules.filter(r => {
    if (filterStandard && r.standard_id !== filterStandard) return false;
    if (filterDimension && r.dimension !== filterDimension) return false;
    return true;
  });

  const ruleColumns: ColumnsType<RuleRow> = [
    {
      title: '所属标准',
      key: 'standard',
      width: 160,
      render: (_, r) => <Text>{r.standard_display_name || r.standard_name}</Text>,
    },
    {
      title: '表单名称',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 100,
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
      width: 90,
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
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDeleteRule(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const uniqueStandards = Array.from(new Map(standards.map(s => [s.id, s])).values());

  const dimensionOptions = [
    { label: '字段级', value: 'field' },
    { label: '记录级', value: 'record' },
    { label: '跨数据集级', value: 'cross_dataset' },
  ];

  if (!currentDomain) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>数据标准</Title>
        <Empty description="请先在顶部选择业务域" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>数据标准</Title>
          <Text type="secondary">上传业务数据质量标准文件，AI 自动解析校验规则</Text>
        </div>
        <Space>
          <Button icon={<DiffOutlined />} onClick={() => router.push('/standards/compare')}>
            版本对比
          </Button>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={uploading}
          >
            <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
              上传标准
            </Button>
          </Upload>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="standards"
        items={[
          {
            key: 'standards',
            label: `标准列表 (${standards.length})`,
            children: (
              <Table
                columns={standardColumns}
                dataSource={standards}
                rowKey="id"
                loading={loading}
                locale={{ emptyText: '暂无标准，请上传 Excel 标准文件' }}
                pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
              />
            ),
          },
          {
            key: 'rules',
            label: `规则池 (${rules.length})`,
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Text>筛选：</Text>
                  <Space style={{ marginLeft: 8 }}>
                    <Select
                      style={{ width: 160 }}
                      placeholder="所属标准"
                      allowClear
                      value={filterStandard}
                      onChange={setFilterStandard}
                      options={uniqueStandards.map(s => ({
                        label: `${s.display_name} v${s.version}`,
                        value: s.id,
                      }))}
                    />
                    <Select
                      style={{ width: 120 }}
                      placeholder="维度"
                      allowClear
                      value={filterDimension}
                      onChange={setFilterDimension}
                      options={dimensionOptions}
                    />
                  </Space>
                </div>
                <Table
                  columns={ruleColumns}
                  dataSource={filteredRules}
                  rowKey="id"
                  loading={rulesLoading}
                  locale={{ emptyText: '暂无已确认规则，请先上传标准并确认规则' }}
                  pagination={{ pageSize: 30, showTotal: (t) => `共 ${t} 条` }}
                  scroll={{ x: 1200 }}
                />
              </>
            ),
          },
        ]}
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
