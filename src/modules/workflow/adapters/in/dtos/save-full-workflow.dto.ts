import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
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

class FullWorkflowConditionDto {
  @IsIn(Object.values(CONDITIONS))
  type: WorkflowConditionType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

class FullWorkflowActionDto {
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

class FullWorkflowStateDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  clientId: string;

  @IsUUID()
  saleOrderStateId: string;

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

class FullWorkflowTransitionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  clientId: string;

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
  @IsString()
  fromStateRef?: string | null;

  @IsOptional()
  @IsString()
  toStateRef?: string | null;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedStateRefs?: string[];

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowConditionDto)
  conditions?: FullWorkflowConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowActionDto)
  actions?: FullWorkflowActionDto[];
}

export class SaveFullWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowStateDto)
  states: FullWorkflowStateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowTransitionDto)
  transitions: FullWorkflowTransitionDto[];
}
