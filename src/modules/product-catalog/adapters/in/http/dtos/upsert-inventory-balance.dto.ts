import { IsNumber, IsOptional, IsUUID } from "class-validator";

export class UpsertProductCatalogInventoryBalanceDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsNumber()
  onHand: number;

  @IsOptional()
  @IsNumber()
  reserved?: number;
}
