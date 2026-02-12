import { IsOptional, IsBooleanString, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProductQueryDto {
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

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?:string;
  

  @IsOptional()
  name?: string;

  @IsOptional()
  description?: string;
}
