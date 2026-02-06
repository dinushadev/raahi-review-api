import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsUUID, Length, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ enum: ['provider', 'traveler'], description: 'Type of subject being reviewed' })
  @IsIn(['provider', 'traveler'])
  subject_type: 'provider' | 'traveler';

  @ApiProperty({ description: 'UUID of the provider or traveler being reviewed', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  subject_id: string;

  @ApiProperty({ description: 'Rating 1-5', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

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
