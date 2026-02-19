import { IsInt, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class HttpAddProductionOrderItemDto {
  @IsUUID()
  finishedVariantId: string;

  @IsUUID()
  fromLocationId: string;

  @IsUUID()
  toLocationId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost: number;
}
