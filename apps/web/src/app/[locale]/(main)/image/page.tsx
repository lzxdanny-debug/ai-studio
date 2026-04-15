'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Upload, X, Sparkles, ChevronDown, Loader2, ImageIcon, RotateCcw,
  Globe, Lock, Download, ChevronRight, Sliders, ChevronLeft, MonitorPlay, BookOpen, Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElapsedSeconds, formatElapsed } from '@/hooks/use-elapsed-seconds';
import { TaskIdBadge } from '@/components/ui/task-id-badge';
import { useAppAlert } from '@/components/ui/app-alert';
import { useRouter } from '@/lib/navigation';
import { useTaskPolling } from '@/hooks/use-task-polling';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { PromptEnhancer } from '@/components/prompt/prompt-enhancer';
import apiClient from '@/lib/api';
import { ImageModel, ImageSubType } from '@ai-platform/shared';
import { DocLink } from '@/components/ui/doc-link';
import { getDocUrl } from '@/lib/doc-urls';
import { ApiKeySelector } from '@/components/ui/api-key-selector';
import { useModelPricing } from '@/hooks/use-model-pricing';

function imageModelMsgKey(value: string) {
  return value.replace(/-/g, '_');
}

const MODELS = [
  { value: ImageModel.NANO_BANANA_PRO, label: 'Nano Banana Pro', credits: 80, badge: 'recommended' as const },
  { value: ImageModel.NANO_BANANA_2, label: 'Nano Banana 2', credits: 80 },
  { value: ImageModel.NANO_BANANA, label: 'Nano Banana', credits: 60 },
  { value: ImageModel.GROK_IMAGE, label: 'Grok Image', credits: 60 },
];

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '3:2', '4:3', '3:4'];

