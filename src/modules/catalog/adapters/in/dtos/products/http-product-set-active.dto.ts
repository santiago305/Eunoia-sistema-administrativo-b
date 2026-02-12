import { IsBoolean } from "class-validator";

export class HttpSetProductActiveDto {
  @IsBoolean()
  isActive: boolean;
}
