'use client';

import { Card, Empty, Typography, Button } from 'antd';
import { CloudServerOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function TasksPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-2">
        任务中心
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        查看和管理所有校验任务
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
                暂无任务
              </Paragraph>
              <Paragraph className="text-gray-400 text-sm mb-4">
                在数据校验页面创建任务后，这里将显示任务状态和进度
              </Paragraph>
              <Button type="primary" icon={<PlusOutlined />} size="large">
                创建新任务
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
