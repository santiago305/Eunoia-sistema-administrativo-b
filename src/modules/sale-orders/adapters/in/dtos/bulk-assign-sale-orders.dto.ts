import { ArrayMinSize, IsArray, IsOptional, IsUUID } from "class-validator";

export class BulkAssignSaleOrdersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  saleOrderIds: string[];

  @IsOptional()
  @IsUUID()
  assignedBy?: string | null;
}
