import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  stockItemId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

