'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Upload, X, Sparkles, ChevronDown, Loader2, Video, RotateCcw,
  Globe, Lock, Download, ChevronRight, Sliders, ChevronLeft,
  Clock, MonitorPlay, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElapsedSeconds, formatElapsed } from '@/hooks/use-elapsed-seconds';
import { TaskIdBadge } from '@/components/ui/task-id-badge';
import { useAppAlert } from '@/components/ui/app-alert';
import { useTaskPolling } from '@/hooks/use-task-polling';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { PromptEnhancer } from '@/components/prompt/prompt-enhancer';
import apiClient from '@/lib/api';
import { VideoModel, VideoSubType } from '@ai-platform/shared';
import { DocLink } from '@/components/ui/doc-link';
import { getDocUrl } from '@/lib/doc-urls';
import { ApiKeySelector } from '@/components/ui/api-key-selector';
import { useModelPricing } from '@/hooks/use-model-pricing';

// ─── Constants ─────────────────────────────────────────────────────
function videoModelMsgKey(value: string) {
  return value.replace(/-/g, '_');
}

const MODELS = [
  { value: VideoModel.VEO31, label: 'Veo 3.1', credits: 600, badge: 'new' as const },
  { value: VideoModel.VEO31_FAST, label: 'Veo 3.1 Fast', credits: 300 },
  { value: VideoModel.VEO3, label: 'Veo 3', credits: 500, badge: 'recommended' as const },
  { value: VideoModel.VEO3_FAST, label: 'Veo 3 Fast', credits: 250 },
  { value: VideoModel.SORA2, label: 'Sora 2', credits: 300 },
  { value: VideoModel.VEO2, label: 'Veo 2', credits: 200 },
  // Grok Video: Mountsea API 暂未实现 /xai/generate-video，暂时下线
];

// 只有 Veo2 支持图生视频（img2video）；Grok Video 暂未实现
const IMG2VIDEO_SUPPORTED_MODELS = new Set([VideoModel.VEO2]);

// Gemini / Veo 系列只支持 16:9 和 9:16；Sora2 同样支持这两种
const ASPECT_RATIOS = ['16:9', '9:16'];
const RESOLUTIONS = ['480P', '720P'];