function ResultCard({ task, onRegenerate, onSendToVideo }: { task: any; onRegenerate?: () => void; onSendToVideo?: (url: string) => void }) {
  const t = useTranslations('generation');
  const locale = useLocale();
  const timeLocale = locale.startsWith('zh') ? 'zh-CN' : 'en-US';
  const urls: string[] = task.resultUrls || [];
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const isProcessing = task.status === 'pending' || task.status === 'processing';

  const elapsed = useElapsedSeconds(task.createdAt, isProcessing);
  const stageText = elapsed < 15 ? t('progress_queued')
    : elapsed < 45 ? t('progress_processing')
    : t('progress_finishing');

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs text-zinc-500">{t('image.result_kind')}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs text-zinc-500">{task.model}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs text-zinc-600">{new Date(task.createdAt).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="ml-auto">
          {task.isPublic ? <Globe className="h-3 w-3 text-zinc-600" /> : <Lock className="h-3 w-3 text-zinc-600" />}
        </div>
      </div>
      {task.prompt && <p className="px-3 py-2 text-xs text-zinc-400 line-clamp-4 overflow-y-auto border-b border-white/5">{task.prompt}</p>}

      {/* Media */}
      {isCompleted && urls.length > 0 ? (
        <div className={cn('grid gap-1 p-1', urls.length === 1 ? 'grid-cols-1' : urls.length <= 2 ? 'grid-cols-2' : 'grid-cols-2')}>
          {urls.map((url, i) => (
            <div key={i} className="relative group aspect-square overflow-hidden rounded-lg bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a href={url} download target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                  <Download className="h-4 w-4 text-white" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : isProcessing ? (
        <div className="py-8 px-8 flex flex-col items-center gap-3 bg-black/20">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-zinc-400 font-medium">{stageText}</p>
          <p className="text-[10px] text-zinc-600">{t('elapsed_time', { time: formatElapsed(elapsed) })} · {t('expected_image')}</p>
          <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full origin-left animate-progress-indeterminate" />
          </div>
        </div>
      ) : isFailed ? (
        <div className="py-6 px-4 flex flex-col items-center gap-2 bg-black/20 text-center">
          <X className="h-8 w-8 text-red-400/60" />
          <p className="text-xs text-red-400">{t('gen_failed')}</p>
          {task.errorMessage && <p className="text-[10px] text-zinc-500">{task.errorMessage}</p>}
          <div className="flex flex-col gap-0.5 items-center mt-1">
            {task.externalTaskId && <TaskIdBadge label="外部 ID" value={task.externalTaskId} />}
            <TaskIdBadge label="任务 ID" value={task.id} />
          </div>
        </div>
      ) : null}

      {(isCompleted || isFailed) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
          {onRegenerate && (
            <button onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors border border-white/8">
              <RotateCcw className="h-3 w-3" />{t('regenerate')}
            </button>
          )}
          {isCompleted && urls.length > 0 && onSendToVideo && (
            <button onClick={() => onSendToVideo(urls[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors border border-white/8 hover:border-purple-500/30">
              <Film className="h-3 w-3" />{t('send_to_video')}
            </button>
          )}
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
        active ? 'border-pink-500/50 bg-pink-500/10 text-pink-300' : 'border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5')}>
      {children}
    </button>
  );
}

const IMAGE_SUGGESTION_COUNT = 9;

export default function ImagePage() {
  const t = useTranslations('generation');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showAlert, AppAlertModal } = useAppAlert();
  const { data: pricingMap } = useModelPricing();

  const getCredits = (modelValue: string, fallback: number) =>
    pricingMap?.[modelValue] ?? fallback;
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [subType, setSubType] = useState<ImageSubType>(() => {
    const sp = searchParams.get('subType');
    return sp === 'img2image' ? ImageSubType.IMG2IMAGE : ImageSubType.TEXT2IMAGE;
  });
  const [selectedModel, setSelectedModel] = useState<ImageModel>(() => {
    const m = searchParams.get('model') as ImageModel | null;
    return MODELS.some((x) => x.value === m) ? m! : ImageModel.NANO_BANANA_PRO;
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [outputNumber, setOutputNumber] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedApiKey, setSelectedApiKey] = useState<string | undefined>(undefined);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const miniModelRef = useRef<HTMLDivElement>(null);
  const arDropRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [miniModelOpen, setMiniModelOpen] = useState(false);
  const [arDropOpen, setArDropOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);

  const SUGGESTIONS_PER_PAGE = 3;
  const totalPages = Math.ceil(IMAGE_SUGGESTION_COUNT / SUGGESTIONS_PER_PAGE);
  const suggestionStart = suggestionPage * SUGGESTIONS_PER_PAGE;
  const suggestionEnd = Math.min(suggestionStart + SUGGESTIONS_PER_PAGE, IMAGE_SUGGESTION_COUNT);
  const currentSuggestions = Array.from({ length: suggestionEnd - suggestionStart }, (_, i) =>
    t(`image_suggestions.${suggestionStart + i}`),
  );

  const model = MODELS.find((m) => m.value === selectedModel)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (miniModelRef.current && !miniModelRef.current.contains(e.target as Node)) setMiniModelOpen(false);
      if (arDropRef.current && !arDropRef.current.contains(e.target as Node)) setArDropOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreOptions(false);
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

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }) as any;
      setReferenceImageUrl(res.data.url);
    } catch { showAlert(t('upload_failed_short'), 'error'); } finally { setIsUploading(false); }
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const effectivePrompt = String(overridePrompt ?? prompt ?? '');
    if (!effectivePrompt.trim()) return;
    if (!selectedApiKey) {
      showAlert(t('need_api_key'), 'warning', '需要 API Key');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/generate/image', {
        model: selectedModel, subType, prompt: effectivePrompt,
        referenceImageUrl: referenceImageUrl || undefined,
        aspectRatio, outputNumber, isPublic,
        apiKey: selectedApiKey || undefined,
      }) as any;
      const taskId = res.data?.taskId || res.taskId;
      const placeholder = { id: taskId, status: 'pending', prompt: effectivePrompt, model: model.label, isPublic, createdAt: new Date() };
      setTasks((prev) => [placeholder, ...prev]);
      setCurrentTaskId(taskId);
    } catch (error: any) {
      setIsGenerating(false);
      showAlert(error?.message || t('submit_failed_short'), 'error');
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
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:border-pink-500/40 hover:text-pink-300 hover:bg-pink-500/8 transition-colors max-w-[200px] truncate">
            <Sparkles className="h-3 w-3 flex-shrink-0 text-zinc-600" />
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>
      {/* Row 2: Prominent prompt input */}
      <div className="px-5 pb-3">
        <div className="relative rounded-2xl bg-[#252525] border border-white/20 focus-within:border-pink-400/70 focus-within:shadow-[0_0_0_3px_rgba(236,72,153,0.15)] transition-all duration-200">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('image.placeholder_main')}
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            className="w-full px-5 pt-4 pb-12 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed" />
          <div className="absolute left-3 bottom-2.5">
            <PromptEnhancer prompt={prompt} type="image" onSelect={setPrompt} direction="up" />
          </div>
          <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
            {prompt && (
              <button onClick={() => setPrompt('')} className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[11px] text-zinc-700">{prompt.length}/2000</span>
          </div>
        </div>
      </div>
      {/* Row 3: Controls */}
      <div className="flex items-center gap-1.5 px-5 pb-4 pt-0 relative">
        <PillButton onClick={() => setSubType(subType === ImageSubType.TEXT2IMAGE ? ImageSubType.IMG2IMAGE : ImageSubType.TEXT2IMAGE)}>
          <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
          {subType === ImageSubType.TEXT2IMAGE ? t('image.t2i') : t('image.i2i')}
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </PillButton>
        <div ref={miniModelRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setMiniModelOpen((v) => !v); setArDropOpen(false); setShowMoreOptions(false); }}>
            <span>{model.label}</span>
            {model.badge && <span className="text-[9px] px-1 py-px rounded bg-pink-500/30 text-pink-300">{t(`badge_${model.badge}`)}</span>}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {miniModelOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {MODELS.map((m) => (
                <button key={m.value} onClick={() => { setSelectedModel(m.value); setMiniModelOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors text-left text-xs', selectedModel === m.value && 'bg-pink-500/10')}>
                  <span className="text-zinc-200">{m.label}</span>
                  <span className="text-amber-400">{getCredits(m.value, m.credits)}{t('credits_unit')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Aspect Ratio */}
        <div ref={arDropRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setArDropOpen((v) => !v); setMiniModelOpen(false); setShowMoreOptions(false); }}>
            <MonitorPlay className="h-3.5 w-3.5 text-zinc-400" />
            {aspectRatio}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {arDropOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-36 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {ASPECT_RATIOS.map((r) => (
                <button key={r} onClick={() => { setAspectRatio(r); setArDropOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2 text-xs transition-colors', r === aspectRatio ? 'bg-pink-500/10 text-pink-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>
                  {r} {r === aspectRatio && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* More options */}
        <div ref={moreRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setShowMoreOptions((v) => !v); setMiniModelOpen(false); setArDropOpen(false); }} active={showMoreOptions}>
            <span className="text-base leading-none tracking-widest">···</span>
          </PillButton>
          {showMoreOptions && (
            <div className="absolute bottom-full right-0 mb-1.5 z-30 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">{t('output_count')}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} onClick={() => setOutputNumber(n)}
                      className={cn('py-1.5 rounded-lg text-sm font-medium transition-colors border', outputNumber === n ? 'border-pink-500 bg-pink-500/15 text-white' : 'border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300')}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div>
                  <p className="text-xs font-medium text-zinc-300">{t('public_visibility')}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t('public_hint_featured_short')}</p>
                </div>
                <button onClick={() => setIsPublic((v) => !v)}
                  className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors flex-shrink-0', isPublic ? 'bg-pink-500' : 'bg-white/10')}>
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
          className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-zinc-500 hover:text-pink-400 hover:border-pink-500/30 hover:bg-pink-500/8 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </a>
        <span className="text-xs text-zinc-600 flex-shrink-0">{getCredits(model.value, model.credits) * outputNumber} {t('credits')}</span>
        <button onClick={() => handleGenerate()} disabled={isGenerating || !prompt.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold transition-all disabled:opacity-40 flex-shrink-0">
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
        'flex-shrink-0 flex flex-col border-white/5 overflow-hidden transition-all duration-300 relative',
        'border-b md:border-b-0 md:border-r',
        panelCollapsed ? 'hidden md:flex md:w-0' : 'w-full md:w-[400px]',
      )}>
        <div className="w-full md:w-[400px] flex flex-col md:h-full overflow-y-auto">
        {/* Sub Type */}
        <div className="flex px-4 pt-4 gap-1">
          {[{ value: ImageSubType.TEXT2IMAGE, labelKey: 'image.t2i' as const }, { value: ImageSubType.IMG2IMAGE, labelKey: 'image.i2i' as const }].map((item) => (
            <button key={item.value} onClick={() => setSubType(item.value)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                subType === item.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
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
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/30 to-rose-500/30 border border-white/10 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">{model.label}</span>
                      {model.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-medium">{t(`badge_${model.badge}`)}</span>}
                    </div>
                    <p className="text-[11px] text-zinc-600">{t(`image.models.${imageModelMsgKey(model.value)}`)}</p>
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
                      className={cn('w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left', selectedModel === m.value && 'bg-pink-500/10')}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-200">{m.label}</span>
                          {m.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">{t(`badge_${m.badge}`)}</span>}
                        </div>
                        <p className="text-[11px] text-zinc-600">{t(`image.models.${imageModelMsgKey(m.value)}`)}</p>
                      </div>
                      <span className="text-xs text-amber-400">{getCredits(m.value, m.credits)} {t('credits')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reference Image */}
          {subType === ImageSubType.IMG2IMAGE && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{t('reference_image')}</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              {referenceImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referenceImageUrl} alt="" className="w-full max-h-48 object-cover" />
                  <button onClick={() => setReferenceImageUrl('')} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                  className="w-full flex flex-col items-center justify-center gap-2.5 py-8 rounded-xl border border-dashed border-white/10 hover:border-white/25 hover:bg-white/3 transition-colors">
                  {isUploading ? <Loader2 className="h-7 w-7 text-zinc-500 animate-spin" /> : <Upload className="h-7 w-7 text-zinc-600" />}
                  <span className="text-sm text-zinc-500">{isUploading ? t('uploading') : t('upload_image_hint')}</span>
                </button>
              )}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{t('prompt')}</label>
            <div className="relative">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('image.placeholder_panel')}
                rows={4} maxLength={2000}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 resize-none leading-relaxed" />
              <span className="absolute bottom-2.5 right-3 text-[11px] text-zinc-700">{prompt.length}/2000</span>
            </div>
            <div className="mt-2">
              <PromptEnhancer prompt={prompt} type="image" onSelect={setPrompt} direction="down" apiKey={selectedApiKey} />
            </div>
          </div>

          {/* Aspect Ratio */}
          <AspectRatioSelector ratios={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} />

          {/* Output Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{t('output_count')}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => setOutputNumber(n)}
                  className={cn('py-2 rounded-lg text-sm font-medium transition-colors border',
                    outputNumber === n ? 'border-pink-500 bg-pink-500/15 text-white' : 'border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300 bg-white/3')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <button onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-400">{t('advanced')}</span>
              </div>
              <ChevronRight className={cn('h-4 w-4 text-zinc-600 transition-transform', advancedOpen && 'rotate-90')} />
            </button>
            {advancedOpen && (
              <div className="px-4 pb-4 border-t border-white/5 pt-4">
                <ToggleSwitch checked={isPublic} onChange={setIsPublic} label={t('public_to_community')} description={t('public_desc_explore')} />
              </div>
            )}
          </div>
          {!advancedOpen && (
            <ToggleSwitch checked={isPublic} onChange={setIsPublic} label={t('public_to_community')} description={t('public_desc_home')} />
          )}
        </div>

        {/* Sticky Bottom */}
        <div className="sticky bottom-0 px-4 pb-4 pt-3 border-t border-white/5 bg-[#0f0f0f]/90 backdrop-blur space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-700">{t('credits_required')}</span>
            <span className="text-amber-400 font-semibold text-sm">{getCredits(model.value, model.credits) * outputNumber}</span>
          </div>
          <ApiKeySelector value={selectedApiKey} onChange={setSelectedApiKey} />
          <button onClick={() => handleGenerate()} disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold transition-all shadow-lg shadow-pink-600/25 disabled:opacity-40 disabled:cursor-not-allowed">
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
          <span className="text-sm font-medium text-zinc-400">{t('all')}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">{t('results_count', { count: tasks.length })}</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="max-w-3xl mx-auto w-full px-5 space-y-4">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">{t('empty_hint_image')}</p>
              </div>
            ) : tasks.map((task) => (
              <ResultCard key={task.id} task={task} onRegenerate={() => {
                const p = task.prompt || '';
                setPrompt(p);
                handleGenerate(p);
              }} onSendToVideo={(url) => {
                router.push(`/video?imageUrl=${encodeURIComponent(url)}&subType=img2video`);
              }} />
            ))}
          </div>
        </div>
      </div>
      </div>{/* end flex-1 row */}

      {/* ─── Collapsed Bottom Bar — desktop only ─── */}
      {panelCollapsed && <div className="hidden md:block"><CollapsedBottomBar /></div>}

      {AppAlertModal}
    </div>
  );
}
