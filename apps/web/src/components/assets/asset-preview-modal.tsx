'use client';

import { useEffect, useRef } from 'react';
import { X, Download, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModelLabel } from '@/lib/utils';

interface Asset {
  id: string;
  type: string;
  model: string;
  prompt?: string;
  resultUrls?: string[];
}

interface AssetPreviewModalProps {
  asset: Asset | null;
  onClose: () => void;
}

export function AssetPreviewModal({ asset, onClose }: AssetPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!asset) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [asset, onClose]);

  // 打开时自动播放视频
  useEffect(() => {
    if (asset?.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [asset]);

  if (!asset) return null;

  const firstUrl = asset.resultUrls?.[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full mx-4 rounded-2xl overflow-hidden bg-[#111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {asset.prompt || getModelLabel(asset.model)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getModelLabel(asset.model)} · {asset.type}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {firstUrl && (
              <a
                href={firstUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                下载
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          'flex items-center justify-center bg-black',
          asset.type === 'video' ? 'aspect-video' : '',
          asset.type === 'image' ? 'max-h-[75vh]' : '',
          asset.type === 'music' ? 'py-12' : '',
        )}>
          {asset.type === 'video' && firstUrl && (
            <video
              ref={videoRef}
              src={firstUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}

          {asset.type === 'image' && firstUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstUrl}
              alt={asset.prompt || ''}
              className="max-w-full max-h-[75vh] object-contain"
            />
          )}


          {asset.type === 'music' && (() => {
            const audioUrl = asset.resultUrls?.[0];
            const coverUrl = asset.resultUrls?.[1];
            return (
              <div className="flex flex-col items-center gap-6 px-8 w-full max-w-lg">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="w-32 h-32 rounded-2xl object-cover shadow-xl shadow-black/50" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Music className="h-10 w-10 text-white" />
                  </div>
                )}
                <p className="text-sm text-zinc-300 text-center line-clamp-2">
                  {asset.prompt || getModelLabel(asset.model)}
                </p>
                {audioUrl ? (
                  <audio src={audioUrl} controls autoPlay className="w-full" />
                ) : (
                  <p className="text-sm text-zinc-500">暂无音频文件</p>
                )}
              </div>
            );
          })()}

          {!firstUrl && asset.type !== 'music' && (
            <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
              <p className="text-sm">暂无预览内容</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
