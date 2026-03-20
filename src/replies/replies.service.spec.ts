import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { RepliesService } from './replies.service';
import { ReviewReply } from '../database/entities/review-reply.entity';
import { ProviderReview } from '../database/entities/provider-review.entity';

describe('RepliesService', () => {
  let service: RepliesService;
  let replyRepo: jest.Mocked<Repository<ReviewReply>>;
  let reviewRepo: jest.Mocked<Repository<ProviderReview>>;

  const review = {
    id: 'review-uuid',
    provider_id: 'provider-uuid',
  } as ProviderReview;

  const reply = {
    id: 'reply-uuid',
    review_id: 'review-uuid',
    provider_id: 'provider-uuid',
    reply_text: 'Thank you for your detailed feedback.',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as ReviewReply;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepliesService,
        {
          provide: getRepositoryToken(ReviewReply),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProviderReview),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RepliesService>(RepliesService);
    replyRepo = module.get(getRepositoryToken(ReviewReply));
    reviewRepo = module.get(getRepositoryToken(ProviderReview));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReply', () => {
    it('should create a reply for the reviewed provider', async () => {
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(review);
      (replyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (replyRepo.save as jest.Mock).mockResolvedValue(reply);

      const result = await service.createReply(
        'review-uuid',
        'provider-uuid',
        'Thank you for your detailed feedback.',
      );

      expect(replyRepo.create).toHaveBeenCalledWith({
        review_id: 'review-uuid',
        provider_id: 'provider-uuid',
        reply_text: 'Thank you for your detailed feedback.',
      });
      expect(result).toEqual(reply);
    });

    it('should throw NotFoundException when the review does not exist', async () => {
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReply(
          'missing-review',
          'provider-uuid',
          'Thank you for your detailed feedback.',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when another provider tries to reply', async () => {
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(review);

      await expect(
        service.createReply(
          'review-uuid',
          'other-provider',
          'Thank you for your detailed feedback.',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when a reply already exists', async () => {
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(review);
      (replyRepo.findOne as jest.Mock).mockResolvedValue(reply);

      await expect(
        service.createReply(
          'review-uuid',
          'provider-uuid',
          'Thank you for your detailed feedback.',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateReply', () => {
    it('should update the reply within 48 hours', async () => {
      const recentReply = {
        ...reply,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      } as ReviewReply;
      (replyRepo.findOne as jest.Mock).mockResolvedValue(recentReply);
      (replyRepo.save as jest.Mock).mockResolvedValue({
        ...recentReply,
        reply_text: 'Updated reply text with enough characters.',
      });

      const result = await service.updateReply(
        'reply-uuid',
        'provider-uuid',
        'Updated reply text with enough characters.',
      );

      expect(result.reply_text).toBe('Updated reply text with enough characters.');
    });

    it('should throw GoneException when the edit window has expired', async () => {
      const oldReply = {
        ...reply,
        created_at: new Date(Date.now() - 49 * 60 * 60 * 1000),
      } as ReviewReply;
      (replyRepo.findOne as jest.Mock).mockResolvedValue(oldReply);

      await expect(
        service.updateReply(
          'reply-uuid',
          'provider-uuid',
          'Updated reply text with enough characters.',
        ),
      ).rejects.toThrow(GoneException);
    });
  });

  describe('deleteReply', () => {
    it('should soft-delete the reply owned by the provider', async () => {
      const activeReply = {
        ...reply,
        deleted_at: null,
      } as ReviewReply;
      (replyRepo.findOne as jest.Mock).mockResolvedValue(activeReply);
      (replyRepo.save as jest.Mock).mockResolvedValue(undefined);

      await service.deleteReply('reply-uuid', 'provider-uuid');

      expect(replyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(Date),
        }),
      );
    });

    it('should throw ForbiddenException when another provider tries to delete', async () => {
      (replyRepo.findOne as jest.Mock).mockResolvedValue(reply);

      await expect(
        service.deleteReply('reply-uuid', 'other-provider'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
