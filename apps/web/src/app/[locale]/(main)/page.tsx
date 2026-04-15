'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Video, Image as ImageIcon, Music, MessageSquare,
  Sparkles, ChevronDown, Play, Download,
  Zap, Grid3x3, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/lib/api';
import { AutoPlayVideo, KenBurnsImage, MusicBars } from '@/components/ui/media-preview';
import { Link, useRouter } from '@/lib/navigation';

// ─── Tab Config ───────────────────────────────────────────────────
type TabKey = 'video' | 'image' | 'music' | 'chat';

const TABS: { key: TabKey; href: string; icon: React.ElementType; labelKey: string; placeholderKey: string; color: string }[] = [
  { key: 'video', href: '/video', icon: Video, labelKey: 'tab_video', placeholderKey: 'placeholder_video', color: 'text-purple-400' },
  { key: 'image', href: '/image', icon: ImageIcon, labelKey: 'tab_image', placeholderKey: 'placeholder_image', color: 'text-pink-400' },
  { key: 'music', href: '/music', icon: Music, labelKey: 'tab_music', placeholderKey: 'placeholder_music', color: 'text-amber-400' },
  { key: 'chat', href: '/chat', icon: MessageSquare, labelKey: 'tab_chat', placeholderKey: 'placeholder_chat', color: 'text-green-400' },
];

// ─── Quick Tags（文案在 messages 的 workspace.quick_tags 中）────────
const QUICK_TAG_KEYS: Record<TabKey, string[]> = {
  video: ['t2v', 'i2v', 'story', 'marketing', 'product', 'timelapse'],
  image: ['photo', 'concept', 'anime', 'game', 'poster', 'portrait'],
  music: ['pop', 'lofi', 'edm', 'classical', 'rap', 'jazz'],
  chat: ['writing', 'code', 'data', 'translate', 'summarize', 'brainstorm'],
};

// ─── Model Config per tab ─────────────────────────────────────────
const MODELS: Record<TabKey, { value: string; label: string }[]> = {
  video: [
    { value: 'sora-2', label: 'Sora 2' },
    { value: 'veo3', label: 'Veo 3' },
    { value: 'veo3-fast', label: 'Veo 3 Fast' },
    { value: 'grok-video', label: 'Grok Video' },
  ],
  image: [
    { value: 'nano-banana', label: 'Nano Banana' },
    { value: 'nano-banana-pro', label: 'Nano Banana Pro' },
    { value: 'grok-image', label: 'Grok Image' },
  ],
  music: [
    { value: 'chirp-v55', label: 'Suno v5.5' },
    { value: 'chirp-v50', label: 'Suno v5.0' },
    { value: 'Lyria 3 Pro', label: 'Lyria 3 Pro' },
  ],
  chat: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0' },
  ],
};

// ─── Aspect Ratio options (video/image) ──────────────────────────
const ASPECT_RATIOS = ['16:9', '9:16'];

// ─── Type color mapping ────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  video: 'from-purple-900 to-indigo-900',
  image: 'from-pink-900 to-rose-900',
  music: 'from-amber-900 to-orange-900',
  chat: 'from-green-900 to-teal-900',
};
const TYPE_EMOJI: Record<string, string> = { video: '🎬', image: '🖼', music: '🎵', chat: '💬' };

// ─── ModelSelector ─────────────────────────────────────────────────
function ModelSelector({ tab, value, onChange }: { tab: TabKey; value: string; onChange: (v: string) => void }) {
  const models = MODELS[tab];
  const selected = models.find((m) => m.value === value) || models[0];
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs text-zinc-300 cursor-pointer focus:outline-none focus:border-purple-500/50 transition-colors"
      >
        {models.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
    </div>
  );
}

