import {
  Injectable,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import { TravelerStatus } from '../database/entities/traveler.entity';
import { ProviderStatus } from '../database/entities/provider.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ProviderReviewsQueryDto } from './dto/provider-reviews-query.dto';

const EDIT_WINDOW_HOURS = 24;

export interface ProviderReviewsResult {
  average_rating: number | null;
  total_reviews: number;
  reviews: Array<{
    rating: number;
    review_text: string | null;
    is_verified: boolean;
    created_at: Date;
  }>;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async create(travelerId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.reviewRepo.findOne({
      where: { provider_id: dto.provider_id, traveler_id: travelerId },
    });
    if (existing) {
      throw new ConflictException('You already have a review for this provider');
    }

    const review = this.reviewRepo.create({
      provider_id: dto.provider_id,
      traveler_id: travelerId,
      rating: dto.rating,
      review_text: dto.review_text ?? null,
      status: ReviewStatus.PENDING,
    });
    try {
      return await this.reviewRepo.save(review);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (msg === '23505') {
        throw new ConflictException('You already have a review for this provider');
      }
      throw err;
    }
  }

  async update(
    reviewId: string,
    travelerId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.traveler_id !== travelerId) {
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
    return this.reviewRepo.save(review);
  }

  async deleteOwnReview(reviewId: string, travelerId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.traveler_id !== travelerId) {
      throw new ForbiddenException('You can only delete your own review');
    }
    review.status = ReviewStatus.DELETED;
    await this.reviewRepo.save(review);
  }

  async getProviderReviews(
    providerId: string,
    query: ProviderReviewsQueryDto,
  ): Promise<ProviderReviewsResult> {
    const sort = query.sort ?? 'recent';
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = query.offset ?? 0;

    const baseWhere = {
      provider_id: providerId,
      status: ReviewStatus.APPROVED,
      traveler: { status: TravelerStatus.ACTIVE },
      provider: { status: ProviderStatus.APPROVED },
    };

    const aggregate = await this.reviewRepo
      .createQueryBuilder('r')
      .innerJoin('r.traveler', 't')
      .innerJoin('r.provider', 'p')
      .select('AVG(r.rating)', 'average_rating')
      .addSelect('COUNT(r.id)', 'total_reviews')
      .where('r.provider_id = :providerId', { providerId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('t.status = :tStatus', { tStatus: TravelerStatus.ACTIVE })
      .andWhere('p.status = :pStatus', { pStatus: ProviderStatus.APPROVED })
      .getRawOne<{ average_rating: string; total_reviews: string }>();

    const totalReviews = parseInt(aggregate?.total_reviews ?? '0', 10);
    const averageRating = aggregate?.average_rating
      ? parseFloat(aggregate.average_rating)
      : null;

    const order: Record<string, 'ASC' | 'DESC'> =
      sort === 'rating'
        ? { rating: 'DESC', created_at: 'DESC' }
        : { created_at: 'DESC' };

    const reviews = await this.reviewRepo.find({
      where: baseWhere,
      select: ['rating', 'review_text', 'is_verified', 'created_at'],
      order,
      skip: offset,
      take: limit,
      relations: ['traveler', 'provider'],
    });

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      reviews: reviews.map((r) => ({
        rating: r.rating,
        review_text: r.review_text,
        is_verified: r.is_verified,
        created_at: r.created_at,
      })),
    };
  }
}
