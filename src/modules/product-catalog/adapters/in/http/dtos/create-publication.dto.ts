import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateProductCatalogPublicationDto {
  @IsString()
  @MaxLength(80)
  channelCode: string;

  @IsUUID()
  skuId: string;

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
