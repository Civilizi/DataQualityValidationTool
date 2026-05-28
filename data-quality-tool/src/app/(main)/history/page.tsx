'use client';

import { Card, Empty, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function HistoryPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-2">
        历史记录
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        查询历史操作记录和版本追溯
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
                暂无操作记录
              </Paragraph>
              <Paragraph className="text-gray-400 text-sm">
                所有操作记录和版本变更将在此处展示，便于追溯和审计
              </Paragraph>
            </div>
          }
        />
      </Card>
    </div>
  );
}
