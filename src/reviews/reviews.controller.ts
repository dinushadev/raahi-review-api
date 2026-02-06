import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SubjectReviewsQueryDto } from './dto/subject-reviews-query.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { User, RequestUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @UseGuards(RolesGuard)
  @Roles('traveler', 'provider')
  create(@User() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Put('reviews/:review_id')
  @UseGuards(RolesGuard)
  @Roles('traveler', 'provider')
  update(
    @Param('review_id') reviewId: string,
    @User() user: RequestUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(reviewId, user.id, dto);
  }

  @Delete('reviews/:review_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('traveler', 'provider')
  async deleteOwn(
    @Param('review_id') reviewId: string,
    @User() user: RequestUser,
  ) {
    await this.reviewsService.deleteOwnReview(reviewId, user.id);
  }

  @Get('providers/:provider_id/reviews')
  getProviderReviews(
    @Param('provider_id') providerId: string,
    @Query() query: SubjectReviewsQueryDto,
  ) {
    return this.reviewsService.getProviderReviews(providerId, query ?? {});
  }

  @Get('travelers/:traveler_id/reviews')
  getTravelerReviews(
    @Param('traveler_id') travelerId: string,
    @Query() query: SubjectReviewsQueryDto,
  ) {
    return this.reviewsService.getTravelerReviews(travelerId, query ?? {});
  }
}
