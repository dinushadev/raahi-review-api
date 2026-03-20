import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReviewReply } from '../database/entities/review-reply.entity';
import { ProviderReview } from '../database/entities/provider-review.entity';

@Injectable()
export class RepliesService {
  constructor(
    @InjectRepository(ReviewReply)
    private replyRepo: Repository<ReviewReply>,

    @InjectRepository(ProviderReview)
    private reviewRepo: Repository<ProviderReview>,
  ) {}

  // Create a reply for a provider review.
  async createReply(reviewId: string, userId: string, replyText: string) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the provider who received the review can reply.
    if (review.provider_id !== userId) {
      throw new ForbiddenException('You can only reply to your own reviews');
    }

    // Only one reply is allowed per review.
    const existingReply = await this.replyRepo.findOne({
      where: { review_id: reviewId },
    });

    if (existingReply) {
      throw new ConflictException('Reply already exists for this review');
    }

    const reply = this.replyRepo.create({
      review_id: reviewId,
      provider_id: userId,
      reply_text: replyText,
    });

    return this.replyRepo.save(reply);
  }

  // Update an existing reply within 48 hours.
  async updateReply(replyId: string, userId: string, replyText: string) {
    const reply = await this.replyRepo.findOne({
      where: { id: replyId },
    });

    if (!reply || reply.deleted_at) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.provider_id !== userId) {
      throw new ForbiddenException('You can only update your own reply');
    }

    const now = new Date();
    const created = new Date(reply.created_at);
    const diffHours =
      (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (diffHours > 48) {
      throw new GoneException('Edit window expired');
    }

    reply.reply_text = replyText;

    return this.replyRepo.save(reply);
  }

  // Soft-delete a reply by setting deleted_at.
  async deleteReply(replyId: string, userId: string): Promise<void> {
    const reply = await this.replyRepo.findOne({
      where: { id: replyId },
    });

    if (!reply || reply.deleted_at) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.provider_id !== userId) {
      throw new ForbiddenException('You can only delete your own reply');
    }

    reply.deleted_at = new Date();

    await this.replyRepo.save(reply);
  }
}
