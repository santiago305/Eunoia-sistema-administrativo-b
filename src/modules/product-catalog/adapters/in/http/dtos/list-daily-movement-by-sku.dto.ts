import { IsOptional, IsString, IsUUID } from "class-validator";

export class ListDailyMovementBySkuDto {
  @IsUUID()
  skuId!: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsString()
  from!: string;

  @IsString()
  to!: string;
}

