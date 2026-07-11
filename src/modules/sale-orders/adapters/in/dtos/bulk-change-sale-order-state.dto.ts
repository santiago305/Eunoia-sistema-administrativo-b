import { ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class BulkChangeSaleOrderStateDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  saleOrderIds: string[];

  @IsUUID()
  targetStateId: string;
}
