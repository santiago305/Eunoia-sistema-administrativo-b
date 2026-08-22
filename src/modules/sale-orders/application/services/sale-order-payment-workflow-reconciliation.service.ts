import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from 'src/shared/application/ports/clock.port';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from 'src/modules/sale-orders/domain/ports/sale-payment.repository';
import {
  WORKFLOW_REPOSITORY,
  WorkflowAggregate,
  WorkflowRepository,
} from 'src/modules/workflow/domain/ports/workflow.repository';
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from 'src/modules/workflow/domain/ports/sale-order-state-history.repository';
import { SaleOrderStateHistory } from 'src/modules/workflow/domain/entities/sale-order-state-history';
import { SaleOrderStockConsumptionReversalService } from 'src/modules/workflow/application/services/sale-order-stock-consumption-reversal.service';
import { CONDITIONS } from 'src/modules/workflow/domain/constants/workflow-condition.constants';
import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { WorkflowState } from 'src/modules/workflow/domain/entities/workflow-state';
import { SaleOrderStockCorrectionService } from './sale-order-stock-correction.service';

@Injectable()
export class SaleOrderPaymentWorkflowReconciliationService {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly stockReversal: SaleOrderStockConsumptionReversalService,
    private readonly stockCorrection: SaleOrderStockCorrectionService,
  ) {}

  async reconcile(
    input: {
      saleOrderId: string;
      executedBy: string;
      source: string;
      previousTotal?: number;
      currentTotal?: number;
      recordAuditWhenUnchanged?: boolean;
      requireWorkflow?: boolean;
    },
    tx: TransactionContext,
  ) {
    const order = await this.saleOrderRepo.findByIdForUpdate(
      input.saleOrderId,
      tx,
    );
    if (!order || order.isActive === false) {
      throw new BadRequestException('Pedido no encontrado');
    }
    if (!order.workflowId || !order.currentStateId) {
      if (input.requireWorkflow) {
        throw new BadRequestException('El pedido no tiene flujo asignado');
      }
      return null;
    }

    const workflow = await this.workflowRepo.findDetailedById(
      order.workflowId,
      tx,
    );
    if (!workflow) {
      if (input.requireWorkflow) {
        throw new BadRequestException('Flujo no encontrado');
      }
      return null;
    }
    const currentState = workflow.states.find(
      (state) => state.id === order.currentStateId,
    );
    if (!currentState) {
      throw new BadRequestException('Estado actual del pedido inválido');
    }

    const total = this.roundMoney(
      Number(input.currentTotal ?? order.total ?? 0),
    );
    const payments = await this.paymentRepo.listBySaleOrderIds([order.id], tx);
    const totalPaid = this.roundMoney(
      payments.reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0,
      ),
    );
    const pendingAmount = this.roundMoney(Math.max(total - totalPaid, 0));
    const paymentStatus =
      total > 0 && totalPaid >= total
        ? ('PAID' as const)
        : ('PENDING' as const);
    const rollbackAnalysis = await this.resolvePaymentRollback({
      saleOrderId: order.id,
      workflow,
      currentState,
      isPaid: paymentStatus === 'PAID',
      tx,
    });
    const targetState = rollbackAnalysis.targetState;
    const stateChanged = targetState.id !== currentState.id;

    let stockRestored = false;
    let stockRestoredAndReserved = false;
    if (stateChanged) {
      if (rollbackAnalysis.targetRequiresReservation) {
        stockRestored = await this.stockReversal.restoreAndReserve(
          order,
          input.executedBy,
          tx,
        );
        stockRestoredAndReserved = stockRestored || order.reserveBool === true;
      } else {
        stockRestored = await this.stockReversal.restoreAndRelease(
          order,
          input.executedBy,
          tx,
        );
        await this.stockCorrection.releaseCurrentReservation(order, tx);
      }
      await this.saleOrderRepo.updateWorkflowState(
        { saleOrderId: order.id, currentStateId: targetState.id },
        tx,
      );
    }

    if (stateChanged || input.recordAuditWhenUnchanged) {
      await this.historyRepo.append(
        new SaleOrderStateHistory({
          id: crypto.randomUUID(),
          saleOrderId: order.id,
          workflowId: order.workflowId,
          transitionId: null,
          fromStateId: currentState.id,
          toStateId: targetState.id,
          executedBy: input.executedBy,
          executedAt: this.clock.now(),
          metadata: {
            source: input.source,
            previousTotal: this.roundMoney(
              Number(input.previousTotal ?? order.total ?? 0),
            ),
            correctedTotal: total,
            totalPaid,
            pendingAmount,
            stateChanged,
            rollbackReason: stateChanged
              ? 'payment-condition-invalidated'
              : null,
            invalidatedTransitionIds:
              rollbackAnalysis.invalidatedTransitionIds,
            stockRestored,
            stockRestoredAndReserved,
            stockStatus: stateChanged
              ? rollbackAnalysis.targetRequiresReservation &&
                (stockRestoredAndReserved || order.reserveBool)
                ? 'RESERVED'
                : 'NONE'
              : undefined,
          },
        }),
        tx,
      );
    }

    return {
      saleOrderId: order.id,
      previousTotal: this.roundMoney(
        Number(input.previousTotal ?? order.total ?? 0),
      ),
      total,
      totalPaid,
      pendingAmount,
      paymentStatus,
      previousState: {
        id: currentState.id,
        code: currentState.code,
        name: currentState.name,
      },
      currentState: {
        id: targetState.id,
        code: targetState.code,
        name: targetState.name,
      },
      stateChanged,
      stockRestored,
      stockRestoredAndReserved,
    };
  }

  private async resolvePaymentRollback(input: {
    saleOrderId: string;
    workflow: WorkflowAggregate;
    currentState: WorkflowState;
    isPaid: boolean;
    tx: TransactionContext;
  }): Promise<{
    targetState: WorkflowState;
    invalidatedTransitionIds: string[];
    targetRequiresReservation: boolean;
  }> {
    if (input.isPaid) {
      return {
        targetState: input.currentState,
        invalidatedTransitionIds: [],
        targetRequiresReservation: false,
      };
    }

    const transitionsById = new Map(
      input.workflow.transitions.map((transition) => [transition.id, transition]),
    );
    const paidTransitionIds = new Set(
      input.workflow.conditions
        .filter((condition) => condition.type === CONDITIONS.IS_PAID)
        .map((condition) => condition.transitionId),
    );
    const history = await this.historyRepo.listBySaleOrderId(
      input.saleOrderId,
      input.tx,
    );
    let cursorStateId: string | null = input.currentState.id;
    let rollbackStateId: string | null = null;
    let rollbackBoundaryIndex: number | null = null;
    const invalidatedTransitionIds: string[] = [];

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const item = history[index];
      if (item.toStateId !== cursorStateId) continue;
      if (item.fromStateId === item.toStateId) continue;
      if (!item.transitionId) break;

      const transition = transitionsById.get(item.transitionId);
      if (!transition) break;
      const executedBranch = item.metadata?.branch === 'ELSE' ? 'ELSE' : 'THEN';
      if (
        executedBranch === 'THEN' &&
        paidTransitionIds.has(transition.id) &&
        item.fromStateId
      ) {
        rollbackStateId = item.fromStateId;
        rollbackBoundaryIndex = index;
        invalidatedTransitionIds.push(transition.id);
      }
      cursorStateId = item.fromStateId;
      if (!cursorStateId) break;
    }

    if (!rollbackStateId) {
      rollbackStateId = this.findGraphPaymentRollbackState(
        input.currentState.id,
        input.workflow,
        paidTransitionIds,
      );
    }
    if (!rollbackStateId) {
      return {
        targetState: input.currentState,
        invalidatedTransitionIds: [],
        targetRequiresReservation: false,
      };
    }

    const targetState = input.workflow.states.find(
      (state) => state.id === rollbackStateId && state.isActive,
    );
    if (!targetState) {
      throw new BadRequestException(
        'El flujo no tiene activo el estado requerido por la condición de pago',
      );
    }
    const targetRequiresReservation =
      rollbackBoundaryIndex !== null
        ? this.resolveReservationFromHistory(
            input.workflow,
            history,
            rollbackBoundaryIndex,
          )
        : this.resolveReservationFromGraph(
            input.workflow,
            targetState.id,
          );
    return {
      targetState,
      invalidatedTransitionIds,
      targetRequiresReservation,
    };
  }

  private resolveReservationFromHistory(
    workflow: WorkflowAggregate,
    history: Awaited<
      ReturnType<SaleOrderStateHistoryRepository['listBySaleOrderId']>
    >,
    endExclusive: number,
  ): boolean {
    let reserved = false;
    for (let index = 0; index < endExclusive; index += 1) {
      const entry = history[index];
      if (entry.transitionId) {
        const branch = entry.metadata?.branch === 'ELSE' ? 'ELSE' : 'THEN';
        reserved = this.applyStockActions(
          reserved,
          workflow.actions.filter(
            (action) =>
              action.transitionId === entry.transitionId &&
              action.branch === branch,
          ),
        );
      }
      const recordedStatus = entry.metadata?.stockStatus;
      if (recordedStatus === 'RESERVED') reserved = true;
      if (
        recordedStatus === 'NONE' ||
        recordedStatus === 'REVERTED' ||
        recordedStatus === 'CONSUMED'
      ) {
        reserved = false;
      }
    }
    return reserved;
  }

  private resolveReservationFromGraph(
    workflow: WorkflowAggregate,
    targetStateId: string,
  ): boolean {
    const initialStateIds = workflow.states
      .filter((state) => state.isActive && state.isInitial)
      .map((state) => state.id);
    const queue = initialStateIds.map((stateId) => ({
      stateId,
      reserved: false,
    }));
    const visited = new Set<string>();
    const candidates: boolean[] = [];

    while (queue.length) {
      const current = queue.shift() as {
        stateId: string;
        reserved: boolean;
      };
      const key = `${current.stateId}:${current.reserved}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (current.stateId === targetStateId) {
        candidates.push(current.reserved);
        continue;
      }
      const outgoing = workflow.transitions.filter(
        (transition) =>
          transition.isActive && transition.fromStateId === current.stateId,
      );
      for (const transition of outgoing) {
        if (transition.toStateId) {
          queue.push({
            stateId: transition.toStateId,
            reserved: this.applyStockActions(
              current.reserved,
              workflow.actions.filter(
                (action) =>
                  action.transitionId === transition.id &&
                  action.branch === 'THEN',
              ),
            ),
          });
        }
        if (transition.elseToStateId) {
          queue.push({
            stateId: transition.elseToStateId,
            reserved: this.applyStockActions(
              current.reserved,
              workflow.actions.filter(
                (action) =>
                  action.transitionId === transition.id &&
                  action.branch === 'ELSE',
              ),
            ),
          });
        }
      }
    }

    return candidates.length > 0 && candidates.every(Boolean);
  }

  private applyStockActions(
    initial: boolean,
    actions: WorkflowAggregate['actions'],
  ): boolean {
    let reserved = initial;
    for (const action of [...actions].sort(
      (left, right) => left.position - right.position,
    )) {
      if (action.type === ACTIONS.RESERVE_STOCK) reserved = true;
      if (
        action.type === ACTIONS.CONSUME_STOCK ||
        action.type === ACTIONS.REVERT_STOCK
      ) {
        reserved = false;
      }
    }
    return reserved;
  }

  private findGraphPaymentRollbackState(
    currentStateId: string,
    workflow: WorkflowAggregate,
    paidTransitionIds: ReadonlySet<string>,
  ): string | null {
    const queue = [{ stateId: currentStateId, depth: 0 }];
    const visited = new Set<string>();
    const candidates: Array<{ stateId: string; depth: number }> = [];

    while (queue.length) {
      const current = queue.shift() as { stateId: string; depth: number };
      if (visited.has(current.stateId)) continue;
      visited.add(current.stateId);

      const incoming = workflow.transitions.filter(
        (transition) =>
          transition.isActive &&
          (transition.toStateId === current.stateId ||
            transition.elseToStateId === current.stateId),
      );
      for (const transition of incoming) {
        if (!transition.fromStateId) continue;
        if (
          transition.toStateId === current.stateId &&
          paidTransitionIds.has(transition.id)
        ) {
          candidates.push({
            stateId: transition.fromStateId,
            depth: current.depth + 1,
          });
          continue;
        }
        queue.push({
          stateId: transition.fromStateId,
          depth: current.depth + 1,
        });
      }
    }

    if (!candidates.length) return null;
    const nearestDepth = Math.min(
      ...candidates.map((candidate) => candidate.depth),
    );
    const nearestStates = Array.from(
      new Set(
        candidates
          .filter((candidate) => candidate.depth === nearestDepth)
          .map((candidate) => candidate.stateId),
      ),
    );
    return nearestStates.length === 1 ? nearestStates[0] : null;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
