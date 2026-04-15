import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteEntity } from '../database/entities/favorite.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { TaskStatus } from '@ai-platform/shared';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private favoriteRepo: Repository<FavoriteEntity>,
    @InjectRepository(TaskEntity)
    private taskRepo: Repository<TaskEntity>,
  ) {}

  /** 切换收藏状态，返回最新状态和收藏数 */
  async toggle(userId: string, taskId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, isPublic: true, adminVisible: true, status: TaskStatus.COMPLETED },
    });
    if (!task) throw new NotFoundException('作品不存在或未公开');

    const existing = await this.favoriteRepo.findOne({ where: { userId, taskId } });

    if (existing) {
      await this.favoriteRepo.remove(existing);
      await this.taskRepo.decrement({ id: taskId }, 'favoritesCount', 1);
      const updated = await this.taskRepo.findOne({ where: { id: taskId } });
      return { isFavorited: false, favoritesCount: Math.max(0, updated?.favoritesCount ?? 0) };
    } else {
      await this.favoriteRepo.save(this.favoriteRepo.create({ userId, taskId }));
      await this.taskRepo.increment({ id: taskId }, 'favoritesCount', 1);
      const updated = await this.taskRepo.findOne({ where: { id: taskId } });
      return { isFavorited: true, favoritesCount: updated?.favoritesCount ?? 1 };
    }
  }

  /** 检查当前用户是否已收藏 */
  async checkStatus(userId: string, taskId: string) {
    const existing = await this.favoriteRepo.findOne({ where: { userId, taskId } });
    return { isFavorited: !!existing };
  }

  /**
   * 获取收藏了某作品的用户列表（仅作品作者可查看）
   */
  async getFavoritors(taskId: string, requestUserId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('作品不存在');
    if (task.userId !== requestUserId) throw new ForbiddenException('仅作者可查看收藏列表');

    const favorites = await this.favoriteRepo.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 200,
    });

    return favorites.map((f) => ({
      userId: f.userId,
      displayName: f.user?.displayName ?? '未知用户',
      avatarUrl: f.user?.avatarUrl ?? null,
      favoritedAt: f.createdAt,
    }));
  }
}
