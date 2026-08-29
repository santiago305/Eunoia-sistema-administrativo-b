import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import {
  FullWorkflowActionDto,
  FullWorkflowConditionDto,
} from "./save-full-workflow.dto";

class PublishedWorkflowTransitionRulesDto {
  @IsUUID()
  transitionId: string;

  @IsBoolean()
  autoTrigger: boolean;

  @IsInt()
  @Min(0)
  priority: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowConditionDto)
  conditions: FullWorkflowConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowActionDto)
  actions: FullWorkflowActionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FullWorkflowActionDto)
  elseActions: FullWorkflowActionDto[];
}

export class UpdatePublishedWorkflowRulesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PublishedWorkflowTransitionRulesDto)
  transitions: PublishedWorkflowTransitionRulesDto[];
}
