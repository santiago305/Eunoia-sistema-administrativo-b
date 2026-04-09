import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class UpdateProductCatalogProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @IsOptional()
  @IsUUID()
  baseUnitId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
