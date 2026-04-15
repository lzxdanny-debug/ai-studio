'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Globe, Lock, ChevronLeft, ChevronRight, Eye, EyeOff, ShieldCheck, ShieldOff, Bookmark, MessageCircle } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/search-bar';
import { QueryState } from '@/components/query-state';

interface Task {
  id: string;
  type: string;
  model: string;
  status: string;
  prompt?: string;
  isPublic: boolean;
  adminVisible: boolean;
  likeCount: number;
  favoritesCount: number;
  commentsCount: number;
  createdAt: string;
  user?: { id: string; displayName: string };
}

interface PagedResult {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'video', label: '视频' },
  { value: 'image', label: '图片' },
  { value: 'music', label: '音乐' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  failed:     'bg-red-50 text-red-700 border border-red-200',
};

const TYPE_STYLES: Record<string, string> = {
  video: 'bg-blue-50 text-blue-700 border border-blue-200',
  image: 'bg-pink-50 text-pink-700 border border-pink-200',
  music: 'bg-purple-50 text-purple-700 border border-purple-200',
};

/** 用户侧可见性：只读徽章 */
function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Globe className="h-3 w-3" />公开
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
      <Lock className="h-3 w-3" />私密
    </span>
  );
}

/** 管理员展示控制：可切换分段按钮 */
function AdminVisibleToggle({
  taskId,
  adminVisible,
  isPending,
  onToggle,
}: {
  taskId: string;
  adminVisible: boolean;
  isPending: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
      <button
        onClick={() => !adminVisible && onToggle(taskId)}
        disabled={isPending || adminVisible}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
          adminVisible
            ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 cursor-default'
            : 'text-slate-400 hover:text-slate-600 hover:bg-white/70 disabled:opacity-50',
        )}
        title="允许展示（isPublic=true 时才实际显示）"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        允许
      </button>
      <button
        onClick={() => adminVisible && onToggle(taskId)}
        disabled={isPending || !adminVisible}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
          !adminVisible
            ? 'bg-white text-red-600 shadow-sm border border-red-200 cursor-default'
            : 'text-slate-400 hover:text-slate-600 hover:bg-white/70 disabled:opacity-50',
        )}
        title="强制隐藏（即使用户已设公开，前台也不展示）"
      >
        <ShieldOff className="h-3.5 w-3.5" />
        隐藏
      </button>
    </div>
  );
}

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery<PagedResult>({
    queryKey: ['admin', 'tasks', page, typeFilter, statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return apiClient.get(`/admin/tasks?${params}`) as any;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/tasks/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tasks'] }),
  });

  const adminVisibleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/tasks/${id}/admin-visible`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tasks'] }),
  });

  const handleDelete = (id: string) => {
    if (confirm('确认强制删除该任务？此操作不可撤销。')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">内容管理</h1>
          <p className="text-xs text-slate-400 mt-0.5">共 {data?.total ?? 0} 个任务{search && <span className="text-purple-600 ml-1">· 筛选中</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="搜索提示词、模型或创作者..."
            width="w-60"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {/* 快速过滤 */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                !statusFilter && !typeFilter ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600',
              )}
            >全部</button>
            <button
              onClick={() => { setStatusFilter('completed'); setPage(1); }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' : 'text-slate-400 hover:text-slate-600',
              )}
            ><Eye className="h-3 w-3" />已完成</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-4 mt-4 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* 说明条 */}
          <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            作品在前台展示需同时满足：用户设为「公开」且管理员设为「允许」。
          </div>
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!isLoading && !isError && data?.data.length === 0}
            emptyMessage="暂无任务"
            emptyIcon={<EyeOff className="h-5 w-5 text-slate-400" />}
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs text-slate-500 font-semibold">提示词</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">类型</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">状态</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">创作者</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">用户可见性</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">管理展示</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">点赞</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">收藏</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">评论</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">时间</th>
                  <th className="px-4 py-3.5 text-right text-xs text-slate-500 font-semibold">删除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((task) => {
                  const actuallyVisible = task.isPublic && task.adminVisible;
                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        'transition-colors',
                        !task.adminVisible ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50',
                      )}
                    >
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <p className="text-slate-700 line-clamp-1 text-xs">{task.prompt || task.model}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 font-mono">{task.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium', TYPE_STYLES[task.type] ?? 'bg-slate-100 text-slate-600')}>
                          {task.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium', STATUS_STYLES[task.status] ?? 'bg-slate-100 text-slate-600')}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{task.user?.displayName || '-'}</td>
                      <td className="px-4 py-3.5">
                        <VisibilityBadge isPublic={task.isPublic} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <AdminVisibleToggle
                            taskId={task.id}
                            adminVisible={task.adminVisible}
                            isPending={adminVisibleMutation.isPending}
                            onToggle={(id) => adminVisibleMutation.mutate(id)}
                          />
                          {task.isPublic && !task.adminVisible && (
                            <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                              <EyeOff className="h-3 w-3" />前台已强制隐藏
                            </span>
                          )}
                          {actuallyVisible && (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />前台展示中
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{task.likeCount}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-pink-600 font-medium">
                          <Bookmark className="h-3 w-3" />
                          {task.favoritesCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <MessageCircle className="h-3 w-3" />
                          {task.commentsCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{formatDate(task.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50 border border-red-200"
                            title="强制删除此任务"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </QueryState>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500">第 {data.page} / {data.totalPages} 页，共 {data.total} 条</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
