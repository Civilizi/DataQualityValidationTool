'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button, Table, Tag, Space, message, Typography,
  Progress, Popconfirm, Empty, Card, Row, Col,
  Input, Checkbox, Divider, Alert, Statistic, Badge,
} from 'antd';
import {
  PlayCircleOutlined, PlusOutlined, DeleteOutlined, EyeOutlined,
  CheckCircleOutlined, SyncOutlined, CloseCircleOutlined,
  FolderOutlined, FileTextOutlined, TableOutlined,
  SearchOutlined, ClearOutlined, CheckOutlined,
  ArrowRightOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDomainStore } from '@/lib/stores/domainStore';
import { DIMENSION_COLORS, LEVEL_MAP, SEVERITY_MAP, parseSheetNames } from '@/lib/constants';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

interface TaskRow {
  id: string;
  name: string;
  standard_id: string | null;
  status: string;
  progress: number;
  current_phase: string | null;
  asset_ids: string | null;
  total_rules: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  pass_rate: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface RuleOption {
  id: string;
  table_name: string;
  field_name: string;
  dimension: string;
  level: string;
  executable_type: string;
  severity: string;
  original_text: string;
}

interface AssetOption {
  id: string;
  display_name: string;
  sheet_names: string | null;
  row_count: number | null;
}

const STATUS_MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  draft: { color: 'default', icon: <SyncOutlined />, label: '草稿' },
  pending: { color: 'blue', icon: <SyncOutlined />, label: '待执行' },
  running: { color: 'processing', icon: <SyncOutlined spin />, label: '执行中' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, label: '已完成' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: '失败' },
};

