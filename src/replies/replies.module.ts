import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepliesService } from './replies.service';
import { RepliesController } from './replies.controller';

import { ReviewReply } from '../database/entities/review-reply.entity';
import { ProviderReview } from '../database/entities/provider-review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewReply, ProviderReview])],
  controllers: [RepliesController],
  providers: [RepliesService],
})
export class RepliesModule {}