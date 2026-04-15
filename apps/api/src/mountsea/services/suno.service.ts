import { Injectable, Logger } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';

export interface SunoCreateParams {
  task: 'create' | 'extend' | 'cover' | 'sound';
  model?: string;
  prompt?: string;
  tags?: string;
  title?: string;
  makeInstrumental?: boolean;
  clipId?: string;
  continueAt?: number;
}

export interface SunoLyricsParams {
  prompt: string;
}

export interface SunoTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  clips?: Array<{
    id: string;
    audioUrl: string;
    imageUrl?: string;
    title?: string;
    tags?: string;
    duration?: number;
  }>;
  errorMessage?: string;
}

@Injectable()
export class MountseaSunoService {
  private readonly logger = new Logger(MountseaSunoService.name);

  constructor(private mountsea: MountseaService) {}

  async createMusicTask(params: SunoCreateParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);

    // Mountsea Suno API 不接受 makeInstrumental 字段，
    // 纯音乐模式通过在 tags 中追加 "instrumental" 实现
    let tags = params.tags || '';
    if (params.makeInstrumental && !tags.toLowerCase().includes('instrumental')) {
      tags = tags ? `${tags}, instrumental` : 'instrumental';
    }

    const body: Record<string, any> = {
      task: params.task || 'create',
      model: params.model || 'chirp-v55',
      prompt: params.prompt,
      title: params.title,
    };
    if (tags) body.tags = tags;
    if (params.clipId) body.clipId = params.clipId;
    if (params.continueAt !== undefined) body.continueAt = params.continueAt;

    const response = await client.post('/suno/v2/generate', body);
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async generateLyrics(prompt: string): Promise<{ taskId: string }> {
    const response = await this.mountsea.httpClient.post('/suno/v2/lyrics', { prompt });
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async getTaskResult(taskId: string, userApiKey?: string): Promise<SunoTaskResult> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.get('/suno/v2/status', {
      params: { taskId },
    });

    // 实际响应结构：{ taskId, status, data: [...clips], finishAt }
    // status 在顶层，clips 直接放在 data 字段（数组）
    const raw = response.data;

    const status = this.normalizeStatus(
      raw.status ?? raw.state ?? raw.task_status,
    );

    // 兼容多种路径：raw.data（数组）/ raw.clips / raw.output.clips
    const rawClips: any[] = Array.isArray(raw.data)
      ? raw.data
      : (raw.clips ?? raw.output?.clips ?? raw.result?.clips ?? []);

    // 字段名兼容 snake_case（audio_url）和 camelCase（audioUrl）
    const clips = rawClips.map((c: any) => ({
      id: c.id,
      audioUrl: c.audio_url ?? c.audioUrl ?? '',
      imageUrl: c.image_url ?? c.imageUrl,
      title: c.title,
      tags: c.metadata?.tags ?? c.tags,
      duration: c.metadata?.duration ?? c.duration,
    }));

    this.logger.log(
      `Suno task ${taskId} — status="${raw.status}" → normalized="${status}", clips=${clips.length}`,
    );

    return {
      taskId,
      status,
      clips,
      errorMessage: raw.errorMessage ?? raw.error_message ?? raw.error,
    };
  }

  private normalizeStatus(status: string): 'pending' | 'processing' | 'success' | 'failed' {
    if (!status) return 'processing';
    const s = status.toLowerCase();
    const statusMap: Record<string, 'pending' | 'processing' | 'success' | 'failed'> = {
      // pending
      pending: 'pending',
      queued: 'pending',
      waiting: 'pending',
      submitted: 'pending',
      // processing
      processing: 'processing',
      running: 'processing',
      generating: 'processing',
      in_progress: 'processing',
      // success
      success: 'success',
      succeed: 'success',
      succeeded: 'success',
      done: 'success',
      complete: 'success',
      completed: 'success',
      finished: 'success',
      // failed
      failed: 'failed',
      failure: 'failed',
      error: 'failed',
      cancelled: 'failed',
      canceled: 'failed',
      timeout: 'failed',
    };
    const normalized = statusMap[s];
    if (!normalized) {
      this.logger.warn(`Suno: unknown status "${status}", defaulting to "processing"`);
    }
    return normalized ?? 'processing';
  }
}
