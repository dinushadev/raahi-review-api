import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ReviewStatus } from './review-status.enum';

@Entity('traveler_reviews')
@Unique(['traveler_id', 'reviewer_id'])
@Index('idx_traveler_reviews_traveler_status', ['traveler_id', 'status'])
@Index('idx_traveler_reviews_reviewer', ['reviewer_id'])
@Index('idx_traveler_reviews_created_at', ['created_at'])
export class TravelerReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  traveler_id: string;

  @Column('uuid')
  reviewer_id: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  review_text: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewer_name: string | null;

  @Column({
    type: 'varchar',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
