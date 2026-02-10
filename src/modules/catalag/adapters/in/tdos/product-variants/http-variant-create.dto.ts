import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

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