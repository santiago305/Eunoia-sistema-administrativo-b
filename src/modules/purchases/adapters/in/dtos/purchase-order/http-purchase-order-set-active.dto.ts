import { IsBoolean } from "class-validator";

export class HttpSetPurchaseOrderActiveDto {
  @IsBoolean()
  isActive: boolean;
}
