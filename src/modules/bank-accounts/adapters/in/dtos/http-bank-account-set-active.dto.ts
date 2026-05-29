import { IsBoolean } from "class-validator";

export class HttpBankAccountSetActiveDto {
  @IsBoolean()
  isActive: boolean;
}

