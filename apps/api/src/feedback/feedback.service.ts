import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackEntity } from '../database/entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly repo: Repository<FeedbackEntity>,
  ) {}

  async create(dto: CreateFeedbackDto, userId?: string) {
    const item = this.repo.create({ ...dto, userId });
    return this.repo.save(item);
  }

  async listAll(
    page = 1,
    pageSize = 20,
    category?: string,
    isRead?: boolean,
    search?: string,
  ) {
    const qb = this.repo.createQueryBuilder('fb');

    if (category) qb.andWhere('fb.category = :category', { category });
    if (isRead !== undefined) qb.andWhere('fb.is_read = :isRead', { isRead });
    if (search) {
      qb.andWhere(
        '(fb.content ILIKE :s OR fb.contact_email ILIKE :s OR fb.page_path ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy('fb.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getUnreadCount() {
    return this.repo.count({ where: { isRead: false } });
  }

  async markRead(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('反馈不存在');
    item.isRead = true;
    await this.repo.save(item);
    return { id: item.id, isRead: item.isRead };
  }

  async remove(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('反馈不存在');
    await this.repo.remove(item);
    return { message: '已删除' };
  }
}
