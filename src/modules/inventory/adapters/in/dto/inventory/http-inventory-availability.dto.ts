import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
