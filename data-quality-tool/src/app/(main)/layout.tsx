'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout,
  Menu,
  Select,
  Space,
  Avatar,
  Dropdown,
  Typography,
} from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  SecurityScanOutlined,
  FolderOutlined,
  CloudServerOutlined,
  HistoryOutlined,
  SettingOutlined,
  UserOutlined,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const navItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/standards', icon: <FileTextOutlined />, label: '数据标准' },
  { key: '/validation', icon: <SecurityScanOutlined />, label: '数据校验' },
  { key: '/assets', icon: <FolderOutlined />, label: '素材池' },
  { key: '/tasks', icon: <CloudServerOutlined />, label: '任务中心' },
  { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

const domains = [
  { value: 'hr', label: '人力资源' },
  { value: 'finance', label: '财务' },
  { value: 'sales', label: '销售' },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('hr');

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  const userMenuItems = [
    { key: 'profile', label: '个人设置' },
    { key: 'logout', label: '退出登录' },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          background: '#001529',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          className="flex items-center justify-center h-16 px-4 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <MenuUnfoldOutlined className="text-white text-lg" />
          ) : (
            <Title
              level={4}
              className="text-white mb-0 truncate"
              style={{ margin: 0, fontSize: 16, color: '#fff' }}
            >
              数据质量校验
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          className="border-0"
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240 }}>
        <Header
          className="bg-white px-6 flex items-center justify-between shadow-sm"
          style={{ padding: '0 24px', position: 'sticky', top: 0, zIndex: 99 }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg hover:bg-gray-100 p-2 rounded"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">当前业务域：</span>
              <Select
                value={selectedDomain}
                onChange={setSelectedDomain}
                options={domains}
                style={{ minWidth: 120 }}
                size="middle"
              />
            </div>
          </div>
          <Space size={16}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <span className="hidden sm:inline text-sm">管理员</span>
                <DownOutlined className="text-gray-400 text-xs" />
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="main-content p-6">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
