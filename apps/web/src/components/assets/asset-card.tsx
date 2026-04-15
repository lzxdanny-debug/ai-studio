'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download, Heart, Trash2, FolderOpen, Music, X, RefreshCw, AlertCircle,
  Video, Image as ImageIcon, Globe, Lock,
} from 'lucide-react';
import { cn, getModelLabel } from '@/lib/utils';
import apiClient from '@/lib/api';
import { AutoPlayVideo, KenBurnsImage, MusicBars } from '@/components/ui/media-preview';
import { useRouter } from '@/lib/navigation';

interface Asset {
  id: string;
  type: string;
  model: string;
  prompt?: string;
  resultUrls?: string[];
  isFavorited: boolean;
  isPublic: boolean;
  projectId?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface AssetCardProps {
  asset: Asset;
  projects: Project[];
  onUpdate: () => void;
  /** 固定媒体区高度（如 'h-48'）。传入时覆盖默认 aspect-square */
  mediaHeight?: string;
}


export function AssetCard({ asset, projects, onUpdate, mediaHeight }: AssetCardProps) {
  const t = useTranslations('assets');
  const router = useRouter();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firstUrl = asset.resultUrls?.[0];
  // 音乐：resultUrls[0]=音频, resultUrls[1]=封面图
  const musicCoverUrl = asset.type === 'music' ? asset.resultUrls?.[1] : undefined;
  const hasNoResult = !firstUrl;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiClient.post(`/tasks/${asset.id}/refresh`);
      onUpdate();
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFavorite = async () => {
    await apiClient.patch(`/tasks/${asset.id}/favorite`);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm(t('delete_confirm'))) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tasks/${asset.id}`);
      onUpdate();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveProject = async (projectId: string | null) => {
    await apiClient.patch(`/tasks/${asset.id}/project`, { projectId });
    setShowProjectMenu(false);
    onUpdate();
  };

  const handleToggleVisibility = async () => {
    await apiClient.patch(`/tasks/${asset.id}/visibility`);
    onUpdate();
  };

  return (
    <div className="group relative rounded-xl overflow-hidden border border-transparent bg-card transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5">
      {/* Preview — click to open detail page */}
      <div
        className={cn('relative bg-[#111] overflow-hidden cursor-pointer', mediaHeight ?? 'aspect-square')}
        onClick={() => router.push(`/assets/${asset.id}` as any)}
      >
        {/* No result placeholder */}
        {hasNoResult && (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-900/80">
            <AlertCircle className="h-8 w-8 text-zinc-600" />
            <p className="text-xs text-zinc-600 text-center px-3">结果 URL 为空</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
              {isRefreshing ? '刷新中...' : '重新获取'}
            </button>
          </div>
        )}

        {asset.type === 'video' && firstUrl && (
          <AutoPlayVideo src={firstUrl} className="w-full h-full object-cover" />
        )}

        {/* 图片：Ken Burns 缓慢缩放动画 */}
        {asset.type === 'image' && firstUrl && (
          <KenBurnsImage src={firstUrl} alt={asset.prompt} />
        )}

        {/* 音乐：封面图（若有）+ 音波 */}
        {asset.type === 'music' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 relative overflow-hidden">
            {musicCoverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={musicCoverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-black" />
            )}
            {firstUrl && <MusicBars className="relative z-10" />}
          </div>
        )}

        {/* ── 层 1：hover 暗色渐变遮罩（纯装饰，pointer-events-none） ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" />

        {/* ── 层 2：常驻类型角标（左上），不参与事件 ── */}
        {!hasNoResult && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            {asset.type === 'music' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-purple-300 text-[10px] font-medium">
                <Music className="h-2.5 w-2.5" />音乐
              </span>
            )}
            {asset.type === 'image' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-pink-300 text-[10px] font-medium">
                <ImageIcon className="h-2.5 w-2.5" />图片
              </span>
            )}
            {asset.type === 'video' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-blue-300 text-[10px] font-medium">
                <Video className="h-2.5 w-2.5" />视频
              </span>
            )}
          </div>
        )}

        {/* ── 层 3：操作按钮（右上，z-30），独立于遮罩层，hover 时显示 ── */}
        {!hasNoResult && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Favorite */}
            <button
              onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                asset.isFavorited ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-red-500',
              )}
              title={asset.isFavorited ? t('unfavorite') : t('favorite')}
            >
              <Heart className={cn('h-3 w-3', asset.isFavorited && 'fill-current')} />
            </button>

            {/* Visibility toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleVisibility(); }}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                asset.isPublic
                  ? 'bg-emerald-600/80 text-white hover:bg-emerald-600'
                  : 'bg-black/60 text-zinc-400 hover:bg-white/20',
              )}
              title={asset.isPublic ? '点击设为私密' : '点击设为公开'}
            >
              {asset.isPublic
                ? <Globe className="h-3 w-3" />
                : <Lock className="h-3 w-3" />
              }
            </button>

            {/* Download */}
            {firstUrl && (
              <a
                href={firstUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-lg bg-black/60 text-white hover:bg-primary flex items-center justify-center transition-colors"
                title={t('download')}
              >
                <Download className="h-3 w-3" />
              </a>
            )}

            {/* Move to project */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }}
                className="w-7 h-7 rounded-lg bg-black/60 text-white hover:bg-primary flex items-center justify-center transition-colors"
                title={t('move_to_project')}
              >
                <FolderOpen className="h-3 w-3" />
              </button>
              {showProjectMenu && (
                <div className="absolute top-8 right-0 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden min-w-44">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                    {t('move_to_project')}
                  </div>
                  {asset.projectId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveProject(null); }}
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 flex items-center gap-2"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('remove_from_project')}
                    </button>
                  )}
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); handleMoveProject(p.id); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center gap-2',
                        asset.projectId === p.id ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      {p.name}
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">{t('new_project')}</div>
                  )}
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={isDeleting}
              className="w-7 h-7 rounded-lg bg-black/60 text-white hover:bg-destructive flex items-center justify-center transition-colors"
              title={t('delete')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

      </div>

      {/* Info — click to open detail page */}
      <div
        className="p-3 bg-gradient-to-b from-[#111] to-[#0d0d0d] cursor-pointer"
        onClick={() => router.push(`/assets/${asset.id}` as any)}
      >
        <p className="text-xs text-zinc-400 line-clamp-1">
          {asset.prompt || getModelLabel(asset.model)}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-zinc-600">{getModelLabel(asset.model)}</span>
          <div className="flex items-center gap-1.5">
            {asset.isFavorited && <Heart className="h-3 w-3 text-red-500 fill-current" />}
            {asset.isPublic
              ? <Globe className="h-3 w-3 text-emerald-500/70" />
              : <Lock className="h-3 w-3 text-zinc-600" />}
          </div>
        </div>
      </div>

    </div>
  );
}
