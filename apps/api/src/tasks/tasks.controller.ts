import {
  Controller,
  Get,
  Delete,
  Patch,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { RedisService } from '../auth/redis.service';
import { MountseaGeminiService } from '../mountsea/services/gemini.service';
import { MountseaSoraService } from '../mountsea/services/sora.service';
import { MountseaXaiService } from '../mountsea/services/xai.service';
import { MountseaSunoService } from '../mountsea/services/suno.service';
import { MountseaProducerService } from '../mountsea/services/producer.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { TaskType, TaskStatus, VideoModel, ImageModel, MusicModel } from '@ai-platform/shared';

@ApiTags('任务')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private tasksService: TasksService,
    private redisService: RedisService,
    private geminiService: MountseaGeminiService,
    private soraService: MountseaSoraService,
    private xaiService: MountseaXaiService,
    private sunoService: MountseaSunoService,
    private producerService: MountseaProducerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '我的任务列表（生成历史）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  async getMyTasks(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
  ) {
    return this.tasksService.getUserTasks(user.id, page, pageSize, type, status);
  }

  @Get('assets')
  @ApiOperation({ summary: '我的资产（仅已完成任务）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiQuery({ name: 'isFavorited', required: false, type: Boolean })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async getAssets(
    @CurrentUser() user: UserEntity,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(24), ParseIntPipe) pageSize: number,
    @Query('type') type?: TaskType,
    @Query('isFavorited') isFavorited?: string,
    @Query('projectId') projectId?: string,
  ) {
    const favorited = isFavorited === 'true' ? true : isFavorited === 'false' ? false : undefined;
    return this.tasksService.getAssets(user.id, page, pageSize, type, favorited, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  async getTask(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.tasksService.findByIdOrThrow(id, user.id);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: '切换收藏状态' })
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.tasksService.toggleFavorite(id, user.id);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: '切换公开/私密' })
  async toggleVisibility(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    const result = await this.tasksService.toggleVisibility(id, user.id);
    // 无论设为公开还是私密，都清除 explore 缓存保证首页即时同步
    await this.redisService.deleteByPattern('explore:feed:*').catch(() => {});
    return result;
  }

  @Patch(':id/project')
  @ApiOperation({ summary: '分配到项目' })
  async assignProject(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
    @Body() body: { projectId: string | null },
  ) {
    await this.tasksService.assignProject(id, user.id, body.projectId);
    return { success: true };
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: '重新拉取任务结果（修复 resultUrls 为空的任务）' })
  async refreshResult(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    const task = await this.tasksService.findByIdOrThrow(id, user.id);
    if (!task.externalTaskId) return task;

    // 从 inputParams 中恢复创建时使用的 userApiKey
    const userApiKey = (task.inputParams as any)?.apiKey as string | undefined;

    try {
      let resultUrls: string[] = [];
      const m = task.model;

      if (m === VideoModel.SORA2) {
        const r = await this.soraService.getTaskResult(task.externalTaskId, userApiKey);
        if (r.videoUrl) resultUrls = [r.videoUrl];
      } else if ([VideoModel.VEO2, VideoModel.VEO3, VideoModel.VEO3_FAST, VideoModel.VEO31, VideoModel.VEO31_FAST].includes(m as VideoModel)
        || [ImageModel.NANO_BANANA, ImageModel.NANO_BANANA_PRO, ImageModel.NANO_BANANA_2].includes(m as ImageModel)) {
        const r = await this.geminiService.getTaskResult(task.externalTaskId, userApiKey);
        resultUrls = r.resultUrls || [];
      } else if (m === VideoModel.GROK_VIDEO || m === ImageModel.GROK_IMAGE) {
        const r = await this.xaiService.getTaskResult(task.externalTaskId, userApiKey);
        resultUrls = r.resultUrls || [];
      } else if (m === MusicModel.SUNO_V55 || m === MusicModel.SUNO_V50) {
        const r = await this.sunoService.getTaskResult(task.externalTaskId, userApiKey);
        if (r.clips?.length) {
          const first = r.clips[0];
          if (first.audioUrl) resultUrls.push(first.audioUrl);
          if (first.imageUrl) resultUrls.push(first.imageUrl);
        }
      } else if (m === MusicModel.LYRIA3_PRO) {
        const r = await this.producerService.getTaskResult(task.externalTaskId, userApiKey);
        if (r.audioUrl) resultUrls = [r.audioUrl];
      }

      if (resultUrls.length > 0) {
        await this.tasksService.updateStatus(task.id, TaskStatus.COMPLETED, { resultUrls });
        this.logger.log(`Refreshed task ${task.id}: ${resultUrls.length} URLs`);
      } else {
        this.logger.warn(`Refresh task ${task.id}: API still returned empty URLs`);
      }
    } catch (err: any) {
      this.logger.error(`Refresh task ${task.id} failed: ${err.message}`);
    }

    return this.tasksService.findByIdOrThrow(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  async deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    await this.tasksService.deleteTask(id, user.id);
    return { message: '任务已删除' };
  }
}
