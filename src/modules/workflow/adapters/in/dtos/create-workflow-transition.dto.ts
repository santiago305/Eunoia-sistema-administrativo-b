import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { CONDITIONS, WorkflowConditionType } from "../../../domain/constants/workflow-condition.constants";
import { ACTIONS, WorkflowActionType } from "../../../domain/constants/workflow-action.constants";
import {
  TRANSITION_PURPOSES,
  WorkflowTransitionPurpose,
} from "../../../domain/constants/workflow-transition-purpose.constants";
import {
  TRANSITION_EFFECTS,
  WorkflowTransitionEffect,
} from "../../../domain/constants/workflow-transition-effect.constants";

export class CreateWorkflowTransitionConditionDto {
  @IsString()
  @IsIn(Object.values(CONDITIONS))
  type: WorkflowConditionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CreateWorkflowTransitionActionDto {
  @IsIn(Object.values(ACTIONS))
  type: WorkflowActionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateWorkflowTransitionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(Object.values(TRANSITION_EFFECTS))
  effect?: WorkflowTransitionEffect;

  @IsOptional()
  @IsIn(Object.values(TRANSITION_PURPOSES))
  purpose?: WorkflowTransitionPurpose;

  @IsOptional()
  @IsUUID()
  fromStateId?: string | null;

  @IsOptional()
  @IsUUID()
  toStateId?: string | null;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  excludedStateIds?: string[];

  @IsOptional()
  @IsString()
  sourceHandle?: string | null;

  @IsOptional()
  @IsString()
  targetHandle?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  autoTrigger?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsIn(Object.values(TRANSITION_EFFECTS))
  elseEffect?: WorkflowTransitionEffect | null;

  @IsOptional()
  @IsUUID()
  elseToStateId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTransitionConditionDto)
  conditions?: CreateWorkflowTransitionConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTransitionActionDto)
  actions?: CreateWorkflowTransitionActionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTransitionActionDto)
  elseActions?: CreateWorkflowTransitionActionDto[];
}
