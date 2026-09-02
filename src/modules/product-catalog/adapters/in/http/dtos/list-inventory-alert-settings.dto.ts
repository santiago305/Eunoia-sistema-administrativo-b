import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBooleanString,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

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

export class EvaluateInventoryAlertTargetDto {
  @IsUUID()
  stockItemId: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;
}

export class EvaluateInventoryAlertsBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EvaluateInventoryAlertTargetDto)
  items: EvaluateInventoryAlertTargetDto[];
}
