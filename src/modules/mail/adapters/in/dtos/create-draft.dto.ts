import { IsOptional, IsString } from 'class-validator';

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
  @IsString()
  originModule?: string;
}
