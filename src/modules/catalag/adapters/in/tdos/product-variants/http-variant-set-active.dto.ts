import { IsBoolean } from "class-validator";

export class HttpSetProductVariantActiveDto {
  @IsBoolean()
  isActive: boolean;
}