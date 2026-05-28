'use client';

import { Card, Empty, Typography, Button, Space } from 'antd';
import {
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function StandardsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-2">
        数据标准
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        上传业务数据质量标准，AI 自动解析校验规则
      </Paragraph>

      <Card
        bordered={false}
        className="shadow-sm"
        styles={{ body: { padding: '64px' } }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="text-center">
              <Paragraph className="text-gray-500 text-base mb-2">
                当前业务域暂无数据标准
              </Paragraph>
              <Paragraph className="text-gray-400 text-sm mb-4">
                请先选择业务域，然后上传 Excel/CSV 格式的数据标准文档
              </Paragraph>
              <Space>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  size="large"
                >
                  上传数据标准
                </Button>
                <Button icon={<ArrowRightOutlined />} size="large">
                  查看标准模板
                </Button>
              </Space>
            </div>
          }
        />
      </Card>
    </div>
  );
}
