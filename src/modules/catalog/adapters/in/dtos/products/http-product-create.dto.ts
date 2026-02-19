import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export class HttpCreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
