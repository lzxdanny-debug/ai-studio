import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { Public } from '../common/decorators/public.decorator';
import { TaskType } from '@ai-platform/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../database/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('社区探索')
@Controller('explore')
export class ExploreController {
  constructor(private exploreService: ExploreService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取公开作品瀑布流（按热度排序）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  async getPublicFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('type') type?: TaskType,
  ) {
    return this.exploreService.getPublicFeed(page, pageSize, type);
  }

  @Public()
  @Get(':taskId')
  @ApiOperation({ summary: '获取公开作品详情' })
  async getPublicTask(@Param('taskId') taskId: string, @Request() req: any) {
    const userId: string | undefined = req.user?.id;
    return this.exploreService.getPublicTask(taskId, userId);
  }

  @Public()
  @Get(':taskId/comments')
  @ApiOperation({ summary: '获取公开作品评论列表' })
  async listComments(@Param('taskId') taskId: string) {
    return this.exploreService.listComments(taskId);
  }

  @ApiBearerAuth()
  @Post(':taskId/comments')
  @ApiOperation({ summary: '发表评论（仅公开作品）' })
  async addComment(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.exploreService.addComment(taskId, user.id, dto.content);
  }

  @ApiBearerAuth()
  @Post(':taskId/like')
  @ApiOperation({ summary: '点赞作品' })
  async likeTask(@Param('taskId') taskId: string) {
    return this.exploreService.likeTask(taskId);
  }
}
