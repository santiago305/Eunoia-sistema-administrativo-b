import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class TransferBetweenWarehousesItemDto {
  @IsUUID()
  skuId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number | null;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;
}

export class TransferBetweenWarehousesDto {
  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsUUID()
  serieId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferBetweenWarehousesItemDto)
  items: TransferBetweenWarehousesItemDto[];
}

