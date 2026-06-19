import { IsBooleanString, IsOptional, IsUUID } from "class-validator";

export class ListInventoryAlertSettingsDto {
  @IsOptional()
  @IsUUID()
  stockItemId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsBooleanString()
  includeDefaults?: string;
}
