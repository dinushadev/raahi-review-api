import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { RepliesService } from './replies.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User, RequestUser } from '../common/decorators/user.decorator';

@ApiTags('review-replies')
@ApiBearerAuth()
@Controller('reviews/:reviewId/reply')
@UseGuards(AuthGuard, RolesGuard)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  // ── POST /reviews/:reviewId/reply ─────────────────────────────────────────

  @Post()
  @Roles('provider')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a reply to a review',
    description:
      'Allows the provider being reviewed to post a single reply. ' +
      'Only one active reply is permitted per review.',
  })
  @ApiParam({ name: 'reviewId', description: 'UUID of the review to reply to' })
  @ApiBody({ type: CreateReplyDto })
  @ApiResponse({ status: 201, description: 'Reply created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error (reply_text too short/long).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not the provider being reviewed.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 409, description: 'A reply already exists for this review.' })
  createReply(
    @Param('reviewId') reviewId: string,
    @User() user: RequestUser,
    @Body() dto: CreateReplyDto,
  ) {
    return this.repliesService.createReply(reviewId, user.id, dto);
  }

  // ── PUT /reviews/:reviewId/reply ──────────────────────────────────────────

  @Put()
  @Roles('provider')
  @ApiOperation({
    summary: 'Update an existing reply',
    description:
      'Allows the reply author to edit the reply within 48 hours of creation.',
  })
  @ApiParam({ name: 'reviewId', description: 'UUID of the review' })
  @ApiBody({ type: UpdateReplyDto })
  @ApiResponse({ status: 200, description: 'Reply updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not the reply author.' })
  @ApiResponse({ status: 404, description: 'Review or reply not found.' })
  @ApiResponse({ status: 410, description: '48-hour edit window has expired.' })
  updateReply(
    @Param('reviewId') reviewId: string,
    @User() user: RequestUser,
    @Body() dto: UpdateReplyDto,
  ) {
    return this.repliesService.updateReply(reviewId, user.id, dto);
  }

  // ── DELETE /reviews/:reviewId/reply ───────────────────────────────────────

  @Delete()
  @Roles('provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a reply (soft delete)',
    description: 'Marks the reply as deleted. The row is retained in the database.',
  })
  @ApiParam({ name: 'reviewId', description: 'UUID of the review' })
  @ApiResponse({ status: 204, description: 'Reply deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not the reply author.' })
  @ApiResponse({ status: 404, description: 'Review or reply not found.' })
  async deleteReply(
    @Param('reviewId') reviewId: string,
    @User() user: RequestUser,
  ) {
    await this.repliesService.deleteReply(reviewId, user.id);
  }
}