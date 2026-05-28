'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Upload, message, Typography, Empty } from 'antd';
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import type { ColumnsType } from 'antd/es/table';
import { Popconfirm } from 'antd';

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

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待解析' },
  parsing: { color: 'processing', label: '解析中' },
  parsed: { color: 'warning', label: '待确认' },
  confirmed: { color: 'success', label: '已确认' },
  failed: { color: 'error', label: '解析失败' },
};

export default function StandardsPage() {
  const router = useRouter();
  const { currentDomain } = useDomainStore();
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentDomain?.id) loadStandards();
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
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }

  const columns: ColumnsType<StandardRow> = [
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
      </div>

      <Table
        columns={columns}
        dataSource={standards}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无标准，请上传 Excel 标准文件' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />
    </div>
  );
}
