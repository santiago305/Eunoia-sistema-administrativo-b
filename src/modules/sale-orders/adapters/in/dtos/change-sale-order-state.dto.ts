import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ChangeSaleOrderStateDto {
  @IsUUID()
  transitionId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
