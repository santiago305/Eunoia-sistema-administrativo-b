import { Type } from "class-transformer";
import {
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";

export class HttpUpdateItemDto {
  @IsOptional()
  @IsUUID()
  skuId?: string;

  @IsOptional()
  @IsUUID()
  stockItemId?: string;

  @IsOptional()
  @IsEnum(PurchaseItemType)
  itemType?: PurchaseItemType;

  @IsOptional()
  @IsUUID()
  internalMaterialId?: string;

  @IsOptional()
  @IsUUID()
  assetCategoryId?: string;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsBoolean()
  affectsStock?: boolean;

  @IsOptional()
  @IsBoolean()
  generatesAsset?: boolean;

  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @IsOptional()
  @IsBoolean()
  isSubscription?: boolean;

  @IsOptional()
  @IsUUID()
  poItemId?: string;

  @IsOptional()
  @IsUUID()
  poId?: string;

  @IsOptional()
  @IsString()
  unitBase?: string;

  @IsOptional()
  @IsString()
  equivalence?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  factor?: number;

  @IsOptional()
  @IsEnum(AfectIgvType)
  afectType?: AfectIgvType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  porcentageIgv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseWithoutIgv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountIgv?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitValue?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseValue?: number;
}
