import { Injectable } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';

export interface SoraVideoParams {
  prompt: string;
  model?: string;
  orientation?: 'landscape' | 'portrait';
  size?: 'small' | 'large';
  duration?: 10 | 15;
  images?: string[];
  removeWatermark?: boolean;
}

export interface SoraTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
}

@Injectable()
export class MountseaSoraService {
  constructor(private mountsea: MountseaService) {}

  async createVideoTask(params: SoraVideoParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.post('/sora/video/generate', {
      prompt: params.prompt,
      model: params.model || 'sora-2',
      orientation: params.orientation || 'landscape',
      size: params.size || 'small',
      duration: params.duration || 10,
      images: params.images,
      removeWatermark: params.removeWatermark ?? false, 
    });
    return { taskId: response.data.taskId || response.data.data?.taskId };
  }

  async getTaskResult(taskId: string, userApiKey?: string): Promise<SoraTaskResult> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.get('/sora/task/result', {
      params: { taskId },
    });
    const data = response.data.data || response.data;
    return {
      taskId,
      status: this.normalizeStatus(data.status),
      videoUrl: data.videoUrl || data.video_url,
      errorMessage: data.errorMessage || data.error,
    };
  }

  private normalizeStatus(raw: string): 'pending' | 'processing' | 'success' | 'failed' {
    const map: Record<string, 'pending' | 'processing' | 'success' | 'failed'> = {
      pending: 'pending', queued: 'pending',
      processing: 'processing', running: 'processing',
      success: 'success', succeeded: 'success', complete: 'success', completed: 'success', done: 'success',
      failed: 'failed', error: 'failed', cancelled: 'failed',
    };
    return map[raw?.toLowerCase()] ?? 'processing';
  }
}
