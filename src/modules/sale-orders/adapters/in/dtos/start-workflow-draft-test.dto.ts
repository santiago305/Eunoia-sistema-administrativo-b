import { IsUUID } from 'class-validator';

export class StartWorkflowDraftTestDto {
  @IsUUID()
  saleOrderId: string;
}
