import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsUUID, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewByBookingDto {
  @ApiPropertyOptional({ description: 'UUID of the booking/order this review is associated with' })
  @IsOptional()
  @IsUUID()
  booking_id?: string;

  @ApiProperty({ description: 'Rating 1-5', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ description: 'Review text (max 10 chars)', maxLength: 10 })
  @IsOptional()
  @Length(0, 10, {
    message: 'review_text must be at most 10 characters when provided',
  })
  review_text?: string;

  @ApiPropertyOptional({ description: 'Display name of the reviewer', maxLength: 255 })
  @IsOptional()
  @Length(0, 255, {
    message: 'reviewer_name must be at most 255 characters',
  })
  reviewer_name?: string;
}
