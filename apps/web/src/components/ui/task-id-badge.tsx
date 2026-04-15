'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskIdBadgeProps {
  label: string;
  value: string;
  className?: string;
  /** When true, renders with slightly higher contrast — useful for failed tasks */
  highlight?: boolean;
}

export function TaskIdBadge({ label, value, className, highlight }: TaskIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex items-center gap-1 font-mono', className)}>
      <span className={cn('text-[10px] flex-shrink-0', highlight ? 'text-zinc-400' : 'text-zinc-600')}>
        {label}:
      </span>
      <span
        className={cn('text-[10px] truncate max-w-[120px]', highlight ? 'text-zinc-300' : 'text-zinc-500')}
        title={value}
      >
        {value.slice(0, 8)}…
      </span>
      <button
        onClick={handleCopy}
        title={copied ? '已复制' : '复制 ID'}
        className={cn(
          'flex-shrink-0 p-0.5 rounded transition-colors',
          highlight
            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
            : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/10',
        )}
      >
        {copied
          ? <Check className="h-2.5 w-2.5 text-green-400" />
          : <Copy className="h-2.5 w-2.5" />}
      </button>
    </div>
  );
}
