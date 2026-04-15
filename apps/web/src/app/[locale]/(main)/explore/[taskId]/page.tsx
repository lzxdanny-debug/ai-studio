'use client';

import { useMemo, useState, use } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send, Bookmark, Loader2 } from 'lucide-react';
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

  const params = new URLSearchParams();
  const input = (task?.inputParams || {}) as Record<string, any>;
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    if (k === 'apiKey' || k === 'isPublic') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      params.set(k, String(v));
    }
  }
  if (task?.prompt) params.set('prompt', task.prompt);
  if (task?.model) params.set('model', task.model);

  return `${base}?${params.toString()}`;
}

export default function ExploreDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const t = useTranslations('exploreDetail');
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [comment, setComment] = useState('');

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/explore/${taskId}`
    : '';

  const { data: task, isLoading } = useQuery({
    queryKey: ['explore-detail', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/explore/${taskId}`) as any;
      return res.data;
    },
  });

  const { data: comments, refetch: refetchComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['explore-comments', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/explore/${taskId}/comments`) as any;
      return res.data as any[];
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

  // ── Favorite state (optimistic) ──
  const [isFavorited, setIsFavorited] = useState<boolean | null>(null);
  const [favCount, setFavCount] = useState<number | null>(null);

  const resolvedFav = isFavorited ?? (task?.isFavoritedByMe ?? false);
  const resolvedCount = favCount ?? (task?.favoritesCount ?? 0);

  const toggleFav = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ isFavorited: boolean; favoritesCount: number }>(
        `/favorites/${taskId}`,
      );
      return res.data;
    },
    onSuccess: (data) => {
      setIsFavorited(data.isFavorited);
      setFavCount(data.favoritesCount);
    },
  });

  const tryUrl = useMemo(() => (task ? buildTryUrl(task) : ''), [task]);

  const firstUrl = task?.resultUrls?.[0] as string | undefined;
  const coverUrl = task?.type === 'music' ? (task?.resultUrls?.[1] as string | undefined) : undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>
          {task && (
            <button
              onClick={() => window.open(tryUrl, '_blank')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-colors"
            >
              {t('try')}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
          {/* Media */}
          <div className={cn('w-full bg-black', task?.type === 'music' ? 'py-10' : 'aspect-video')}>
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
                  <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-purple-700/60 to-pink-700/40" />
                )}
                {firstUrl ? (
                  <audio src={firstUrl} controls className="w-full max-w-xl" />
                ) : (
                  <p className="text-sm text-zinc-500">{t('no_audio')}</p>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm py-16">
                {t('no_content')}
              </div>
            )}
          </div>

          {/* Meta */}
          {task && (
            <div className="p-4 border-t border-white/10 space-y-3">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                {task.prompt || t('no_prompt')}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                <span className="text-zinc-400">{getModelLabel(task.model)}</span>
                <span className="text-zinc-700">·</span>
                <span>{formatDate(task.createdAt)}</span>
                {task.user?.displayName && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-zinc-400">{t('author')}：{task.user.displayName}</span>
                  </>
                )}
              </div>

              {/* ── Like + Favorite + Share ── */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                <LikeShareBar
                  taskId={taskId}
                  likeCount={task.likeCount ?? 0}
                  shareUrl={shareUrl}
                  shareText={task.prompt || ''}
                />

                {/* Favorite button */}
                {isAuthenticated && (
                  <button
                    onClick={() => !toggleFav.isPending && toggleFav.mutate()}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                      resolvedFav
                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30 hover:bg-pink-500/25'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-200 hover:bg-white/5',
                    )}
                  >
                    {toggleFav.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Bookmark className={cn('h-3.5 w-3.5', resolvedFav && 'fill-current')} />}
                    <span>
                      {resolvedFav ? t('unfavorite') : t('favorite')}
                      {resolvedCount > 0 && (
                        <span className="ml-1 opacity-70">{resolvedCount}</span>
                      )}
                    </span>
                  </button>
                )}

                {/* 未登录时仅展示收藏数 */}
                {!isAuthenticated && resolvedCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-zinc-600">
                    <Bookmark className="h-3.5 w-3.5" />
                    {resolvedCount}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-zinc-300">{t('comments')}</h2>
            <span className="text-xs text-zinc-600">{comments?.length || 0} {t('count_suffix')}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
            <div className="p-3 border-b border-white/10">
              {isAuthenticated ? (
                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('comment_placeholder')}
                    className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 text-sm text-zinc-200 placeholder:text-zinc-600"
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
                      'h-10 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2',
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
                <div className="text-sm text-zinc-500">
                  {t('login_to_comment')}
                  <Link href="/login" className="text-purple-400 hover:text-purple-300 ml-2">
                    {t('go_login')}
                  </Link>
                </div>
              )}
            </div>

            <div className="p-3 space-y-3">
              {commentsLoading ? (
                <div className="text-sm text-zinc-600">{t('loading')}</div>
              ) : comments && comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    {c.user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-300 truncate">
                          {c.user?.displayName || t('user')}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200 mt-1 whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-600">{t('empty_comments')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
