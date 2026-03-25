import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GetStockQueryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
