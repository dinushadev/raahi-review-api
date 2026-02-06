import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';

const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.PENDING]: [ReviewStatus.APPROVED, ReviewStatus.HIDDEN, ReviewStatus.DELETED],
  [ReviewStatus.APPROVED]: [ReviewStatus.HIDDEN, ReviewStatus.DELETED],
  [ReviewStatus.HIDDEN]: [],
  [ReviewStatus.DELETED]: [],
};

export type AdminReviewItem =
  | (ProviderReview & { subject_type: 'provider' })
  | (TravelerReview & { subject_type: 'traveler' });

export interface AdminReviewsListResult {
  data: AdminReviewItem[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class AdminReviewsService {
  constructor(
    @InjectRepository(ProviderReview)
    private readonly providerReviewRepo: Repository<ProviderReview>,
    @InjectRepository(TravelerReview)
    private readonly travelerReviewRepo: Repository<TravelerReview>,
  ) {}

  async moderateReview(
    reviewId: string,
    dto: ModerateReviewDto,
  ): Promise<ProviderReview | TravelerReview> {
    const providerReview = await this.providerReviewRepo.findOne({
      where: { id: reviewId },
    });
    if (providerReview) {
      const allowed = ALLOWED_TRANSITIONS[providerReview.status];
      if (!allowed?.includes(dto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${providerReview.status} to ${dto.status}`,
        );
      }
      providerReview.status = dto.status;
      if (dto.is_verified !== undefined) {
        providerReview.is_verified = dto.is_verified;
      }
      return this.providerReviewRepo.save(providerReview);
    }
    const travelerReview = await this.travelerReviewRepo.findOne({
      where: { id: reviewId },
    });
    if (travelerReview) {
      const allowed = ALLOWED_TRANSITIONS[travelerReview.status];
      if (!allowed?.includes(dto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${travelerReview.status} to ${dto.status}`,
        );
      }
      travelerReview.status = dto.status;
      if (dto.is_verified !== undefined) {
        travelerReview.is_verified = dto.is_verified;
      }
      return this.travelerReviewRepo.save(travelerReview);
    }
    throw new NotFoundException('Review not found');
  }

  async listReviews(query: AdminReviewsQueryDto): Promise<AdminReviewsListResult> {
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;
    const type = query.type ?? 'all';

    const runProvider = type === 'all' || type === 'provider';
    const runTraveler = type === 'all' || type === 'traveler';

    const providerItems: AdminReviewItem[] = [];
    const travelerItems: AdminReviewItem[] = [];

    if (runProvider) {
      const qb = this.providerReviewRepo
        .createQueryBuilder('r')
        .orderBy('r.created_at', 'DESC');
      if (query.status) {
        qb.andWhere('r.status = :status', { status: query.status });
      }
      if (query.provider_id) {
        qb.andWhere('r.provider_id = :providerId', { providerId: query.provider_id });
      }
      if (query.reviewer_id) {
        qb.andWhere('r.reviewer_id = :reviewerId', { reviewerId: query.reviewer_id });
      }
      const list = await qb.getMany();
      providerItems.push(
        ...list.map((r) => ({ ...r, subject_type: 'provider' as const })),
      );
    }

    if (runTraveler) {
      const qb = this.travelerReviewRepo
        .createQueryBuilder('r')
        .orderBy('r.created_at', 'DESC');
      if (query.status) {
        qb.andWhere('r.status = :status', { status: query.status });
      }
      if (query.traveler_id) {
        qb.andWhere('r.traveler_id = :travelerId', { travelerId: query.traveler_id });
      }
      if (query.reviewer_id) {
        qb.andWhere('r.reviewer_id = :reviewerId', { reviewerId: query.reviewer_id });
      }
      const list = await qb.getMany();
      travelerItems.push(
        ...list.map((r) => ({ ...r, subject_type: 'traveler' as const })),
      );
    }

    const merged = [...providerItems, ...travelerItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const total = merged.length;
    const data = merged.slice(offset, offset + limit);

    return { data, total, limit, offset };
  }
}
