import { Injectable } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';

export interface ProducerCreateParams {
  soundPrompt?: string;
  lyrics?: string;
  title?: string;
  seed?: number;
  makeInstrumental?: boolean;
  imageUrl?: string;
}

export interface ProducerTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  audioId?: string;
  duration?: number;
  errorMessage?: string;
}

@Injectable()
export class MountseaProducerService {
  constructor(private mountsea: MountseaService) {}

  async createMusicTask(params: ProducerCreateParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.post('/producer/audios', {
      action: 'create_music',
      model: 'Lyria 3 Pro',
      soundPrompt: params.soundPrompt,
      lyrics: params.lyrics,
      title: params.title,
      seed: params.seed,
      makeInstrumental: params.makeInstrumental,
      imageUrl: params.imageUrl,
    });
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async getTaskResult(taskId: string, userApiKey?: string): Promise<ProducerTaskResult> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.get('/producer/tasks', {
      params: { taskId },
    });
    const data = response.data.data || response.data;
    return {
      taskId,
      status: data.status,
      audioUrl: data.audioUrl || data.url,
      audioId: data.audioId || data.id,
      duration: data.duration,
      errorMessage: data.errorMessage || data.error,
    };
  }
}
