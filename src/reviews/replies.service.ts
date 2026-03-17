import {
  Injectable,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewReply } from '../database/entities/review-reply.entity';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';

const REPLY_EDIT_WINDOW_HOURS = 48;

export interface ReplyResponse {
  id: string;
  review_id: string;
  provider_id: string;
  reply_text: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class RepliesService {
  constructor(
    @InjectRepository(ReviewReply)
    private readonly replyRepo: Repository<ReviewReply>,

    @InjectRepository(ProviderReview)
    private readonly providerReviewRepo: Repository<ProviderReview>,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async createReply(
    reviewId: string,
    providerId: string,
    dto: CreateReplyDto,
  ): Promise<ReplyResponse> {
    // 1. Load the review and verify it exists
    const review = await this.loadReview(reviewId);

    // 2. Verify the authenticated provider is the subject of this review
    this.assertProviderOwnsReview(review, providerId);

    // 3. Check for an existing active reply (application-level guard before DB)
    const existing = await this.replyRepo.findOne({
      where: { review_id: reviewId, is_deleted: false },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REPLY_ALREADY_EXISTS',
        message: 'A reply already exists for this review.',
      });
    }

    // 4. Persist — the partial unique index is the final safety net
    const reply = this.replyRepo.create({
      review_id: reviewId,
      provider_id: providerId,
      reply_text: dto.reply_text,
    });

    try {
      return this.toResponse(await this.replyRepo.save(reply));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'REPLY_ALREADY_EXISTS',
          message: 'A reply already exists for this review.',
        });
      }
      throw err;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateReply(
    reviewId: string,
    providerId: string,
    dto: UpdateReplyDto,
  ): Promise<ReplyResponse> {
    const reply = await this.loadActiveReply(reviewId);

    // Only the author can update
    if (reply.provider_id !== providerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the provider who authored this reply can update it.',
      });
    }

    // 48-hour edit window
    const deadline = new Date(reply.created_at);
    deadline.setHours(deadline.getHours() + REPLY_EDIT_WINDOW_HOURS);
    if (new Date() > deadline) {
      throw new GoneException({
        code: 'EDIT_WINDOW_EXPIRED',
        message: 'The 48-hour edit window for this reply has expired.',
      });
    }

    reply.reply_text = dto.reply_text;
    return this.toResponse(await this.replyRepo.save(reply));
  }

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async deleteReply(reviewId: string, providerId: string): Promise<void> {
    const reply = await this.loadActiveReply(reviewId);

    if (reply.provider_id !== providerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the provider who authored this reply can delete it.',
      });
    }

    reply.is_deleted = true;
    await this.replyRepo.save(reply);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Load a provider review by id; throw 404 if not found or already deleted.
   */
  private async loadReview(reviewId: string): Promise<ProviderReview> {
    const review = await this.providerReviewRepo.findOne({
      where: { id: reviewId },
    });
    if (!review || review.status === ReviewStatus.DELETED) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: 'Review not found.',
      });
    }
    return review;
  }

  /**
   * Load the active (non-deleted) reply for a review; throw 404 if missing.
   */
  private async loadActiveReply(reviewId: string): Promise<ReviewReply> {
    // Also verifies the parent review exists
    await this.loadReview(reviewId);

    const reply = await this.replyRepo.findOne({
      where: { review_id: reviewId, is_deleted: false },
    });
    if (!reply) {
      throw new NotFoundException({
        code: 'REPLY_NOT_FOUND',
        message: 'No active reply found for this review.',
      });
    }
    return reply;
  }

  /**
   * Ensure the JWT provider_id matches the provider_id on the review.
   */
  private assertProviderOwnsReview(
    review: ProviderReview,
    providerId: string,
  ): void {
    if (review.provider_id !== providerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can only reply to reviews written about you.',
      });
    }
  }

  private toResponse(reply: ReviewReply): ReplyResponse {
    return {
      id: reply.id,
      review_id: reply.review_id,
      provider_id: reply.provider_id,
      reply_text: reply.reply_text,
      is_deleted: reply.is_deleted,
      created_at: reply.created_at,
      updated_at: reply.updated_at,
    };
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────

function isUniqueViolation(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}