'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/search-bar';
import { QueryState } from '@/components/query-state';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  user?: { id: string; displayName: string };
}

interface PagedResult {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TX_TYPE_LABELS: Record<string, string> = {
  purchase: '购买',
  consume: '消耗',
  refund: '退款',
  bonus: '奖励',
};

const TX_TYPE_STYLES: Record<string, string> = {
  purchase: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  consume:  'bg-red-50 text-red-700 border border-red-200',
  refund:   'bg-amber-50 text-amber-700 border border-amber-200',
  bonus:    'bg-purple-50 text-purple-700 border border-purple-200',
};

export default function AdminCreditsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<PagedResult>({
    queryKey: ['admin', 'credits', 'transactions', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      return apiClient.get(`/admin/credits/transactions?${params}`) as any;
    },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">积分流水</h1>
          <p className="text-xs text-slate-400 mt-0.5">共 {data?.total ?? 0} 条记录{search && <span className="text-purple-600 ml-1">· 筛选中</span>}</p>
        </div>
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="搜索用户名或备注..."
          width="w-64"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-4 mt-4 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!isLoading && !isError && data?.data.length === 0}
            emptyMessage="暂无流水记录"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs text-slate-500 font-semibold">用户</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">类型</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">金额</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">描述</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((tx) => {
                  const positive = Number(tx.amount) >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-slate-800 text-sm font-medium">{tx.user?.displayName || '-'}</p>
                        <p className="text-slate-400 text-[10px] font-mono">{tx.userId.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium', TX_TYPE_STYLES[tx.type] ?? 'bg-slate-100 text-slate-600')}>
                          {TX_TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('flex items-center gap-1 text-sm font-bold tabular-nums', positive ? 'text-emerald-600' : 'text-red-600')}>
                          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {positive ? '+' : ''}{Number(tx.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[200px] truncate">{tx.description}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">{formatDate(tx.createdAt)}</td>
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
