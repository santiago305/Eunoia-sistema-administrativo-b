import { Injectable } from '@nestjs/common';
import { ACTIONS, WorkflowActionType } from '../../../domain/constants/workflow-action.constants';
import { SaleOrderWarehouseAssignmentService } from '../sale-order-warehouse-assignment.service';
import {
  IdempotentWorkflowActionHandler,
  WorkflowActionContext,
  WorkflowActionDecision,
  WorkflowActionExecutionResult,
} from './idempotent-workflow-action-handler';

const WAREHOUSE_ACTIONS = new Set<WorkflowActionType>([
  ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
  ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW,
]);

@Injectable()
export class WarehouseWorkflowActionHandler implements IdempotentWorkflowActionHandler {
  constructor(private readonly assignment: SaleOrderWarehouseAssignmentService) {}

  supports(type: WorkflowActionType): boolean {
    return WAREHOUSE_ACTIONS.has(type);
  }

  inspect(context: WorkflowActionContext): Promise<WorkflowActionDecision> {
    if (context.order.warehouseId) {
      return Promise.resolve({
        status: 'ALREADY_SATISFIED',
        evidence: { field: 'warehouseId', value: context.order.warehouseId },
      });
    }
    return Promise.resolve({ status: 'PENDING' });
  }

  async execute(context: WorkflowActionContext): Promise<WorkflowActionExecutionResult> {
    const result = context.action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE
      ? await this.assignment.assign(context.order, context.action.config as any, context.tx)
      : await this.assignment.assignByWorkflow(context.order, context.action.config as any, context.tx);

    return { order: result.order, outcome: result.outcome };
  }
}
