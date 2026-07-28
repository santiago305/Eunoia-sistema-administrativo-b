import { ArrayMinSize, IsArray, IsIn, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";

export const BULK_WORKFLOW_EXECUTION_MODES = {
  STATE: "state",
  GLOBAL_ACTION: "global_action",
} as const;

export type BulkWorkflowExecutionMode =
  (typeof BULK_WORKFLOW_EXECUTION_MODES)[keyof typeof BULK_WORKFLOW_EXECUTION_MODES];

export class BulkExecuteSaleOrderWorkflowDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  saleOrderIds: string[];

  @IsIn(Object.values(BULK_WORKFLOW_EXECUTION_MODES))
  mode: BulkWorkflowExecutionMode;

  @ValidateIf((dto: BulkExecuteSaleOrderWorkflowDto) => dto.mode === BULK_WORKFLOW_EXECUTION_MODES.STATE)
  @IsUUID()
  targetStateId?: string;

  @ValidateIf((dto: BulkExecuteSaleOrderWorkflowDto) =>
    dto.mode === BULK_WORKFLOW_EXECUTION_MODES.GLOBAL_ACTION && !dto.globalActionName)
  @IsUUID()
  transitionId?: string;

  @ValidateIf((dto: BulkExecuteSaleOrderWorkflowDto) =>
    dto.mode === BULK_WORKFLOW_EXECUTION_MODES.GLOBAL_ACTION && !dto.transitionId)
  @IsString()
  @MinLength(1)
  globalActionName?: string;
}
