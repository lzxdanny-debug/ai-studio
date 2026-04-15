'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileVideo,
  Coins,
  MessageSquare,
  BarChart2,
  MessageCircle,
  LogOut,
  Shield,
  Settings,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/lib/api';

const NAV_ITEMS = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/tasks', label: '内容管理', icon: FileVideo },
  { href: '/admin/credits', label: '积分流水', icon: Coins },
  { href: '/admin/comments', label: '评论管理', icon: MessageSquare },
  { href: '/admin/analytics', label: '流量统计', icon: BarChart2 },
  { href: '/admin/feedback', label: '用户反馈', icon: MessageCircle },
];

const BOTTOM_NAV_ITEMS = [
  { href: '/admin/settings', label: '系统设置', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['admin', 'feedback', 'unread'],
    queryFn: () => apiClient.get('/feedback/admin/unread-count') as any,
    refetchInterval: 30_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-[220px] h-full flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-200 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Shield className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-bold text-sm text-slate-800">管理后台</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto flex flex-col">
        <div className="space-y-0.5 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            const isFeedback = href === '/admin/feedback';
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  active
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-purple-600' : 'text-slate-400')} />
                <span className="flex-1">{label}</span>
                {isFeedback && unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* 底部分组：系统类菜单 */}
        <div className="pt-2 mt-1 border-t border-slate-100 space-y-0.5">
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  active
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-purple-600' : 'text-slate-400')} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 flex-shrink-0 border-t border-slate-200 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-700 font-medium truncate">{user?.displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || '管理员'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
