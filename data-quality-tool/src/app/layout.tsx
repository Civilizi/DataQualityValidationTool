import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '数据质量校验工具',
  description: '业务标准驱动、分层分级校验的数据质量治理平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
