import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewsController } from './reviews.controller';
import { ProviderReviewsController } from './provider-reviews.controller';
import { ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { RepliesController } from './replies.controller';
import { ReviewReply } from '../database/entities/review-reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderReview, TravelerReview , ReviewReply])],
  controllers: [ReviewsController, ProviderReviewsController , RepliesController],
  providers: [ReviewsService , RepliesService],
  exports: [ReviewsService , RepliesService],
})
export class ReviewsModule {}
