import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('page_views')
@Index(['createdAt'])
@Index(['path'])
@Index(['sessionId'])
export class PageViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column()
  path: string;

  @Column({ nullable: true, length: 2048 })
  referrer: string;

  @Column({ name: 'referrer_source', default: 'direct' })
  referrerSource: string;

  @Column({ name: 'referrer_domain', nullable: true })
  referrerDomain: string;

  @Column({ nullable: true, length: 2 })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'device_type', nullable: true })
  deviceType: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