// ─── Result Card ────────────────────────────────────────────────────
function ResultCard({ task, onRegenerate }: { task: any; onRegenerate?: () => void }) {
  const t = useTranslations('generation');
  const locale = useLocale();
  const timeLocale = locale.startsWith('zh') ? 'zh-CN' : 'en-US';
  const firstUrl = task.resultUrls?.[0];
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const isProcessing = task.status === 'pending' || task.status === 'processing';

  const elapsed = useElapsedSeconds(task.createdAt, isProcessing);
  const stageText = elapsed < 15 ? t('progress_queued')
    : elapsed < 60 ? t('progress_processing')
    : t('progress_finishing');

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Video className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs text-zinc-500">{t('video.result_kind')}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs text-zinc-500">{task.model}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs text-zinc-600">{new Date(task.createdAt).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="ml-auto flex items-center gap-1">
          {task.isPublic ? <Globe className="h-3 w-3 text-zinc-600" /> : <Lock className="h-3 w-3 text-zinc-600" />}
        </div>
      </div>
      {task.prompt && <p className="px-3 py-2 text-xs text-zinc-400 line-clamp-4 border-b border-white/5 overflow-y-auto">{task.prompt}</p>}

      <div className="aspect-video bg-black/40 relative flex items-center justify-center">
        {isCompleted && firstUrl ? (
          <video src={firstUrl} controls className="w-full h-full object-contain" />
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-3 w-full px-8">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">{stageText}</p>
            <p className="text-[10px] text-zinc-600">{t('elapsed_time', { time: formatElapsed(elapsed) })} · {t('expected_video')}</p>
            {/* Indeterminate progress bar */}
            <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full origin-left animate-progress-indeterminate" />
            </div>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <X className="h-8 w-8 text-red-400/60" />
            <p className="text-xs text-red-400">{t('gen_failed')}</p>
            {task.errorMessage && <p className="text-[10px] text-zinc-500 max-w-full">{task.errorMessage}</p>}
            <div className="flex flex-col gap-0.5 items-center mt-1">
              {task.externalTaskId && <TaskIdBadge label="外部 ID" value={task.externalTaskId} />}
              <TaskIdBadge label="任务 ID" value={task.id} />
            </div>
          </div>
        ) : null}
      </div>

      {(isCompleted || isFailed) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
          {onRegenerate && (
            <button onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors border border-white/8">
              <RotateCcw className="h-3 w-3" />{t('regenerate')}
            </button>
          )}
          {isCompleted && firstUrl && (
            <a href={firstUrl} download target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors border border-white/8 ml-auto">
              <Download className="h-3 w-3" />{t('download')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact Pill Button ─────────────────────────────────────────────
function PillButton({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
        active
          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
          : 'border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5',
      )}
    >
      {children}
    </button>
  );
}

const VIDEO_SUGGESTION_COUNT = 9;

// ─── Main Page ──────────────────────────────────────────────────────
export default function VideoPage() {
  const t = useTranslations('generation');
  const searchParams = useSearchParams();
  const { showAlert, AppAlertModal } = useAppAlert();
  const { data: pricingMap } = useModelPricing();

  /** 读取动态积分，未加载完时降级到硬编码 */
  const getCredits = (modelValue: string, fallback: number) =>
    pricingMap?.[modelValue] ?? fallback;
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [subType, setSubType] = useState<VideoSubType>(() => {
    const sp = searchParams.get('subType');
    return sp === 'img2video' ? VideoSubType.IMG2VIDEO : VideoSubType.TEXT2VIDEO;
  });
  const [selectedModel, setSelectedModel] = useState<VideoModel>(() => {
    const m = searchParams.get('model') as VideoModel | null;
    return MODELS.some((x) => x.value === m) ? m! : VideoModel.VEO3;
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(searchParams.get('imageUrl') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720P');
  const [outputNumber, setOutputNumber] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedApiKey, setSelectedApiKey] = useState<string | undefined>(undefined);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Bottom bar dropdowns
  const [miniModelOpen, setMiniModelOpen] = useState(false);
  const [arDropOpen, setArDropOpen] = useState(false);
  const [resDropOpen, setResDropOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);
  const miniModelRef = useRef<HTMLDivElement>(null);
  const arDropRef = useRef<HTMLDivElement>(null);
  const resDropRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS_PER_PAGE = 3;
  const totalPages = Math.ceil(VIDEO_SUGGESTION_COUNT / SUGGESTIONS_PER_PAGE);
  const suggestionStart = suggestionPage * SUGGESTIONS_PER_PAGE;
  const suggestionEnd = Math.min(suggestionStart + SUGGESTIONS_PER_PAGE, VIDEO_SUGGESTION_COUNT);
  const currentSuggestions = Array.from({ length: suggestionEnd - suggestionStart }, (_, i) =>
    t(`video_suggestions.${suggestionStart + i}`),
  );

  const model = MODELS.find((m) => m.value === selectedModel)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (miniModelRef.current && !miniModelRef.current.contains(e.target as Node)) setMiniModelOpen(false);
      if (arDropRef.current && !arDropRef.current.contains(e.target as Node)) setArDropOpen(false);
      if (resDropRef.current && !resDropRef.current.contains(e.target as Node)) setResDropOpen(false);
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
      setUploadedImageUrl(res.data.url);
    } catch { showAlert(t('upload_failed'), 'error'); } finally { setIsUploading(false); }
  };

  const handleGenerate = async (overridePrompt?: string) => {
    const effectivePrompt = String(overridePrompt ?? prompt ?? '');
    if (!effectivePrompt.trim() && subType === VideoSubType.TEXT2VIDEO) return;
    if (subType === VideoSubType.IMG2VIDEO && !uploadedImageUrl) return;
    if (!selectedApiKey) {
      showAlert(t('need_api_key'), 'warning', '需要 API Key');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/generate/video', {
        model: selectedModel, subType, prompt: effectivePrompt,
        imageUrls: uploadedImageUrl ? [uploadedImageUrl] : undefined,
        aspectRatio,
        duration: selectedModel === VideoModel.SORA2 ? duration : undefined,
        resolution: resolution || undefined,
        isPublic,
        apiKey: selectedApiKey || undefined,
      }) as any;
      const taskId = res.data?.taskId || res.taskId;
      const placeholder = { id: taskId, status: 'pending', prompt: effectivePrompt, model: model.label, isPublic, createdAt: new Date() };
      setTasks((prev) => [placeholder, ...prev]);
      setCurrentTaskId(taskId);
    } catch (error: any) {
      setIsGenerating(false);
      showAlert(error?.message || t('submit_failed'), 'error');
    }
  };

  // ─── Collapsed Bottom Bar (pollo.ai style, multi-row) ─────────────
  const CollapsedBottomBar = () => (
    <div className="border-t border-white/8 bg-[#141414]">
      <div className="max-w-4xl mx-auto w-full flex flex-col">
      {/* Row 1: Suggestion chips */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-2 overflow-x-auto">
        <button
          onClick={() => setSuggestionPage((v) => (v + 1) % totalPages)}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/8 transition-colors text-zinc-500 hover:text-zinc-300"
          title={t('shuffle_suggestions')}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        {currentSuggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setPrompt(s)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/8 transition-colors max-w-[200px] truncate"
          >
            <Sparkles className="h-3 w-3 flex-shrink-0 text-zinc-600" />
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>

      {/* Row 2: Prominent prompt input */}
      <div className="px-5 pb-3">
        <div className="relative rounded-2xl bg-[#252525] border border-white/20 focus-within:border-purple-400/70 focus-within:shadow-[0_0_0_3px_rgba(168,85,247,0.15)] transition-all duration-200">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('video.placeholder_main')}
            rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            className="w-full px-5 pt-4 pb-12 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
          />
          {/* Bottom-right actions inside box */}
          <div className="absolute left-3 bottom-2.5">
            <PromptEnhancer prompt={prompt} type="video" onSelect={setPrompt} direction="up" />
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
        {/* Sub-type */}
        <PillButton
          onClick={() => {
            if (subType === VideoSubType.TEXT2VIDEO) {
              if (!IMG2VIDEO_SUPPORTED_MODELS.has(selectedModel)) {
                showAlert('当前模型不支持图生视频，请切换到 Veo 2', 'warning', '模型限制');
                return;
              }
              setSubType(VideoSubType.IMG2VIDEO);
            } else {
              setSubType(VideoSubType.TEXT2VIDEO);
            }
          }}
          active={false}
        >
          <Video className="h-3.5 w-3.5 text-purple-400" />
          {subType === VideoSubType.TEXT2VIDEO ? t('video.t2v') : t('video.i2v')}
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </PillButton>

        {/* Model */}
        <div ref={miniModelRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setMiniModelOpen((v) => !v); setArDropOpen(false); setResDropOpen(false); setShowMoreOptions(false); }}>
            <span>{model.label}</span>
            {model.badge && <span className="text-[9px] px-1 py-px rounded bg-purple-500/30 text-purple-300">{t(`badge_${model.badge}`)}</span>}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {miniModelOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {MODELS.map((m) => (
                <button key={m.value} onClick={() => { setSelectedModel(m.value); setMiniModelOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors text-left text-xs', selectedModel === m.value && 'bg-purple-500/10')}>
                  <span className="text-zinc-200">{m.label}</span>
                  <span className="text-amber-400">{getCredits(m.value, m.credits)}{t('credits_unit')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aspect Ratio */}
        <div ref={arDropRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setArDropOpen((v) => !v); setMiniModelOpen(false); setResDropOpen(false); setShowMoreOptions(false); }}>
            <MonitorPlay className="h-3.5 w-3.5 text-zinc-400" />
            {aspectRatio}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {arDropOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-36 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {ASPECT_RATIOS.map((r) => (
                <button key={r} onClick={() => { setAspectRatio(r); setArDropOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left', r === aspectRatio ? 'bg-purple-500/10 text-purple-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>
                  <span>{r}</span>
                  {r === aspectRatio && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration (Sora 2 only) */}
        {selectedModel === VideoModel.SORA2 && (
          <PillButton>
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            {duration}s
          </PillButton>
        )}

        {/* Resolution */}
        <div ref={resDropRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setResDropOpen((v) => !v); setMiniModelOpen(false); setArDropOpen(false); setShowMoreOptions(false); }}>
            {resolution}
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          </PillButton>
          {resDropOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 z-30 w-28 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden">
              {RESOLUTIONS.map((r) => (
                <button key={r} onClick={() => { setResolution(r); setResDropOpen(false); }}
                  className={cn('w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left', r === resolution ? 'bg-purple-500/10 text-purple-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200')}>
                  <span>{r}</span>
                  {r === resolution && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More Options ··· */}
        <div ref={moreRef} className="relative flex-shrink-0">
          <PillButton onClick={() => { setShowMoreOptions((v) => !v); setMiniModelOpen(false); setArDropOpen(false); setResDropOpen(false); }} active={showMoreOptions}>
            <span className="text-base leading-none tracking-widest">···</span>
          </PillButton>
          {showMoreOptions && (
            <div className="absolute bottom-full right-0 mb-1.5 z-30 w-72 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl p-4 space-y-4">
              {/* Output Number */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">{t('output_count')}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} onClick={() => setOutputNumber(n)}
                      className={cn('py-1.5 rounded-lg text-sm font-medium transition-colors border',
                        outputNumber === n ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300')}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {/* Public Visibility */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div>
                  <p className="text-xs font-medium text-zinc-300">{t('public_visibility')}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{t('public_hint_featured')}</p>
                </div>
                <button
                  onClick={() => setIsPublic((v) => !v)}
                  className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors flex-shrink-0', isPublic ? 'bg-pink-500' : 'bg-white/10')}>
                  <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', isPublic ? 'translate-x-4' : 'translate-x-0')} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
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
          className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-zinc-500 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/8 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </a>

        {/* Credits + Generate */}
        <span className="text-xs text-zinc-600 flex-shrink-0">{getCredits(model.value, model.credits)} {t('credits')}</span>
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating || (!prompt.trim() && subType === VideoSubType.TEXT2VIDEO)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold transition-all disabled:opacity-40 flex-shrink-0"
        >
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
        {/* ─── Left Panel ─── */}
        <div className={cn(
          'flex-shrink-0 flex flex-col border-white/5 overflow-hidden transition-all duration-300 relative',
          'border-b md:border-b-0 md:border-r',
          panelCollapsed ? 'hidden md:flex md:w-0' : 'w-full md:w-[400px]',
        )}>
          <div className="w-full md:w-[400px] flex flex-col md:h-full overflow-y-auto">
            {/* Sub Type Tabs */}
            <div className="flex px-4 pt-4 gap-1">
              {[
                { value: VideoSubType.TEXT2VIDEO, labelKey: 'video.t2v' as const },
                { value: VideoSubType.IMG2VIDEO, labelKey: 'video.i2v' as const },
              ].map((item) => {
                const isI2V = item.value === VideoSubType.IMG2VIDEO;
                const i2vDisabled = isI2V && !IMG2VIDEO_SUPPORTED_MODELS.has(selectedModel);
                return (
                  <button key={item.value}
                    onClick={() => {
                      if (i2vDisabled) {
                        showAlert('当前模型不支持图生视频，请切换到 Veo 2', 'warning', '模型限制');
                        return;
                      }
                      setSubType(item.value);
                    }}
                    title={i2vDisabled ? '仅 Veo 2 / Grok Video 支持图生视频' : undefined}
                    className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      subType === item.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300',
                      i2vDisabled && 'opacity-40 cursor-not-allowed')}>
                    {t(item.labelKey)}
                    {i2vDisabled && <span className="ml-1 text-[10px] text-zinc-600">(不支持)</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 px-4 py-4 space-y-4">
              {/* Model Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('model')}</label>
                  <DocLink href={getDocUrl(selectedModel)} />
                </div>
                <div ref={modelRef} className="relative">
                  <button onClick={() => setModelOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center">
                        <Video className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{model.label}</span>
                          {model.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">{t(`badge_${model.badge}`)}</span>}
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{t(`video.models.${videoModelMsgKey(model.value)}`)}</p>
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
                          className={cn('w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left', selectedModel === m.value && 'bg-purple-500/10')}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-200">{m.label}</span>
                              {m.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">{t(`badge_${m.badge}`)}</span>}
                            </div>
                            <p className="text-[11px] text-zinc-600 mt-0.5">{t(`video.models.${videoModelMsgKey(m.value)}`)}</p>
                          </div>
                          <span className="text-xs text-amber-400 flex-shrink-0">{getCredits(m.value, m.credits)} {t('credits')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              {subType === VideoSubType.IMG2VIDEO && (
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{t('reference_image')}</label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  {uploadedImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedImageUrl} alt="" className="w-full max-h-48 object-cover" />
                      <button onClick={() => setUploadedImageUrl('')}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                      className="w-full flex flex-col items-center justify-center gap-2.5 py-8 rounded-xl border border-dashed border-white/10 hover:border-white/25 hover:bg-white/3 transition-colors">
                      {isUploading ? <Loader2 className="h-7 w-7 text-zinc-500 animate-spin" /> : <Upload className="h-7 w-7 text-zinc-600" />}
                      <span className="text-sm text-zinc-500">{isUploading ? t('uploading') : t('upload_image_hint')}</span>
                      <span className="text-xs text-zinc-700">{t('upload_format_hint')}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Prompt */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                  {t('prompt')} <span className="text-zinc-700 font-normal normal-case">{t('prompt_optional')}</span>
                </label>
                <div className="relative">
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('video.placeholder_panel')}
                    rows={4} maxLength={2000}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed" />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-zinc-700">{prompt.length}/2000</span>
                </div>
                <div className="mt-2">
                  <PromptEnhancer prompt={prompt} type="video" onSelect={setPrompt} direction="down" apiKey={selectedApiKey} />
                </div>
              </div>

              {/* Aspect Ratio */}
              <AspectRatioSelector ratios={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} />

              {/* Duration */}
              {selectedModel === VideoModel.SORA2 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-400">{t('video_duration')}</label>
                    <span className="text-sm font-bold text-zinc-300">{duration}s</span>
                  </div>
                  <input type="range" min={5} max={20} step={5} value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-[10px] text-zinc-700">
                    <span>5s</span><span>10s</span><span>15s</span><span>20s</span>
                  </div>
                </div>
              )}

              {/* Output Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{t('output_count')}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} onClick={() => setOutputNumber(n)}
                      className={cn('py-2 rounded-lg text-sm font-medium transition-colors border',
                        outputNumber === n ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300 bg-white/3')}>
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
                  <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{t('resolution')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {RESOLUTIONS.map((r) => (
                          <button key={r} onClick={() => setResolution(r)}
                            className={cn('py-2 rounded-lg text-sm font-medium transition-colors border',
                              resolution === r ? 'border-purple-500 bg-purple-500/15 text-white' : 'border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300 bg-white/3')}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ToggleSwitch checked={isPublic} onChange={setIsPublic} label={t('public_to_community')} description={t('public_desc_explore')} />
                  </div>
                )}
              </div>
              {!advancedOpen && (
                <ToggleSwitch checked={isPublic} onChange={setIsPublic} label={t('public_to_community')} description={t('public_desc_home')} />
              )}
            </div>

            {/* Sticky bottom */}
            <div className="sticky bottom-0 px-4 pb-4 pt-3 border-t border-white/5 bg-[#0f0f0f]/90 backdrop-blur space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-700">{t('credits_required')}</span>
                <span className="text-amber-400 font-semibold text-sm">{getCredits(model.value, model.credits)}</span>
              </div>
              <ApiKeySelector value={selectedApiKey} onChange={setSelectedApiKey} />
              <button onClick={() => handleGenerate()}
                disabled={isGenerating || (!prompt.trim() && subType === VideoSubType.TEXT2VIDEO) || (subType === VideoSubType.IMG2VIDEO && !uploadedImageUrl)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-pink-600">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />{t('generating')}</> : <><Sparkles className="h-4 w-4" />{t('generate_now')}</>}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Collapse Toggle Button — desktop only ─── */}
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

        {/* ─── Right Panel (Results) ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="max-w-3xl mx-auto w-full flex items-center gap-3 px-5 py-3 border-b border-white/5">
            <span className="text-sm font-medium text-zinc-400">{t('all')}</span>
            <span className="text-xs text-zinc-700">·</span>
            <span className="text-xs text-zinc-600">{t('results_count', { count: tasks.length })}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="max-w-3xl mx-auto w-full px-5 space-y-4">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
                    <Video className="h-8 w-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500 text-sm">{t('empty_hint_video')}</p>
                  <p className="text-zinc-700 text-xs mt-1">{t('empty_sub_video')}</p>
                </div>
              ) : tasks.map((task) => (
                <ResultCard key={task.id} task={task} onRegenerate={() => {
                  const p = task.prompt || '';
                  setPrompt(p);
                  handleGenerate(p);
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Collapsed Bottom Bar — desktop only ─── */}
      {panelCollapsed && <div className="hidden md:block"><CollapsedBottomBar /></div>}

      {AppAlertModal}
    </div>
  );
}
