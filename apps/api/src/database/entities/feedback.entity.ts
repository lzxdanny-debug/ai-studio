import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('feedback')
@Index(['createdAt'])
@Index(['isRead'])
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['bug', 'suggestion', 'other'],
    default: 'other',
  })
  category: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'screenshot_url', nullable: true, length: 2048 })
  screenshotUrl: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'page_path', nullable: true })
  pagePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
