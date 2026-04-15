'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, ChevronLeft, ChevronRight, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/search-bar';
import { QueryState } from '@/components/query-state';

interface Comment {
  id: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  user?: { id: string; displayName: string };
  task?: { id: string; type: string; prompt?: string };
}

interface PagedResult {
  data: Comment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 审核状态切换：分段选择器 */
function ApprovalToggle({
  commentId,
  isApproved,
  isPending,
  onToggle,
}: {
  commentId: string;
  isApproved: boolean;
  isPending: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
      <button
        onClick={() => !isApproved && onToggle(commentId)}
        disabled={isPending || isApproved}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
          isApproved
            ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 cursor-default'
            : 'text-slate-400 hover:text-slate-600 hover:bg-white/70 disabled:opacity-50',
        )}
        title="通过审核，在前台展示"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        通过
      </button>
      <button
        onClick={() => isApproved && onToggle(commentId)}
        disabled={isPending || !isApproved}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
          !isApproved
            ? 'bg-white text-red-600 shadow-sm border border-red-200 cursor-default'
            : 'text-slate-400 hover:text-slate-600 hover:bg-white/70 disabled:opacity-50',
        )}
        title="不通过，前台隐藏此评论"
      >
        <XCircle className="h-3.5 w-3.5" />
        不通过
      </button>
    </div>
  );
}

export default function AdminCommentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  const { data, isLoading, isError, error } = useQuery<PagedResult>({
    queryKey: ['admin', 'comments', page, filter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (filter === 'approved') params.set('isApproved', 'true');
      if (filter === 'rejected') params.set('isApproved', 'false');
      if (search) params.set('search', search);
      return apiClient.get(`/admin/comments?${params}`) as any;
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/comments/${id}/approval`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'comments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/comments/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'comments'] }),
  });

  const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">评论管理</h1>
          <p className="text-xs text-slate-400 mt-0.5">共 {data?.total ?? 0} 条评论{search && <span className="text-purple-600 ml-1">· 筛选中</span>}</p>
        </div>
        <div className="flex items-center gap-2">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="搜索评论内容或用户名..."
          width="w-60"
        />
        {/* 快速筛选 */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          {([
            { key: 'all', label: '全部' },
            { key: 'approved', label: '✓ 已通过' },
            { key: 'rejected', label: '✗ 未通过' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === key
                  ? key === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm border border-red-200'
                    : key === 'approved'
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'bg-white text-slate-700 shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-4 mt-4 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!isLoading && !isError && data?.data.length === 0}
            emptyMessage="暂无评论"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs text-slate-500 font-semibold">评论内容</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">用户</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">所属作品</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">审核状态</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">时间</th>
                  <th className="px-4 py-3.5 text-right text-xs text-slate-500 font-semibold">删除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((comment) => (
                  <tr
                    key={comment.id}
                    className={cn(
                      'transition-colors',
                      comment.isApproved ? 'hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50/70',
                    )}
                  >
                    <td className="px-5 py-3.5 max-w-[260px]">
                      <p className={cn('text-sm line-clamp-2', comment.isApproved ? 'text-slate-700' : 'text-slate-400 line-through decoration-red-300')}>
                        {comment.content}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-medium whitespace-nowrap">
                      {comment.user?.displayName || '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      {comment.task ? (
                        <a
                          href={`${MAIN_APP_URL}/explore/${comment.task.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors font-medium"
                        >
                          <span className="line-clamp-1 max-w-[110px]">{comment.task.prompt || comment.task.type}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <ApprovalToggle
                        commentId={comment.id}
                        isApproved={comment.isApproved}
                        isPending={approvalMutation.isPending}
                        onToggle={(id) => approvalMutation.mutate(id)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(comment.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => confirm('确认删除该评论？') && deleteMutation.mutate(comment.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50 border border-red-200"
                          title="删除评论"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
