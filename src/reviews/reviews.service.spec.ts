import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from '../database/entities/review.entity';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ProviderReviewsQueryDto } from './dto/provider-reviews-query.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let repo: jest.Mocked<Repository<Review>>;

  const mockReview = {
    id: 'review-uuid',
    provider_id: 'provider-uuid',
    traveler_id: 'traveler-uuid',
    rating: 5,
    review_text: 'Great experience with more than twenty characters here.',
    status: ReviewStatus.PENDING,
    is_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as Review;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockReturnValue(mockReview),
      save: jest.fn().mockResolvedValue(mockReview),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: '4.5', total_reviews: '10' }),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    repo = module.get(getRepositoryToken(Review));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a review when traveler has no existing review', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      const dto: CreateReviewDto = {
        provider_id: 'provider-uuid',
        rating: 5,
        review_text: 'Great experience with more than twenty characters here.',
      };
      const result = await service.create('traveler-uuid', dto);
      expect(result).toEqual(mockReview);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_id: dto.provider_id,
          traveler_id: 'traveler-uuid',
          rating: dto.rating,
          review_text: dto.review_text,
          status: ReviewStatus.PENDING,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when traveler already has a review', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockReview);
      const dto: CreateReviewDto = {
        provider_id: 'provider-uuid',
        rating: 4,
      };
      await expect(service.create('traveler-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('getProviderReviews', () => {
    it('should return aggregate and empty list when no reviews', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: null, total_reviews: '0' }),
      };
      (repo.find as jest.Mock).mockResolvedValue([]);
      (repo.createQueryBuilder as jest.Mock).mockReturnValueOnce(qb).mockReturnValueOnce({
        ...qb,
        getRawOne: jest.fn().mockResolvedValue({ average_rating: null, total_reviews: '0' }),
      });
      const query: ProviderReviewsQueryDto = { sort: 'recent', limit: 10, offset: 0 };
      const result = await service.getProviderReviews('provider-uuid', query);
      expect(result.total_reviews).toBe(0);
      expect(result.average_rating).toBeNull();
      expect(result.reviews).toEqual([]);
    });
  });
});
