import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsIn(['inbox', 'sent', 'scheduled', 'trash', 'starred', 'archived', 'snoozed', 'drafts', 'all'])
  view?: 'inbox' | 'sent' | 'scheduled' | 'trash' | 'starred' | 'archived' | 'snoozed' | 'drafts' | 'all';

  @IsOptional()
  @IsString()
  originModule?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasAttachments?: boolean;

  @IsOptional()
  @IsString()
  labelId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
