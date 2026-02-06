import {
  Injectable,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';

const EDIT_WINDOW_HOURS = 24;

export type ReviewRecord = ProviderReview | TravelerReview;

export interface SubjectReviewsResult {
  average_rating: number | null;
  total_reviews: number;
  reviews: Array<{
    rating: number;
    review_text: string | null;
    reviewer_name: string | null;
    is_verified: boolean;
    created_at: Date;
  }>;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProviderReview)
    private readonly providerReviewRepo: Repository<ProviderReview>,
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
    return this.getSubjectReviews(
      this.providerReviewRepo,
      'provider_id',
      providerId,
      query,
    );
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
      select: ['rating', 'review_text', 'reviewer_name', 'is_verified', 'created_at'],
      order,
      skip: offset,
      take: limit,
    });

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      reviews: reviews.map((r) => ({
        rating: r.rating,
        review_text: r.review_text,
        reviewer_name: r.reviewer_name,
        is_verified: r.is_verified,
        created_at: r.created_at,
      })),
    };
  }
}
