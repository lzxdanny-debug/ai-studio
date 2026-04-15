import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TasksService } from '../../tasks/tasks.service';
import { CreditsService } from '../../credits/credits.service';
import { MountseaGeminiService } from '../../mountsea/services/gemini.service';
import { MountseaXaiService } from '../../mountsea/services/xai.service';
import { CreateImageDto } from './dto/create-image.dto';
import { TaskType, TaskStatus, ImageModel, ImageSubType, CREDIT_COSTS } from '@ai-platform/shared';
import { TASK_POLLING_QUEUE } from '../../queue/queue.constants';

@Injectable()
export class ImageGenerateService {
  constructor(
    @InjectQueue(TASK_POLLING_QUEUE) private queue: Queue,
    private tasksService: TasksService,
    private creditsService: CreditsService,
    private geminiService: MountseaGeminiService,
    private xaiService: MountseaXaiService,
  ) {}

  async createTask(userId: string, dto: CreateImageDto) {
    const costKey = `${dto.model}_${dto.subType}`;
    const creditsCost = CREDIT_COSTS[costKey] || 60;

    if (!(await this.creditsService.checkBalance(userId, creditsCost))) {
      throw new BadRequestException('积分不足，请先充值');
    }

    const task = await this.tasksService.create({
      userId,
      type: TaskType.IMAGE,
      model: dto.model,
      subType: dto.subType,
      status: TaskStatus.PENDING,
      prompt: dto.prompt,
      inputParams: dto as unknown as Record<string, unknown>,
      creditsCost,
      isPublic: dto.isPublic ?? true,
    });

    await this.creditsService.reserveCredits(userId, creditsCost, `图像生成：${dto.model}`, task.id);

    try {
      const externalTask = await this.callMountseaAPI(dto, dto.apiKey);

      await this.tasksService.updateStatus(task.id, TaskStatus.PROCESSING, {
        externalTaskId: externalTask.taskId,
      });

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
        { delay: 3000 },
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

  private async callMountseaAPI(dto: CreateImageDto, userApiKey?: string): Promise<{ taskId: string }> {
    switch (dto.model) {
      case ImageModel.NANO_BANANA:
      case ImageModel.NANO_BANANA_PRO:
      case ImageModel.NANO_BANANA_2:
        return this.geminiService.createImageTask(
          {
            task: dto.subType === ImageSubType.IMG2IMAGE ? 'IMG2IMAGE' : 'TEXT2IMAGE',
            model: dto.model as 'nano-banana' | 'nano-banana-pro' | 'nano-banana-2',
            prompt: dto.prompt,
            imageUrl: dto.referenceImageUrl,
            aspectRatio: dto.aspectRatio,
            outputNumber: dto.outputNumber,
          },
          userApiKey,
        );

      case ImageModel.GROK_IMAGE:
        return this.xaiService.createImageTask(
          {
            prompt: dto.prompt,
            referenceImageUrl: dto.referenceImageUrl,
            n: dto.outputNumber,
          },
          userApiKey,
        );

      default:
        throw new BadRequestException(`不支持的模型: ${dto.model}`);
    }
  }
}
