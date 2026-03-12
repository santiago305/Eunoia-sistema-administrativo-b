import { IsBoolean } from "class-validator";

export class HttpPaymentMethodSetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
