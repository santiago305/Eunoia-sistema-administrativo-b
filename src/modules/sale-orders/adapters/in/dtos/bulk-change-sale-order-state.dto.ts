import { ArrayMinSize, IsArray, IsObject, IsOptional, IsUUID } from "class-validator";

export class BulkChangeSaleOrderStateDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  saleOrderIds: string[];

  @IsUUID()
  transitionId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
