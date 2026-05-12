import { IsOptional, IsString } from 'class-validator';

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  recipients?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;
}
