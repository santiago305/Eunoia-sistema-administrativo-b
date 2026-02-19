import { IsOptional, IsString, IsEnum } from "class-validator";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export class HttpUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
