'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldOff, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/search-bar';
import { QueryState } from '@/components/query-state';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  isLocalUser: boolean;
  createdAt: string;
}

interface PagedResult {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function AdjustCreditsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (body: { amount: number; description: string }) =>
      apiClient.post(`/admin/users/${user.id}/credits`, body) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); onClose(); },
    onError: (err: any) => setError(err?.message || '操作失败'),
  });

  const handleSubmit = () => {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num === 0) { setError('请输入有效金额（非零整数）'); return; }
    if (!desc.trim()) { setError('请填写备注说明'); return; }
    mutation.mutate({ amount: num, description: desc.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-[380px] shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800">调整积分</h3>
            <p className="text-xs text-slate-400 mt-0.5">用户：{user.displayName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">积分数量</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="正数为充值，负数为扣除（如 500 或 -100）"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">操作备注</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="说明原因，将记录到流水"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm text-white font-medium transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? '处理中...' : '确认'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<User | null>(null);

  const { data, isLoading, isError, error } = useQuery<PagedResult>({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      return apiClient.get(`/admin/users?${params}`) as any;
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch(`/admin/users/${userId}/role`, { role }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">用户管理</h1>
          <p className="text-xs text-slate-400 mt-0.5">共 {data?.total ?? 0} 名用户{search && <span className="text-purple-600 ml-1">· 筛选中</span>}</p>
        </div>
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="搜索邮箱或用户名..."
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
            emptyMessage="暂无用户"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs text-slate-500 font-semibold">用户</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">邮箱</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">角色</th>
                  <th className="px-4 py-3.5 text-left text-xs text-slate-500 font-semibold">注册时间</th>
                  <th className="px-4 py-3.5 text-right text-xs text-slate-500 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {user.avatarUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[10px] font-bold text-white">{user.displayName?.[0]?.toUpperCase() || 'U'}</span>
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-slate-800 font-medium">{user.displayName}</p>
                            {user.isLocalUser && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-600 border border-indigo-200 leading-none">
                                本站
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[10px] font-mono">{user.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{user.email || '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600',
                      )}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setAdjustTarget(user)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs transition-colors font-medium border border-amber-200"
                        >
                          <Coins className="h-3 w-3" />积分
                        </button>
                        <button
                          onClick={() => roleMutation.mutate({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' })}
                          disabled={roleMutation.isPending}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50 font-medium border',
                            user.role === 'admin'
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
                          )}
                        >
                          {user.role === 'admin' ? <><ShieldOff className="h-3 w-3" />撤销</> : <><Shield className="h-3 w-3" />提权</>}
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

      {adjustTarget && <AdjustCreditsModal user={adjustTarget} onClose={() => setAdjustTarget(null)} />}
    </div>
  );
}
