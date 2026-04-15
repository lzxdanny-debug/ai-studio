'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Music, Sparkles, Loader2, ChevronDown, Globe, Lock, X,
  RotateCcw, Download, Play, Pause, ChevronLeft, ChevronRight, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElapsedSeconds, formatElapsed } from '@/hooks/use-elapsed-seconds';
import { TaskIdBadge } from '@/components/ui/task-id-badge';
import { useAppAlert } from '@/components/ui/app-alert';
import { useTaskPolling } from '@/hooks/use-task-polling';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { PromptEnhancer } from '@/components/prompt/prompt-enhancer';
import { DocLink } from '@/components/ui/doc-link';
import { getDocUrl } from '@/lib/doc-urls';
import { ApiKeySelector } from '@/components/ui/api-key-selector';
import apiClient from '@/lib/api';
import { MusicModel } from '@ai-platform/shared';
import { useModelPricing } from '@/hooks/use-model-pricing';

function musicModelMsgKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

const MODELS = [
  { value: MusicModel.SUNO_V55, label: 'Suno v5.5', credits: 50, badge: 'recommended' as const },
  { value: MusicModel.SUNO_V50, label: 'Suno v5.0', credits: 40 },
  { value: MusicModel.LYRIA3_PRO, label: 'Lyria 3 Pro', credits: 80 },
];

