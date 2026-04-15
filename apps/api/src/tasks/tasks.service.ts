import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../database/entities/task.entity';
import { TaskStatus, TaskType } from '@ai-platform/shared';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private tasksRepo: Repository<TaskEntity>,
  ) {}

  async create(data: Partial<TaskEntity>): Promise<TaskEntity> {
    const task = this.tasksRepo.create(data);
    return this.tasksRepo.save(task);
  }

  async findById(id: string): Promise<TaskEntity | null> {
    return this.tasksRepo.findOne({ where: { id } });
  }

  async findPublicTaskById(id: string): Promise<any | null> {
    const task = await this.tasksRepo.findOne({
      where: { id, isPublic: true, status: TaskStatus.COMPLETED },
      relations: ['user'],
    });
    if (!task) return null;
    return {
      ...task,
      user: task.user ? { id: task.user.id, displayName: task.user.displayName, avatarUrl: task.user.avatarUrl } : null,
    };
  }

  async findByIdOrThrow(id: string, userId?: string): Promise<TaskEntity> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    if (userId && task.userId !== userId) throw new ForbiddenException('无权限访问此任务');
    return task;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    data?: Partial<TaskEntity>,
  ): Promise<void> {
    const updates: Partial<TaskEntity> = { status, ...data };
    if (status === TaskStatus.COMPLETED) {
      updates.completedAt = new Date();
    }
    await this.tasksRepo.update(id, updates);
  }

  async getUserTasks(
    userId: string,
    page = 1,
    pageSize = 20,
    type?: TaskType,
    status?: TaskStatus,
  ) {
    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    // 进行中包括 pending + processing
    if (status === TaskStatus.PROCESSING) {
      const { In } = await import('typeorm');
      where.status = In([TaskStatus.PENDING, TaskStatus.PROCESSING]);
    }

    const [data, total] = await this.tasksRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPublicTasks(
    page = 1,
    pageSize = 20,
    type?: TaskType,
  ) {
    const where: any = { isPublic: true, adminVisible: true, status: TaskStatus.COMPLETED };
    if (type) where.type = type;

    const [tasks, total] = await this.tasksRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 只返回用户的安全字段
    const data = tasks.map((t) => ({
      ...t,
      user: t.user
        ? { id: t.user.id, displayName: t.user.displayName, avatarUrl: t.user.avatarUrl }
        : null,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await this.findByIdOrThrow(id, userId);
    await this.tasksRepo.remove(task);
  }

  async incrementLike(id: string): Promise<void> {
    await this.tasksRepo.increment({ id }, 'likeCount', 1);
  }

  async toggleFavorite(id: string, userId: string): Promise<{ isFavorited: boolean }> {
    const task = await this.findByIdOrThrow(id, userId);
    task.isFavorited = !task.isFavorited;
    await this.tasksRepo.save(task);
    return { isFavorited: task.isFavorited };
  }

  async toggleVisibility(id: string, userId: string): Promise<{ isPublic: boolean }> {
    const task = await this.findByIdOrThrow(id, userId);
    task.isPublic = !task.isPublic;
    await this.tasksRepo.save(task);
    return { isPublic: task.isPublic };
  }

  async assignProject(id: string, userId: string, projectId: string | null): Promise<void> {
    await this.findByIdOrThrow(id, userId);
    await this.tasksRepo.update(id, { projectId: projectId as any });
  }

  async getAssets(
    userId: string,
    page = 1,
    pageSize = 20,
    type?: TaskType,
    isFavorited?: boolean,
    projectId?: string,
  ) {
    const qb = this.tasksRepo
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.resultUrls IS NOT NULL');

    if (type) qb.andWhere('task.type = :type', { type });
    if (isFavorited !== undefined) qb.andWhere('task.isFavorited = :isFavorited', { isFavorited });
    if (projectId) qb.andWhere('task.projectId = :projectId', { projectId });

    qb.orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
