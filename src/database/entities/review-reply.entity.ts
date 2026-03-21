import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { ProviderReview } from './provider-review.entity';


@Entity('review_replies')
@Check(`char_length("reply_text") >= 20 AND char_length("reply_text") <= 1000`)
@Index('idx_review_replies_provider_id', ['provider_id'])
export class ReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;


  @Column('uuid')
  review_id: string;

  
  @Column('uuid')
  provider_id: string;

  @Column({ type: 'text' })
  reply_text: string;

 
  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ── Relations ──────────────────────────────────────────────────────────────


  @ManyToOne(() => ProviderReview, (review) => review.reply, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review: ProviderReview;
}