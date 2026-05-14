import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDraftDto {
  @IsOptional()
  @IsString()
  recipients?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsObject()
  bodyJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  originModule?: string;
}
