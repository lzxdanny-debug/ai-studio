'use client';

import { cn } from '@/lib/utils';

const RATIO_ICONS: Record<string, React.FC<{ className?: string }>> = {
  '16:9': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="20" height="14" rx="1.5" />
    </svg>
  ),
  '4:3': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
    </svg>
  ),
  '1:1': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </svg>
  ),
  '3:4': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
    </svg>
  ),
  '9:16': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7" y="2" width="10" height="20" rx="1.5" />
    </svg>
  ),
  '21:9': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="7" width="22" height="10" rx="1.5" />
    </svg>
  ),
  '3:2': ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5.5" width="20" height="13" rx="1.5" />
    </svg>
  ),
};

interface AspectRatioSelectorProps {
  ratios: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function AspectRatioSelector({ ratios, value, onChange, label = '画面比例' }: AspectRatioSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {ratios.map((ratio) => {
          const Icon = RATIO_ICONS[ratio];
          return (
            <button
              key={ratio}
              onClick={() => onChange(ratio)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all min-w-[52px]',
                value === ratio
                  ? 'border-purple-500 bg-purple-500/15 text-white'
                  : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300 bg-white/3',
              )}
            >
              {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5 flex items-center justify-center text-[10px]">?</span>}
              <span className="text-[11px] font-medium">{ratio}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
