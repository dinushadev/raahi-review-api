import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @ApiProperty({
    description: 'Reply text from the provider (20–1000 characters)',
    minLength: 20,
    maxLength: 1000,
    example: 'Thank you for the kind feedback! We look forward to welcoming you again.',
  })
  @IsString()
  @MinLength(20, { message: 'reply_text must be at least 20 characters' })
  @MaxLength(1000, { message: 'reply_text must be at most 1000 characters' })
  reply_text: string;
}