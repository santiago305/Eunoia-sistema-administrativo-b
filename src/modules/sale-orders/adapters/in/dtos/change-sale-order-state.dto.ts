import { IsObject, IsOptional, IsUUID } from "class-validator";

export class ChangeSaleOrderStateDto {
  @IsUUID()
  transitionId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
