'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, X, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModelOption {
  value: string;
  label: string;
  description?: string;
  creditsCost?: number;
  tag?: string;
}

interface GenerationPanelProps {
  title: string;
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  promptPlaceholder?: string;
  onGenerate: () => void;
  isGenerating: boolean;
  creditsCost?: number;
  children?: React.ReactNode;
  showImageUpload?: boolean;
  onImageUpload?: (url: string) => void;
}

export function GenerationPanel({
  title,
  models,
  selectedModel,
  onModelChange,
  prompt,
  onPromptChange,
  promptPlaceholder = '描述你想要创作的内容...',
  onGenerate,
  isGenerating,
  creditsCost,
  children,
  showImageUpload,
  onImageUpload,
}: GenerationPanelProps) {
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModelData = models.find((m) => m.value === selectedModel);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { apiClient } = await import('@/lib/api');
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as any;
      const url = response.data.url;
      setUploadedImageUrl(url);
      onImageUpload?.(url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>

      {/* Model Selector */}
      <div className="relative">
        <button
          onClick={() => setIsModelOpen(!isModelOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedModelData?.label}</span>
            {selectedModelData?.tag && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                {selectedModelData.tag}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedModelData?.creditsCost && (
              <span className="text-sm text-amber-400">
                {selectedModelData.creditsCost} 积分
              </span>
            )}
            <ChevronDown className={cn('h-4 w-4 transition-transform', isModelOpen && 'rotate-180')} />
          </div>
        </button>

        {isModelOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            {models.map((model) => (
              <button
                key={model.value}
                onClick={() => {
                  onModelChange(model.value);
                  setIsModelOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left',
                  selectedModel === model.value && 'bg-primary/10',
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.label}</span>
                    {model.tag && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {model.tag}
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                  )}
                </div>
                {model.creditsCost && (
                  <span className="text-sm text-amber-400">{model.creditsCost} 积分</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Upload */}
      {showImageUpload && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
          {uploadedImageUrl ? (
            <div className="relative rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImageUrl} alt="上传的图片" className="w-full max-h-48 object-cover" />
              <button
                onClick={() => {
                  setUploadedImageUrl(null);
                  onImageUpload?.('');
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {isUploading ? '上传中...' : '上传参考图片'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={promptPlaceholder}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          maxLength={2000}
        />
        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {prompt.length}/2000
        </span>
      </div>

      {/* Additional Controls */}
      {children}

      {/* Generate Button */}
      <Button
        variant="gradient"
        size="xl"
        className="w-full"
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            立即生成
            {creditsCost && (
              <span className="ml-2 text-sm opacity-80">({creditsCost} 积分)</span>
            )}
          </>
        )}
      </Button>
    </div>
  );
}
