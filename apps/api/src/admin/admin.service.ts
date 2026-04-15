import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { CommentEntity } from '../database/entities/comment.entity';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { CreditTransactionEntity } from '../database/entities/credit-transaction.entity';
import { UserRole, TaskType, TaskStatus, CreditTransactionType } from '@ai-platform/shared';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
    @InjectRepository(TaskEntity)
    private tasksRepo: Repository<TaskEntity>,
    @InjectRepository(CommentEntity)
    private commentsRepo: Repository<CommentEntity>,
    @InjectRepository(UserCreditEntity)
    private creditsRepo: Repository<UserCreditEntity>,
    @InjectRepository(CreditTransactionEntity)
    private txRepo: Repository<CreditTransactionEntity>,
  ) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalTasks,
      totalComments,
      newUsersToday,
      newTasksToday,
      completedTasks,
      publicTasks,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.tasksRepo.count(),
      this.commentsRepo.count(),
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.tasksRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.tasksRepo.count({ where: { status: TaskStatus.COMPLETED } }),
      this.tasksRepo.count({ where: { isPublic: true } }),
    ]);

    return {
      totalUsers,
      totalTasks,
      totalComments,
      newUsersToday,
      newTasksToday,
      completedTasks,
      publicTasks,
    };
  }

  // ─── Trends ────────────────────────────────────────────────────────────────

  async getTrends(days = 14) {
    const daily: { date: string; newUsers: number; newTasks: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [newUsers, newTasks] = await Promise.all([
        this.usersRepo.count({ where: { createdAt: Between(start, end) } }),
        this.tasksRepo.count({ where: { createdAt: Between(start, end) } }),
      ]);

      daily.push({
        date: start.toISOString().split('T')[0],
        newUsers,
        newTasks,
      });
    }

    const [typeRaw, statusRaw] = await Promise.all([
      this.tasksRepo
        .createQueryBuilder('task')
        .select('task.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.type')
        .getRawMany(),
      this.tasksRepo
        .createQueryBuilder('task')
        .select('task.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.status')
        .getRawMany(),
    ]);

    return {
      daily,
      typeDistribution: typeRaw.map((r) => ({ type: r.type, count: parseInt(r.count, 10) })),
      statusDistribution: statusRaw.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
    };
  }

  async getStatusDistribution(days?: number) {
    const qb = this.tasksRepo
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count');

    if (days && days > 0) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - days + 1);
      qb.where('task.createdAt >= :start', { start });
    }

    const raw = await qb.groupBy('task.status').getRawMany();
    return raw.map((r) => ({ status: r.status, count: parseInt(r.count, 10) }));
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async listUsers(page = 1, pageSize = 20, search?: string) {
    const qb = this.usersRepo.createQueryBuilder('user');

    if (search) {
      qb.where(
        'user.email ILIKE :search OR user.display_name ILIKE :search',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        isLocalUser: !!u.passwordHash,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    user.role = role;
    await this.usersRepo.save(user);
    return { id: user.id, role: user.role };
  }

  async adjustUserCredits(userId: string, amount: number, description: string) {
    let credit = await this.creditsRepo.findOne({ where: { userId } });
    if (!credit) {
      credit = this.creditsRepo.create({ userId, balance: 0 });
    }
    credit.balance = Number(credit.balance) + amount;
    await this.creditsRepo.save(credit);

    const tx = this.txRepo.create({
      userId,
      amount,
      type: amount >= 0 ? CreditTransactionType.BONUS : CreditTransactionType.CONSUME,
      description,
    });
    await this.txRepo.save(tx);

    return { userId, balance: credit.balance };
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  async listAllTasks(
    page = 1,
    pageSize = 20,
    type?: TaskType,
    status?: TaskStatus,
    userId?: string,
    search?: string,
  ) {
    const qb = this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.user', 'user');

    if (type) qb.andWhere('task.type = :type', { type });
    if (status) qb.andWhere('task.status = :status', { status });
    if (userId) qb.andWhere('task.userId = :userId', { userId });
    if (search) {
      qb.andWhere(
        '(task.prompt ILIKE :s OR task.model ILIKE :s OR user.display_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [tasks, total] = await qb.getManyAndCount();

    return {
      data: tasks.map((t) => ({
        id: t.id,
        type: t.type,
        model: t.model,
        status: t.status,
        prompt: t.prompt,
        isPublic: t.isPublic,
        adminVisible: t.adminVisible,
        likeCount: t.likeCount,
        createdAt: t.createdAt,
        user: t.user
          ? { id: t.user.id, displayName: t.user.displayName, avatarUrl: t.user.avatarUrl }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminDeleteTask(taskId: string) {
    const task = await this.tasksRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    await this.tasksRepo.remove(task);
    return { message: '已删除' };
  }

  async adminToggleTaskVisibility(taskId: string) {
    const task = await this.tasksRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    task.isPublic = !task.isPublic;
    await this.tasksRepo.save(task);
    return { isPublic: task.isPublic };
  }

  async adminToggleAdminVisible(taskId: string) {
    const task = await this.tasksRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    task.adminVisible = !task.adminVisible;
    await this.tasksRepo.save(task);
    return { adminVisible: task.adminVisible };
  }

  // ─── Credits ───────────────────────────────────────────────────────────────

  async listAllTransactions(page = 1, pageSize = 20, userId?: string, search?: string) {
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.user', 'user');

    if (userId) qb.andWhere('tx.userId = :userId', { userId });
    if (search) {
      qb.andWhere(
        '(user.display_name ILIKE :s OR tx.description ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((tx) => ({
        ...tx,
        user: tx.user
          ? { id: tx.user.id, displayName: tx.user.displayName }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  async listAllComments(page = 1, pageSize = 20, isApproved?: boolean, search?: string) {
    const qb = this.commentsRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.task', 'task');

    if (isApproved !== undefined) {
      qb.andWhere('comment.is_approved = :isApproved', { isApproved });
    }
    if (search) {
      qb.andWhere(
        '(comment.content ILIKE :s OR user.display_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((c) => ({
        id: c.id,
        content: c.content,
        isApproved: c.isApproved,
        createdAt: c.createdAt,
        user: c.user ? { id: c.user.id, displayName: c.user.displayName } : null,
        task: c.task ? { id: c.task.id, type: c.task.type, prompt: c.task.prompt } : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminToggleCommentApproval(commentId: string) {
    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('评论不存在');
    comment.isApproved = !comment.isApproved;
    await this.commentsRepo.save(comment);
    return { id: comment.id, isApproved: comment.isApproved };
  }

  async adminDeleteComment(commentId: string) {
    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('评论不存在');
    await this.commentsRepo.remove(comment);
    return { message: '已删除' };
  }
}
