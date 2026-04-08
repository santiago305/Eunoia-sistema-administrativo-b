import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HttpUpdateCatalogPublicationDto {
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number | null;

  @IsOptional()
  @IsString()
  displayNameOverride?: string | null;
}
