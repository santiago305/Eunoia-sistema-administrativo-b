import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendDraftDto {
  @IsString()
  @IsNotEmpty()
  recipients: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
