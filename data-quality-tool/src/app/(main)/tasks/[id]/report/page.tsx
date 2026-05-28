'use client';

import React, { useState, useEffect } from 'react';
import {
  Button, Card, Typography, Spin, Space, message,
  Breadcrumb, Divider,
} from 'antd';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeftOutlined, DownloadOutlined, CopyOutlined,
  RobotOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';

const { Title } = Typography;

export default function TaskReportPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [taskName, setTaskName] = useState('');

  useEffect(() => {
    loadTask();
  }, [taskId]);

  async function loadTask() {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (json.success) setTaskName(json.data.name);
    } catch {
      // ignore
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/report`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setReport(json.data.content);
        message.success('报告生成成功');
      } else {
        message.error(json.error?.message || '报告生成失败');
      }
    } catch {
      message.error('报告生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }

  async function handleDownloadMd() {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskName}_质量分析报告.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('报告已下载');
  }

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item onClick={() => router.push('/validation')} style={{ cursor: 'pointer' }}>
          数据校验
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => router.push(`/tasks/${taskId}`)} style={{ cursor: 'pointer' }}>
          {taskName || '任务详情'}
        </Breadcrumb.Item>
        <Breadcrumb.Item>质量分析报告</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <RobotOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          质量分析报告
        </Title>
        {report && (
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>复制</Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadMd}>下载 Markdown</Button>
            <Button icon={<ReloadOutlined />} onClick={handleGenerate} loading={loading}>重新生成</Button>
          </Space>
        )}
      </div>

      {loading && !report ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            AI 正在分析校验结果，生成质量分析报告...
          </Typography.Text>
        </div>
      ) : report ? (
        <Card>
          <div style={{ maxWidth: 800 }}>
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              基于校验结果，AI 将自动生成完整的质量分析报告，包括总体评估、问题分布分析和改进建议。
            </Typography.Text>
            <Button type="primary" size="large" icon={<RobotOutlined />} onClick={handleGenerate}>
              生成质量分析报告
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
