import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { RepliesService } from './replies.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';

import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

// Handles provider reply endpoints for reviews.
// AuthGuard checks that a user exists on the request.
// RolesGuard + @Roles('provider') restrict these routes to providers only.
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  // Create a reply for a specific review.
  // Only the provider who was reviewed is allowed to do this.
  @Post('reviews/:review_id/reply')
  @Roles('provider')
  async createReply(
    @Param('review_id') reviewId: string,
    @Body() dto: CreateReplyDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    return this.repliesService.createReply(
      reviewId,
      userId,
      dto.reply_text,
    );
  }

  // Update an existing reply.
  // The service checks ownership and the 48-hour edit window.
  @Put('replies/:reply_id')
  @Roles('provider')
  async updateReply(
    @Param('reply_id') replyId: string,
    @Body() dto: UpdateReplyDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    return this.repliesService.updateReply(
      replyId,
      userId,
      dto.reply_text,
    );
  }

  // Soft-delete a reply.
  // Returns 204 so the API sends no response body on success.
  @Delete('replies/:reply_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('provider')
  async deleteReply(
    @Param('reply_id') replyId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    await this.repliesService.deleteReply(replyId, userId);
  }
}
