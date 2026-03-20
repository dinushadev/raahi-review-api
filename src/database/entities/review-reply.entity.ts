import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProviderReview } from './provider-review.entity';

@Entity('review_replies')
export class ReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Each review can have ONLY ONE reply
  @Column({ type: 'uuid', unique: true })
  review_id: string;

  @Column({ type: 'uuid' })
  provider_id: string;

  @Column({ type: 'text' })
  reply_text: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Soft delete
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // 🔗 Relation with ProviderReview
  @ManyToOne(() => ProviderReview, (review) => review.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review: ProviderReview;
}