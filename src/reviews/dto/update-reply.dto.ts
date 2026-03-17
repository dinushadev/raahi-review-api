import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateReplyDto {
  @ApiProperty({
    description: 'Updated reply text (20–1000 characters)',
    minLength: 20,
    maxLength: 1000,
    example: 'We appreciate your feedback and hope to serve you better next time.',
  })
  @IsString()
  @MinLength(20, { message: 'reply_text must be at least 20 characters' })
  @MaxLength(1000, { message: 'reply_text must be at most 1000 characters' })
  reply_text: string;
}