import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue as InjectBullQueue } from '@nestjs/bullmq';
import { TasksService } from '../../tasks/tasks.service';
import { CreditsService } from '../../credits/credits.service';
import { RedisService } from '../../auth/redis.service';
import { MountseaSoraService } from '../../mountsea/services/sora.service';
import { MountseaGeminiService } from '../../mountsea/services/gemini.service';
import { MountseaXaiService } from '../../mountsea/services/xai.service';
import { MountseaSunoService } from '../../mountsea/services/suno.service';
import { MountseaProducerService } from '../../mountsea/services/producer.service';
import { CosService } from '../../storage/cos.service';
import { TaskStatus, VideoModel, ImageModel, MusicModel } from '@ai-platform/shared';
import { TASK_POLLING_QUEUE } from '../queue.constants';

export interface TaskPollingJobData {
  taskId: string;
  externalTaskId: string;
  userId: string;
  model: string;
  creditsCost: number;
  userApiKey?: string;
  attempts?: number;
}

/** 各模型最大轮询次数（每次间隔 POLL_DELAY_MS，超出后标记失败） */
const MAX_POLL_ATTEMPTS_BY_MODEL: Record<string, number> = {
  // 视频类：最多 40 分钟（480 × 5s）
  [VideoModel.SORA2]:      480,
  [VideoModel.VEO2]:       480,
  [VideoModel.VEO3]:       480,
  [VideoModel.VEO3_FAST]:  360,
  [VideoModel.VEO31]:      480,
  [VideoModel.VEO31_FAST]: 360,
  [VideoModel.GROK_VIDEO]: 360,
  // 图片类：最多 10 分钟（120 × 5s）
  [ImageModel.NANO_BANANA]:     120,
  [ImageModel.NANO_BANANA_PRO]: 120,
  [ImageModel.NANO_BANANA_2]:   120,
  [ImageModel.GROK_IMAGE]:      120,
  // 音乐类：最多 15 分钟（180 × 5s）
  [MusicModel.SUNO_V55]:   180,
  [MusicModel.SUNO_V50]:   180,
  [MusicModel.LYRIA3_PRO]: 180,
};
const DEFAULT_MAX_POLL_ATTEMPTS = 240; // 兜底 20 分钟
const POLL_DELAY_MS = 5000;

