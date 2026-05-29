'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Typography, Layout, Button, Space } from 'antd';
import {
  CloudServerOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useDomainStore } from '@/lib/stores/domainStore';

const { Text } = Typography;

const menuItems = [
  { key: '/settings/models', icon: <CloudServerOutlined />, label: '模型管理' },
  { key: '/settings/prompt', icon: <FileTextOutlined />, label: 'Prompt 管理' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentDomain } = useDomainStore();

  if (!currentDomain) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text type="secondary">请先在顶部选择业务域</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}
