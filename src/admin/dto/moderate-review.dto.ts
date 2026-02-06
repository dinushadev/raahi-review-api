import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ReviewStatus } from '../../database/entities/review-status.enum';

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus, description: 'New moderation status' })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiPropertyOptional({ description: 'Mark review as verified' })
  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;
}
