import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';

const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.PENDING]: [ReviewStatus.APPROVED, ReviewStatus.HIDDEN, ReviewStatus.DELETED],
  [ReviewStatus.APPROVED]: [ReviewStatus.HIDDEN, ReviewStatus.DELETED],
  [ReviewStatus.HIDDEN]: [],
  [ReviewStatus.DELETED]: [],
};

export interface AdminReviewsListResult {
  data: Review[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class AdminReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async moderateReview(reviewId: string, dto: ModerateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['traveler', 'provider'],
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const allowed = ALLOWED_TRANSITIONS[review.status];
    if (!allowed?.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${review.status} to ${dto.status}`,
      );
    }
    review.status = dto.status;
    if (dto.is_verified !== undefined) {
      review.is_verified = dto.is_verified;
    }
    return this.reviewRepo.save(review);
  }

  async listReviews(query: AdminReviewsQueryDto): Promise<AdminReviewsListResult> {
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.traveler', 't')
      .leftJoinAndSelect('r.provider', 'p');

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.provider_id) {
      qb.andWhere('r.provider_id = :providerId', { providerId: query.provider_id });
    }
    if (query.traveler_id) {
      qb.andWhere('r.traveler_id = :travelerId', { travelerId: query.traveler_id });
    }

    const [data, total] = await qb
      .orderBy('r.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total, limit, offset };
  }
}
