import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCredits(credits: number): string {
  if (credits >= 10000) {
    return `${(credits / 10000).toFixed(1)}万`;
  }
  return credits.toLocaleString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: '视频',
    image: '图像',
    music: '音乐',
    chat: '对话',
  };
  return labels[type] || type;
}

export function getModelLabel(model: string): string {
  const labels: Record<string, string> = {
    'sora-2': 'Sora 2',
    veo2: 'Veo 2',
    veo3: 'Veo 3',
    'veo3-fast': 'Veo 3 Fast',
    'grok-video': 'Grok Video',
    'nano-banana': 'Nano Banana',
    'nano-banana-pro': 'Nano Banana Pro',
    'nano-banana-2': 'Nano Banana 2',
    'grok-image': 'Grok Image',
    'chirp-v55': 'Suno v5.5',
    'chirp-v50': 'Suno v5.0',
    'Lyria 3 Pro': 'Lyria 3 Pro',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
  };
  return labels[model] || model;
}
