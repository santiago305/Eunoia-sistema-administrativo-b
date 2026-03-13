import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class HttpAddProductionOrderItemDto {
  @IsUUID()
  finishedItemId: string;

  @IsOptional()
  @IsUUID()
  fromLocationId: string | null;

  @IsOptional()
  @IsUUID()
  toLocationId: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost: number;

  @IsString()
  @IsOptional()
  type?:string;
}
