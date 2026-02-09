import { IsBoolean, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class HttpCreateProductVariantDto {
  @IsString()
  productId: string;

  @IsString()
  barcode: string;

  @IsString()
  attributes: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class HttpUpdateProductVariantDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  attributes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}

export class HttpSetProductVariantActiveDto {
  @IsBoolean()
  isActive: boolean;
}
