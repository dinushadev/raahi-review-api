import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
  Index,
} from 'typeorm';
import { ProviderReview } from './provider-review.entity';

@Entity('review_replies')
@Check(`char_length("reply_text") BETWEEN 20 AND 1000`)
@Index('idx_review_replies_review_id', ['review_id'])
@Index('idx_review_replies_provider_id', ['provider_id'])
export class ReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Each review can have only one reply.
  @Column({ type: 'uuid', unique: true })
  review_id: string;

  // The provider who wrote the reply.
  @Column({ type: 'uuid' })
  provider_id: string;

  @Column({ type: 'text' })
  reply_text: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Soft delete timestamp. A non-null value means the reply is hidden.
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Link the reply back to the provider review it belongs to.
  @ManyToOne(() => ProviderReview, (review) => review.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review: ProviderReview;
}
