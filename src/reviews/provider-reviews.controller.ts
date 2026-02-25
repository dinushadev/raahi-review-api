import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewByBookingDto } from './dto/create-review-by-booking.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { User, RequestUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('provider')
@Controller('provider')
export class ProviderReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':provider_id/reviews')
  getProviderReviews(
    @Param('provider_id') providerId: string,
    @Query() query: SubjectReviewsQueryDto,
  ) {
    return this.reviewsService.getProviderReviews(providerId, query ?? {});
  }

  @Post('travelers/:traveler_id/reviews')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('provider')
  create(
    @Param('traveler_id') travelerId: string,
    @User() user: RequestUser,
    @Body() dto: CreateReviewByBookingDto,
  ) {
    return this.reviewsService.create(user.id, {
      subject_type: 'traveler',
      subject_id: travelerId,
      booking_id: dto.booking_id,
      rating: dto.rating,
      review_text: dto.review_text,
      reviewer_name: dto.reviewer_name,
    });
  }

  @Put('travelers/:traveler_id/reviews/:review_id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('provider')
  update(
    @Param('traveler_id') _travelerId: string,
    @Param('review_id') reviewId: string,
    @User() user: RequestUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(reviewId, user.id, dto);
  }

  @Delete('travelers/:traveler_id/reviews/:review_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('provider')
  async deleteOwn(
    @Param('traveler_id') _travelerId: string,
    @Param('review_id') reviewId: string,
    @User() user: RequestUser,
  ) {
    await this.reviewsService.deleteOwnReview(reviewId, user.id);
  }
}
