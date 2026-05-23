import { IsBoolean } from "class-validator";

export class HttpSetAgencyActiveDto {
  @IsBoolean()
  isActive: boolean;
}

