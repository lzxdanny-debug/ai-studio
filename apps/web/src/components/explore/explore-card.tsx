'use client';

import { useState } from 'react';
import { Video, ImageIcon, Music as MusicIcon, Heart, Bookmark } from 'lucide-react';
import { AutoPlayVideo, KenBurnsImage, MusicBars } from '@/components/ui/media-preview';
import { cn, formatDate, getModelLabel } from '@/lib/utils';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface ExploreItem {
  id: string;
  type: string;
  model: string;
  prompt?: string;
  resultUrls?: string[];
  likeCount?: number;
  favoritesCount?: number;
  isFavoritedByMe?: boolean;
  createdAt: string;
  status: string;
  inputParams?: Record<string, unknown>;
  user?: { id: string; displayName: string; avatarUrl?: string } | null;
}

interface ExploreCardProps {
  item: ExploreItem;
  /** 固定媒体区高度（如 'h-48'）。传入时覆盖默认 aspect-ratio，用于瀑布流布局 */
  mediaHeight?: string;
  onFavoriteToggle?: (taskId: string, isFavorited: boolean, count: number) => void;
}

/** fallback aspect-ratio（未传 mediaHeight 时使用） */
function mediaAspectClass(item: ExploreItem): string {
  if (item.type === 'music') return 'aspect-square';
  if (item.type === 'image') return 'aspect-[4/3]';
  const ar = (item.inputParams as any)?.aspectRatio as string | undefined;
  return ar === '9:16' ? 'aspect-[9/16]' : 'aspect-video';
}

const TYPE_CONFIG = {
  video: { labelKey: 'video' as const, icon: Video, color: 'bg-blue-500/90' },
  image: { labelKey: 'image' as const, icon: ImageIcon, color: 'bg-emerald-500/90' },
  music: { labelKey: 'music' as const, icon: MusicIcon, color: 'bg-purple-500/90' },
};

export function ExploreCard({ item, mediaHeight, onFavoriteToggle }: ExploreCardProps) {
  const t = useTranslations('explore');
  const { isAuthenticated } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(item.isFavoritedByMe ?? false);
  const [favCount, setFavCount] = useState(item.favoritesCount ?? 0);
  const [favLoading, setFavLoading] = useState(false);

  const firstUrl = item.resultUrls?.[0];
  const coverUrl = item.type === 'music' ? item.resultUrls?.[1] : undefined;
  const typeConf = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG];
  const TypeIcon = typeConf?.icon;
  const sizeClass = mediaHeight ?? mediaAspectClass(item);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || favLoading) return;
    setFavLoading(true);
    try {
      const res = await apiClient.post<{ isFavorited: boolean; favoritesCount: number }>(
        `/favorites/${item.id}`,
      );
      const { isFavorited: newState, favoritesCount: newCount } = res.data;
      setIsFavorited(newState);
      setFavCount(newCount);
      onFavoriteToggle?.(item.id, newState, newCount);
    } catch {
      // silent fail
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <Link
      href={`/explore/${item.id}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-[#1a1a1c] border border-white/5 hover:border-white/15 cursor-pointer hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 transition-all duration-200"
    >
        {/* ─── 媒体预览区 ─── */}
        <div className={cn('relative w-full overflow-hidden bg-zinc-900', sizeClass)}>
          {item.type === 'video' && firstUrl ? (
            <AutoPlayVideo src={firstUrl} className="absolute inset-0 w-full h-full object-cover" />
          ) : item.type === 'image' && firstUrl ? (
            <KenBurnsImage
              src={firstUrl}
              alt={item.prompt}
              className="absolute inset-0 w-full h-full object-cover"
              wrapperClassName="absolute inset-0"
            />
          ) : item.type === 'music' ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={
                coverUrl
                  ? {
                      backgroundImage: `url(${coverUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {!coverUrl && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/80 to-pink-600/60" />
              )}
              {coverUrl && <div className="absolute inset-0 bg-black/45" />}
              <div className="relative z-10">
                <MusicBars />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-zinc-500 text-sm">无内容</p>
            </div>
          )}

          {/* 底部渐变遮罩（让文字可读） */}
          <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

          {/* 悬停暗色遮罩 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 z-10 pointer-events-none" />

          {/* 类型标签 — 左上角 */}
          {typeConf && TypeIcon && (
            <div
              className={cn(
                'absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[9px] font-medium backdrop-blur-sm',
                typeConf.color,
              )}
            >
              <TypeIcon className="w-2.5 h-2.5" />
              {t(typeConf.labelKey)}
            </div>
          )}

          {/* 收藏按钮 — 右上角（登录后显示，hover 可见） */}
          {isAuthenticated && (
            <button
              onClick={handleFavorite}
              disabled={favLoading}
              className={cn(
                'absolute top-2 right-2 z-30 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                'opacity-0 group-hover:opacity-100',
                isFavorited
                  ? 'bg-pink-500/90 text-white'
                  : 'bg-black/60 text-white hover:bg-pink-500/80',
              )}
              title={isFavorited ? t('unfavorite') : t('favorite')}
            >
              <Bookmark className={cn('h-3.5 w-3.5', isFavorited && 'fill-current')} />
            </button>
          )}

          {/* 点赞 + 收藏计数 — 左下角 */}
          <div className="absolute bottom-2 left-2.5 z-20 pointer-events-none flex items-center gap-2.5">
            {(item.likeCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-white/50 fill-white/50" />
                <span className="text-[11px] text-white/50">{item.likeCount}</span>
              </span>
            )}
            {favCount > 0 && (
              <span className="flex items-center gap-1">
                <Bookmark className={cn('w-3 h-3', isFavorited ? 'text-pink-400 fill-pink-400' : 'text-white/50 fill-white/50')} />
                <span className="text-[11px] text-white/50">{favCount}</span>
              </span>
            )}
          </div>

          {/* 作者 — 右下角 */}
          <div className="absolute bottom-2 right-2.5 z-20 pointer-events-none">
            <span className="text-[11px] text-white/60 truncate max-w-[140px] block drop-shadow">
              {item.user?.displayName || t('unknown_user')}
            </span>
          </div>
        </div>

        {/* ─── 信息区 ─── */}
        <div className="px-3 pt-2 pb-2.5 flex flex-col gap-1 bg-[#1a1a1c]">
          {item.prompt && (
            <p className="text-xs text-zinc-300 line-clamp-1 leading-relaxed">
              {item.prompt}
            </p>
          )}
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <span>{getModelLabel(item.model)}</span>
            <span>·</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>
        </div>
    </Link>
  );
}
