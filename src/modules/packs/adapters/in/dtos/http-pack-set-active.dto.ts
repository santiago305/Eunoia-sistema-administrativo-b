import { IsBoolean } from "class-validator";

export class HttpSetPackActiveDto {
  @IsBoolean()
  isActive: boolean;
}

