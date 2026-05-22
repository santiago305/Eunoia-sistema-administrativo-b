import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateMailStorageQuotaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  mailStorageQuotaGb: number;
}
