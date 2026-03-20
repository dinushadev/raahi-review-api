import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateReplyDto {
  @ApiProperty({
    description: 'Reply text',
    minLength: 20,
    maxLength: 1000,
    example: 'Thank you for your feedback. We appreciate your comments.',
  })
  @IsString()
  @Length(20, 1000, {
    message: 'reply_text must be between 20 and 1000 characters',
  })
  reply_text: string;
}
