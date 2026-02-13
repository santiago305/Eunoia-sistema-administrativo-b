import { IsBoolean } from "class-validator";

export class HttpSetWarehouseActiveDto {
  @IsBoolean()
  isActive: boolean;
}
