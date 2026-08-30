import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Matches, ValidateNested } from "class-validator";

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

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "scheduledDepartureDate debe tener formato YYYY-MM-DD" })
  scheduledDepartureDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "expectedArrivalDate debe tener formato YYYY-MM-DD" })
  expectedArrivalDate: string;

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

