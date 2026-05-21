import { IsBoolean } from "class-validator";

export class HttpSetClientActiveDto {
  @IsBoolean()
  isActive: boolean;
}

