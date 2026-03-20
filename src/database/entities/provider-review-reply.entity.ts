import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ReviewReplyStatus } from './review-reply-status.enum';

@Entity('provider_review_replies')
@Unique(['review_id'])
@Index('idx_provider_review_replies_provider_id', ['provider_id'])
@Index('idx_provider_review_replies_status', ['status'])
export class ProviderReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  review_id: string;

  @Column('uuid')
  provider_id: string;

  @Column({ type: 'text' })
  reply_text: string;

  @Column({
    type: 'varchar',
    enum: ReviewReplyStatus,
    default: ReviewReplyStatus.ACTIVE,
  })
  status: ReviewReplyStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
