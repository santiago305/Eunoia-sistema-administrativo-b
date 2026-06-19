import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class UpdateInventoryAlertSettingDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockAlertQty?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  alertThresholdDays?: number;

  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;
}
