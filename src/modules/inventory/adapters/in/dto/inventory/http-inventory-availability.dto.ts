import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  stockItemId: string;
  
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

