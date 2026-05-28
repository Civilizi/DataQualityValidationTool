'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Upload, message, Typography, Popconfirm, Empty } from 'antd';
import { UploadOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface AssetRow {
  id: string;
  name: string;
  display_name: string | null;
  version: number;
  file_path: string | null;
  file_size: number | null;
  sheet_names: string | null;
  row_count: number | null;
  column_names: string | null;
  upload_status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '上传中' },
  parsing: { color: 'processing', label: '解析中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AssetsPage() {
  const router = useRouter();
  const { currentDomain } = useDomainStore();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentDomain?.id) loadAssets();
  }, [currentDomain?.id]);

  async function loadAssets() {
    if (!currentDomain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) setAssets(json.data);
    } catch {
      message.error('加载素材列表失败');
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
      const res = await fetch('/api/assets', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        message.success(`素材 "${json.data.display_name}" 上传成功`);
        loadAssets();
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
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('删除成功');
        loadAssets();
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }

  const columns: ColumnsType<AssetRow> = [
    {
      title: '素材名称',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (val: string | null, record) => (
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          <span>{val || record.name}</span>
        </Space>
      ),
    },
    {
      title: '工作表',
      dataIndex: 'sheet_names',
      key: 'sheet_names',
      width: 150,
      render: (val: string | null) => {
        if (!val) return '-';
        try {
          const sheets: string[] = JSON.parse(val);
          return sheets.length <= 3
            ? sheets.join(', ')
            : `${sheets.slice(0, 3).join(', ')} +${sheets.length - 3}`;
        } catch {
          return val;
        }
      },
    },
    {
      title: '数据行数',
      dataIndex: 'row_count',
      key: 'row_count',
      width: 100,
      render: (val: number | null) => val?.toLocaleString() ?? '-',
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (val: number | null) => formatBytes(val),
    },
    {
      title: '状态',
      dataIndex: 'upload_status',
      key: 'upload_status',
      width: 80,
      render: (status: string) => {
        const s = STATUS_MAP[status] || { color: 'default', label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => (val ? new Date(val).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除此素材吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (!currentDomain) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>素材池</Title>
        <Empty description="请先在顶部选择业务域" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>素材池</Title>
          <Text type="secondary">上传业务数据 Excel 文件作为校验素材</Text>
        </div>
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={uploading}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            上传素材
          </Button>
        </Upload>
      </div>

      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无素材，请上传 Excel 数据文件' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />
    </div>
  );
}
