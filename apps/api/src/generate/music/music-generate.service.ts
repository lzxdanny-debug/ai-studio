import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TasksService } from '../../tasks/tasks.service';
import { CreditsService } from '../../credits/credits.service';
import { MountseaSunoService } from '../../mountsea/services/suno.service';
import { MountseaProducerService } from '../../mountsea/services/producer.service';
import { CreateMusicDto } from './dto/create-music.dto';
import { TaskType, TaskStatus, MusicModel, CREDIT_COSTS } from '@ai-platform/shared';
import { TASK_POLLING_QUEUE } from '../../queue/queue.constants';

@Injectable()
export class MusicGenerateService {
  constructor(
    @InjectQueue(TASK_POLLING_QUEUE) private queue: Queue,
    private tasksService: TasksService,
    private creditsService: CreditsService,
    private sunoService: MountseaSunoService,
    private producerService: MountseaProducerService,
  ) {}

  async createTask(userId: string, dto: CreateMusicDto) {
    const costKey = `${dto.model}_create`;
    const creditsCost = CREDIT_COSTS[costKey] || 50;

    if (!(await this.creditsService.checkBalance(userId, creditsCost))) {
      throw new BadRequestException('积分不足，请先充值');
    }

    if (!dto.prompt && !dto.lyrics) {
      throw new BadRequestException('请提供音乐描述或歌词');
    }

    const task = await this.tasksService.create({
      userId,
      type: TaskType.MUSIC,
      model: dto.model,
      subType: 'create',
      status: TaskStatus.PENDING,
      prompt: dto.prompt || dto.title || '音乐生成',
      inputParams: dto as unknown as Record<string, unknown>,
      creditsCost,
      isPublic: dto.isPublic ?? true,
    });

    await this.creditsService.reserveCredits(userId, creditsCost, `音乐生成：${dto.model}`, task.id);

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

  async generateLyrics(userId: string, prompt: string) {
    const result = await this.sunoService.generateLyrics(prompt);
    return { taskId: result.taskId };
  }

  private async callMountseaAPI(dto: CreateMusicDto, userApiKey?: string): Promise<{ taskId: string }> {
    switch (dto.model) {
      case MusicModel.SUNO_V55:
      case MusicModel.SUNO_V50:
        return this.sunoService.createMusicTask(
          {
            task: 'create',
            model: dto.model,
            prompt: dto.lyrics || dto.prompt,
            tags: dto.tags,
            title: dto.title,
            makeInstrumental: dto.makeInstrumental,
          },
          userApiKey,
        );

      case MusicModel.LYRIA3_PRO:
        return this.producerService.createMusicTask(
          {
            soundPrompt: dto.prompt,
            lyrics: dto.lyrics,
            title: dto.title,
            makeInstrumental: dto.makeInstrumental,
          },
          userApiKey,
        );

      default:
        throw new BadRequestException(`不支持的模型: ${dto.model}`);
    }
  }
}
