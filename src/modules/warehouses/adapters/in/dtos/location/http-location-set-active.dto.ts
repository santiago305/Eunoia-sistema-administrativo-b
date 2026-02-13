import { IsBoolean } from "class-validator";

export class HttpSetLocationActiveDto {
  @IsBoolean()
  isActive: boolean;
}