@Processor(TASK_POLLING_QUEUE)
export class TaskPollingProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskPollingProcessor.name);

  constructor(
    @InjectBullQueue(TASK_POLLING_QUEUE) private queue: Queue,
    private tasksService: TasksService,
    private creditsService: CreditsService,
    private redisService: RedisService,
    private soraService: MountseaSoraService,
    private geminiService: MountseaGeminiService,
    private xaiService: MountseaXaiService,
    private sunoService: MountseaSunoService,
    private producerService: MountseaProducerService,
    private cosService: CosService,
  ) {
    super();
  }

  async process(job: Job<TaskPollingJobData>): Promise<void> {
    const { taskId, externalTaskId, userId, model, creditsCost, userApiKey } = job.data;
    const attempt = job.data.attempts || 0;
    const maxAttempts = MAX_POLL_ATTEMPTS_BY_MODEL[model] ?? DEFAULT_MAX_POLL_ATTEMPTS;

    this.logger.log(`Polling task ${taskId}, external: ${externalTaskId}, attempt: ${attempt}/${maxAttempts}`);

    if (attempt >= maxAttempts) {
      this.logger.warn(`Task ${taskId} timed out after ${maxAttempts} attempts (${Math.round(maxAttempts * POLL_DELAY_MS / 60000)} min)`);
      await this.tasksService.updateStatus(taskId, TaskStatus.FAILED, {
        errorMessage: '任务超时，请重试',
      });
      await this.creditsService.refundCredits(userId, creditsCost, taskId, '任务超时退款');
      return;
    }

    try {
      const result = await this.pollExternalTask(model, externalTaskId, userApiKey);

      if (result.status === 'success') {
        // 将 Mountsea CDN 文件（3 天有效期）归档到腾讯云 COS 永久存储
        let finalUrls = result.resultUrls ?? [];
        if (this.cosService.isEnabled && finalUrls.length > 0) {
          this.logger.log(`Archiving ${finalUrls.length} file(s) to COS for task ${taskId}`);
          finalUrls = await this.cosService.archiveResultUrls(taskId, finalUrls);
          this.logger.log(`COS archive done for task ${taskId}`);
        }

        await this.tasksService.updateStatus(taskId, TaskStatus.COMPLETED, {
          resultUrls: finalUrls,
        });
        this.logger.log(`Task ${taskId} completed successfully`);
        // 任务完成后清除 explore 缓存，公开内容立即显示在首页
        await this.redisService.deleteByPattern('explore:feed:*').catch(() => {});
      } else if (result.status === 'failed') {
        const friendlyError = this.toFriendlyError(result.errorMessage);
        await this.tasksService.updateStatus(taskId, TaskStatus.FAILED, {
          errorMessage: friendlyError,
        });
        await this.creditsService.refundCredits(userId, creditsCost, taskId, '任务失败退款');
        this.logger.warn(`Task ${taskId} failed: ${result.errorMessage}`);
      } else {
        // Still processing, re-queue with delay
        await this.tasksService.updateStatus(taskId, TaskStatus.PROCESSING);
        await this.queue.add(
          'poll',
          { ...job.data, attempts: attempt + 1, userApiKey },
          { delay: POLL_DELAY_MS },
        );
      }
    } catch (error) {
      this.logger.error(`Error polling task ${taskId}`, error);
      // Re-queue on error (BullMQ handles retry)
      throw error;
    }
  }

  private async pollExternalTask(
    model: string,
    externalTaskId: string,
    userApiKey?: string,
  ): Promise<{
    status: 'pending' | 'processing' | 'success' | 'failed';
    resultUrls?: string[];
    errorMessage?: string;
  }> {
    // Sora2
    if (model === VideoModel.SORA2) {
      const result = await this.soraService.getTaskResult(externalTaskId, userApiKey);
      return {
        status: result.status,
        resultUrls: result.videoUrl ? [result.videoUrl] : undefined,
        errorMessage: result.errorMessage,
      };
    }

    // Veo models (including Veo 3.1)
    if (
      [
        VideoModel.VEO2,
        VideoModel.VEO3,
        VideoModel.VEO3_FAST,
        VideoModel.VEO31,
        VideoModel.VEO31_FAST,
      ].includes(model as VideoModel)
    ) {
      const result = await this.geminiService.getTaskResult(externalTaskId, userApiKey);
      return {
        status: result.status,
        resultUrls: result.resultUrls,
        errorMessage: result.errorMessage,
      };
    }

    // Grok video/image
    if (
      model === VideoModel.GROK_VIDEO ||
      model === ImageModel.GROK_IMAGE
    ) {
      const result = await this.xaiService.getTaskResult(externalTaskId, userApiKey);
      return {
        status: result.status,
        resultUrls: result.resultUrls,
        errorMessage: result.errorMessage,
      };
    }

    // Nano Banana image
    if (
      [ImageModel.NANO_BANANA, ImageModel.NANO_BANANA_PRO, ImageModel.NANO_BANANA_2].includes(
        model as ImageModel,
      )
    ) {
      const result = await this.geminiService.getTaskResult(externalTaskId, userApiKey);
      return {
        status: result.status,
        resultUrls: result.resultUrls,
        errorMessage: result.errorMessage,
      };
    }

    // Suno — resultUrls: [audioUrl, coverImageUrl] (每首歌一组，取第一首)
    if (model === MusicModel.SUNO_V55 || model === MusicModel.SUNO_V50) {
      const result = await this.sunoService.getTaskResult(externalTaskId, userApiKey);
      const urls: string[] = [];
      if (result.clips?.length) {
        const first = result.clips[0];
        if (first.audioUrl) urls.push(first.audioUrl);
        if (first.imageUrl) urls.push(first.imageUrl);
      }
      return {
        status: result.status,
        resultUrls: urls,
        errorMessage: result.errorMessage,
      };
    }

    // Producer
    if (model === MusicModel.LYRIA3_PRO) {
      const result = await this.producerService.getTaskResult(externalTaskId, userApiKey);
      const status = result.status === 'completed' ? 'success' : result.status as any;
      return {
        status,
        resultUrls: result.audioUrl ? [result.audioUrl] : undefined,
        errorMessage: result.errorMessage,
      };
    }

    throw new Error(`Unknown model: ${model}`);
  }

  /** 将底层技术性错误转换为用户可理解的提示 */
  private toFriendlyError(raw?: string): string {
    if (!raw) return '生成失败，积分已退还，请重试';
    const msg = raw.toLowerCase();

    // Mountsea / 底层 JS 空指针（底层 AI 服务内部错误）
    if (msg.includes('cannot read properties') || msg.includes('null') || msg.includes('undefined')) {
      return 'AI 服务处理失败，积分已退还，请稍后重试';
    }
    // 内容安全过滤
    if (
      msg.includes('safety') || msg.includes('policy') ||
      msg.includes('content') || msg.includes('inappropriate') ||
      msg.includes('violat') || msg.includes('blocked')
    ) {
      return '内容被安全策略拦截，请修改描述后重试（避免使用版权角色或敏感内容）';
    }
    // 积分不足
    if (msg.includes('insufficient') || msg.includes('credit') || msg.includes('balance')) {
      return 'API Key 积分不足，请在 Mountsea 控制台充值';
    }
    // 超时
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return '生成超时，积分已退还，请重试';
    }
    // 其他
    return `生成失败，积分已退还（${raw.slice(0, 80)}）`;
  }
}
