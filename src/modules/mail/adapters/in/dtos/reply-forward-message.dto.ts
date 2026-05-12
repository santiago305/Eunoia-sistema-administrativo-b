import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReplyForwardMessageDto {
  @IsOptional()
  @IsString()
  recipients?: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;
}
