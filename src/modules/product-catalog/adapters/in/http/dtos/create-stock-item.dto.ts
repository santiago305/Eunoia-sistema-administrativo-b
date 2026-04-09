import { IsBoolean, IsOptional } from "class-validator";

export class CreateProductCatalogStockItemDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
