'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Space, Typography, Select, DatePicker, message,
} from 'antd';
import {
  FileAddOutlined, CloudUploadOutlined, CheckSquareOutlined,
  PlayCircleOutlined, StopOutlined, SyncOutlined,
} from '@ant-design/icons';
import { useDomainStore } from '@/lib/stores/domainStore';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface AuditLogRow {
  id: string;
  domain_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
}

const ACTION_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  standard_upload: { icon: <FileAddOutlined />, label: '标准上传', color: 'blue' },
  standard_parse: { icon: <SyncOutlined />, label: 'AI 解析', color: 'purple' },
  standard_delete: { icon: <StopOutlined />, label: '标准删除', color: 'red' },
  asset_upload: { icon: <CloudUploadOutlined />, label: '资产上传', color: 'green' },
  task_create: { icon: <PlayCircleOutlined />, label: '任务创建', color: 'cyan' },
  task_complete: { icon: <CheckSquareOutlined />, label: '任务完成', color: 'success' },
};

export default function HistoryPage() {
  const { currentDomain } = useDomainStore();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterAction, setFilterAction] = useState<string>();
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const loadLogs = useCallback(async () => {
    if (!currentDomain) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        domainId: currentDomain.id,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filterAction) params.set('action', filterAction);
      if (dateRange?.[0]) params.set('from', dateRange[0].toISOString());
      if (dateRange?.[1]) params.set('to', dateRange[1].toISOString());

      const res = await fetch(`/api/history?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.items);
        setTotal(json.data.total);
      }
    } catch {
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [currentDomain, page, pageSize, filterAction, dateRange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns: ColumnsType<AuditLogRow> = [
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const m = ACTION_MAP[action] || { icon: null, label: action, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '实体类型',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 120,
      render: (v: string) => {
        const labels: Record<string, string> = {
          data_standard: '数据标准',
          data_asset: '数据资产',
          validation_task: '校验任务',
        };
        return labels[v] || v;
      },
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (val: string | null) => {
        if (!val) return '-';
        try {
          const d = JSON.parse(val);
          const parts: string[] = [];
          if (d.file_name) parts.push(`文件: ${d.file_name}`);
          if (d.sheet_count) parts.push(`工作表: ${d.sheet_count}`);
          if (d.row_count !== undefined) parts.push(`数据行: ${d.row_count}`);
          if (d.rule_count !== undefined) parts.push(`规则数: ${d.rule_count}`);
          if (d.total_issues !== undefined) parts.push(`问题数: ${d.total_issues}`);
          if (d.error_count !== undefined) parts.push(`严重: ${d.error_count}`);
          if (d.warning_count !== undefined) parts.push(`警告: ${d.warning_count}`);
          if (d.name) parts.push(`名称: ${d.name}`);
          if (d.standard_name) parts.push(`标准: ${d.standard_name}`);
          return parts.join(' | ') || val;
        } catch {
          return val;
        }
      },
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val: string) => (val ? new Date(val).toLocaleString('zh-CN') : '-'),
    },
  ];

  if (!currentDomain) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>历史记录</Title>
        <Typography.Text type="secondary">请先在顶部选择业务域</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 8 }}>历史记录</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        查看业务域内的所有操作记录，支持按时间范围和操作类型筛选
      </Text>

      <div style={{ marginBottom: 16 }}>
        <Text>筛选：</Text>
        <Space style={{ marginLeft: 8 }}>
          <Select
            style={{ width: 140 }}
            placeholder="操作类型"
            allowClear
            value={filterAction}
            onChange={setFilterAction}
            options={[
              { value: 'standard_upload', label: '标准上传' },
              { value: 'standard_parse', label: 'AI 解析' },
              { value: 'standard_delete', label: '标准删除' },
              { value: 'asset_upload', label: '资产上传' },
              { value: 'task_create', label: '任务创建' },
              { value: 'task_complete', label: '任务完成' },
            ]}
          />
          <RangePicker onChange={(dates: any) => setDateRange(dates)} />
          <Text type="secondary">共 {total} 条记录</Text>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无操作记录' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
