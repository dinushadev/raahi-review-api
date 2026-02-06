import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';

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
    created_at: new Date(),
    updated_at: new Date(),
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
    created_at: new Date(),
    updated_at: new Date(),
  } as TravelerReview;

  beforeEach(async () => {
    const mockProviderRepo = {
      create: jest.fn().mockReturnValue(mockProviderReview),
      save: jest.fn().mockResolvedValue(mockProviderReview),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: '4.5', total_reviews: '10' }),
      })),
    };
    const mockTravelerRepo = {
      create: jest.fn().mockReturnValue(mockTravelerReview),
      save: jest.fn().mockResolvedValue(mockTravelerReview),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: null, total_reviews: '0' }),
      })),
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
    it('should return aggregate and empty list when no reviews', async () => {
      (providerReviewRepo.find as jest.Mock).mockResolvedValue([]);
      (providerReviewRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: null, total_reviews: '0' }),
      });
      const query: SubjectReviewsQueryDto = { sort: 'recent', limit: 10, offset: 0 };
      const result = await service.getProviderReviews('provider-uuid', query);
      expect(result.total_reviews).toBe(0);
      expect(result.average_rating).toBeNull();
      expect(result.reviews).toEqual([]);
    });
  });

  describe('getTravelerReviews', () => {
    it('should return aggregate and list from traveler_reviews', async () => {
      (travelerReviewRepo.find as jest.Mock).mockResolvedValue([]);
      (travelerReviewRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: null, total_reviews: '0' }),
      });
      const query: SubjectReviewsQueryDto = { sort: 'recent', limit: 10, offset: 0 };
      const result = await service.getTravelerReviews('traveler-uuid', query);
      expect(result.total_reviews).toBe(0);
      expect(result.reviews).toEqual([]);
    });
  });
});
