import { Injectable } from '@nestjs/common';
import { WorkflowRevisionLifecycleService } from '../../services/workflow-revision-lifecycle.service';

@Injectable()
export class RepairSaleOrderWorkflowUsecase {
  constructor(private readonly workflowLifecycle: WorkflowRevisionLifecycleService) {}

  execute(input: { saleOrderId: string; executedBy: string }) {
    return this.workflowLifecycle.repairSaleOrder(input);
  }
}
