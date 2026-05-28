'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Table, Tag, Space, message, Typography, Popconfirm, Empty,
  Modal, Progress, Select,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, FileExcelOutlined, PauseCircleOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

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

  // Chunked upload state
  const [chunkModalVisible, setChunkModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadPaused, setUploadPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef(false);

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

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    setChunkModalVisible(true);
    setUploadProgress(0);
    setUploadStatusText('');
    setUploadPaused(false);
    setSessionId(null);
    return false;
  }

  async function handleChunkUpload() {
    if (!selectedFile || !currentDomain) return;
    setUploading(true);
    abortRef.current = false;

    try {
      // Step 1: Initialize upload session
      const initRes = await fetch('/api/assets/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          chunkSize: CHUNK_SIZE,
          domainId: currentDomain.id,
        }),
      });
      const initJson = await initRes.json();
      if (!initJson.success) {
        message.error(initJson.error?.message || '初始化上传失败');
        setUploading(false);
        return;
      }

      const sid = initJson.data.sessionId;
      const totalChunks = initJson.data.totalChunks;
      setSessionId(sid);

      // Check for already uploaded chunks
      const statusRes = await fetch(`/api/assets/upload/status?sessionId=${sid}`);
      const statusJson = await statusRes.json();
      let uploadedChunks: number[] = [];
      if (statusJson.success) {
        uploadedChunks = statusJson.data.uploadedChunks || [];
      }

      setUploadStatusText(`已恢复 ${uploadedChunks.length}/${totalChunks} 个分片`);

      // Step 2: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) {
          setUploadStatusText('已暂停上传');
          setUploadPaused(true);
          setUploading(false);
          return;
        }

        if (uploadedChunks.includes(i)) {
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
          continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        const formData = new FormData();
        formData.append('sessionId', sid);
        formData.append('chunkIndex', String(i));
        formData.append('chunk', chunk);

        const chunkRes = await fetch('/api/assets/upload/chunk', { method: 'POST', body: formData });
        const chunkJson = await chunkRes.json();
        if (!chunkJson.success) {
          message.error(chunkJson.error?.message || '分片上传失败');
          setUploading(false);
          return;
        }

        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        setUploadStatusText(`正在上传 ${i + 1}/${totalChunks}`);
      }

      // Step 3: Complete upload
      setUploadStatusText('正在合并文件...');
      const completeRes = await fetch('/api/assets/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, domainId: currentDomain.id }),
      });
      const completeJson = await completeRes.json();
      if (completeJson.success) {
        message.success(`素材上传成功: ${selectedFile.name}`);
        setChunkModalVisible(false);
        setSelectedFile(null);
        setSessionId(null);
        loadAssets();
      } else {
        message.error(completeJson.error?.message || '合并文件失败');
      }
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  }

  function handlePauseUpload() {
    abortRef.current = true;
  }

  async function handleCancelUpload() {
    abortRef.current = true;
    if (sessionId) {
      try {
        await fetch(`/api/assets/upload/status?sessionId=${sessionId}`, { method: 'DELETE' });
      } catch {
        // ignore
      }
    }
    setChunkModalVisible(false);
    setUploading(false);
    setUploadPaused(false);
    setSelectedFile(null);
    setSessionId(null);
  }

  async function handleResumeUpload() {
    setUploadPaused(false);
    setUploading(true);
    // Re-trigger the upload from where it left off
    // The server already tracks uploaded chunks, so we just continue
    abortRef.current = false;
    await handleChunkUpload();
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
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
          <Tag color="blue" style={{ marginLeft: 4 }}>v{record.version}</Tag>
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
          <Text type="secondary">上传业务数据 Excel 文件作为校验素材，支持分片断点续传</Text>
        </div>
        <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls';
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFileSelect(file);
          };
          input.click();
        }}>
          上传素材
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无素材，请上传 Excel 数据文件' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />

      {/* Chunked upload modal */}
      <Modal
        title={<Space><CloudUploadOutlined /> 分片上传</Space>}
        open={chunkModalVisible}
        onCancel={handleCancelUpload}
        footer={null}
        closable={!uploading}
        maskClosable={!uploading}
      >
        <div style={{ padding: '16px 0' }}>
          <Space style={{ marginBottom: 16 }}>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <Text strong>{selectedFile?.name}</Text>
            <Text type="secondary">{formatBytes(selectedFile?.size ?? null)}</Text>
          </Space>

          <Progress percent={uploadProgress} status={uploadPaused ? 'exception' : 'active'} />

          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            {uploadStatusText || '准备上传...'}
          </Text>

          <Space style={{ marginTop: 16 }}>
            {uploading && (
              <Button danger icon={<PauseCircleOutlined />} onClick={handlePauseUpload}>
                暂停
              </Button>
            )}
            {uploadPaused && (
              <Button type="primary" icon={<UploadOutlined />} onClick={handleResumeUpload}>
                继续上传
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </div>
  );
}