export default function ValidationPage() {
  const router = useRouter();
  const { currentDomain } = useDomainStore();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<RuleOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // Selection state
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [ruleSearch, setRuleSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');

  const loadTasks = useCallback(async () => {
    if (!currentDomain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentDomain]);

  useEffect(() => {
    if (currentDomain?.id) {
      loadTasks();
      loadRules();
      loadAssets();
    }
  }, [currentDomain?.id, loadTasks]);

  async function loadRules() {
    if (!currentDomain) return;
    try {
      const res = await fetch(`/api/rules/pool?domainId=${currentDomain.id}&status=confirmed`);
      const json = await res.json();
      if (json.success) setRules(json.data);
    } catch {
      // ignore
    }
  }

  async function loadAssets() {
    if (!currentDomain) return;
    try {
      const res = await fetch(`/api/assets?domainId=${currentDomain.id}`);
      const json = await res.json();
      if (json.success) setAssets(json.data);
    } catch {
      // ignore
    }
  }

  async function handleStartValidation() {
    if (selectedRuleIds.length === 0) {
      message.warning('请至少选择一条规则');
      return;
    }
    if (selectedAssetIds.length === 0) {
      message.warning('请至少选择一个文件');
      return;
    }

    const taskName = `校验_${new Date().toLocaleString('zh-CN').replace(/\//g, '-').replace(/:/g, '')}`;
    setValidating(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName,
          domainId: currentDomain!.id,
          ruleIds: selectedRuleIds,
          assetIds: selectedAssetIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        message.error(json.error?.message || '创建失败');
        setValidating(false);
        return;
      }

      // Auto-execute
      const executeRes = await fetch(`/api/tasks/${json.data.id}/execute`, { method: 'POST' });
      const executeJson = await executeRes.json();
      if (executeJson.success) {
        message.success(
          `校验完成，共发现 ${executeJson.data.issueCount} 个问题（${executeJson.data.errorCount} 严重，${executeJson.data.warningCount} 警告）`,
        );
      } else {
        message.error(executeJson.error?.message || '执行失败');
      }

      // Reset selection
      setSelectedRuleIds([]);
      setSelectedAssetIds([]);
      setRuleSearch('');
      setAssetSearch('');
      loadTasks();
    } catch {
      message.error('校验失败');
    } finally {
      setValidating(false);
    }
  }

  async function handleExecute(id: string) {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}/execute`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        message.success(
          `校验完成，共发现 ${json.data.issueCount} 个问题（${json.data.errorCount} 严重，${json.data.warningCount} 警告）`,
        );
        loadTasks();
      } else {
        message.error(json.error?.message || '执行失败');
        loadTasks();
      }
    } catch {
      message.error('执行失败');
      loadTasks();
    } finally {
      setExecutingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('删除成功');
        loadTasks();
      } else {
        message.error(json.error?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }

  // Memoized parsed sheets count per asset (for display)
  const assetSheetCounts = useMemo(
    () => new Map(assets.map(a => [a.id, parseSheetNames(a.sheet_names).length])),
    [assets],
  );

  // Filtered rules
  const filteredRules = useMemo(() => {
    if (!ruleSearch) return rules;
    const s = ruleSearch.toLowerCase();
    return rules.filter(r =>
      (r.field_name || '').toLowerCase().includes(s) ||
      (r.table_name || '').toLowerCase().includes(s) ||
      (r.original_text || '').toLowerCase().includes(s),
    );
  }, [rules, ruleSearch]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    if (!assetSearch) return assets;
    const s = assetSearch.toLowerCase();
    return assets.filter(a =>
      (a.display_name || '').toLowerCase().includes(s),
    );
  }, [assets, assetSearch]);

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const totalSheetsCount = useMemo(
    () => Array.from(assetSheetCounts.values()).reduce((sum, c) => sum + c, 0),
    [assetSheetCounts],
  );

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const columns: ColumnsType<TaskRow> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const s = STATUS_MAP[status] || { color: 'default', icon: null, label: status };
        return <Tag color={s.color}>{s.icon}{s.label}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: TaskRow) => (
        <div>
          <Progress
            percent={progress}
            size="small"
            status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
          />
          {record.current_phase && (
            <Text type="secondary" style={{ fontSize: 11 }}>{record.current_phase}</Text>
          )}
        </div>
      ),
    },
    {
      title: '规则数',
      dataIndex: 'total_rules',
      key: 'total_rules',
      width: 70,
      render: (val: number) => val || 0,
    },
    {
      title: '问题数',
      key: 'issues',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          {record.error_count > 0 && <Tag color="red">{record.error_count} 严重</Tag>}
          {record.warning_count > 0 && <Tag color="gold">{record.warning_count} 警告</Tag>}
          {record.info_count > 0 && <Tag color="blue">{record.info_count} 提示</Tag>}
          {record.error_count === 0 && record.warning_count === 0 && record.info_count === 0 && <Text type="secondary">0</Text>}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val: string) => (val ? new Date(val).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record.id)}
              loading={executingId === record.id}
            >
              执行
            </Button>
          )}
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleExecute(record.id)}
              loading={executingId === record.id}
            >
              重试
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/tasks/${record.id}`)}
            >
              查看
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Selected items preview
  const selectedRules = rules.filter(r => selectedRuleIds.includes(r.id));
  const selectedAssetsList = assets.filter(a => selectedAssetIds.includes(a.id));

  if (!currentDomain) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>数据校验</Title>
        <Empty description="请先在顶部选择业务域" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header with stats */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 8px 0' }}>数据校验</Title>
        <Text type="secondary">从规则池选择校验规则，选择数据文件，执行数据质量校验</Text>
      </div>

      {/* Stat cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => router.push('/assets')}
            style={{ textAlign: 'center' }}
          >
            <Statistic
              title="素材总数"
              value={assets.length}
              prefix={<FolderOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'center' }}>
            <Statistic
              title="工作表总数"
              value={totalSheetsCount}
              prefix={<TableOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'center' }}>
            <Statistic
              title="数据行总数"
              value={assets.reduce((sum, a) => sum + (a.row_count || 0), 0)}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              formatter={(v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            onClick={() => router.push('/assets')}
            style={{ textAlign: 'center', border: '1px dashed #1677ff' }}
          >
            <div style={{ padding: '8px 0' }}>
              <PlusOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#1677ff' }}>
                {assets.length === 0 ? '去上传素材' : '管理素材'}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: selectedRuleIds.length > 0 ? '#1677ff' : '#f0f0f0',
            color: selectedRuleIds.length > 0 ? '#fff' : '#999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 4px', fontSize: 14, fontWeight: 600,
          }}>1</div>
          <Text style={{ fontSize: 12 }}>选择规则</Text>
        </div>
        <ArrowRightOutlined style={{ color: '#d9d9d9' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: selectedAssetIds.length > 0 ? '#1677ff' : '#f0f0f0',
            color: selectedAssetIds.length > 0 ? '#fff' : '#999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 4px', fontSize: 14, fontWeight: 600,
          }}>2</div>
          <Text style={{ fontSize: 12 }}>选择文件</Text>
        </div>
        <ArrowRightOutlined style={{ color: '#d9d9d9' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: selectedRuleIds.length > 0 && selectedAssetIds.length > 0 ? '#52c41a' : '#f0f0f0',
            color: selectedRuleIds.length > 0 && selectedAssetIds.length > 0 ? '#fff' : '#999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 4px', fontSize: 14,
          }}>
            <PlayCircleOutlined />
          </div>
          <Text style={{ fontSize: 12 }}>开始校验</Text>
        </div>
      </div>

      {/* Three-column panel */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* Left: Rule selection */}
        <Col span={10}>
          <Card
            title={`选择规则 ${selectedRuleIds.length > 0 && <Badge count={selectedRuleIds.length} style={{ backgroundColor: '#1677ff' }} />}`}
            size="small"
            bodyStyle={{ padding: 0 }}
            style={{ height: 380, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '12px 16px 8px' }}>
              <Input
                size="small"
                placeholder="搜索规则名称或字段..."
                prefix={<SearchOutlined />}
                value={ruleSearch}
                onChange={e => setRuleSearch(e.target.value)}
                allowClear
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
              {filteredRules.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={ruleSearch ? '无匹配规则' : '暂无已确认规则'}
                  style={{ marginTop: 60 }}
                  imageStyle={{ height: 40 }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredRules.map(rule => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: selectedRuleIds.includes(rule.id) ? '#e6f4ff' : 'transparent',
                        border: selectedRuleIds.includes(rule.id) ? '1px solid #91caff' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => toggleRule(rule.id)}
                    >
                      <Space size={8}>
                        <Checkbox checked={selectedRuleIds.includes(rule.id)} />
                        <div>
                          <Text strong style={{ fontSize: 13 }}>
                            {rule.field_name || rule.table_name || rule.id.slice(0, 8)}
                          </Text>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <Tag color={DIMENSION_COLORS[rule.dimension] || 'default'} style={{ margin: 0, fontSize: 10 }}>
                              {rule.dimension}
                            </Tag>
                            <Tag color={LEVEL_MAP[rule.level]?.color || 'default'} style={{ margin: 0, fontSize: 10 }}>
                              {LEVEL_MAP[rule.level]?.label || rule.level}
                            </Tag>
                            <Tag color={SEVERITY_MAP[rule.severity]?.color || 'default'} style={{ margin: 0, fontSize: 10 }}>
                              {SEVERITY_MAP[rule.severity]?.label || rule.severity}
                            </Tag>
                          </div>
                        </div>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Divider style={{ margin: 0 }} />
            <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" type="link" onClick={() => setSelectedRuleIds(filteredRules.map(r => r.id))}>
                全选
              </Button>
              <Button size="small" type="link" onClick={() => setSelectedRuleIds([])}>
                清空
              </Button>
            </div>
          </Card>
        </Col>

        {/* Middle: File selection */}
        <Col span={10}>
          <Card
            title={`选择文件 ${selectedAssetIds.length > 0 && <Badge count={selectedAssetIds.length} style={{ backgroundColor: '#1677ff' }} />}`}
            size="small"
            bodyStyle={{ padding: 0 }}
            style={{ height: 380, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '12px 16px 8px' }}>
              <Input
                size="small"
                placeholder="搜索文件名称..."
                prefix={<SearchOutlined />}
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                allowClear
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
              {filteredAssets.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={assetSearch ? '无匹配文件' : '暂无素材'}
                  style={{ marginTop: 60 }}
                  imageStyle={{ height: 40 }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: selectedAssetIds.includes(asset.id) ? '#e6f4ff' : 'transparent',
                        border: selectedAssetIds.includes(asset.id) ? '1px solid #91caff' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => toggleAsset(asset.id)}
                    >
                      <Space size={8}>
                        <Checkbox checked={selectedAssetIds.includes(asset.id)} />
                        <div>
                          <Text strong style={{ fontSize: 13 }}>
                            {asset.display_name || asset.id.slice(0, 8)}
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {asset.row_count || 0} 行数据
                            </Text>
                            {(assetSheetCounts.get(asset.id) || 0) > 0 && (
                              <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                · {assetSheetCounts.get(asset.id)} 个工作表
                              </Text>
                            )}
                          </div>
                        </div>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Divider style={{ margin: 0 }} />
            <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <Button size="small" type="link" onClick={() => setSelectedAssetIds(filteredAssets.map(a => a.id))}>
                全选
              </Button>
              <Button size="small" type="link" onClick={() => setSelectedAssetIds([])}>
                清空
              </Button>
            </div>
          </Card>
        </Col>

        {/* Right: Summary + Action */}
        <Col span={4}>
          <Card
            title="校验配置"
            size="small"
            style={{ height: 380 }}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>已选规则</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>
                  {selectedRuleIds.length}
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>已选文件</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>
                  {selectedAssetIds.length}
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartValidation}
                disabled={selectedRuleIds.length === 0 || selectedAssetIds.length === 0}
                loading={validating}
                block
                style={{ height: 44, fontSize: 15 }}
              >
                开始校验
              </Button>
              {(selectedRuleIds.length > 0 || selectedAssetIds.length > 0) && (
                <Button
                  size="small"
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setSelectedRuleIds([]);
                    setSelectedAssetIds([]);
                    setRuleSearch('');
                    setAssetSearch('');
                  }}
                  style={{ marginTop: 8 }}
                >
                  重置选择
                </Button>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Selection summary bar */}
      {(selectedRules.length > 0 || selectedAssetsList.length > 0) && (
        <Card size="small" style={{ marginBottom: 24, background: '#f6f8fa' }}>
          <Space size={24}>
            {selectedRules.length > 0 && (
              <div>
                <Text strong>已选规则：</Text>
                {selectedRules.slice(0, 5).map((r, i) => (
                  <Tag key={r.id} closable onClose={() => toggleRule(r.id)} color="blue" style={{ margin: '0 4px 0 0' }}>
                    {r.field_name || r.table_name}
                  </Tag>
                ))}
                {selectedRules.length > 5 && <Text type="secondary">+{selectedRules.length - 5} 更多</Text>}
              </div>
            )}
            {selectedAssetsList.length > 0 && (
              <div>
                <Text strong>已选文件：</Text>
                {selectedAssetsList.slice(0, 5).map(a => (
                  <Tag key={a.id} closable onClose={() => toggleAsset(a.id)} color="green" style={{ margin: '0 4px 0 0' }}>
                    {a.display_name}
                  </Tag>
                ))}
                {selectedAssetsList.length > 5 && <Text type="secondary">+{selectedAssetsList.length - 5} 更多</Text>}
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* Task history */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>校验记录</Title>
        {tasks.length > 0 && (
          <Text type="secondary">共 {tasks.length} 条记录</Text>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: '暂无校验任务，请点击上方配置开始校验' }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />
    </div>
  );
}
