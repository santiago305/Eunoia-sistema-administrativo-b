import { IsBoolean } from "class-validator";

export class HttpSetSupplierActiveDto {
  @IsBoolean()
  isActive: boolean;
}
