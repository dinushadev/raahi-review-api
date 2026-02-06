import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminReviewsService } from './admin-reviews.service';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminReviewsController {
  constructor(private readonly adminReviewsService: AdminReviewsService) {}

  @Patch('reviews/:review_id')
  moderateReview(
    @Param('review_id') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminReviewsService.moderateReview(reviewId, dto);
  }

  @Get('reviews')
  listReviews(@Query() query: AdminReviewsQueryDto) {
    return this.adminReviewsService.listReviews(query);
  }
}
