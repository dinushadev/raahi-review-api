import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RepliesService } from './replies.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';

import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api')
@UseGuards(AuthGuard)
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  // 🔹 CREATE REPLY
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

  // 🔹 UPDATE REPLY
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

  // 🔹 DELETE REPLY
  @Delete('replies/:reply_id')
  @Roles('provider')
  async deleteReply(
    @Param('reply_id') replyId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    return this.repliesService.deleteReply(replyId, userId);
  }
}