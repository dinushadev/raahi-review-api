import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ReviewStatus } from '../../database/entities/review.entity';

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;
}
