'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bug,
  Lightbulb,
  MessageSquare,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  ImageIcon,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/search-bar';
import { QueryState } from '@/components/query-state';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  category: 'bug' | 'suggestion' | 'other';
  content: string;
  contactEmail?: string;
  screenshotUrl?: string;
  userId?: string;
  isRead: boolean;
  pagePath?: string;
  createdAt: string;
}

interface PagedResult {
  data: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  bug: { label: 'Bug 报告', icon: Bug, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  suggestion: { label: '功能建议', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  other: { label: '其他', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
};

// ─── Screenshot Lightbox ──────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white/70 hover:text-white">
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="截图" className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Feedback Card ────────────────────────────────────────────────────────────

function FeedbackCard({
  item,
  onMarkRead,
  onDelete,
}: {
  item: FeedbackItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const cfg = CATEGORY_CONFIG[item.category];
  const Icon = cfg.icon;
  const isLong = item.content.length > 180;

  return (
    <>
      <div className={cn(
        'bg-white border rounded-2xl p-5 transition-all hover:shadow-sm',
        item.isRead ? 'border-slate-200' : 'border-purple-200 shadow-sm',
      )}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border', cfg.bg, cfg.color, cfg.border)}>
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            {!item.isRead && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-600 text-white">
                未读
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!item.isRead && (
              <button
                onClick={() => onMarkRead(item.id)}
                title="标记已读"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(item.id)}
              title="删除"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <p className={cn('text-sm text-slate-700 leading-relaxed whitespace-pre-wrap', !expanded && isLong && 'line-clamp-3')}>
          {item.content}
        </p>
        {isLong && (
          <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs text-purple-500 hover:text-purple-700">
            {expanded ? '收起' : '展开全文'}
          </button>
        )}

        {/* Screenshot */}
        {item.screenshotUrl && (
          <button
            onClick={() => setLightbox(true)}
            className="mt-3 flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors group"
          >
            <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-purple-500 flex-shrink-0" />
            <span className="text-xs text-slate-500 group-hover:text-purple-600 truncate">查看截图</span>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-purple-400 ml-auto" />
          </button>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-50">
          {item.contactEmail && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Mail className="h-3 w-3" />
              {item.contactEmail}
            </span>
          )}
          {item.pagePath && (
            <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <ExternalLink className="h-3 w-3" />
              {item.pagePath}
            </span>
          )}
          {item.userId && (
            <span className="text-xs text-slate-400 font-mono">UID: {item.userId.slice(0, 8)}…</span>
          )}
          <span className="text-xs text-slate-300 ml-auto">{formatDate(item.createdAt)}</span>
        </div>
      </div>

      {lightbox && item.screenshotUrl && <Lightbox url={item.screenshotUrl} onClose={() => setLightbox(false)} />}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { value: '', label: '全部' },
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: '建议' },
  { value: 'other', label: '其他' },
];

const READ_TABS = [
  { value: '', label: '全部' },
  { value: 'false', label: '未读' },
  { value: 'true', label: '已读' },
];

export default function AdminFeedbackPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [isRead, setIsRead] = useState('');
  const [search, setSearch] = useState('');

  const resetPage = () => setPage(1);

  const { data, isLoading, isError, error } = useQuery<PagedResult>({
    queryKey: ['admin', 'feedback', page, category, isRead, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (category) params.set('category', category);
      if (isRead) params.set('isRead', isRead);
      if (search) params.set('search', search);
      return apiClient.get(`/feedback/admin?${params}`) as any;
    },
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['admin', 'feedback', 'unread'],
    queryFn: () => apiClient.get('/feedback/admin/unread-count') as any,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/feedback/admin/${id}/read`, {}) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/feedback/admin/${id}`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    },
  });

  const totalUnread = unreadData?.count ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              用户反馈
              {search && <span className="text-purple-600 ml-1 font-normal text-sm">· 筛选中</span>}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              共 {data?.total ?? 0} 条{totalUnread > 0 && <span className="text-purple-600 ml-1">· {totalUnread} 条未读</span>}
            </p>
          </div>
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); resetPage(); }}
            placeholder="搜索内容或邮箱..."
            width="w-56"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setCategory(t.value); resetPage(); }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  category === t.value ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {READ_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setIsRead(t.value); resetPage(); }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  isRead === t.value ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!isLoading && !isError && data?.data.length === 0}
          emptyMessage="暂无反馈"
          emptyIcon={<MessageSquare className="h-5 w-5 text-slate-400" />}
        >
          <div className="space-y-3 max-w-3xl mx-auto">
            {data?.data.map((item) => (
              <FeedbackCard
                key={item.id}
                item={item}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </QueryState>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white border-t border-slate-100">
          <span className="text-xs text-slate-500">第 {data.page} / {data.totalPages} 页，共 {data.total} 条</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
