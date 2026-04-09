import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProductCatalogPublicationDto {
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsNumber()
  priceOverride?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayNameOverride?: string | null;
}
