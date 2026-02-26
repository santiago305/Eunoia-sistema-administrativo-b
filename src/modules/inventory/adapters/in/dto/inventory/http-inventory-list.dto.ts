import { IsOptional, IsUUID } from 'class-validator';

export class ListInventoryQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  stockItemId?: string;
  
  @IsOptional()
  @IsUUID()
  locationId?: string;
}

