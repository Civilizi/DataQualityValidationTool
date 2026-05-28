'use client';

import { Card, Empty, Typography, Button } from 'antd';
import { FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function AssetsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Title level={3} className="mb-2">
        素材池
      </Title>
      <Paragraph className="text-gray-500 text-lg mb-8">
        管理已上传的数据集素材
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
                素材池为空
              </Paragraph>
              <Paragraph className="text-gray-400 text-sm mb-4">
                上传数据集素材用于数据质量校验和分析
              </Paragraph>
              <Button type="primary" icon={<UploadOutlined />} size="large">
                上传素材
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
