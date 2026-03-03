'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sider } from '@/components/layout/sider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setSiderCollapsed(!siderCollapsed)} />
      <div className="flex flex-1 overflow-hidden">
        <Sider collapsed={siderCollapsed} />
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="p-8 max-w-[1600px] mx-auto min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
