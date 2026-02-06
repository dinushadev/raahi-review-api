import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: 'Rating 1-5', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ description: 'Review text (20-500 chars)', minLength: 20, maxLength: 500 })
  @IsOptional()
  @Length(20, 500, {
    message: 'review_text must be between 20 and 500 characters when provided',
  })
  review_text?: string;

  @ApiPropertyOptional({ description: 'Display name of the reviewer', maxLength: 255 })
  @IsOptional()
  @Length(0, 255, {
    message: 'reviewer_name must be at most 255 characters',
  })
  reviewer_name?: string;
}
