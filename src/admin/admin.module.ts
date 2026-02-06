import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderReview, TravelerReview])],
  controllers: [AdminReviewsController],
  providers: [AdminReviewsService],
})
export class AdminModule {}
