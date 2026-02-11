import { IsNotEmpty, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsUUID()
  @IsNotEmpty()
  variantId: string;
}
