import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendDraftDto {
  @IsString()
  @IsNotEmpty()
  recipients: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds?: string[];
}
