import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../database/entities/review.entity';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  controllers: [AdminReviewsController],
  providers: [AdminReviewsService],
})
export class AdminModule {}
