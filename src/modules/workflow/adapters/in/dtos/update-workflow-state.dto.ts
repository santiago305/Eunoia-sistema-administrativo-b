import { IsBoolean, IsInt, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class UpdateWorkflowStateDto {
  @IsOptional()
  @IsUUID()
  saleOrderStateId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsNumber()
  positionX?: number | null;

  @IsOptional()
  @IsNumber()
  positionY?: number | null;

  @IsOptional()
  @IsBoolean()
  isInitial?: boolean;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
