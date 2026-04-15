'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  FolderOpen, Heart, Video, Image, Music, Plus, Loader2,
  FolderPlus, ChevronRight, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetCard } from '@/components/assets/asset-card';
import apiClient from '@/lib/api';
import { TaskType } from '@ai-platform/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type SidebarView = 'all' | 'favorites' | string; // string = projectId

const TYPE_FILTERS = [
  { value: undefined, labelKey: 'all' as const },
  { value: TaskType.VIDEO, labelKey: 'video' as const, Icon: Video },
  { value: TaskType.IMAGE, labelKey: 'image' as const, Icon: Image },
  { value: TaskType.MUSIC, labelKey: 'music' as const, Icon: Music },
];

export default function AssetsPage() {
  const t = useTranslations('assets');
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [sidebarView, setSidebarView] = useState<SidebarView>('all');

  // Auth guard — read from localStorage directly to avoid Zustand persist
  // hydration race: on page refresh the store may report isAuthenticated=false
  // for a brief tick before rehydrating, causing a spurious redirect to login.
  useEffect(() => {
    const hasToken =
      !!localStorage.getItem('access_token') ||
      !!localStorage.getItem('refresh_token');
    if (!hasToken) {
      router.replace(`/login?from=${encodeURIComponent('/assets')}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — logout redirect is handled by auth.store logout()
  const [typeFilter, setTypeFilter] = useState<TaskType | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);

  // Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects') as any;
      return res.data || [];
    },
    enabled: isAuthenticated,
  });

  // Assets
  const assetsParams = () => {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: '24',
    };
    if (typeFilter) params.type = typeFilter;
    if (sidebarView === 'favorites') params.isFavorited = 'true';
    if (sidebarView !== 'all' && sidebarView !== 'favorites') params.projectId = sidebarView;
    return new URLSearchParams(params).toString();
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['assets', sidebarView, typeFilter, page],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/assets?${assetsParams()}`) as any;
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Create project
  const createProject = useMutation({
    mutationFn: async (name: string) => apiClient.post('/projects', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProjectName('');
      setShowNewProject(false);
    },
  });

  // Delete project
  const deleteProject = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSidebarView('all');
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  const currentProject = projects.find((p: any) => p.id === sidebarView);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Left Sidebar — desktop only ─── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-border bg-card/50 flex-col overflow-y-auto">
        <div className="p-4 flex-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            {t('title')}
          </h2>

          {/* All Assets */}
          <button
            onClick={() => { setSidebarView('all'); setPage(1); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
              sidebarView === 'all'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <FolderOpen className="h-4 w-4" />
            {t('all_assets')}
          </button>

          {/* Favorites */}
          <button
            onClick={() => { setSidebarView('favorites'); setPage(1); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-3',
              sidebarView === 'favorites'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Heart className="h-4 w-4" />
            {t('favorites')}
          </button>

          {/* Projects section */}
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('projects')}
            </span>
            <button
              onClick={() => setShowNewProject(!showNewProject)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={t('new_project')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* New project input */}
          {showNewProject && (
            <div className="mb-2 px-1 space-y-1.5">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('project_name_placeholder')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    createProject.mutate(newProjectName.trim());
                  }
                  if (e.key === 'Escape') setShowNewProject(false);
                }}
                autoFocus
              />
              <Button
                size="sm"
                variant="gradient"
                className="w-full h-7 text-xs"
                disabled={!newProjectName.trim() || createProject.isPending}
                onClick={() => newProjectName.trim() && createProject.mutate(newProjectName.trim())}
              >
                {createProject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('create')}
              </Button>
            </div>
          )}

          {/* Project list */}
          <div className="space-y-0.5">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors',
                  sidebarView === project.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                onClick={() => { setSidebarView(project.id); setPage(1); }}
              >
                <FolderPlus className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{project.name}</span>
                {sidebarView === project.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('delete_project_confirm'))) {
                        deleteProject.mutate(project.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold truncate">
              {sidebarView === 'all'
                ? t('all_assets')
                : sidebarView === 'favorites'
                ? t('favorites')
                : currentProject?.name || t('projects')}
            </h1>
            {data && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.total} {t('all')}
              </p>
            )}
          </div>

          {/* Type filter — scrollable on mobile */}
          <div className="flex gap-1.5 overflow-x-auto flex-shrink-0 max-w-[60%] md:max-w-none">
            {TYPE_FILTERS.map(({ value, labelKey, Icon }) => (
              <button
                key={labelKey}
                onClick={() => { setTypeFilter(value); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  typeFilter === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile view selector — All / Favorites / Projects (hidden on desktop, sidebar handles it) */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-white/5 overflow-x-auto">
          <button
            onClick={() => { setSidebarView('all'); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border',
              sidebarView === 'all'
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                : 'border-white/10 text-zinc-500',
            )}
          >
            <FolderOpen className="h-3 w-3" />
            {t('all_assets')}
          </button>
          <button
            onClick={() => { setSidebarView('favorites'); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border',
              sidebarView === 'favorites'
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                : 'border-white/10 text-zinc-500',
            )}
          >
            <Heart className="h-3 w-3" />
            {t('favorites')}
          </button>
          {projects.map((project: any) => (
            <button
              key={project.id}
              onClick={() => { setSidebarView(project.id); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border',
                sidebarView === project.id
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-zinc-500',
              )}
            >
              <FolderPlus className="h-3 w-3" />
              {project.name}
            </button>
          ))}
        </div>

        {/* Grid — 4 列手动分发，媒体区固定高度序列 */}
        <div className="flex-1 overflow-y-auto p-5">
          {(() => {
            const NUM_COLS = 4;
            // 24 条/页，4 列 × 6 行，各列媒体区总高均为 1088px
            const MEDIA_HEIGHTS = [
              'h-44', 'h-36', 'h-52', 'h-40',  // row 0
              'h-52', 'h-44', 'h-36', 'h-56',  // row 1
              'h-36', 'h-52', 'h-44', 'h-40',  // row 2
              'h-48', 'h-40', 'h-56', 'h-44',  // row 3
              'h-40', 'h-56', 'h-44', 'h-52',  // row 4
              'h-52', 'h-44', 'h-40', 'h-40',  // row 5
            ] as const;

            // ── Loading skeleton ──
            if (isLoading) {
              const skeletonCols: string[][] = [
                ['h-44', 'h-52', 'h-36', 'h-48'],
                ['h-36', 'h-44', 'h-52', 'h-40'],
                ['h-52', 'h-36', 'h-44', 'h-56'],
                ['h-40', 'h-56', 'h-40', 'h-44'],
              ];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {skeletonCols.map((heights, ci) => (
                    <div key={ci} className="flex flex-col gap-3">
                      {heights.map((h, j) => (
                        <div key={j} className="rounded-xl border border-white/5 bg-zinc-900/60 overflow-hidden">
                          <div className={cn('bg-zinc-800/60 animate-pulse', h)} />
                          <div className="p-3 space-y-1.5">
                            <div className="h-2.5 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-2.5 bg-zinc-800/50 rounded w-2/3 animate-pulse" />
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
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                    <FolderOpen className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-medium">
                    {sidebarView === 'favorites' ? t('empty_favorites') : t('empty')}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {sidebarView === 'favorites' ? t('empty_favorites_hint') : t('empty_hint')}
                  </p>
                </div>
              );
            }

            // ── Real content ──
            type ColItem = { asset: any; idx: number };
            const cols: ColItem[][] = Array.from({ length: NUM_COLS }, () => []);
            (data.data as any[]).forEach((asset, i) => {
              cols[i % NUM_COLS].push({ asset, idx: i });
            });

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {cols.map((colItems, ci) => (
                    <div key={ci} className="flex flex-col gap-3">
                      {colItems.map(({ asset, idx }) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          projects={projects}
                          onUpdate={handleRefresh}
                          mediaHeight={MEDIA_HEIGHTS[idx % MEDIA_HEIGHTS.length]}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      {page} / {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
