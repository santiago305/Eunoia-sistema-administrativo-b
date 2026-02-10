import { IsUUID, IsNotEmpty, IsOptional, IsBooleanString } from 'class-validator';

export class ListProductVariantsQueryDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  sku?: string;

  @IsOptional()
  barcode?: string;
}
