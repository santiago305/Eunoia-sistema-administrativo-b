import { Inject, Injectable } from '@nestjs/common';
import { SaleOrder } from '../../domain/entities/sale-order';
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from 'src/modules/workflow/domain/ports/sale-order-state-history.repository';
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from 'src/modules/workflow/domain/ports/workflow-transition.repository';
import {
  WORKFLOW_REPOSITORY,
  WorkflowRepository,
} from 'src/modules/workflow/domain/ports/workflow.repository';
import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';

export type SaleOrderStockStatus =
  | 'NONE'
  | 'RESERVED'
  | 'REVERTED'
  | 'CONSUMED';

export type SaleOrderEditPolicy = {
  stockStatus: SaleOrderStockStatus;
  productsEditable: boolean;
  warehouseEditable: boolean;
  isFinal: boolean;
  reason: string | null;
};

@Injectable()
export class SaleOrderEditPolicyService {
  constructor(
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly transitionRepo: WorkflowTransitionRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async resolve(
    order: Pick<
      SaleOrder,
      'id' | 'workflowId' | 'currentStateId' | 'reserveBool'
    >,
    tx?: TransactionContext,
  ): Promise<SaleOrderEditPolicy> {
    const [resolvedStockStatus, isFinal] = await Promise.all([
      this.resolveStockStatus(order.id, tx),
      this.resolveFinalState(order, tx),
    ]);
    const stockStatus =
      resolvedStockStatus === 'RESERVED' && order.reserveBool === false
        ? 'NONE'
        : resolvedStockStatus;

    const productsEditable =
      !isFinal && stockStatus !== 'RESERVED';
    const warehouseEditable =
      !isFinal &&
      stockStatus !== 'RESERVED' &&
      stockStatus !== 'CONSUMED';

    const reasons: string[] = [];
    if (isFinal) reasons.push('Pedido finalizado');
    if (stockStatus === 'RESERVED') reasons.push('Stock reservado');
    if (stockStatus === 'CONSUMED') reasons.push('Stock consumido');

    return {
      stockStatus,
      productsEditable,
      warehouseEditable,
      isFinal,
      reason: reasons.length ? reasons.join(' · ') : null,
    };
  }

  private async resolveFinalState(
    order: Pick<SaleOrder, 'workflowId' | 'currentStateId'>,
    tx?: TransactionContext,
  ): Promise<boolean> {
    if (!order.workflowId || !order.currentStateId) return false;
    const workflow = await this.workflowRepo.findDetailedById(
      order.workflowId,
      tx,
    );
    return Boolean(
      workflow?.states.find((state) => state.id === order.currentStateId)
        ?.isFinal,
    );
  }

  private async resolveStockStatus(
    saleOrderId: string,
    tx?: TransactionContext,
  ): Promise<SaleOrderStockStatus> {
    const history = await this.historyRepo.listBySaleOrderId(saleOrderId, tx);
    let status: SaleOrderStockStatus = 'NONE';

    for (const item of history) {
      if (!item.transitionId) continue;
      const transition = await this.transitionRepo.findDetailedById(
        item.transitionId,
        tx,
      );
      const executedBranch =
        item.metadata?.branch === 'ELSE' ? 'ELSE' : 'THEN';
      const actions = [...(transition?.actions ?? [])]
        .filter((action) => action.branch === executedBranch)
        .sort((left, right) => left.position - right.position);

      for (const action of actions) {
        if (action.type === ACTIONS.RESERVE_STOCK) status = 'RESERVED';
        if (action.type === ACTIONS.REVERT_STOCK) status = 'REVERTED';
        if (action.type === ACTIONS.CONSUME_STOCK) status = 'CONSUMED';
      }
    }

    return status;
  }
}
