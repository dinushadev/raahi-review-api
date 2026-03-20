import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProviderReview } from '../database/entities/provider-review.entity';
import { ProviderReviewReply } from '../database/entities/provider-review-reply.entity';
import { ReviewReplyStatus } from '../database/entities/review-reply-status.enum';
import { TravelerReview } from '../database/entities/traveler-review.entity';
import { ReviewStatus } from '../database/entities/review-status.enum';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let providerReviewRepo: jest.Mocked<Repository<ProviderReview>>;
  let providerReviewReplyRepo: jest.Mocked<Repository<ProviderReviewReply>>;
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

  const mockReply = {
    id: 'reply-uuid',
    review_id: 'review-uuid',
    provider_id: 'provider-uuid',
    reply_text: 'Thank you for your feedback.',
    status: ReviewReplyStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as ProviderReviewReply;

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
    const mockProviderReplyRepo = {
      create: jest.fn().mockReturnValue(mockReply),
      save: jest.fn().mockResolvedValue(mockReply),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
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
          provide: getRepositoryToken(ProviderReviewReply),
          useValue: mockProviderReplyRepo,
        },
        {
          provide: getRepositoryToken(TravelerReview),
          useValue: mockTravelerRepo,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    providerReviewRepo = module.get(getRepositoryToken(ProviderReview));
    providerReviewReplyRepo = module.get(getRepositoryToken(ProviderReviewReply));
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

    it('should include active reply as nested object', async () => {
      const approvedReview = {
        ...mockProviderReview,
        status: ReviewStatus.APPROVED,
      } as ProviderReview;
      (providerReviewRepo.find as jest.Mock).mockResolvedValue([approvedReview]);
      (providerReviewReplyRepo.find as jest.Mock).mockResolvedValue([mockReply]);
      (providerReviewRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: '5', total_reviews: '1' }),
      });

      const query: SubjectReviewsQueryDto = { sort: 'recent', limit: 10, offset: 0 };
      const result = await service.getProviderReviews('provider-uuid', query);

      expect(result.reviews).toEqual([
        {
          id: approvedReview.id,
          rating: approvedReview.rating,
          review_text: approvedReview.review_text,
          reviewer_name: approvedReview.reviewer_name,
          is_verified: approvedReview.is_verified,
          created_at: approvedReview.created_at,
          reply: {
            reply_text: mockReply.reply_text,
            created_at: mockReply.created_at,
            updated_at: mockReply.updated_at,
          },
        },
      ]);
    });

    it('should return reply as null when no active reply exists', async () => {
      const approvedReview = {
        ...mockProviderReview,
        status: ReviewStatus.APPROVED,
      } as ProviderReview;
      (providerReviewRepo.find as jest.Mock).mockResolvedValue([approvedReview]);
      (providerReviewReplyRepo.find as jest.Mock).mockResolvedValue([]);
      (providerReviewRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average_rating: '5', total_reviews: '1' }),
      });

      const query: SubjectReviewsQueryDto = { sort: 'recent', limit: 10, offset: 0 };
      const result = await service.getProviderReviews('provider-uuid', query);

      expect(result.reviews[0].reply).toBeNull();
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

  describe('reply lifecycle', () => {
    it('should create a reply for a provider review', async () => {
      (providerReviewRepo.findOne as jest.Mock).mockResolvedValue(mockProviderReview);
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(null);
      const dto: CreateReplyDto = {
        reply_text: 'Thank you for your detailed feedback.',
      };

      const result = await service.createReply('provider-uuid', 'review-uuid', dto);

      expect(result).toEqual(mockReply);
      expect(providerReviewReplyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          review_id: 'review-uuid',
          provider_id: 'provider-uuid',
          reply_text: dto.reply_text,
          status: ReviewReplyStatus.ACTIVE,
        }),
      );
    });

    it('should reject duplicate reply creation', async () => {
      (providerReviewRepo.findOne as jest.Mock).mockResolvedValue(mockProviderReview);
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(mockReply);

      await expect(
        service.createReply('provider-uuid', 'review-uuid', {
          reply_text: 'Thank you for your detailed feedback.',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject reply creation by wrong provider', async () => {
      (providerReviewRepo.findOne as jest.Mock).mockResolvedValue(mockProviderReview);

      await expect(
        service.createReply('other-provider', 'review-uuid', {
          reply_text: 'Thank you for your detailed feedback.',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update a reply within 48 hours', async () => {
      const recentReply = {
        ...mockReply,
        created_at: new Date(Date.now() - 47 * 60 * 60 * 1000),
      } as ProviderReviewReply;
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(recentReply);
      (providerReviewReplyRepo.save as jest.Mock).mockResolvedValue({
        ...recentReply,
        reply_text: 'Updated reply text for this review.',
      });
      const dto: UpdateReplyDto = {
        reply_text: 'Updated reply text for this review.',
      };

      const result = await service.updateReply('provider-uuid', 'review-uuid', dto);

      expect(result.reply_text).toBe(dto.reply_text);
      expect(providerReviewReplyRepo.save).toHaveBeenCalled();
    });

    it('should reject reply update after 48 hours', async () => {
      const oldReply = {
        ...mockReply,
        created_at: new Date(Date.now() - 49 * 60 * 60 * 1000),
      } as ProviderReviewReply;
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(oldReply);

      await expect(
        service.updateReply('provider-uuid', 'review-uuid', {
          reply_text: 'Updated reply text for this review.',
        }),
      ).rejects.toThrow(GoneException);
    });

    it('should soft-delete a reply', async () => {
      const activeReply = {
        ...mockReply,
        status: ReviewReplyStatus.ACTIVE,
      } as ProviderReviewReply;
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(activeReply);

      await service.deleteReply('provider-uuid', 'review-uuid');

      expect(providerReviewReplyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewReplyStatus.DELETED,
        }),
      );
    });

    it('should reject deleting a reply by wrong provider', async () => {
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue(mockReply);

      await expect(
        service.deleteReply('other-provider', 'review-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should treat deleted reply as not found on update', async () => {
      (providerReviewReplyRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockReply,
        status: ReviewReplyStatus.DELETED,
      } as ProviderReviewReply);

      await expect(
        service.updateReply('provider-uuid', 'review-uuid', {
          reply_text: 'Updated reply text for this review.',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
