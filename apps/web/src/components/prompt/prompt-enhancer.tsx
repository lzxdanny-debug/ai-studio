'use client';

import { useState } from 'react';
import { Wand2, Loader2, ChevronUp, Check, X, Sparkles, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type PromptType = 'video' | 'image' | 'music';

interface PromptEnhancerProps {
  prompt: string;
  type: PromptType;
  onSelect: (enhanced: string) => void;
  className?: string;
  direction?: 'up' | 'down';
  apiKey?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function PromptEnhancer({ prompt, type, onSelect, className, direction = 'down', apiKey }: PromptEnhancerProps) {
  const t = useTranslations('promptEnhancer');
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleEnhance = async () => {
    if (!isAuthenticated) { setError(t('login_required')); return; }
    if (!prompt.trim()) { setError('请先输入一些描述内容'); return; }

    setLoading(true);
    setError('');
    setVariants([]);
    setOpen(false);
    setSelectedIdx(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_URL}/prompt/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim(), type, ...(apiKey ? { apiKey } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || t('error'));
      const data: string[] = json?.data?.variants ?? json?.variants ?? [];
      setVariants(data);
      setOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    onSelect(variants[idx]);
    setTimeout(() => { setOpen(false); setVariants([]); setSelectedIdx(null); }, 600);
  };

  return (
    // w-full 让父容器撑满，面板用 left-0 right-0 跟随父宽
    <div className={cn('relative w-full', className)}>

      {/* ── 按钮行 ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={open ? () => setOpen(false) : handleEnhance}
          disabled={loading}
          title={t('tooltip')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            'border border-purple-500/40 text-purple-400 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-500/10',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            loading && 'cursor-wait',
          )}
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="h-3.5 w-3.5" />}
          <span>{loading ? t('enhancing') : t('button')}</span>
          {variants.length > 0 && !loading && (
            <ChevronUp className={cn('h-3 w-3 transition-transform', !open && 'rotate-180')} />
          )}
        </button>

        {/* 说明小提示 */}
        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
          <Info className="h-3 w-3 flex-shrink-0" />
          {t('hint')}
        </span>
      </div>

      {/* ── 错误提示 ── */}
      {error && (
        <div className={cn(
          'absolute left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-red-500/10 border border-red-500/20 text-xs text-red-400',
          direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-1.5',
        )}>
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="hover:text-red-300 flex-shrink-0">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── 方案面板（left-0 right-0 自适应宽度） ── */}
      {open && variants.length > 0 && (
        <div className={cn(
          'absolute left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden',
          direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}>
          {/* 头部 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-purple-500/5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
            <span className="text-xs font-medium text-purple-300">{t('title')}</span>
            <span className="text-[10px] text-zinc-500">{t('subtitle')}</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-zinc-600 hover:text-zinc-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 方案列表 */}
          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
            {variants.map((v, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(idx)}
                className={cn(
                  'group relative p-3 cursor-pointer transition-colors hover:bg-white/5',
                  selectedIdx === idx && 'bg-purple-500/10',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed flex-1 pr-14">{v}</p>
                </div>

                {/* 使用/勾选按钮 */}
                <div className={cn(
                  'absolute right-3 top-3 flex items-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  selectedIdx === idx && 'opacity-100',
                )}>
                  {selectedIdx === idx
                    ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                    : <span className="text-[10px] text-purple-400 font-medium whitespace-nowrap px-1.5 py-0.5 rounded border border-purple-500/30">{t('use')}</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
