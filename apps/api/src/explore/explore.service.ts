import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasksService } from '../tasks/tasks.service';
import { RedisService } from '../auth/redis.service';
import { TaskStatus, TaskType } from '@ai-platform/shared';
import { CommentEntity } from '../database/entities/comment.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { FavoriteEntity } from '../database/entities/favorite.entity';

@Injectable()
export class ExploreService {
  constructor(
    private tasksService: TasksService,
    private redisService: RedisService,
    @InjectRepository(TaskEntity)
    private taskRepo: Repository<TaskEntity>,
    @InjectRepository(CommentEntity)
    private commentRepo: Repository<CommentEntity>,
    @InjectRepository(FavoriteEntity)
    private favoriteRepo: Repository<FavoriteEntity>,
  ) {}

  async getPublicFeed(page = 1, pageSize = 20, type?: TaskType) {
    const cacheKey = `explore:feed:${page}:${pageSize}:${type || 'all'}`;
    const cached = await this.redisService.getJson(cacheKey);
    if (cached) return cached;

    // 按热度（收藏数 + 评论数）倒序，再按创建时间兜底
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user')
      .where(
        'task.isPublic = :pub AND task.adminVisible = :adm AND task.status = :st',
        { pub: true, adm: true, st: TaskStatus.COMPLETED },
      )
      .orderBy('(task.favoritesCount + task.commentsCount)', 'DESC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (type) qb.andWhere('task.type = :type', { type });

    const [tasks, total] = await qb.getManyAndCount();

    const data = tasks.map((t) => ({
      ...t,
      user: t.user
        ? { id: t.user.id, displayName: t.user.displayName, avatarUrl: t.user.avatarUrl }
        : null,
    }));

    const result = { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    await this.redisService.setJson(cacheKey, result, 300);
    return result;
  }

  async likeTask(taskId: string) {
    await this.tasksService.incrementLike(taskId);
    return { message: '点赞成功' };
  }

  async getPublicTask(taskId: string, currentUserId?: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, isPublic: true, adminVisible: true, status: TaskStatus.COMPLETED },
      relations: ['user'],
    });
    if (!task) throw new NotFoundException('作品不存在或未公开');

    let isFavoritedByMe = false;
    if (currentUserId) {
      const fav = await this.favoriteRepo.findOne({
        where: { userId: currentUserId, taskId },
      });
      isFavoritedByMe = !!fav;
    }

    return {
      ...task,
      user: task.user
        ? { id: task.user.id, displayName: task.user.displayName, avatarUrl: task.user.avatarUrl }
        : null,
      isFavoritedByMe,
    };
  }

  async listComments(taskId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, isPublic: true, adminVisible: true, status: TaskStatus.COMPLETED },
    });
    if (!task) throw new NotFoundException('作品不存在或未公开');

    const comments = await this.commentRepo.find({
      where: { taskId, isApproved: true },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: 200,
    });

    return comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      user: c.user ? { id: c.user.id, displayName: c.user.displayName, avatarUrl: c.user.avatarUrl } : null,
      content: c.content,
      createdAt: c.createdAt,
    }));
  }

  async addComment(taskId: string, userId: string, content: string) {
    const task = await this.tasksService.findById(taskId);
    if (!task) throw new NotFoundException('作品不存在');
    if (!task.isPublic || task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('该作品不可评论');
    }

    const entity = this.commentRepo.create({ taskId, userId, content: content.trim() });
    const saved = await this.commentRepo.save(entity);

    // 同步更新评论计数（冗余字段）
    await this.taskRepo.increment({ id: taskId }, 'commentsCount', 1);

    // 清除 feed 缓存
    await this.redisService.deleteByPattern('explore:feed:*').catch(() => {});
    return { id: saved.id };
  }
}