// ─── AspectSelector ────────────────────────────────────────────────
function AspectSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs text-zinc-300 cursor-pointer focus:outline-none focus:border-purple-500/50 transition-colors"
      >
        {ASPECT_RATIOS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function HomePage() {
  const t = useTranslations('workspace');
  const tExplore = useTranslations('explore');
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('video');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS.video[0].value);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');

  const { data: exploreData, isLoading: exploreLoading } = useQuery({
    queryKey: ['home-explore', featuredFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', pageSize: '8' });
      if (featuredFilter !== 'all') params.set('type', featuredFilter);
      const res = await apiClient.get(`/explore?${params}`) as any;
      return res.data?.data ?? res.data ?? [];
    },
    staleTime: 60000,
  });

  const tab = TABS.find((t) => t.key === activeTab)!;

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setModel(MODELS[key][0].value);
    setPrompt('');
  };

  const handleGenerate = () => {
    if (!isAuthenticated) {
      router.push('/register');
      return;
    }
    if (!prompt.trim()) return;
    const params = new URLSearchParams({ prompt, model });
    if (activeTab === 'video' || activeTab === 'image') params.set('aspectRatio', aspectRatio);
    router.push(`${tab.href}?${params}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-0.5 md:gap-1 px-3 md:px-6 pt-4 md:pt-5 pb-0 border-b border-white/5">
        {TABS.map(({ key, icon: Icon, labelKey, color }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              'flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px flex-1 md:flex-none justify-center md:justify-start',
              activeTab === key
                ? `border-b-2 border-purple-500 text-white bg-white/5`
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/3',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0', activeTab === key ? color : '')} />
            {/* Label: short prefix on mobile (AI is redundant when icon is present) */}
            <span className="hidden sm:inline">{t(labelKey)}</span>
            <span className="sm:hidden">{t(labelKey).replace(/^AI /, '')}</span>
          </button>
        ))}
      </div>

      {/* ─── Creation Area ─── */}
      <div className="px-3 md:px-6 py-4 md:py-5">
        {/* Input Box */}
        <div className="relative rounded-2xl border border-white/10 bg-white/3 hover:border-white/20 transition-colors focus-within:border-purple-500/50 overflow-hidden">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t(tab.placeholderKey as any)}
            rows={4}
            className="w-full px-5 pt-4 pb-2 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-between px-3 md:px-4 pb-3 gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <ModelSelector tab={activeTab} value={model} onChange={setModel} />
              {(activeTab === 'video' || activeTab === 'image') && (
                <AspectSelector value={aspectRatio} onChange={setAspectRatio} />
              )}
              <span className="text-xs text-zinc-700 hidden sm:inline">⌘+↵ {t('generate')}</span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() && isAuthenticated}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all',
                'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
                'hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 hover:-translate-y-px',
                !isAuthenticated && 'opacity-90',
              )}
            >
              <Sparkles className="h-4 w-4" />
              {isAuthenticated ? t('generate') : t('login_to_generate')}
            </button>
          </div>
        </div>

        {/* Quick Tags */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {QUICK_TAG_KEYS[activeTab].map((key) => {
            const label = t(`quick_tags.${activeTab}.${key}`);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPrompt((prev) => (prev ? `${prev}, ${label}` : label))}
                className="px-3 py-1.5 rounded-full text-xs text-zinc-400 border border-white/8 bg-white/3 hover:bg-white/8 hover:text-zinc-200 hover:border-white/15 transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Featured Gallery ─── */}
      <div className="flex-1 px-3 md:px-6 pb-6 md:pb-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm font-semibold text-zinc-300">{t('featured')}</span>
            <span className="text-xs text-zinc-600 ml-1 hidden sm:inline">{t('featured_subtitle')}</span>
          </div>
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {(['all', 'video', 'image', 'music'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFeaturedFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs transition-colors whitespace-nowrap flex-shrink-0',
                  featuredFilter === f
                    ? 'bg-white/10 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400',
                )}
              >
                {f === 'all' ? tExplore('all') : f === 'video' ? tExplore('video') : f === 'image' ? tExplore('image') : tExplore('music')}
              </button>
            ))}
            <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-xs text-purple-400 hover:text-purple-300 transition-colors ml-0.5 flex-shrink-0">
              {tExplore('title')}
              <ChevronDown className="h-3 w-3 -rotate-90" />
            </Link>
          </div>
        </div>

        {/* Masonry — 4 列手动分发，错落高度序列让各列总高相等 */}
        {(() => {
          // 预设高度：col0[208+160] col1[144+224] col2[192+176] col3[160+208] 各列总高均为 368px
          const HEIGHTS = ['h-52', 'h-36', 'h-48', 'h-40', 'h-40', 'h-56', 'h-44', 'h-52'] as const;
          const NUM_COLS = 4;

          // ── Loading skeleton ──
          if (exploreLoading) {
            const skeletonCols = [
              ['h-52', 'h-40'],
              ['h-36', 'h-56'],
              ['h-48', 'h-44'],
              ['h-40', 'h-52'],
            ];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {skeletonCols.map((heights, ci) => (
                  <div key={ci} className="flex flex-col gap-2.5">
                    {heights.map((h, j) => (
                      <div key={j} className={cn('rounded-xl bg-white/5 animate-pulse', h)} />
                    ))}
                  </div>
                ))}
              </div>
            );
          }

          // ── Empty placeholder ──
          if (!exploreData || exploreData.length === 0) {
            const phTypes = ['video', 'image', 'music', 'video', 'image', 'video', 'music', 'image'];
            const phCols = Array.from({ length: NUM_COLS }, (_, ci) => [
              { type: phTypes[ci], h: HEIGHTS[ci] },
              { type: phTypes[ci + NUM_COLS], h: HEIGHTS[ci + NUM_COLS] },
            ]);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {phCols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-2.5">
                    {col.map(({ type, h }, j) => (
                      <div key={j} className={cn('rounded-xl overflow-hidden border border-white/5 relative', h)}>
                        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40', TYPE_COLOR[type])} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl opacity-20">{TYPE_EMOJI[type]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          }

          // ── Real content — distribute items round-robin across columns ──
          type ColItem = { item: any; idx: number };
          const cols: ColItem[][] = Array.from({ length: NUM_COLS }, () => []);
          (exploreData as any[]).forEach((item, i) => cols[i % NUM_COLS].push({ item, idx: i }));

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {cols.map((colItems, ci) => (
                <div key={ci} className="flex flex-col gap-2.5">
                  {colItems.map(({ item, idx }) => {
                    const h = HEIGHTS[idx] ?? 'h-44';
                    const firstUrl = item.resultUrls?.[0] as string | undefined;
                    const isVideo = item.type === 'video';
                    const isImage = item.type === 'image';
                    const isMusic = item.type === 'music';

                    return (
                      <div
                        key={item.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/explore/${item.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/explore/${item.id}`);
                          }
                        }}
                        className={cn(
                          'group relative rounded-xl overflow-hidden cursor-pointer',
                          'border border-white/5 hover:border-white/20',
                          'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/60',
                          'bg-zinc-900',
                          h,
                        )}
                      >
                        {/* ── Media ── */}
                        {firstUrl && isVideo && (
                          <AutoPlayVideo src={firstUrl} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        {firstUrl && isImage && (
                          <KenBurnsImage src={firstUrl} alt={item.prompt} wrapperClassName="absolute inset-0" />
                        )}
                        {isMusic && (
                          <div className="absolute inset-0">
                            {item.resultUrls?.[1] ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.resultUrls[1]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50" />
                              </>
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/20 to-black" />
                            )}
                            {firstUrl && <MusicBars className="absolute inset-0 flex items-center justify-center" />}
                          </div>
                        )}
                        {!firstUrl && !isMusic && (
                          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40', TYPE_COLOR[item.type] || 'from-zinc-800 to-zinc-900')} />
                        )}

                        {/* ── Bottom gradient + prompt ── */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                          <p className="text-[10px] text-white/70 line-clamp-2 leading-snug">
                            {item.prompt || `${TYPE_EMOJI[item.type]} AI 作品`}
                          </p>
                        </div>

                        {/* ── Type badge ── */}
                        <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
                          {isVideo && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-blue-300 text-[9px] font-medium">
                              <Video className="h-2.5 w-2.5" />{tExplore('video')}
                            </span>
                          )}
                          {isImage && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-pink-300 text-[9px] font-medium">
                              <ImageIcon className="h-2.5 w-2.5" />{tExplore('image')}
                            </span>
                          )}
                          {isMusic && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-amber-300 text-[9px] font-medium">
                              <Music className="h-2.5 w-2.5" />{tExplore('music')}
                            </span>
                          )}
                        </div>

                        {/* ── Play overlay (video / music) ── */}
                        {firstUrl && (isVideo || isMusic) && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
                              <Play className="h-3 w-3 text-white ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* ── Download button ── */}
                        {firstUrl && (
                          <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(firstUrl, '_blank', 'noopener,noreferrer');
                              }}
                              className="w-6 h-6 rounded-lg bg-black/60 text-white hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
                              aria-label={tExplore('download')}
                            >
                              <Download className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}

        {/* 查看全部 — 瀑布流外，居中展示 */}
        {!exploreLoading && (
          <div className="flex justify-center mt-5">
            <Link
              href="/explore"
              className="flex items-center gap-2 px-5 py-2 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/25 transition-colors"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              {t('view_all')}
            </Link>
          </div>
        )}
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="border-t border-white/5 px-3 md:px-6 py-3">
        {/* Mobile: 3-col grid；Desktop: single flex row */}
        <div className="grid grid-cols-3 md:flex md:items-center md:gap-6">
          {[
            { value: '12+', label: t('stat_models'), icon: Zap },
            { value: '4', label: t('stat_types'), icon: Grid3x3 },
            { value: '500', label: t('stat_free'), icon: Sparkles },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 md:flex-row md:gap-1.5 py-1">
              <div className="flex items-center gap-1">
                <Icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-purple-500/60" />
                <span className="text-sm font-bold text-zinc-200">{value}</span>
              </div>
              <span className="text-[10px] md:text-xs text-zinc-500 whitespace-nowrap">{label}</span>
            </div>
          ))}
          {/* "Powered by" — hidden on mobile to avoid crowding */}
          <div className="hidden md:block ml-auto text-xs text-zinc-700">
            Powered by{' '}
            <a href="https://shanhaiapi.com" target="_blank" rel="noreferrer" className="text-purple-500/70 hover:text-purple-400 transition-colors">
              Mountsea AI
            </a>
          </div>
        </div>
        {/* Mobile only: Powered by on its own row */}
        <div className="md:hidden mt-1.5 text-center text-[10px] text-zinc-700">
          Powered by{' '}
          <a href="https://shanhaiapi.com" target="_blank" rel="noreferrer" className="text-purple-500/60">
            Mountsea AI
          </a>
        </div>
      </div>
    </div>
  );
}
