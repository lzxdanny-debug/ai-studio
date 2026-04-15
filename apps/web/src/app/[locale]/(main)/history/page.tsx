'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import Link from 'next/link';
import {
  Video, Image, Music, MessageSquare, Globe,
  Clock, CheckCircle, XCircle, Loader2, RotateCcw, ChevronRight, History, Trash2, PlayCircle
} from 'lucide-react';
import { TaskIdBadge } from '@/components/ui/task-id-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api';
import { TaskType, TaskStatus } from '@ai-platform/shared';
import { cn, formatDate, getModelLabel } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
}

const TYPE_ICON: Record<string, React.ElementType> = {
  video: Video,
  image: Image,
  music: Music,
  chat: MessageSquare,
};

const TYPE_COLOR: Record<string, string> = {
  video: 'text-purple-400',
  image: 'text-pink-400',
  music: 'text-amber-400',
  chat: 'text-green-400',
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslations('history');
  const config = {
    [TaskStatus.PENDING]: { label: t('status_pending'), variant: 'info' as const, icon: Clock },
    [TaskStatus.PROCESSING]: { label: t('status_processing'), variant: 'warning' as const, icon: Loader2 },
    [TaskStatus.COMPLETED]: { label: t('status_completed'), variant: 'success' as const, icon: CheckCircle },
    [TaskStatus.FAILED]: { label: t('status_failed'), variant: 'destructive' as const, icon: XCircle },
  };
  const { label, variant, icon: Icon } = config[status] || config[TaskStatus.PENDING];
  return (
    <Badge variant={variant} className="flex items-center gap-1 flex-shrink-0">
      <Icon className={cn('h-3 w-3', status === TaskStatus.PROCESSING && 'animate-spin')} />
      {label}
    </Badge>
  );
}

const TYPE_FILTERS = [
  { value: undefined, labelKey: 'all' as const, icon: Globe },
  { value: TaskType.VIDEO, labelKey: 'video' as const, icon: Video },
  { value: TaskType.IMAGE, labelKey: 'image' as const, icon: Image },
  { value: TaskType.MUSIC, labelKey: 'music' as const, icon: Music },
  { value: TaskType.CHAT, labelKey: 'chat' as const, icon: MessageSquare },
];

