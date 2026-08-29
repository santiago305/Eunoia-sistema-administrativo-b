import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from "class-validator";
import {
  FullWorkflowActionDto,
  FullWorkflowConditionDto,
} from "./save-full-workflow.dto";

class PublishedWorkflowTransitionRulesDto {
  @IsUUID()
  transitionId: string;

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
