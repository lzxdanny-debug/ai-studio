import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskType, TaskStatus } from '@ai-platform/shared';
import { UserEntity } from './user.entity';

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type: TaskType;

  @Column()
  model: string;

  @Column({ name: 'sub_type', nullable: true })
  subType: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ nullable: true, type: 'text' })
  prompt: string;

  @Column({ name: 'input_params', type: 'jsonb', default: '{}' })
  inputParams: Record<string, unknown>;

  @Column({ name: 'external_task_id', nullable: true })
  externalTaskId: string;

  @Column({ name: 'result_urls', type: 'jsonb', nullable: true })
  resultUrls: string[];

  @Column({ name: 'credits_cost', default: 0 })
  creditsCost: number;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  /** 社区收藏人数（冗余计数，由 FavoritesService 维护） */
  @Column({ name: 'favorites_count', default: 0 })
  favoritesCount: number;

  /** 社区评论数（冗余计数，由 ExploreService 维护） */
  @Column({ name: 'comments_count', default: 0 })
  commentsCount: number;

  /** 管理员是否允许展示（默认 true）。需与 isPublic 同时为 true 才在前台显示 */
  @Column({ name: 'admin_visible', default: true })
  adminVisible: boolean;

  @Column({ name: 'is_favorited', default: false })
  isFavorited: boolean;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;
}
