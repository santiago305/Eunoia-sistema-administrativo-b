import { Inject, Injectable } from '@nestjs/common';
import { SaleOrderRepository, SALE_ORDER_REPOSITORY } from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import { ACTIONS, WorkflowActionType } from '../../../domain/constants/workflow-action.constants';
import {
  IdempotentWorkflowActionHandler,
  WorkflowActionContext,
  WorkflowActionDecision,
  WorkflowActionExecutionResult,
} from './idempotent-workflow-action-handler';

const MARKER_ACTIONS = new Set<WorkflowActionType>([
  ACTIONS.MARK_INVOICE_SENT,
  ACTIONS.MARK_PREGUIDE,
  ACTIONS.MARK_PREPARED,
  ACTIONS.UNMARK_PREGUIDE,
  ACTIONS.UNMARK_PREPARED,
]);

@Injectable()
export class MarkerWorkflowActionHandler implements IdempotentWorkflowActionHandler {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  supports(type: WorkflowActionType): boolean {
    return MARKER_ACTIONS.has(type);
  }

  inspect(context: WorkflowActionContext): Promise<WorkflowActionDecision> {
    const marker = this.markerFor(context.action.type);
    if (!marker) {
      return Promise.resolve({
        status: 'CONFLICT',
        reason: 'La acción de marca no está soportada',
      });
    }

    const expected = this.expectedValue(context.action.type);
    const current = context.state[marker];
    if (current === expected) {
      return Promise.resolve({
        status: 'ALREADY_SATISFIED',
        evidence: { field: marker, value: current },
      });
    }

    return Promise.resolve({ status: 'PENDING' });
  }

  async execute(context: WorkflowActionContext): Promise<WorkflowActionExecutionResult> {
    const marker = this.markerFor(context.action.type);
    if (!marker) {
      throw new Error('La acción de marca no está soportada');
    }

    const expected = this.expectedValue(context.action.type);
    if (context.action.type === ACTIONS.MARK_INVOICE_SENT) {
      await this.saleOrderRepo.markInvoiceSent(context.order.id, context.tx);
    } else if (context.action.type === ACTIONS.MARK_PREGUIDE) {
      await this.saleOrderRepo.markPreguide(context.order.id, context.tx);
    } else if (context.action.type === ACTIONS.MARK_PREPARED) {
      await this.saleOrderRepo.markPrepared(context.order.id, context.tx);
    } else if (context.action.type === ACTIONS.UNMARK_PREGUIDE) {
      await this.saleOrderRepo.unmarkPreguide(context.order.id, context.tx);
    } else if (context.action.type === ACTIONS.UNMARK_PREPARED) {
      await this.saleOrderRepo.unmarkPrepared(context.order.id, context.tx);
    }

    context.state[marker] = expected;
    return {
      outcome: { actionType: context.action.type, status: 'APPLIED' },
    };
  }

  private markerFor(type: WorkflowActionType): keyof WorkflowActionContext['state'] | null {
    if (type === ACTIONS.MARK_INVOICE_SENT) return 'invoiceSent';
    if (type === ACTIONS.MARK_PREGUIDE || type === ACTIONS.UNMARK_PREGUIDE) return 'preguide';
    if (type === ACTIONS.MARK_PREPARED || type === ACTIONS.UNMARK_PREPARED) return 'prepared';
    return null;
  }

  private expectedValue(type: WorkflowActionType): boolean {
    return type !== ACTIONS.UNMARK_PREGUIDE && type !== ACTIONS.UNMARK_PREPARED;
  }
}
