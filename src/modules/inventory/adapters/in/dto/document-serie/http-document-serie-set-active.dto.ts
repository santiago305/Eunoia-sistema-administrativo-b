import { IsBoolean } from "class-validator";

export class HttpSetDocumentSerieActiveDto {
  @IsBoolean()
  isActive: boolean;
}
