import { IsString, Length } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @Length(20, 1000)
  reply_text: string;
}