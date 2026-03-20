import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';

function createQbMock() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };
}

describe('ReviewsService', () => {
  let service: ReviewsService;
  let providerReviewRepo: jest.Mocked<Repository<ProviderReview>>;
  let travelerReviewRepo: jest.Mocked<Repository<TravelerReview>>;

  const mockProviderReview = {
    id: 'review-uuid',
    provider_id: 'provider-uuid',
    reviewer_id: 'reviewer-uuid',
    rating: 5,
    review_text: 'Great experience with more than twenty characters here.',
    reviewer_name: null,
    status: ReviewStatus.PENDING,
    is_verified: false,
    created_at: new Date('2026-03-18T10:00:00.000Z'),
    updated_at: new Date('2026-03-18T10:00:00.000Z'),
  } as ProviderReview;

  const mockTravelerReview = {
    id: 'traveler-review-uuid',
    traveler_id: 'traveler-uuid',
    reviewer_id: 'reviewer-uuid',
    rating: 4,
    review_text: null,
    reviewer_name: null,
    status: ReviewStatus.PENDING,
    is_verified: false,
    created_at: new Date('2026-03-18T10:00:00.000Z'),
    updated_at: new Date('2026-03-18T10:00:00.000Z'),
  } as TravelerReview;

  beforeEach(async () => {
    const mockProviderRepo = {
      create: jest.fn().mockReturnValue(mockProviderReview),
      save: jest.fn().mockResolvedValue(mockProviderReview),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(),
    };
    const mockTravelerRepo = {
      create: jest.fn().mockReturnValue(mockTravelerReview),
      save: jest.fn().mockResolvedValue(mockTravelerReview),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(ProviderReview),
          useValue: mockProviderRepo,
        },
        {
          provide: getRepositoryToken(TravelerReview),
          useValue: mockTravelerRepo,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    providerReviewRepo = module.get(getRepositoryToken(ProviderReview));
    travelerReviewRepo = module.get(getRepositoryToken(TravelerReview));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a provider review when no existing review', async () => {
      (providerReviewRepo.findOne as jest.Mock).mockResolvedValue(null);
      const dto: CreateReviewDto = {
        subject_type: 'provider',
        subject_id: 'provider-uuid',
        rating: 5,
        review_text: 'Great experience with more than twenty characters here.',
      };

      const result = await service.create('reviewer-uuid', dto);

      expect(result).toEqual(mockProviderReview);
      expect(providerReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_id: dto.subject_id,
          reviewer_id: 'reviewer-uuid',
          rating: dto.rating,
          review_text: dto.review_text,
          status: ReviewStatus.PENDING,
        }),
      );
      expect(providerReviewRepo.save).toHaveBeenCalled();
      expect(travelerReviewRepo.create).not.toHaveBeenCalled();
    });

    it('should create a traveler review when subject_type is traveler', async () => {
      (travelerReviewRepo.findOne as jest.Mock).mockResolvedValue(null);
      const dto: CreateReviewDto = {
        subject_type: 'traveler',
        subject_id: 'traveler-uuid',
        rating: 4,
      };

      const result = await service.create('reviewer-uuid', dto);

      expect(result).toEqual(mockTravelerReview);
      expect(travelerReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          traveler_id: dto.subject_id,
          reviewer_id: 'reviewer-uuid',
          rating: dto.rating,
          status: ReviewStatus.PENDING,
        }),
      );
      expect(travelerReviewRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when reviewer already has a provider review', async () => {
      (providerReviewRepo.findOne as jest.Mock).mockResolvedValue(mockProviderReview);
      const dto: CreateReviewDto = {
        subject_type: 'provider',
        subject_id: 'provider-uuid',
        rating: 4,
      };

      await expect(service.create('reviewer-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(providerReviewRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getProviderReviews', () => {
    it('should include non-deleted reply data in the provider reviews response', async () => {
      const aggregateQb = createQbMock();
      aggregateQb.getRawOne.mockResolvedValue({
        average_rating: '4.5',
        total_reviews: '1',
      });

      const listQb = createQbMock();
      listQb.getRawMany.mockResolvedValue([
        {
          r_rating: 5,
          r_review_text: 'Excellent service and communication.',
          r_reviewer_name: 'Alice',
          r_is_verified: true,
          r_created_at: new Date('2026-03-18T10:00:00.000Z'),
          reply_reply_text: 'Thank you for your feedback and support.',
          reply_created_at: new Date('2026-03-18T12:00:00.000Z'),
          reply_updated_at: new Date('2026-03-18T12:00:00.000Z'),
        },
      ]);

      (providerReviewRepo.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(aggregateQb)
        .mockReturnValueOnce(listQb);

      const query: SubjectReviewsQueryDto = {
        sort: 'recent',
        limit: 10,
        offset: 0,
      };

      const result = await service.getProviderReviews('provider-uuid', query);

      expect(listQb.leftJoin).toHaveBeenCalled();
      expect(result).toEqual({
        average_rating: 4.5,
        total_reviews: 1,
        reviews: [
          {
            rating: 5,
            review_text: 'Excellent service and communication.',
            reviewer_name: 'Alice',
            is_verified: true,
            created_at: new Date('2026-03-18T10:00:00.000Z'),
            reply: {
              reply_text: 'Thank you for your feedback and support.',
              created_at: new Date('2026-03-18T12:00:00.000Z'),
              updated_at: new Date('2026-03-18T12:00:00.000Z'),
            },
          },
        ],
      });
    });
  });

  describe('getTravelerReviews', () => {
    it('should return traveler reviews without reply data', async () => {
      const aggregateQb = createQbMock();
      aggregateQb.getRawOne.mockResolvedValue({
        average_rating: null,
        total_reviews: '1',
      });

      const listQb = createQbMock();
      listQb.getRawMany.mockResolvedValue([
        {
          r_rating: 4,
          r_review_text: 'Good traveler overall.',
          r_reviewer_name: 'Bob',
          r_is_verified: false,
          r_created_at: new Date('2026-03-18T10:00:00.000Z'),
        },
      ]);

      (travelerReviewRepo.createQueryBuilder as jest.Mock).mockReturnValue(listQb);
      listQb.clone.mockReturnValue(aggregateQb);

      const query: SubjectReviewsQueryDto = {
        sort: 'recent',
        limit: 10,
        offset: 0,
      };

      const result = await service.getTravelerReviews('traveler-uuid', query);

      expect(listQb.leftJoin).not.toHaveBeenCalled();
      expect(result).toEqual({
        average_rating: null,
        total_reviews: 1,
        reviews: [
          {
            rating: 4,
            review_text: 'Good traveler overall.',
            reviewer_name: 'Bob',
            is_verified: false,
            created_at: new Date('2026-03-18T10:00:00.000Z'),
          },
        ],
      });
    });
  });
});
