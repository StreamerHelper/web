'use client';

import { cn } from '@/lib/utils';
import {
  Activity,
  FolderOpen,
  LayoutDashboard,
  ListVideo,
  Settings as SettingsIcon,
  Tv,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mainNavItems = [
  {
    title: '仪表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '主播管理',
    href: '/streamers',
    icon: Users,
  },
  {
    title: '录制任务',
    href: '/jobs',
    icon: ListVideo,
  },
  {
    title: '系统监控',
    href: '/system',
    icon: Activity,
  },
  {
    title: '内容浏览',
    href: '/content',
    icon: FolderOpen,
  },
  {
    title: 'B站投稿',
    href: '/bilibili',
    icon: Tv,
  },
];

const bottomNavItems = [
  {
    title: '设置',
    href: '/settings',
    icon: SettingsIcon,
  },
];

interface SiderProps {
  collapsed?: boolean;
}

export function Sider({ collapsed = false }: SiderProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/');

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r bg-background',
        collapsed ? 'w-[70px]' : 'w-[240px]',
        'transition-all duration-300'
      )}
    >
      {/* Top Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation (Settings) */}
      <div className="py-4 border-t border-border/50">
        <nav className="space-y-1 px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
