'use client';

import { useState, useRef, useEffect } from 'react';
import { Key, ChevronDown, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserKeys, type UserApiKey } from '@/hooks/use-user-keys';

interface ApiKeySelectorProps {
  value?: string;
  onChange: (key: string | undefined) => void;
  className?: string;
  /** 紧凑模式（折叠栏使用） */
  compact?: boolean;
  /** 下拉方向 */
  dropDirection?: 'up' | 'down';
}

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 12) return key.slice(0, 4) + '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

export function ApiKeySelector({ value, onChange, className, compact, dropDirection = 'up' }: ApiKeySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: keys = [], isLoading, isError } = useUserKeys();

  // 数据加载完成后，若当前无选中值，自动选第一个
  useEffect(() => {
    if (!isLoading && keys.length > 0 && !value) {
      onChange(keys[0].key);
    }
  }, [isLoading, keys, value, onChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = keys.find((k) => k.key === value);
  const hasNoKey = !isLoading && !isError && keys.length === 0;

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border transition-colors',
          compact
            ? 'px-2 py-1.5 text-[11px]'
            : 'px-2.5 py-1.5 text-xs min-w-[130px] max-w-[200px]',
          // 无 Key 时高亮警告边框
          hasNoKey
            ? 'border-amber-500/50 bg-amber-500/8 text-amber-400 hover:border-amber-400'
            : 'border-white/10 bg-white/4 text-zinc-400 hover:bg-white/8 hover:border-white/20 hover:text-zinc-200',
        )}
      >
        {hasNoKey
          ? <AlertCircle className="h-3 w-3 flex-shrink-0 text-amber-400" />
          : <Key className="h-3 w-3 flex-shrink-0 text-purple-400" />
        }
        {!compact && (
          <span className="truncate flex-1 text-left">
            {isLoading ? '加载中...' : hasNoKey ? '无 API Key' : selected?.name ?? '选择 Key'}
          </span>
        )}
        {compact && (
          <span className="truncate">
            {isLoading ? '...' : hasNoKey ? '无 Key' : (selected?.name ?? '选择')}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute left-0 z-50 w-72 rounded-xl border border-white/10 bg-[#1c1c1c] shadow-xl shadow-black/50 overflow-hidden',
          dropDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}>
          <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">选择 API Key</span>
            <a
              href="https://shanhaiapi.com/zh/console/keys/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              管理 Keys
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在加载你的 API Keys...
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              无法加载 Keys，请重新登录
            </div>
          )}

          {!isLoading && !isError && (
            <div className="max-h-56 overflow-y-auto py-1">
              {keys.length > 0 ? keys.map((k: UserApiKey) => {
                const isSelected = value === k.key;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => { onChange(k.key); setOpen(false); }}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors',
                      isSelected && 'bg-purple-500/10',
                    )}
                  >
                    <Key className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', isSelected ? 'text-purple-400' : 'text-zinc-500')} />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-medium truncate', isSelected ? 'text-purple-300' : 'text-zinc-300')}>
                        {k.name}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{maskKey(k.key)}</div>
                      {k.description && (
                        <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{k.description}</div>
                      )}
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />}
                  </button>
                );
              }) : (
                <div className="px-3 py-4 text-center">
                  <AlertCircle className="h-6 w-6 text-amber-500/60 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-1 font-medium">你还没有 API Key</p>
                  <p className="text-[11px] text-zinc-600 mb-3">生成内容需要使用 API Key</p>
                  <a
                    href="https://shanhaiapi.com/zh/console/keys/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                  >
                    前往 shanhaiapi.com 创建 →
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
