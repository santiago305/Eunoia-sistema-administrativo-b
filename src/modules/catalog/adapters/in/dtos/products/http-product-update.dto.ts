import { IsOptional, IsString, IsEnum, IsUUID } from "class-validator";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export class HttpUpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
