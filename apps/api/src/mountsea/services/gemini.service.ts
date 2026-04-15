import { Injectable, Logger } from '@nestjs/common';
import { MountseaService } from '../mountsea.service';

export interface VeoVideoParams {
  task: 'TEXT2VIDEO' | 'IMG2VIDEO';
  model: 'veo2' | 'veo3' | 'veo3-fast';
  prompt: string;
  imageList?: string[];
  duration?: number;
  aspectRatio?: string;
}

export interface BananaImageParams {
  task: 'TEXT2IMAGE' | 'IMG2IMAGE';
  model: 'nano-banana' | 'nano-banana-pro' | 'nano-banana-2';
  prompt: string;
  imageUrl?: string;
  aspectRatio?: string;
  outputNumber?: number;
}

export interface GeminiTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  resultUrls?: string[];
  errorMessage?: string;
}

/** 将内部 model 枚举值映射到 Mountsea API 最新模型名 */
const VIDEO_MODEL_MAP: Record<string, string> = {
  'veo2':      'veo2_quality',
  'veo3':      'veo3_quality',
  'veo3-fast': 'veo3_fast',
  'veo31':     'veo31_quality',
  'veo31-fast':'veo31_fast',
};

/** 将内部 task 枚举值映射到 Mountsea API action 字段 */
const VIDEO_ACTION_MAP: Record<string, string> = {
  'TEXT2VIDEO': 'text2video',
  'IMG2VIDEO':  'img2video',
};

/** 图像 task → action */
const IMAGE_ACTION_MAP: Record<string, string> = {
  'TEXT2IMAGE': 'text2image',
  'IMG2IMAGE':  'img2image',
};

@Injectable()
export class MountseaGeminiService {
  private readonly logger = new Logger(MountseaGeminiService.name);

  constructor(private mountsea: MountseaService) {}

  async createVideoTask(params: VeoVideoParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const action = VIDEO_ACTION_MAP[params.task] ?? 'text2video';
    const model  = VIDEO_MODEL_MAP[params.model] ?? params.model;

    const body: Record<string, unknown> = {
      action,
      model,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
    };
    if (params.imageList && params.imageList.length > 0) {
      body.imageList = params.imageList;
    }
    if (params.duration) {
      body.duration = params.duration;
    }

    const response = await client.post('/gemini/video/generate', body);
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async createImageTask(params: BananaImageParams, userApiKey?: string): Promise<{ taskId: string }> {
    const client = this.mountsea.getClient(userApiKey);
    const action = IMAGE_ACTION_MAP[params.task] ?? 'text2image';

    const body: Record<string, unknown> = {
      action,
      model: params.model,
      prompt: params.prompt,
    };
    if (params.imageUrl) body.imageUrl = params.imageUrl;

    const response = await client.post('/gemini/image/generate', body);
    const data = response.data.data || response.data;
    return { taskId: data.taskId };
  }

  async getTaskResult(taskId: string, userApiKey?: string): Promise<GeminiTaskResult> {
    const client = this.mountsea.getClient(userApiKey);
    const response = await client.get('/gemini/task/result', {
      params: { taskId },
    });
    const raw = response.data;
    const data = raw.data || raw;

    // 打印完整响应，便于排查字段名问题
    this.logger.log(`getTaskResult [${taskId}] raw: ${JSON.stringify(raw)}`);

    const resultUrls = this.extractResultUrls(data);

    return {
      taskId,
      status: this.normalizeStatus(data.status),
      resultUrls,
      errorMessage: data.errorMessage || data.error_message || data.error,
    };
  }

  /**
   * 兼容 Mountsea API 各种可能的 URL 字段名。
   * 实际响应示例：{ result: { videoUrls: ["..."] } }
   */
  private extractResultUrls(data: any): string[] {
    // ── 视频 URL 数组（最常见：result.videoUrls）──
    const videoArr =
      data.result?.videoUrls ||
      data.result?.video_urls ||
      data.videoUrls ||
      data.video_urls;
    if (Array.isArray(videoArr) && videoArr.length > 0) {
      return videoArr.filter(Boolean);
    }

    // ── 视频单 URL ──
    const single =
      data.result?.videoUrl ||
      data.result?.video_url ||
      data.videoUrl ||
      data.video_url ||
      data.output?.videoUrl ||
      data.output?.video_url ||
      data.outputUrl ||
      data.output_url ||
      data.url;
    if (single) return [single];

    // ── 图片 URL 数组 ──
    const imageArr =
      data.result?.imageUrls ||
      data.result?.image_urls ||
      data.result?.images ||
      data.imageUrls ||
      data.image_urls ||
      data.images ||
      data.output?.imageUrls ||
      data.output?.images ||
      data.outputs;
    if (Array.isArray(imageArr) && imageArr.length > 0) {
      return imageArr
        .map((item: any) =>
          typeof item === 'string' ? item : item?.url || item?.imageUrl || item?.videoUrl,
        )
        .filter(Boolean);
    }

    return [];
  }

  private normalizeStatus(raw: string): 'pending' | 'processing' | 'success' | 'failed' {
    const map: Record<string, 'pending' | 'processing' | 'success' | 'failed'> = {
      pending:    'pending',
      queued:     'pending',
      processing: 'processing',
      running:    'processing',
      success:    'success',
      succeeded:  'success',
      complete:   'success',
      completed:  'success',
      done:       'success',
      failed:     'failed',
      error:      'failed',
      cancelled:  'failed',
    };
    return map[raw?.toLowerCase()] ?? 'processing';
  }

  async expandPrompt(prompt: string): Promise<string> {
    const response = await this.mountsea.httpClient.post('/gemini/video/prompt/expand', { prompt });
    const data = response.data.data || response.data;
    return data.expandedPrompt || data.prompt || prompt;
  }
}
