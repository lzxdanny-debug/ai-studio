import { Injectable } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';

export interface GrokVideoParams {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
}

export interface GrokImageParams {
  prompt: string;
  referenceImageUrl?: string;
  n?: number;
}

export interface XaiTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  resultUrls?: string[];
  errorMessage?: string;
}

@Injectable()
export class MountseaXaiService {
  constructor(private mountsea: MountseaService) {}

  async createVideoTask(params: GrokVideoParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.post('/xai/generate-video', {
      prompt: params.prompt,
      referenceImageUrl: params.imageUrl,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
    });
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async createImageTask(params: GrokImageParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.post('/xai/generate-image', {
      prompt: params.prompt,
      referenceImageUrl: params.referenceImageUrl,
      n: params.n || 1,
    });
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async getTaskResult(taskId: string, userApiKey?: string): Promise<XaiTaskResult> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.get('/xai/tasks', {
      params: { taskId },
    });
    const data = response.data.data || response.data;
    return {
      taskId,
      status: this.normalizeStatus(data.status),
      resultUrls: data.videoUrl
        ? [data.videoUrl]
        : data.imageUrls || data.images || [],
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
