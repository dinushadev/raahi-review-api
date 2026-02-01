import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Review } from './review.entity';

export enum ProviderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
}

export enum ServiceType {
  GUIDE = 'GUIDE',
  DRIVER = 'DRIVER',
  SAFARI = 'SAFARI',
}

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', enum: ServiceType })
  service_type: ServiceType;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({
    type: 'varchar',
    enum: ProviderStatus,
    default: ProviderStatus.PENDING,
  })
  status: ProviderStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Review, (review) => review.provider)
  reviews: Review[];
}