const STYLE_TAGS = ['Pop', 'Lo-Fi', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Rock', 'Ambient', 'R&B', 'Folk'];

function MusicResultCard({ task, onRegenerate }: { task: any; onRegenerate?: () => void }) {
  const t = useTranslations('generation');
  const locale = useLocale();
  const timeLocale = locale.startsWith('zh') ? 'zh-CN' : 'en-US';
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const firstUrl = task.resultUrls?.[0];
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const isProcessing = task.status === 'pending' || task.status === 'processing';

  const elapsed = useElapsedSeconds(task.createdAt, isProcessing);
  const stageText = elapsed < 15 ? t('progress_queued')
    : elapsed < 40 ? t('progress_processing')
    : t('progress_finishing');

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Music className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs text-zinc-500">{task.model}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs text-zinc-600">{new Date(task.createdAt).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="ml-auto">
          {task.isPublic ? <Globe className="h-3 w-3 text-zinc-600" /> : <Lock className="h-3 w-3 text-zinc-600" />}
        </div>
      </div>
      {task.prompt && <p className="px-3 py-2 text-xs text-zinc-400 line-clamp-4 overflow-y-auto border-b border-white/5">{task.prompt}</p>}

      {/* Player */}
      <div className="px-3 py-3">
        {isCompleted && firstUrl ? (
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center flex-shrink-0 transition-colors">
              {playing ? <Pause className="h-4 w-4 text-amber-400" /> : <Play className="h-4 w-4 text-amber-400 ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={cn('h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all', playing ? 'animate-pulse w-1/2' : 'w-0')} />
            </div>
            <audio ref={audioRef} src={firstUrl} onEnded={() => setPlaying(false)} />
            <a href={firstUrl} download target="_blank" rel="noreferrer"
              className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center transition-colors">
              <Download className="h-3.5 w-3.5 text-zinc-500" />
            </a>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin flex-shrink-0" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-zinc-400 font-medium">{stageText}</p>
                <p className="text-[10px] text-zinc-600">{t('elapsed_time', { time: formatElapsed(elapsed) })} · {t('expected_music')}</p>
              </div>
            </div>
            <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full origin-left animate-progress-indeterminate" />
            </div>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-red-400/50" />
              <p className="text-xs text-red-400">{t('gen_failed')}</p>
            </div>
            {task.errorMessage && <p className="text-[10px] text-zinc-500">{task.errorMessage}</p>}
            <div className="flex flex-col gap-0.5">
              {task.externalTaskId && <TaskIdBadge label="外部 ID" value={task.externalTaskId} />}
              <TaskIdBadge label="任务 ID" value={task.id} />
            </div>
          </div>
        ) : null}
      </div>

      {(isCompleted || isFailed) && onRegenerate && (
        <div className="px-3 pb-2 border-t border-white/5 pt-2">
          <button onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors border border-white/8">
            <RotateCcw className="h-3 w-3" />{t('regenerate')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Compact Pill Button ────────────────────────────────────────────
function PillButton({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
        active ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5')}>
      {children}
    </button>
  );
}

const MUSIC_SUGGESTION_COUNT = 9;

export default function MusicPage() {
  const t = useTranslations('generation');
  const searchParams = useSearchParams();
  const { showAlert, AppAlertModal } = useAppAlert();
  const { data: pricingMap } = useModelPricing();

  const getCredits = (modelValue: string, fallback: number) =>
    pricingMap?.[modelValue] ?? fallback;
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MusicModel>(() => {
    const m = searchParams.get('model') as MusicModel | null;
    return MODELS.some((x) => x.value === m) ? m! : MusicModel.SUNO_V55;
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [miniModelOpen, setMiniModelOpen] = useState(false);
  const [moreRef] = useState(() => ({ current: null as HTMLDivElement | null }));
  const moreDropRef = useRef<HTMLDivElement>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'simple' | 'custom'>('simple');
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedApiKey, setSelectedApiKey] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const modelRef = useRef<HTMLDivElement>(null);
  const miniModelRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS_PER_PAGE = 3;
  const totalPages = Math.ceil(MUSIC_SUGGESTION_COUNT / SUGGESTIONS_PER_PAGE);
  const suggestionStart = suggestionPage * SUGGESTIONS_PER_PAGE;
  const suggestionEnd = Math.min(suggestionStart + SUGGESTIONS_PER_PAGE, MUSIC_SUGGESTION_COUNT);
  const currentSuggestions = Array.from({ length: suggestionEnd - suggestionStart }, (_, i) =>
    t(`music_suggestions.${suggestionStart + i}`),
  );

  const model = MODELS.find((m) => m.value === selectedModel)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (miniModelRef.current && !miniModelRef.current.contains(e.target as Node)) setMiniModelOpen(false);
      if (moreDropRef.current && !moreDropRef.current.contains(e.target as Node)) setShowMoreOptions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { task: pollingTask } = useTaskPolling({
    taskId: currentTaskId,
    onComplete: (t) => {
      setTasks((prev) => prev.map((item) => item.id === t.id ? t : item));
      setCurrentTaskId(null);
      setIsGenerating(false);
    },
    onError: () => { setCurrentTaskId(null); setIsGenerating(false); },
  });

  useEffect(() => {
    if (pollingTask) setTasks((prev) => prev.map((item) => item.id === pollingTask.id ? pollingTask : item));
  }, [pollingTask]);

  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingLyrics(true);
    try {
      const res = await apiClient.post('/generate/music/lyrics', { prompt }) as any;
      if (res.data?.taskId) {
        setTimeout(async () => {
          try {
            const result = await apiClient.get(`/tasks/${res.data.taskId}`) as any;
            if (result.data?.resultUrls?.[0]) { setLyrics(result.data.resultUrls[0]); setActiveTab('custom'); }
          } catch {}
          setIsGeneratingLyrics(false);
        }, 5000);
      }
    } catch { setIsGeneratingLyrics(false); }
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const effectivePrompt = String(overridePrompt ?? prompt ?? '');
    if (!effectivePrompt.trim() && !lyrics.trim()) return;
    if (!selectedApiKey) {
      showAlert(t('need_api_key'), 'warning', '需要 API Key');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/generate/music', {
        model: selectedModel,
        prompt: activeTab === 'simple' ? effectivePrompt : undefined,
        lyrics: activeTab === 'custom' ? lyrics : undefined,
        title, tags, makeInstrumental, isPublic,
        apiKey: selectedApiKey || undefined,
      }) as any;
      const taskId = res.data?.taskId || res.taskId;
      const placeholder = { id: taskId, status: 'pending', prompt: effectivePrompt || title, model: model.label, isPublic, createdAt: new Date() };
      setTasks((prev) => [placeholder, ...prev]);
      setCurrentTaskId(taskId);
    } catch (error: any) {
      setIsGenerating(false);
      showAlert(error?.message || t('gen_failed'), 'error');
    }
  };

  // ─── Collapsed Bottom Bar (pollo.ai style) ─────────────────────────
  const CollapsedBottomBar = () => (
    <div className="border-t border-white/8 bg-[#141414]">
      <div className="max-w-4xl mx-auto w-full flex flex-col">
      {/* Row 1: Suggestion chips */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-2 overflow-x-auto">
        <button type="button" title={t('shuffle_suggestions')} onClick={() => setSuggestionPage((v) => (v + 1) % totalPages)}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/8 transition-colors text-zinc-500 hover:text-zinc-300">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        {currentSuggestions.map((s, i) => (
          <button key={i} onClick={() => setPrompt(s)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:border-amber-500/40 hover:text-amber-300 hover:bg-amber-500/8 transition-colors max-w-[200px] truncate">
            <Music className="h-3 w-3 flex-shrink-0 text-zinc-600" />
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>
      {/* Row 2: Prominent prompt input */}
      <div className="px-5 pb-3">
        <div className="relative rounded-2xl bg-[#252525] border border-white/20 focus-within:border-amber-400/70 focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.15)] transition-all duration-200">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('music.placeholder_main')}
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            className="w-full px-5 pt-4 pb-12 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed" />
          <div className="absolute left-3 bottom-2.5">
            <PromptEnhancer prompt={prompt} type="music" onSelect={setPrompt} direction="up" />
          </div>
          <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
            {prompt && (
              <button onClick={() => setPrompt('')} className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[11px] text-zinc-700">{prompt.length}/500</span>
          </div>
        </div>
      </div>
      {/* Row 3: Controls */}
      <div className="flex items-center gap-1.5 px-5 pb-4 pt-0 relative">
        <PillButton onClick={() => setActiveTab(activeTab === 'simple' ? 'custom' : 'simple')}>
          <Music className="h-3.5 w-3.5 text-amber-400" />
          {activeTab === 'simple' ? t('music.tab_simple') : t('music.tab_custom')}
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </PillButton>
        <div ref={miniModelRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setMiniModelOpen((v) => !v); setShowMoreOptions(false); }}>
            <span>{model.label}</span>
            {model.badge && <span className="text-[9px] px-1 py-px rounded bg-amber-500/30 text-amber-300">{t(`badge_${model.badge}`)}</span>}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {miniModelOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {MODELS.map((m) => (
                <button key={m.value} onClick={() => { setSelectedModel(m.value); setMiniModelOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors text-left text-xs', selectedModel === m.value && 'bg-amber-500/10')}>
                  <span className="text-zinc-200">{m.label}</span>
                  <span className="text-amber-400">{getCredits(m.value, m.credits)}{t('credits_unit')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* More options */}
        <div ref={moreDropRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setShowMoreOptions((v) => !v); setMiniModelOpen(false); }} active={showMoreOptions}>
            <span className="text-base leading-none tracking-widest">···</span>
          </PillButton>
          {showMoreOptions && (
            <div className="absolute bottom-full right-0 mb-1.5 z-30 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-300">{t('music.instrumental')}</p>
                </div>
                <button onClick={() => setMakeInstrumental((v) => !v)}
                  className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors', makeInstrumental ? 'bg-amber-500' : 'bg-white/10')}>
                  <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', makeInstrumental ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div>
                  <p className="text-xs font-medium text-zinc-300">{t('public_visibility')}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t('public_hint_featured_short')}</p>
                </div>
                <button onClick={() => setIsPublic((v) => !v)}
                  className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors', isPublic ? 'bg-pink-500' : 'bg-white/10')}>
                  <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', isPublic ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1" />
        {/* API Key selector (always visible) */}
        <ApiKeySelector
          value={selectedApiKey}
          onChange={setSelectedApiKey}
          compact
          dropDirection="up"
          className="flex-shrink-0"
        />
        {/* Doc link icon */}
        <a
          href={getDocUrl(selectedModel)}
          target="_blank"
          rel="noreferrer"
          title={t('api_docs')}
          className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/8 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </a>
        <span className="text-xs text-zinc-600 flex-shrink-0">{getCredits(model.value, model.credits)} {t('credits')}</span>
        <button onClick={() => handleGenerate()} disabled={isGenerating || (!prompt.trim() && !lyrics.trim())}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold transition-all disabled:opacity-40 flex-shrink-0">
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {t('generate')}
        </button>
      </div>
      </div>{/* end max-w wrapper */}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
      {/* Left Panel */}
      <div className={cn(
        'flex-shrink-0 flex flex-col border-white/5 overflow-hidden transition-all duration-300',
        'border-b md:border-b-0 md:border-r',
        panelCollapsed ? 'hidden md:flex md:w-0' : 'w-full md:w-[400px]',
      )}>
        <div className="w-full md:w-[400px] flex flex-col md:h-full overflow-y-auto">
        {/* Mode tabs */}
        <div className="flex px-4 pt-4 gap-1">
          {[{ value: 'simple' as const, labelKey: 'music.tab_simple' as const }, { value: 'custom' as const, labelKey: 'music.tab_custom' as const }].map((item) => (
            <button key={item.value} onClick={() => setActiveTab(item.value)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === item.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Model */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('model')}</label>
              <DocLink href={getDocUrl(selectedModel)} />
            </div>
            <div ref={modelRef} className="relative">
              <button onClick={() => setModelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-white/10 flex items-center justify-center">
                    <Music className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">{model.label}</span>
                      {model.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">{t(`badge_${model.badge}`)}</span>}
                    </div>
                    <p className="text-[11px] text-zinc-600">{t(`music.models.${musicModelMsgKey(model.value)}`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400">{getCredits(model.value, model.credits)} {t('credits')}</span>
                  <ChevronDown className={cn('h-4 w-4 text-zinc-600 transition-transform', modelOpen && 'rotate-180')} />
                </div>
              </button>
              {modelOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
                  {MODELS.map((m) => (
                    <button key={m.value} onClick={() => { setSelectedModel(m.value); setModelOpen(false); }}
                      className={cn('w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left', selectedModel === m.value && 'bg-amber-500/10')}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-200">{m.label}</span>
                          {m.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{t(`badge_${m.badge}`)}</span>}
                        </div>
                        <p className="text-[11px] text-zinc-600">{t(`music.models.${musicModelMsgKey(m.value)}`)}</p>
                      </div>
                      <span className="text-xs text-amber-400">{getCredits(m.value, m.credits)} {t('credits')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
              {activeTab === 'simple' ? t('music.label_desc') : t('music.label_theme')}
            </label>
            <div className="relative">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'simple' ? t('music.ph_simple') : t('music.ph_theme')}
                rows={3} maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed" />
            </div>
            <div className="mt-2">
              <PromptEnhancer prompt={prompt} type="music" onSelect={setPrompt} direction="down" apiKey={selectedApiKey} />
            </div>
          </div>

          {/* Custom Lyrics */}
          {activeTab === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('music.lyrics')}</label>
                <button type="button" onClick={handleGenerateLyrics} disabled={isGeneratingLyrics || !prompt.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors disabled:opacity-40">
                  {isGeneratingLyrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {t('music.ai_lyrics')}
                </button>
              </div>
              <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)}
                placeholder={t('music.lyrics_placeholder')}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none font-mono leading-relaxed" />
            </div>
          )}

          {/* Title + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{t('music.title')}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('music.title_optional')}
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            </div>
            {selectedModel !== MusicModel.LYRIA3_PRO && (
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{t('music.style_tags')}</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Pop, Happy..."
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
              </div>
            )}
          </div>

          {/* Quick style tags */}
          {selectedModel !== MusicModel.LYRIA3_PRO && (
            <div className="flex flex-wrap gap-1.5">
              {STYLE_TAGS.map((tag) => (
                <button key={tag} onClick={() => setTags((prev) => prev ? `${prev}, ${tag}` : tag)}
                  className="px-2.5 py-1 rounded-full text-[11px] text-zinc-500 border border-white/8 bg-white/3 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                  {tag}
                </button>
              ))}
            </div>
          )}

          <ToggleSwitch checked={makeInstrumental} onChange={setMakeInstrumental} label={t('music.instrumental')} />
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} label={t('public_to_community')} description={t('public_desc_explore_music')} />
        </div>

        {/* Sticky Bottom */}
        <div className="sticky bottom-0 px-4 pb-4 pt-3 border-t border-white/5 bg-[#0f0f0f]/90 backdrop-blur space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-700">{t('credits_required')}</span>
            <span className="text-amber-400 font-semibold text-sm">{getCredits(model.value, model.credits)}</span>
          </div>
          <ApiKeySelector value={selectedApiKey} onChange={setSelectedApiKey} />
          <button onClick={() => handleGenerate()}
            disabled={isGenerating || (!prompt.trim() && !lyrics.trim())}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-40 disabled:cursor-not-allowed">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />{t('generating')}</> : <><Sparkles className="h-4 w-4" />{t('generate_now')}</>}
          </button>
        </div>
        </div>{/* end inner 400px wrapper */}
      </div>{/* end left panel */}

        {/* ─── Collapse Toggle Button ─── */}
        <button
          onClick={() => setPanelCollapsed((v) => !v)}
          className={cn(
            'hidden md:flex absolute top-1/2 -translate-y-1/2 z-30 items-center justify-center',
            'w-5 h-12 rounded-r-lg bg-[#1a1a1a] border border-l-0 border-white/10',
            'text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-all',
            panelCollapsed ? 'left-0' : 'left-[400px]',
          )}
          title={panelCollapsed ? t('expand_panel') : t('collapse_panel')}
        >
          {panelCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-3 px-5 py-3 border-b border-white/5">
          <span className="text-sm font-medium text-zinc-400">{t('music.result_header')}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">{t('tracks_count', { count: tasks.length })}</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="max-w-3xl mx-auto w-full px-5 space-y-4">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
                  <Music className="h-8 w-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">{t('empty_hint_music')}</p>
                <p className="text-zinc-700 text-xs mt-1">{t('empty_sub_music')}</p>
              </div>
            ) : tasks.map((task) => (
              <MusicResultCard key={task.id} task={task} onRegenerate={() => {
                const p = task.prompt || '';
                setPrompt(p);
                handleGenerate(p);
              }} />
            ))}
          </div>
        </div>
      </div>
      </div>{/* end flex row */}

      {/* ─── Collapsed Bottom Bar — desktop only ─── */}
      {panelCollapsed && <div className="hidden md:block"><CollapsedBottomBar /></div>}

      {AppAlertModal}
    </div>
  );
}
