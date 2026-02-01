import { IsInt, Min, Max, IsOptional, IsUUID, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsUUID()
  provider_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @Length(20, 500, {
    message: 'review_text must be between 20 and 500 characters when provided',
  })
  review_text?: string;
}
