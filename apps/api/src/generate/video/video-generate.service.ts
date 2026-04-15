import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TasksService } from '../../tasks/tasks.service';
import { CreditsService } from '../../credits/credits.service';
import { MountseaSoraService } from '../../mountsea/services/sora.service';
import { MountseaGeminiService } from '../../mountsea/services/gemini.service';
import { MountseaXaiService } from '../../mountsea/services/xai.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { TaskType, TaskStatus, VideoModel, VideoSubType, CREDIT_COSTS } from '@ai-platform/shared';
import { TASK_POLLING_QUEUE } from '../../queue/queue.constants';

@Injectable()
export class VideoGenerateService {
  constructor(
    @InjectQueue(TASK_POLLING_QUEUE) private queue: Queue,
    private tasksService: TasksService,
    private creditsService: CreditsService,
    private soraService: MountseaSoraService,
    private geminiService: MountseaGeminiService,
    private xaiService: MountseaXaiService,
  ) {}

  async createTask(userId: string, dto: CreateVideoDto) {
    const costKey = `${dto.model}_${dto.subType}`;
    const creditsCost = CREDIT_COSTS[costKey] || 300;

    if (!(await this.creditsService.checkBalance(userId, creditsCost))) {
      throw new BadRequestException('积分不足，请先充值');
    }

    if (dto.subType === VideoSubType.IMG2VIDEO && (!dto.imageUrls || dto.imageUrls.length === 0)) {
      throw new BadRequestException('图生视频需要提供参考图片');
    }

    // 创建任务记录
    const task = await this.tasksService.create({
      userId,
      type: TaskType.VIDEO,
      model: dto.model,
      subType: dto.subType,
      status: TaskStatus.PENDING,
      prompt: dto.prompt,
      inputParams: dto as unknown as Record<string, unknown>,
      creditsCost,
      isPublic: dto.isPublic ?? true,
    });

    // 扣减积分
    await this.creditsService.reserveCredits(userId, creditsCost, `视频生成：${dto.model}`, task.id);

    try {
      // 调用对应的 Mountsea API（可使用用户自己的 API Key）
      const externalTask = await this.callMountseaAPI(dto, dto.apiKey);

      // 更新任务的外部 ID
      await this.tasksService.updateStatus(task.id, TaskStatus.PROCESSING, {
        externalTaskId: externalTask.taskId,
      });

      // 加入轮询队列
      await this.queue.add(
        'poll',
        {
          taskId: task.id,
          externalTaskId: externalTask.taskId,
          userId,
          model: dto.model,
          creditsCost,
          userApiKey: dto.apiKey,
        },
        { delay: 5000 },
      );

      return { taskId: task.id, status: TaskStatus.PROCESSING };
    } catch (error) {
      await this.tasksService.updateStatus(task.id, TaskStatus.FAILED, {
        errorMessage: error.message,
      });
      await this.creditsService.refundCredits(userId, creditsCost, task.id, 'API调用失败退款');
      throw error;
    }
  }

  private async callMountseaAPI(dto: CreateVideoDto, userApiKey?: string): Promise<{ taskId: string }> {
    switch (dto.model) {
      case VideoModel.SORA2:
        return this.soraService.createVideoTask(
          {
            prompt: dto.prompt,
            orientation: dto.aspectRatio === '9:16' ? 'portrait' : 'landscape',
            duration: (dto.duration as 10 | 15) || 10,
            images: dto.imageUrls,
          },
          userApiKey,
        );

      case VideoModel.VEO2:
      case VideoModel.VEO3:
      case VideoModel.VEO3_FAST:
      case VideoModel.VEO31:
      case VideoModel.VEO31_FAST:
        return this.geminiService.createVideoTask(
          {
            task: dto.subType === VideoSubType.IMG2VIDEO ? 'IMG2VIDEO' : 'TEXT2VIDEO',
            model: dto.model as any,
            prompt: dto.prompt,
            imageList: dto.imageUrls,
            aspectRatio: dto.aspectRatio,
          },
          userApiKey,
        );

      case VideoModel.GROK_VIDEO:
        return this.xaiService.createVideoTask(
          {
            prompt: dto.prompt,
            imageUrl: dto.imageUrls?.[0],
            aspectRatio: dto.aspectRatio,
            resolution: dto.resolution,
          },
          userApiKey,
        );

      default:
        throw new BadRequestException(`不支持的模型: ${dto.model}`);
    }
  }
}
