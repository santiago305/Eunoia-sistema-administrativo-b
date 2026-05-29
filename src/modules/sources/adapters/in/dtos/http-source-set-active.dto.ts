import { IsBoolean } from "class-validator";

export class HttpSetSourceActiveDto {
  @IsBoolean()
  isActive: boolean;
}

