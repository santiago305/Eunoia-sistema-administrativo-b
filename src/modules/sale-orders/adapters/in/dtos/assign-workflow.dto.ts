import { IsUUID } from "class-validator";

export class AssignWorkflowDto {
  @IsUUID()
  workflowId: string;
}
