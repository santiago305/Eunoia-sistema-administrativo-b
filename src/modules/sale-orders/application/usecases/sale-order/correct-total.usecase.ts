import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import {
  UNIT_OF_WORK,
  UnitOfWork,
} from "src/shared/domain/ports/unit-of-work.port";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import {
  WORKFLOW_REPOSITORY,
  WorkflowAggregate,
  WorkflowRepository,
} from "src/modules/workflow/domain/ports/workflow.repository";
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from "src/modules/workflow/domain/ports/sale-order-state-history.repository";
import { SaleOrderStateHistory } from "src/modules/workflow/domain/entities/sale-order-state-history";
import { SaleOrderStockConsumptionReversalService } from "src/modules/workflow/application/services/sale-order-stock-consumption-reversal.service";
import { CONDITIONS } from "src/modules/workflow/domain/constants/workflow-condition.constants";
import { WorkflowState } from "src/modules/workflow/domain/entities/workflow-state";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";

type AmountRow = { id: string; quantity: number; total: number };

@Injectable()
export class CorrectSaleOrderTotalUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly itemRepo: SaleOrderItemRepository,
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: WorkflowRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly stockReversal: SaleOrderStockConsumptionReversalService,
  ) {}

  async execute(input: {
    saleOrderId: string;
    total: number;
    executedBy: string;
  }) {
    const correctedTotal = this.roundMoney(input.total);
    if (!Number.isFinite(correctedTotal) || correctedTotal <= 0) {
      throw new BadRequestException("El total corregido debe ser mayor a 0");
    }

    return this.uow.runInTransaction(async (tx) => {
      const order = await this.saleOrderRepo.findByIdForUpdate(
        input.saleOrderId,
        tx,
      );
      if (!order || order.isActive === false) {
        throw new BadRequestException("Pedido no encontrado");
      }
      if (!order.workflowId || !order.currentStateId) {
        throw new BadRequestException("El pedido no tiene flujo asignado");
      }

      const workflow = await this.workflowRepo.findDetailedById(
        order.workflowId,
        tx,
      );
      if (!workflow) {
        throw new BadRequestException("Flujo no encontrado");
      }
      const currentState = workflow.states.find(
        (state) => state.id === order.currentStateId,
      );
      if (!currentState) {
        throw new BadRequestException("Estado actual del pedido inválido");
      }

      const correctedSubTotal = this.roundMoney(
        correctedTotal - Number(order.deliveryCost ?? 0) + Number(order.discount ?? 0),
      );
      if (correctedSubTotal < 0) {
        throw new BadRequestException(
          "El total corregido no puede ser menor que la tarifa menos el descuento",
        );
      }

      const items = await this.itemRepo.listBySaleOrderId(order.id, tx);
      if (!items.length) {
        throw new BadRequestException("El pedido no tiene productos para distribuir el total");
      }
      const itemAmounts = this.allocate(correctedSubTotal, items);
      await this.itemRepo.updateAmounts(itemAmounts, tx);

      const components = await this.componentRepo.listBySaleOrderItemIds(
        items.map((item) => item.id),
        tx,
      );
      const itemTotalById = new Map(
        itemAmounts.map((item) => [item.id, item.total]),
      );
      const componentAmounts = items.flatMap((item) => {
        const itemComponents = components.filter(
          (component) => component.saleOrderItemId === item.id,
        );
        return this.allocate(itemTotalById.get(item.id) ?? 0, itemComponents);
      });
      await this.componentRepo.updateAmounts(componentAmounts, tx);
      const correctedOrder = await this.saleOrderRepo.updateAmounts(
        {
          saleOrderId: order.id,
          subTotal: correctedSubTotal,
          total: correctedTotal,
        },
        tx,
      );

      const payments = await this.paymentRepo.listBySaleOrderIds(
        [order.id],
        tx,
      );
      const totalPaid = this.roundMoney(
        payments.reduce(
          (sum, payment) => sum + Number(payment.amount ?? 0),
          0,
        ),
      );
      const pendingAmount = this.roundMoney(
        Math.max(correctedTotal - totalPaid, 0),
      );
      const paymentStatus =
        correctedTotal > 0 && totalPaid >= correctedTotal
          ? ("PAID" as const)
          : ("PENDING" as const);
      const rollbackAnalysis = await this.resolvePaymentRollback({
        order: correctedOrder,
        workflow,
        currentState,
        isPaid: paymentStatus === "PAID",
        tx,
      });
      const targetState = rollbackAnalysis.targetState;
      const mustRollback = targetState.id !== currentState.id;

      let stockRestoredAndReserved = false;
      if (mustRollback) {
        stockRestoredAndReserved = await this.stockReversal.restoreAndReserve(
          order,
          input.executedBy,
          tx,
        );
        await this.saleOrderRepo.updateWorkflowState(
          { saleOrderId: order.id, currentStateId: targetState.id },
          tx,
        );
      }

      const now = this.clock.now();
      await this.historyRepo.append(
        new SaleOrderStateHistory({
          id: crypto.randomUUID(),
          saleOrderId: order.id,
          workflowId: order.workflowId,
          transitionId: null,
          fromStateId: currentState.id,
          toStateId: targetState.id,
          executedBy: input.executedBy,
          executedAt: now,
          metadata: {
            source: "sale-order-total-correction",
            previousTotal: Number(order.total ?? 0),
            correctedTotal,
            totalPaid,
            pendingAmount,
            stateChanged: mustRollback,
            rollbackReason: mustRollback
              ? "payment-condition-invalidated"
              : null,
            invalidatedTransitionIds:
              rollbackAnalysis.invalidatedTransitionIds,
            stockRestoredAndReserved,
            stockStatus: mustRollback
              ? stockRestoredAndReserved || order.reserveBool
                ? "RESERVED"
                : "NONE"
              : undefined,
          },
        }),
        tx,
      );

      return {
        saleOrderId: order.id,
        previousTotal: Number(order.total ?? 0),
        total: correctedTotal,
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
        stateChanged: mustRollback,
        stockRestoredAndReserved,
      };
    });
  }

  private async resolvePaymentRollback(input: {
    order: SaleOrder;
    workflow: WorkflowAggregate;
    currentState: WorkflowState;
    isPaid: boolean;
    tx: TransactionContext;
  }): Promise<{
    targetState: WorkflowState;
    invalidatedTransitionIds: string[];
  }> {
    if (input.isPaid) {
      return {
        targetState: input.currentState,
        invalidatedTransitionIds: [],
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
      input.order.id,
      input.tx,
    );
    let cursorStateId: string | null = input.currentState.id;
    let rollbackStateId: string | null = null;
    const invalidatedTransitionIds: string[] = [];

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const item = history[index];
      if (item.toStateId !== cursorStateId) continue;
      if (item.fromStateId === item.toStateId) continue;
      if (!item.transitionId) break;

      const transition = transitionsById.get(item.transitionId);
      if (!transition) break;
      const executedBranch = item.metadata?.branch === "ELSE" ? "ELSE" : "THEN";
      if (
        executedBranch === "THEN" &&
        paidTransitionIds.has(transition.id) &&
        item.fromStateId
      ) {
        rollbackStateId = item.fromStateId;
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
      };
    }

    const targetState = input.workflow.states.find(
      (state) => state.id === rollbackStateId && state.isActive,
    );
    if (!targetState) {
      throw new BadRequestException(
        "El flujo no tiene activo el estado requerido por la condición de pago",
      );
    }
    return { targetState, invalidatedTransitionIds };
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
    const nearestDepth = Math.min(...candidates.map((candidate) => candidate.depth));
    const nearestStates = Array.from(
      new Set(
        candidates
          .filter((candidate) => candidate.depth === nearestDepth)
          .map((candidate) => candidate.stateId),
      ),
    );
    return nearestStates.length === 1 ? nearestStates[0] : null;
  }

  private allocate(targetTotal: number, rows: AmountRow[]) {
    if (!rows.length) return [];
    const targetCents = Math.round(targetTotal * 100);
    const positiveTotal = rows.reduce(
      (sum, row) => sum + Math.max(Number(row.total ?? 0), 0),
      0,
    );
    const positiveQuantity = rows.reduce(
      (sum, row) => sum + Math.max(Number(row.quantity ?? 0), 0),
      0,
    );
    const weights = rows.map((row) =>
      positiveTotal > 0
        ? Math.max(Number(row.total ?? 0), 0)
        : positiveQuantity > 0
          ? Math.max(Number(row.quantity ?? 0), 0)
          : 1,
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const rawShares = weights.map(
      (weight) => (targetCents * weight) / totalWeight,
    );
    const centsByRow = rawShares.map((share) => Math.floor(share));
    const remainingCents =
      targetCents - centsByRow.reduce((sum, cents) => sum + cents, 0);
    const distributionOrder = rawShares
      .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
      .sort(
        (left, right) =>
          right.remainder - left.remainder || left.index - right.index,
      );
    for (let index = 0; index < remainingCents; index += 1) {
      centsByRow[distributionOrder[index % distributionOrder.length].index] += 1;
    }

    return rows.map((row, index) => {
      const cents = centsByRow[index];
      const total = cents / 100;
      const quantity = Number(row.quantity ?? 0);
      return {
        id: row.id,
        total,
        unitPrice: this.roundMoney(quantity > 0 ? total / quantity : total),
      };
    });
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

}
