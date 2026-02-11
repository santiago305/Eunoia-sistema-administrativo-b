import { IsOptional, IsUUID } from 'class-validator';

export class ListInventoryQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;
}
