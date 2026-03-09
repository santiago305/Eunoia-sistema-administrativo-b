import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualBanDto {
  @IsString()
  @MaxLength(64)
  ip: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

