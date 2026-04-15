'use client';

import { use, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, Lock, Heart, Download, Trash2,
  Send, Play, Music, Loader2, RefreshCw, Bookmark, Users, X,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import apiClient from '@/lib/api';
import { Link, useRouter } from '@/lib/navigation';
import { cn, formatDate, getModelLabel } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { LikeShareBar } from '@/components/ui/like-share-bar';

function buildTryUrl(task: any) {
  const type = task?.type as string;
  const base =
    type === 'video' ? '/video' :
    type === 'image' ? '/image' :
    type === 'music' ? '/music' :
    '/video';

  const qs = new URLSearchParams();
  const input = (task?.inputParams || {}) as Record<string, any>;
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    if (k === 'apiKey' || k === 'isPublic') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      qs.set(k, String(v));
    }
  }
  if (task?.prompt) qs.set('prompt', task.prompt);
  if (task?.model) qs.set('model', task.model);

  return `${base}?${qs.toString()}`;
}

export default function AssetDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const t = useTranslations('assetDetail');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [comment, setComment] = useState('');
  const [showFavoritors, setShowFavoritors] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/explore/${taskId}`
    : '';

  // Use /tasks/:id so private assets are accessible
  const { data: task, isLoading } = useQuery({
    queryKey: ['asset-detail', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}`) as any;
      return res.data;
    },
  });

  const { data: comments, refetch: refetchComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['asset-comments', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/explore/${taskId}/comments`) as any;
      return res.data as any[];
    },
    // only load comments when task is public (private tasks won't have community comments)
    enabled: !!task?.isPublic,
  });

  const toggleVisibility = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/tasks/${taskId}/visibility`) as any;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/tasks/${taskId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  // 收藏列表（作者查看谁收藏了）
  const { data: favoritors, isLoading: favoritorLoading } = useQuery({
    queryKey: ['favoritors', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/favorites/${taskId}/favoritors`) as any;
      return res.data as Array<{ userId: string; displayName: string; avatarUrl: string | null; favoritedAt: string }>;
    },
    enabled: showFavoritors,
  });

  const deleteAsset = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      router.push('/assets');
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post(`/explore/${taskId}/comments`, { content }) as any;
      return res.data;
    },
    onSuccess: async () => {
      setComment('');
      await refetchComments();
    },
  });

  const tryUrl = useMemo(() => (task ? buildTryUrl(task) : ''), [task]);

  const firstUrl = task?.resultUrls?.[0] as string | undefined;
  const coverUrl = task?.type === 'music' ? (task?.resultUrls?.[1] as string | undefined) : undefined;
  const isPublic: boolean = task?.isPublic ?? false;

  const handleDelete = () => {
    if (!confirm(t('delete_confirm'))) return;
    deleteAsset.mutate();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Header bar ── */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>

          {task && (
            <div className="flex items-center gap-2">
              {/* Try again */}
              <Link
                href={tryUrl as any}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 text-xs font-medium transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('try_again')}
              </Link>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={deleteAsset.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 text-xs font-medium transition-colors"
              >
                {deleteAsset.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />}
                {t('delete')}
              </button>
            </div>
          )}
        </div>

        {/* ── Media card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
          {/* Media preview */}
          <div className={cn('w-full bg-black relative', task?.type === 'music' ? 'py-12' : 'aspect-video')}>
            {isLoading ? (
              <div className="w-full h-full animate-pulse bg-white/5" />
            ) : task?.type === 'video' && firstUrl ? (
              <video src={firstUrl} controls className="w-full h-full object-contain" />
            ) : task?.type === 'image' && firstUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firstUrl} alt={task?.prompt || ''} className="w-full h-full object-contain" />
            ) : task?.type === 'music' ? (
              <div className="flex flex-col items-center gap-5 px-8">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="w-36 h-36 rounded-2xl object-cover shadow-xl shadow-black/40" />
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-purple-700/60 to-pink-700/40 flex items-center justify-center">
                    <Music className="h-12 w-12 text-purple-300/50" />
                  </div>
                )}
                {firstUrl
                  ? <audio src={firstUrl} controls className="w-full max-w-md" />
                  : <p className="text-sm text-zinc-500">{t('no_audio')}</p>}
              </div>
            ) : task && !firstUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 py-16">
                <Play className="h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">{t('no_content')}</p>
              </div>
            ) : null}
          </div>

          {/* Meta + actions */}
          {task && (
            <div className="p-4 border-t border-white/8 space-y-3">
              {/* Prompt */}
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                {task.prompt || <span className="text-zinc-600 italic">{t('no_prompt')}</span>}
              </p>

              {/* Sub-info row */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                <span className="text-zinc-400 font-medium">{getModelLabel(task.model)}</span>
                <span className="text-zinc-700">·</span>
                <span>{formatDate(task.createdAt)}</span>
              </div>

              {/* ── Owner action bar ── */}
              <div className="pt-1 flex items-center gap-2 flex-wrap border-t border-white/5">

                {/* Visibility toggle — most prominent control */}
                <button
                  onClick={() => toggleVisibility.mutate()}
                  disabled={toggleVisibility.isPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    isPublic
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700',
                  )}
                  title={t('visibility_hint')}
                >
                  {toggleVisibility.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : isPublic
                      ? <Globe className="h-4 w-4" />
                      : <Lock className="h-4 w-4" />}
                  <span>{isPublic ? t('visibility_public') : t('visibility_private')}</span>
                  <span className="text-xs font-normal opacity-70 ml-0.5">
                    · {isPublic ? t('set_private') : t('set_public')}
                  </span>
                </button>

                <div className="flex-1" />

                {/* Favorite */}
                <button
                  onClick={() => toggleFavorite.mutate()}
                  disabled={toggleFavorite.isPending}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
                    task.isFavorited
                      ? 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                      : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
                  )}
                >
                  <Heart className={cn('h-3.5 w-3.5', task.isFavorited && 'fill-current')} />
                  {task.isFavorited ? t('unfavorite') : t('favorite')}
                </button>

                {/* Download */}
                {firstUrl && (
                  <a
                    href={firstUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('download')}
                  </a>
                )}
              </div>

              {/* ── Like + Share ── */}
              <div className="pt-1 border-t border-white/5">
                <LikeShareBar
                  taskId={taskId}
                  likeCount={task.likeCount ?? 0}
                  shareUrl={shareUrl}
                  shareText={task.prompt || ''}
                  isPrivate={!isPublic}
                />
              </div>

              {/* ── 收藏 & 评论统计（公开作品才有社区数据） ── */}
              {isPublic && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-4 flex-wrap">
                  {/* 收藏数 + 查看按钮 */}
                  <button
                    onClick={() => setShowFavoritors((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-pink-300 transition-colors"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>
                      {task.favoritesCount ?? 0} {t('favorited_by')}
                    </span>
                    {showFavoritors ? (
                      <X className="h-3 w-3 ml-0.5 opacity-60" />
                    ) : (
                      <Users className="h-3 w-3 ml-0.5 opacity-60" />
                    )}
                  </button>

                  {/* 评论数 */}
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    {task.commentsCount ?? comments?.length ?? 0} {t('count_suffix')}
                  </span>
                </div>
              )}

              {/* ── 收藏列表展开面板 ── */}
              {showFavoritors && isPublic && (
                <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">{t('favoritors_title')}</p>
                  {favoritorLoading ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('loading')}
                    </div>
                  ) : favoritors && favoritors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {favoritors.map((f) => (
                        <div key={f.userId} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
                          {f.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                              <span className="text-[9px] text-zinc-400">{f.displayName?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <span className="text-xs text-zinc-300">{f.displayName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">{t('no_favoritors')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Comments — only shown when public ── */}
        {task?.isPublic && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-zinc-300">{t('comments')}</h2>
              <span className="text-xs text-zinc-600">{comments?.length ?? 0} {t('count_suffix')}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
              <div className="p-3 border-b border-white/8">
                {isAuthenticated ? (
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t('comment_placeholder')}
                      className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 text-sm text-zinc-200 placeholder:text-zinc-600"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && comment.trim()) {
                          addComment.mutate(comment);
                        }
                      }}
                    />
                    <button
                      onClick={() => addComment.mutate(comment)}
                      disabled={!comment.trim() || addComment.isPending}
                      className={cn(
                        'h-9 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2',
                        !comment.trim() || addComment.isPending
                          ? 'bg-white/5 text-zinc-600'
                          : 'bg-purple-600 text-white hover:bg-purple-500',
                      )}
                    >
                      <Send className="h-4 w-4" />
                      {t('send')}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    {t('login_to_comment')}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300 ml-2">
                      {t('go_login')}
                    </Link>
                  </p>
                )}
              </div>

              <div className="p-3 space-y-3 min-h-[64px]">
                {commentsLoading ? (
                  <p className="text-sm text-zinc-600">{t('loading')}</p>
                ) : comments && comments.length > 0 ? (
                  comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      {c.user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-xs text-zinc-500">{c.user?.displayName?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 truncate font-medium">
                            {c.user?.displayName || t('user')}
                          </span>
                          <span className="text-[11px] text-zinc-600">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">{t('empty_comments')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
