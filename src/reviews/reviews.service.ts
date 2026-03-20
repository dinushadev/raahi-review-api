import {
  Injectable,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { ProviderReviewReply } from '../database/entities/provider-review-reply.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewReplyStatus } from '../database/entities/review-reply-status.enum';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';

const EDIT_WINDOW_HOURS = 24;
const REPLY_EDIT_WINDOW_HOURS = 48;

export type ReviewRecord = ProviderReview | TravelerReview;

export interface SubjectReviewsResult {
  average_rating: number | null;
  total_reviews: number;
  reviews: Array<{
    id: string;
    rating: number;
    review_text: string | null;
    reviewer_name: string | null;
    is_verified: boolean;
    created_at: Date;
    reply?: {
      reply_text: string;
      created_at: Date;
      updated_at: Date;
    } | null;
  }>;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProviderReview)
    private readonly providerReviewRepo: Repository<ProviderReview>,
    @InjectRepository(ProviderReviewReply)
    private readonly providerReviewReplyRepo: Repository<ProviderReviewReply>,
    @InjectRepository(TravelerReview)
    private readonly travelerReviewRepo: Repository<TravelerReview>,
  ) {}

  async create(
    reviewerId: string,
    dto: CreateReviewDto,
  ): Promise<ProviderReview | TravelerReview> {
    if (dto.subject_type === 'provider') {
      const existing = await this.providerReviewRepo.findOne({
        where: { provider_id: dto.subject_id, reviewer_id: reviewerId },
      });
      if (existing) {
        throw new ConflictException('You already have a review for this provider');
      }
      const review = this.providerReviewRepo.create({
        provider_id: dto.subject_id,
        reviewer_id: reviewerId,
        rating: dto.rating,
        review_text: dto.review_text ?? null,
        reviewer_name: dto.reviewer_name ?? null,
        status: ReviewStatus.PENDING,
        booking_id: dto.booking_id ?? null,
      });
      try {
        return await this.providerReviewRepo.save(review);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        if (code === '23505') {
          throw new ConflictException('You already have a review for this provider');
        }
        throw err;
      }
    } else {
      const existing = await this.travelerReviewRepo.findOne({
        where: { traveler_id: dto.subject_id, reviewer_id: reviewerId },
      });
      if (existing) {
        throw new ConflictException('You already have a review for this traveler');
      }
      const review = this.travelerReviewRepo.create({
        traveler_id: dto.subject_id,
        reviewer_id: reviewerId,
        rating: dto.rating,
        review_text: dto.review_text ?? null,
        reviewer_name: dto.reviewer_name ?? null,
        status: ReviewStatus.PENDING,
        booking_id: dto.booking_id ?? null,
      });
      try {
        return await this.travelerReviewRepo.save(review);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        if (code === '23505') {
          throw new ConflictException('You already have a review for this traveler');
        }
        throw err;
      }
    }
  }

  async createReply(
    providerId: string,
    reviewId: string,
    dto: CreateReplyDto,
  ): Promise<ProviderReviewReply> {
    const found = await this.findReviewById(reviewId);
    if (!found) {
      throw new NotFoundException('Review not found');
    }
    if (found.type !== 'provider') {
      throw new NotFoundException('Review not found');
    }
    const review = found.review as ProviderReview;
    if (review.provider_id !== providerId) {
      throw new ForbiddenException('You can only reply to reviews about yourself');
    }

    const existing = await this.providerReviewReplyRepo.findOne({
      where: { review_id: reviewId },
    });
    if (existing) {
      throw new ConflictException('This review already has a reply');
    }

    const reply = this.providerReviewReplyRepo.create({
      review_id: reviewId,
      provider_id: providerId,
      reply_text: dto.reply_text,
      status: ReviewReplyStatus.ACTIVE,
    });

    try {
      return await this.providerReviewReplyRepo.save(reply);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : '';
      if (code === '23505') {
        throw new ConflictException('This review already has a reply');
      }
      throw err;
    }
  }

  async updateReply(
    providerId: string,
    reviewId: string,
    dto: UpdateReplyDto,
  ): Promise<ProviderReviewReply> {
    const reply = await this.providerReviewReplyRepo.findOne({
      where: { review_id: reviewId },
    });
    if (!reply || reply.status === ReviewReplyStatus.DELETED) {
      throw new NotFoundException('Reply not found');
    }
    if (reply.provider_id !== providerId) {
      throw new ForbiddenException('You can only edit your own reply');
    }

    const now = new Date();
    const windowEnd = new Date(reply.created_at);
    windowEnd.setHours(windowEnd.getHours() + REPLY_EDIT_WINDOW_HOURS);
    if (now > windowEnd) {
      throw new GoneException('Edit window has expired');
    }

    reply.reply_text = dto.reply_text;
    reply.updated_at = now;

    return this.providerReviewReplyRepo.save(reply);
  }

  async deleteReply(providerId: string, reviewId: string): Promise<void> {
    const reply = await this.providerReviewReplyRepo.findOne({
      where: { review_id: reviewId },
    });
    if (!reply || reply.status === ReviewReplyStatus.DELETED) {
      throw new NotFoundException('Reply not found');
    }
    if (reply.provider_id !== providerId) {
      throw new ForbiddenException('You can only delete your own reply');
    }

    reply.status = ReviewReplyStatus.DELETED;
    reply.updated_at = new Date();

    await this.providerReviewReplyRepo.save(reply);
  }

  private async findReviewById(reviewId: string): Promise<{
    review: ProviderReview | TravelerReview;
    type: 'provider' | 'traveler';
  } | null> {
    const providerReview = await this.providerReviewRepo.findOne({
      where: { id: reviewId },
    });
    if (providerReview) {
      return { review: providerReview, type: 'provider' };
    }
    const travelerReview = await this.travelerReviewRepo.findOne({
      where: { id: reviewId },
    });
    if (travelerReview) {
      return { review: travelerReview, type: 'traveler' };
    }
    return null;
  }

  async update(
    reviewId: string,
    reviewerId: string,
    dto: UpdateReviewDto,
  ): Promise<ProviderReview | TravelerReview> {
    const found = await this.findReviewById(reviewId);
    if (!found) {
      throw new NotFoundException('Review not found');
    }
    const { review } = found;
    if (review.reviewer_id !== reviewerId) {
      throw new ForbiddenException('You can only edit your own review');
    }
    const now = new Date();
    const windowEnd = new Date(review.created_at);
    windowEnd.setHours(windowEnd.getHours() + EDIT_WINDOW_HOURS);
    if (now > windowEnd) {
      throw new GoneException('Edit window has expired');
    }
    if (review.status === ReviewStatus.DELETED) {
      throw new NotFoundException('Review not found');
    }
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.review_text !== undefined) review.review_text = dto.review_text;
    if (dto.reviewer_name !== undefined) review.reviewer_name = dto.reviewer_name;
    if (found.type === 'provider') {
      return this.providerReviewRepo.save(review as ProviderReview);
    }
    return this.travelerReviewRepo.save(review as TravelerReview);
  }

  async deleteOwnReview(reviewId: string, reviewerId: string): Promise<void> {
    const found = await this.findReviewById(reviewId);
    if (!found) {
      throw new NotFoundException('Review not found');
    }
    const { review, type } = found;
    if (review.reviewer_id !== reviewerId) {
      throw new ForbiddenException('You can only delete your own review');
    }
    review.status = ReviewStatus.DELETED;
    if (type === 'provider') {
      await this.providerReviewRepo.save(review as ProviderReview);
    } else {
      await this.travelerReviewRepo.save(review as TravelerReview);
    }
  }

  async getProviderReviews(
    providerId: string,
    query: SubjectReviewsQueryDto,
  ): Promise<SubjectReviewsResult> {
    const sort = query.sort ?? 'recent';
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = query.offset ?? 0;

    const qb = this.providerReviewRepo
      .createQueryBuilder('r')
      .where('r.provider_id = :providerId', { providerId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED });

    const aggregate = await qb
      .clone()
      .select('AVG(r.rating)', 'average_rating')
      .addSelect('COUNT(r.id)', 'total_reviews')
      .getRawOne<{ average_rating: string; total_reviews: string }>();

    const totalReviews = parseInt(aggregate?.total_reviews ?? '0', 10);
    const averageRating = aggregate?.average_rating
      ? parseFloat(aggregate.average_rating)
      : null;

    const order: Record<string, 'ASC' | 'DESC'> =
      sort === 'rating'
        ? { rating: 'DESC', created_at: 'DESC' }
        : { created_at: 'DESC' };

    const reviews = await this.providerReviewRepo.find({
      where: { provider_id: providerId, status: ReviewStatus.APPROVED },
      select: ['id', 'rating', 'review_text', 'reviewer_name', 'is_verified', 'created_at'],
      order,
      skip: offset,
      take: limit,
    });

    const replies = reviews.length
      ? await this.providerReviewReplyRepo.find({
          where: {
            review_id: In(reviews.map((review) => review.id)),
            status: ReviewReplyStatus.ACTIVE,
          },
          select: ['review_id', 'reply_text', 'created_at', 'updated_at'],
        })
      : [];

    const repliesByReviewId = new Map(
      replies.map((reply) => [reply.review_id, reply] as const),
    );

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      reviews: reviews.map((review) => {
        const reply = repliesByReviewId.get(review.id);
        return {
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          reviewer_name: review.reviewer_name,
          is_verified: review.is_verified,
          created_at: review.created_at,
          reply: reply
            ? {
                reply_text: reply.reply_text,
                created_at: reply.created_at,
                updated_at: reply.updated_at,
              }
            : null,
        };
      }),
    };
  }

  async getTravelerReviews(
    travelerId: string,
    query: SubjectReviewsQueryDto,
  ): Promise<SubjectReviewsResult> {
    return this.getSubjectReviews(
      this.travelerReviewRepo,
      'traveler_id',
      travelerId,
      query,
    );
  }

  private async getSubjectReviews(
    repo: Repository<ProviderReview> | Repository<TravelerReview>,
    subjectColumn: 'provider_id' | 'traveler_id',
    subjectId: string,
    query: SubjectReviewsQueryDto,
  ): Promise<SubjectReviewsResult> {
    const sort = query.sort ?? 'recent';
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = query.offset ?? 0;

    const qb = repo
      .createQueryBuilder('r')
      .where(`r.${subjectColumn} = :subjectId`, { subjectId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED });

    const aggregate = await qb
      .clone()
      .select('AVG(r.rating)', 'average_rating')
      .addSelect('COUNT(r.id)', 'total_reviews')
      .getRawOne<{ average_rating: string; total_reviews: string }>();

    const totalReviews = parseInt(aggregate?.total_reviews ?? '0', 10);
    const averageRating = aggregate?.average_rating
      ? parseFloat(aggregate.average_rating)
      : null;

    const order: Record<string, 'ASC' | 'DESC'> =
      sort === 'rating'
        ? { rating: 'DESC', created_at: 'DESC' }
        : { created_at: 'DESC' };

    const reviews = await repo.find({
      where: { [subjectColumn]: subjectId, status: ReviewStatus.APPROVED },
      select: ['id', 'rating', 'review_text', 'reviewer_name', 'is_verified', 'created_at'],
      order,
      skip: offset,
      take: limit,
    });

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review_text: r.review_text,
        reviewer_name: r.reviewer_name,
        is_verified: r.is_verified,
        created_at: r.created_at,
      })),
    };
  }
}
