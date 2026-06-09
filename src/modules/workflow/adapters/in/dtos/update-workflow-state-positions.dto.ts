import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsUUID, ValidateNested } from "class-validator";

export class WorkflowStatePositionDto {
  @IsUUID()
  stateId: string;

  @IsOptional()
  @IsNumber()
  positionX: number | null;

  @IsOptional()
  @IsNumber()
  positionY: number | null;
}

export class UpdateWorkflowStatePositionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStatePositionDto)
  positions: WorkflowStatePositionDto[];
}
