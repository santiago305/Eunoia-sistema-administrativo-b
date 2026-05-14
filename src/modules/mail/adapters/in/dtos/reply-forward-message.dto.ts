import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReplyForwardMessageDto {
  @IsOptional()
  @IsString()
  recipients?: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
