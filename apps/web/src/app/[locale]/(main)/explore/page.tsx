'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, ImageIcon, Music, Globe } from 'lucide-react';
import { ExploreCard } from '@/components/explore/explore-card';
import apiClient from '@/lib/api';
import { TaskType } from '@ai-platform/shared';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const TYPE_FILTERS = [
  { value: undefined, labelKey: 'all', icon: Globe },
  { value: TaskType.VIDEO, labelKey: 'video', icon: Video },
  { value: TaskType.IMAGE, labelKey: 'image', icon: ImageIcon },
  { value: TaskType.MUSIC, labelKey: 'music', icon: Music },
];

export default function ExplorePage() {
  const t = useTranslations('explore');
  const [typeFilter, setTypeFilter] = useState<TaskType | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['explore', typeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (typeFilter) params.set('type', typeFilter);
      const response = await apiClient.get(`/explore?${params}`) as any;
      return response.data;
    },
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TYPE_FILTERS.map(({ value, labelKey, icon: Icon }) => (
            <button
              key={labelKey}
              onClick={() => {
                setTypeFilter(value);
                setPage(1);
              }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                typeFilter === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey as any)}
            </button>
          ))}
        </div>

        {/* Masonry — 4 列手动分发，媒体区固定高度序列 */}
        {(() => {
          const NUM_COLS = 4;
          // 20 条/页，4 列 × 5 行，各列媒体区总高约 912px（不含信息区）
          const MEDIA_HEIGHTS = [
            'h-44', 'h-36', 'h-52', 'h-40',  // row 0
            'h-52', 'h-44', 'h-36', 'h-56',  // row 1
            'h-36', 'h-52', 'h-44', 'h-40',  // row 2
            'h-48', 'h-40', 'h-56', 'h-44',  // row 3
            'h-44', 'h-56', 'h-40', 'h-48',  // row 4
          ] as const;

          // ── Loading skeleton ──
          if (isLoading) {
            const skeletonCols: string[][] = [
              ['h-44', 'h-52', 'h-36', 'h-48'],
              ['h-36', 'h-40', 'h-52', 'h-40'],
              ['h-52', 'h-36', 'h-44', 'h-56'],
              ['h-40', 'h-56', 'h-40', 'h-44'],
            ];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {skeletonCols.map((heights, ci) => (
                  <div key={ci} className="flex flex-col gap-3">
                    {heights.map((h, j) => (
                      <div key={j} className="rounded-xl bg-[#1a1a1c] overflow-hidden border border-white/5">
                        <div className={cn('bg-zinc-800/60 animate-pulse', h)} />
                        <div className="p-3 space-y-2">
                          <div className="h-2.5 bg-zinc-800/60 rounded animate-pulse" />
                          <div className="h-2.5 bg-zinc-800/60 rounded w-2/3 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          }

          // ── Empty ──
          if (!data?.data?.length) {
            return (
              <div className="rounded-xl border border-dashed border-white/10 p-16 text-center">
                <Globe className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">{t('empty')}</p>
              </div>
            );
          }

          // ── Real content ──
          type ColItem = { item: any; idx: number };
          const cols: ColItem[][] = Array.from({ length: NUM_COLS }, () => []);
          (data.data as any[]).forEach((item, i) => {
            cols[i % NUM_COLS].push({ item, idx: i });
          });

          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cols.map((colItems, ci) => (
                  <div key={ci} className="flex flex-col gap-3">
                    {colItems.map(({ item, idx }) => (
                      <ExploreCard
                        key={item.id}
                        item={item}
                        mediaHeight={MEDIA_HEIGHTS[idx % MEDIA_HEIGHTS.length]}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/20 disabled:opacity-30 transition-colors"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t('prev')}
                  </button>
                  <span className="px-3 text-sm text-zinc-500">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/20 disabled:opacity-30 transition-colors"
                    disabled={page === data.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