const STATUS_FILTERS = [
  { value: TaskStatus.COMPLETED, labelKey: 'filter_success' as const, icon: CheckCircle, color: 'text-green-400 border-green-500/40 bg-green-500/10' },
  { value: TaskStatus.PROCESSING, labelKey: 'filter_processing' as const, icon: Loader2, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { value: TaskStatus.FAILED, labelKey: 'filter_failed' as const, icon: XCircle, color: 'text-red-400 border-red-500/40 bg-red-500/10' },
];

export default function HistoryPage() {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [typeFilter, setTypeFilter] = useState<TaskType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(TaskStatus.COMPLETED);
  const [page, setPage] = useState(1);

  // Auth guard — read from localStorage directly to avoid Zustand persist
  // hydration race: on page refresh the store may report isAuthenticated=false
  // for a brief tick before rehydrating, causing a spurious redirect to login.
  useEffect(() => {
    const hasToken =
      !!localStorage.getItem('access_token') ||
      !!localStorage.getItem('refresh_token');
    if (!hasToken) {
      router.replace(`/login?from=${encodeURIComponent('/history')}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — logout redirect is handled by auth.store logout()

  const isChatTab = typeFilter === TaskType.CHAT;

  // 任务历史（视频/图片/音乐）
  const { data, isLoading } = useQuery({
    queryKey: ['history', typeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get(`/tasks?${params}`) as any;
      return res.data;
    },
    enabled: !isChatTab,
  });

  // 对话会话历史
  const { data: chatSessions, isLoading: chatLoading } = useQuery({
    queryKey: ['chat-sessions-history'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chat-sessions`, { headers: getAuthHeader() });
      const json = await res.json();
      return (json?.data ?? json) as any[];
    },
    enabled: isChatTab,
  });

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t('chat_delete_confirm'))) return;
    await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    queryClient.invalidateQueries({ queryKey: ['chat-sessions-history'] });
  };

  const handleGoToWorkbench = (task: any) => {
    const routes: Record<string, string> = {
      video: '/video',
      image: '/image',
      music: '/music',
      chat: '/chat',
    };
    const path = routes[task.type] || '/video';
    const params = new URLSearchParams();
    if (task.prompt) params.set('prompt', task.prompt);
    if (task.model) params.set('model', task.model);
    if (task.subType) params.set('subType', task.subType);
    router.push(`${path}?${params.toString()}`);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
    <div className="container mx-auto px-4 py-8 max-w-5xl pb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-6">
        {/* Type Filter — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {TYPE_FILTERS.map(({ value, labelKey, icon: Icon }) => (
            <button
              key={labelKey}
              onClick={() => { setTypeFilter(value); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                typeFilter === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>
        {/* Status Filter — horizontal scroll on mobile */}
        {!isChatTab && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {STATUS_FILTERS.map(({ value, labelKey, icon: Icon, color }) => (
              <button
                key={labelKey}
                type="button"
                onClick={() => { setStatusFilter(value); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  statusFilter === value
                    ? color
                    : 'border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', statusFilter === value && value === TaskStatus.PROCESSING && 'animate-spin')} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Sessions List */}
      {isChatTab && (
        chatLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded shimmer w-3/4" />
                  <div className="h-3 bg-muted rounded shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : chatSessions && chatSessions.length > 0 ? (
          <div className="space-y-2">
            {chatSessions.map((session: any) => (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex-shrink-0 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title || t('new_chat')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{session.model}</span>
                      <span className="text-xs text-muted-foreground/40">·</span>
                      <span className="text-xs text-muted-foreground">{formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => router.push(`/chat?sessionId=${session.id}`)}
                    >
                      {t('continue_chat')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      className="w-7 h-7 rounded-lg bg-transparent hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      title={t('delete_title')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('no_chat_sessions')}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t('no_chat_hint')}</p>
            <div className="flex justify-center mt-6">
              <Link href="/chat">
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" />
                  {t('start_chat')}
                </Button>
              </Link>
            </div>
          </div>
        )
      )}

      {/* History List (video/image/music) */}
      {!isChatTab && (isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded shimmer w-3/4" />
                <div className="h-3 bg-muted rounded shimmer w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data?.length > 0 ? (
        <>
          <div className="space-y-2">
            {data.data.map((task: any) => {
              const TypeIcon = TYPE_ICON[task.type] || Globe;
              const typeColor = TYPE_COLOR[task.type] || 'text-muted-foreground';
              const firstResult = task.resultUrls?.[0];

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Type Icon + Preview */}
                    <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden relative">
                      {task.status === TaskStatus.COMPLETED && firstResult ? (
                        task.type === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={firstResult} alt="" className="w-full h-full object-cover" />
                        ) : task.type === 'video' ? (
                          <video src={firstResult} className="w-full h-full object-cover" muted />
                        ) : (
                          <div className={cn('w-full h-full flex items-center justify-center', typeColor)}>
                            <TypeIcon className="h-6 w-6" />
                          </div>
                        )
                      ) : (
                        <div className={cn('w-full h-full flex items-center justify-center', typeColor)}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-3 break-words">
                        {task.prompt || task.type}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{getModelLabel(task.model)}</span>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(task.createdAt)}</span>
                        {task.creditsCost > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="text-xs text-amber-400">{task.creditsCost} {t('credits_cost')}</span>
                          </>
                        )}
                      </div>
                      {task.status === TaskStatus.FAILED && task.errorMessage && (
                        <p className="text-xs text-destructive mt-1 line-clamp-2 break-words">{task.errorMessage}</p>
                      )}
                      <div className={cn(
                        'flex items-center gap-3 mt-1.5 flex-wrap',
                        task.status === TaskStatus.FAILED && 'opacity-80',
                      )}>
                        <TaskIdBadge
                          label={t('task_id')}
                          value={task.id}
                          highlight={task.status === TaskStatus.FAILED}
                        />
                        {task.externalTaskId && (
                          <TaskIdBadge
                            label={t('external_id')}
                            value={task.externalTaskId}
                            highlight={task.status === TaskStatus.FAILED}
                          />
                        )}
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={task.status} />
                      {task.status === TaskStatus.FAILED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGoToWorkbench(task)}
                          className="h-7 px-2 text-xs"
                        >
                          <RotateCcw className="h-3 w-3" />
                          {t('retry')}
                        </Button>
                      )}
                      {task.status === TaskStatus.COMPLETED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGoToWorkbench(task)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <PlayCircle className="h-3 w-3" />
                          {t('continue')}
                        </Button>
                      )}
                      {task.status === TaskStatus.COMPLETED && firstResult && (
                        <a
                          href={firstResult}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {tCommon('download')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination — 每页 20 条（与 API pageSize 一致） */}
          {data.totalPages >= 1 && data.total > 0 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8">
              <p className="text-sm text-muted-foreground order-2 sm:order-1 sm:mr-2">
                {t('page_info', { page: data.page ?? page, totalPages: data.totalPages, total: data.total })}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline" size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  {t('prev')}
                </Button>
                <span className="text-sm text-muted-foreground px-2 tabular-nums min-w-[4.5rem] text-center">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('empty')}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">{t('empty_hint')}</p>
          <div className="flex justify-center gap-3 mt-6">
            <Link href="/video"><Button variant="outline" size="sm"><Video className="h-4 w-4" />{tNav('video')}</Button></Link>
            <Link href="/image"><Button variant="outline" size="sm"><Image className="h-4 w-4" />{tNav('image')}</Button></Link>
            <Link href="/music"><Button variant="outline" size="sm"><Music className="h-4 w-4" />{tNav('music')}</Button></Link>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
