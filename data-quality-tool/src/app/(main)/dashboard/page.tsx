'use client';

import { Card, Row, Col, Statistic, Typography, Empty, Divider } from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  const stats = [
    {
      title: '数据标准',
      value: 0,
      icon: <FileTextOutlined />,
      color: '#1677ff',
      prefix: '',
      suffix: '个',
    },
    {
      title: '素材数量',
      value: 0,
      icon: <FolderOutlined />,
      color: '#52c41a',
      prefix: '',
      suffix: '个',
    },
    {
      title: '校验规则',
      value: 0,
      icon: <CheckCircleOutlined />,
      color: '#faad14',
      prefix: '',
      suffix: '条',
    },
    {
      title: '校验任务',
      value: 0,
      icon: <CloudServerOutlined />,
      color: '#722ed1',
      prefix: '',
      suffix: '个',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-6">
        工作台
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        数据质量治理概览
      </Paragraph>

      <Row gutter={[24, 24]} className="mb-8">
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card
              bordered={false}
              hoverable
              className="stat-card"
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                suffix={stat.suffix}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      <Card
        bordered={false}
        className="shadow-sm"
        styles={{ body: { padding: '48px' } }}
      >
        <Empty
          description={
            <div>
              <span className="text-gray-500 text-base">
                请先创建业务域，然后上传数据标准开始使用
              </span>
              <div className="mt-2 text-gray-400 text-sm">
                当前业务域尚无数据标准和素材，请先完成基础配置
              </div>
            </div>
          }
        />
      </Card>
    </div>
  );
}
