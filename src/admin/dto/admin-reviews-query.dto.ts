import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../../database/entities/review-status.enum';

export class AdminReviewsQueryDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: 'Filter by provider UUID' })
  @IsOptional()
  @IsUUID()
  provider_id?: string;

  @ApiPropertyOptional({ description: 'Filter by traveler UUID' })
  @IsOptional()
  @IsUUID()
  traveler_id?: string;

  @ApiPropertyOptional({ description: 'Filter by reviewer UUID' })
  @IsOptional()
  @IsUUID()
  reviewer_id?: string;

  @ApiPropertyOptional({ enum: ['provider', 'traveler', 'all'], description: 'Scope which table(s) to list' })
  @IsOptional()
  @IsIn(['provider', 'traveler', 'all'])
  type?: 'provider' | 'traveler' | 'all' = 'all';

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
