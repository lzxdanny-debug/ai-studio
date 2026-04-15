'use client';

import { useState } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import apiClient from '@/lib/api';
import { cn } from '@/lib/utils';

interface SettingCardProps {
  title: string;
  description: string;
}

function SettingCard({ title, description }: SettingCardProps) {
  return (
    <div className="mb-1">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [priceCacheClearing, setPriceCacheClearing] = useState(false);
  const [priceCacheMsg, setPriceCacheMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleClearPriceCache() {
    setPriceCacheClearing(true);
    setPriceCacheMsg(null);
    try {
      await apiClient.delete('/model-pricing/cache');
      setPriceCacheMsg({ ok: true, text: '缓存已清除，下次访问创作页将从山海重新拉取最新定价。' });
    } catch {
      setPriceCacheMsg({ ok: false, text: '清除失败，请确认登录状态后重试。' });
    } finally {
      setPriceCacheClearing(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <h1 className="text-lg font-bold text-slate-900">系统设置</h1>
        <p className="text-xs text-slate-400 mt-0.5">系统操作与配置管理</p>
      </div>

      <div className="p-6 space-y-4 max-w-3xl">

        {/* ── 缓存管理 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">缓存管理</h2>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">

            {/* 模型价格缓存 */}
            <div className="flex items-start sm:items-center gap-4 p-5 flex-col sm:flex-row">
              <div className="flex-1">
                <SettingCard
                  title="模型价格缓存"
                  description="价格数据从山海实时拉取并在后端缓存 1 小时。若山海调整了定价，可点击此按钮强制清除，下次用户访问创作页时自动刷新。"
                />
                {priceCacheMsg && (
                  <p className={cn(
                    'text-xs mt-2 font-medium',
                    priceCacheMsg.ok ? 'text-emerald-600' : 'text-red-500',
                  )}>
                    {priceCacheMsg.text}
                  </p>
                )}
              </div>
              <button
                onClick={handleClearPriceCache}
                disabled={priceCacheClearing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', priceCacheClearing && 'animate-spin')} />
                {priceCacheClearing ? '清除中…' : '清除价格缓存'}
              </button>
            </div>

          </div>
        </section>

        {/* ── 占位区域（后续扩展） ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">其他</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3 text-slate-400">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">更多系统设置即将推出…</span>
          </div>
        </section>

      </div>
    </div>
  );
}
