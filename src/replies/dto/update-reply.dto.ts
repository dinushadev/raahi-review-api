import { IsString, Length } from 'class-validator';

export class UpdateReplyDto {
  @IsString()
  @Length(20, 1000)
  reply_text: string;
}