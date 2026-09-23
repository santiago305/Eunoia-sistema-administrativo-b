import { Injectable } from '@nestjs/common';
import { ACTIONS, WorkflowActionType } from '../../../domain/constants/workflow-action.constants';
import { SaleOrderStockConsumptionReversalService } from '../sale-order-stock-consumption-reversal.service';
import {
  IdempotentWorkflowActionHandler,
  WorkflowActionContext,
  WorkflowActionDecision,
  WorkflowActionExecutionResult,
} from './idempotent-workflow-action-handler';

const STOCK_ACTIONS = new Set<WorkflowActionType>([
  ACTIONS.RESERVE_STOCK,
  ACTIONS.CONSUME_STOCK,
  ACTIONS.REVERT_STOCK,
  ACTIONS.RESTORE_STOCK,
]);

@Injectable()
export class StockWorkflowActionHandler implements IdempotentWorkflowActionHandler {
  constructor(private readonly consumption: SaleOrderStockConsumptionReversalService) {}

  supports(type: WorkflowActionType): boolean {
    return STOCK_ACTIONS.has(type);
  }

  async inspect(context: WorkflowActionContext): Promise<WorkflowActionDecision> {
    const state = await this.consumption.inspectConsumption(context.order.id, context.tx);
    if (state.status === 'INCONSISTENT') {
      return {
        status: 'CONFLICT',
        reason: 'El pedido tiene multiples consumos de stock vigentes y requiere conciliacion',
      };
    }

    if (context.action.type === ACTIONS.CONSUME_STOCK && state.status === 'CONSUMED') {
      return { status: 'ALREADY_SATISFIED', evidence: { status: state.status, documentIds: state.activeDocumentIds } };
    }
    if (context.action.type === ACTIONS.RESTORE_STOCK) {
      if (state.status === 'RESTORED') {
        return { status: 'ALREADY_SATISFIED', evidence: { status: state.status, documentIds: state.postedDocumentIds } };
      }
      if (state.status === 'NONE') {
        return { status: 'CONFLICT', reason: 'El pedido no tiene consumo de stock pendiente de reponer' };
      }
    }
    if (context.action.type === ACTIONS.RESERVE_STOCK && context.order.reserveBool === true) {
      return { status: 'ALREADY_SATISFIED', evidence: { field: 'reserveBool', value: true } };
    }
    if (context.action.type === ACTIONS.REVERT_STOCK && context.order.reserveBool !== true) {
      return { status: 'ALREADY_SATISFIED', evidence: { field: 'reserveBool', value: false } };
    }
    return { status: 'PENDING' };
  }

  async execute(_context: WorkflowActionContext): Promise<WorkflowActionExecutionResult> {
    throw new Error('Las acciones de stock deben ejecutarse mediante el plan transaccional del runner');
  }
}
