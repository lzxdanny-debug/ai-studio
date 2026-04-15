export enum TaskType {
  VIDEO = 'video',
  IMAGE = 'image',
  MUSIC = 'music',
  CHAT = 'chat',
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VideoModel {
  SORA2 = 'sora-2',
  VEO2 = 'veo2',
  VEO3 = 'veo3',
  VEO3_FAST = 'veo3-fast',
  VEO31 = 'veo31',
  VEO31_FAST = 'veo31-fast',
  GROK_VIDEO = 'grok-video',
}

export enum ImageModel {
  NANO_BANANA = 'nano-banana',
  NANO_BANANA_PRO = 'nano-banana-pro',
  NANO_BANANA_2 = 'nano-banana-2',
  GROK_IMAGE = 'grok-image',
}

export enum MusicModel {
  SUNO_V55 = 'chirp-v55',
  SUNO_V50 = 'chirp-v50',
  LYRIA3_PRO = 'Lyria 3 Pro',
}

export enum ChatModel {
  GPT51 = 'gpt-5.1',
  GPT52 = 'gpt-5.2',
  CLAUDE_SONNET_46 = 'claude-sonnet-4-6',
  CLAUDE_OPUS_46 = 'claude-opus-4-6',
  CLAUDE_HAIKU_45 = 'claude-haiku-4-5-20251001',
  GEMINI_25_PRO = 'gemini-2.5-pro',
  GEMINI_25_FLASH = 'gemini-2.5-flash',
  GEMINI_3_FLASH = 'gemini-3-flash',
  GEMINI_3_PRO = 'gemini-3-pro',
}

export enum VideoSubType {
  TEXT2VIDEO = 'text2video',
  IMG2VIDEO = 'img2video',
}

export enum ImageSubType {
  TEXT2IMAGE = 'text2image',
  IMG2IMAGE = 'img2image',
}

export interface TaskResult {
  id: string;
  userId: string;
  type: TaskType;
  model: string;
  subType?: string;
  status: TaskStatus;
  prompt?: string;
  inputParams: Record<string, unknown>;
  resultUrls?: string[];
  creditsCost: number;
  isPublic: boolean;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateVideoTaskDto {
  model: VideoModel;
  subType: VideoSubType;
  prompt: string;
  imageUrls?: string[];
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  isPublic?: boolean;
}

export interface CreateImageTaskDto {
  model: ImageModel;
  subType: ImageSubType;
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: string;
  outputNumber?: number;
  isPublic?: boolean;
}

export interface CreateMusicTaskDto {
  model: MusicModel;
  prompt?: string;
  lyrics?: string;
  title?: string;
  tags?: string;
  makeInstrumental?: boolean;
  isPublic?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CreateChatDto {
  model: ChatModel;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
