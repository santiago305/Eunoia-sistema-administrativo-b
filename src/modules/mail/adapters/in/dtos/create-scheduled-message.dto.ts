import { IsArray, IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateScheduledMessageDto {
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
  @IsString()
  recipients?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsObject()
  bodyJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  originModule?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

