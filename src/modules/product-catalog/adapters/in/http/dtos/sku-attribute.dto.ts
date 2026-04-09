import { IsOptional, IsString, MaxLength } from "class-validator";

export class ProductCatalogSkuAttributeDto {
  @IsString()
  @MaxLength(80)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsString()
  @MaxLength(255)
  value: string;
}
