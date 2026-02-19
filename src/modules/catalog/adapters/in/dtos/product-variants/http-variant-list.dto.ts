import { Type } from 'class-transformer';
import { IsUUID, IsNotEmpty, IsOptional, IsBooleanString, IsString, IsInt, Max, Min } from 'class-validator';

export class ListProductVariantsQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsOptional()
  @IsString()
  q?:string;
  
  @IsOptional()
  @IsString()
  type?:string;

  @IsOptional()
  @IsString()
  productName?:string;

  @IsOptional()
  @IsString()
  productDescription?:string;
  
  @IsOptional()
  @IsString()
  sku?:string;
  
  @IsOptional()
  @IsString()
  barcode?:string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

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
