import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { SaleOrder } from "src/modules/sale-orders/domain/entities/sale-order";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import {
  INVENTORY_LOCK,
  InventoryLock,
} from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { WorkflowAction } from "../../domain/entities/workflow-action";
import { SaleOrderStockRequirementsService } from "./sale-order-stock-requirements.service";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { ACTIONS } from "../../domain/constants/workflow-action.constants";
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from "../../domain/ports/sale-order-state-history.repository";
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from "../../domain/ports/workflow-transition.repository";
import { SaleOrderStockConsumptionService } from "./sale-order-stock-consumption.service";
import { SaleOrderStockConsumptionReversalService } from "./sale-order-stock-consumption-reversal.service";
import {
  SaleOrderWarehouseAssignmentService,
  WorkflowActionOutcome,
} from "./sale-order-warehouse-assignment.service";
import { ActionFactory } from "../../domain/factories/action.factory";
import { CONDITIONS } from "../../domain/constants/workflow-condition.constants";
import { WorkflowCondition } from "../../domain/entities/workflow-condition";

export type WorkflowActionRunResult = {
  order: SaleOrder;
  outcomes: WorkflowActionOutcome[];
};

@Injectable()
export class SaleOrderWorkflowActionRunnerService {
  constructor(
    private readonly requirements: SaleOrderStockRequirementsService,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly inventoryLock: InventoryLock,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_STATE_HISTORY_REPOSITORY)
    private readonly historyRepo: SaleOrderStateHistoryRepository,
    @Inject(WORKFLOW_TRANSITION_REPOSITORY)
    private readonly transitionRepo: WorkflowTransitionRepository,
    private readonly stockConsumption: SaleOrderStockConsumptionService,
    private readonly stockConsumptionReversal: SaleOrderStockConsumptionReversalService,
    private readonly warehouseAssignment: SaleOrderWarehouseAssignmentService,
  ) {}

  private async hasActiveReservation(saleOrderId: string, tx: TransactionContext): Promise<boolean> {
    const history = await this.historyRepo.listBySaleOrderId(saleOrderId, tx);
    let active = false;

    for (const entry of history) {
      if (!entry.transitionId) continue;
      const transition = await this.transitionRepo.findDetailedById(entry.transitionId, tx);
      const branch = entry.metadata?.branch === "ELSE" ? "ELSE" : "THEN";
      const actions = [...(transition?.actions ?? [])]
        .filter((action) => (action.branch ?? "THEN") === branch)
        .sort((a, b) => a.position - b.position);
      for (const action of actions) {
        if (action.type === ACTIONS.RESERVE_STOCK) {
          active = true;
        } else if (
          action.type === ACTIONS.CONSUME_STOCK ||
          action.type === ACTIONS.REVERT_STOCK
        ) {
          active = false;
        }
      }
    }

    return active;
  }

  private async resolveConsumptionEffectiveDate(
    order: SaleOrder,
    tx: TransactionContext,
    currentConditions: WorkflowCondition[],
  ): Promise<string | null> {
    const deliveryDate = order.deliveryDate;
    if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      return null;
    }

    const resolveDaysBefore = (conditions: WorkflowCondition[]) => {
      const condition = conditions.find(
        (item) => item.type === CONDITIONS.SCHEDULE_DELIVERY_WINDOW,
      );
      if (!condition) return null;

      const rawDays = Number(condition.config.maxDaysBefore ?? 0);
      return Number.isInteger(rawDays) && rawDays >= 0 ? rawDays : null;
    };

    let daysBefore = resolveDaysBefore(currentConditions);
    if (daysBefore === null) {
      const history = await this.historyRepo.listBySaleOrderId(order.id, tx);
      for (let index = history.length - 1; index >= 0; index -= 1) {
        const entry = history[index];
        if (!entry.transitionId) continue;
        if (order.currentStateId && entry.toStateId !== order.currentStateId) continue;

        const transition = await this.transitionRepo.findDetailedById(
          entry.transitionId,
          tx,
        );
        daysBefore = resolveDaysBefore(transition?.conditions ?? []);
        if (daysBefore !== null) break;
      }
    }

    const [year, month, day] = deliveryDate.split("-").map(Number);
    const effectiveDate = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isNaN(effectiveDate.getTime()) ||
      effectiveDate.getUTCFullYear() !== year ||
      effectiveDate.getUTCMonth() !== month - 1 ||
      effectiveDate.getUTCDate() !== day
    ) {
      return null;
    }
    effectiveDate.setUTCDate(effectiveDate.getUTCDate() - (daysBefore ?? 0));
    return effectiveDate.toISOString().slice(0, 10);
  }

  async run(
    order: SaleOrder,
    actions: WorkflowAction[],
    tx: TransactionContext,
    executedBy?: string,
    currentConditions: WorkflowCondition[] = [],
  ): Promise<WorkflowActionRunResult> {
    if (order.isActive === false) {
      throw new ConflictException('Los pedidos eliminados son de solo lectura');
    }
    if (!actions.length) return { order, outcomes: [] };
    const ordered = [...actions].sort((a, b) => a.position - b.position);
    let effectiveOrder = order;
    const outcomes: WorkflowActionOutcome[] = [];
    for (const action of ordered) {
      if (
        action.type !== ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE &&
        action.type !== ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW
      ) {
        continue;
      }

      ActionFactory.validate(action);
      const result =
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE
          ? await this.warehouseAssignment.assign(
              effectiveOrder,
              action.config as any,
              tx,
            )
          : await this.warehouseAssignment.assignByWorkflow(
              effectiveOrder,
              action.config as any,
              tx,
            );
      effectiveOrder = result.order;
      outcomes.push(result.outcome);
    }

    const stockActions = ordered.filter((action) =>
      [
        ACTIONS.RESERVE_STOCK,
        ACTIONS.CONSUME_STOCK,
        ACTIONS.REVERT_STOCK,
      ].includes(action.type as any),
    );

    if (!stockActions.length) {
      for (const action of ordered) {
        if (action.type === ACTIONS.MARK_INVOICE_SENT) {
          await this.saleOrderRepo.markInvoiceSent(order.id, tx);
        }
        if (action.type === ACTIONS.MARK_PREGUIDE) {
          await this.saleOrderRepo.markPreguide(order.id, tx);
        }
        if (action.type === ACTIONS.MARK_PREPARED) {
          await this.saleOrderRepo.markPrepared(order.id, tx);
        }
        if (action.type === ACTIONS.UNMARK_PREGUIDE) {
          await this.saleOrderRepo.unmarkPreguide(order.id, tx);
        }
        if (action.type === ACTIONS.UNMARK_PREPARED) {
          await this.saleOrderRepo.unmarkPrepared(order.id, tx);
        }
      }
      return { order: effectiveOrder, outcomes };
    }

    const onlyRevertsStock = stockActions.every((action) => action.type === ACTIONS.REVERT_STOCK);
    if (onlyRevertsStock && effectiveOrder.warehouseId) {
      await this.stockConsumptionReversal.restoreAndRelease(
        effectiveOrder,
        executedBy ?? effectiveOrder.createdBy,
        tx,
      );
    }
    if (onlyRevertsStock && !(await this.hasActiveReservation(effectiveOrder.id, tx))) {
      await this.saleOrderRepo.setReserveBool(
        { saleOrderId: effectiveOrder.id, reserveBool: false },
        tx,
      );
      return { order: effectiveOrder, outcomes };
    }
    if (!effectiveOrder.warehouseId && onlyRevertsStock) {
      await this.saleOrderRepo.setReserveBool(
        { saleOrderId: effectiveOrder.id, reserveBool: false },
        tx,
      );
      return { order: effectiveOrder, outcomes };
    }
    if (!effectiveOrder.warehouseId) {
      throw new BadRequestException("El pedido no tiene almacen para ejecutar acciones de stock");
    }

    const requirements = await this.requirements.resolve(effectiveOrder, tx);
    const keys = requirements
      .map(({ stockItemId }) => ({ warehouseId: effectiveOrder.warehouseId!, stockItemId }))
      .sort((a, b) => `${a.warehouseId}:${a.stockItemId}`.localeCompare(`${b.warehouseId}:${b.stockItemId}`));
    if (keys.length) {
      await this.inventoryLock.lockSnapshots(keys, tx);
    }

    const snapshots = new Map<string, { onHand: number; reserved: number; available: number }>();
    for (const requirement of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        { warehouseId: effectiveOrder.warehouseId, stockItemId: requirement.stockItemId, locationId: null },
        tx,
      );
      if (!snapshot) {
        if (onlyRevertsStock) {
          continue;
        }
        throw new BadRequestException("Stock no encontrado");
      }
      snapshots.set(requirement.stockItemId, {
        onHand: Number(snapshot.onHand ?? 0),
        reserved: Number(snapshot.reserved ?? 0),
        available: Number(snapshot.available ?? snapshot.onHand - snapshot.reserved),
      });
    }

    const quantitiesByAction = new Map<WorkflowAction, Map<string, number>>();
    for (const action of stockActions) {
      const quantities = new Map<string, number>();
      quantitiesByAction.set(action, quantities);
      for (const { stockItemId, quantity } of requirements) {
        const snapshot = snapshots.get(stockItemId);
        if (!snapshot) {
          quantities.set(stockItemId, 0);
          continue;
        }
        if (action.type === ACTIONS.RESERVE_STOCK && snapshot.available < quantity) {
          throw new BadRequestException("Stock disponible insuficiente");
        }
        if (action.type === ACTIONS.CONSUME_STOCK && snapshot.reserved < quantity) {
          throw new BadRequestException("Stock reservado insuficiente");
        }
        if (action.type === ACTIONS.CONSUME_STOCK && snapshot.onHand < quantity) {
          throw new BadRequestException("Stock fisico insuficiente");
        }

        const quantityToApply =
          action.type === ACTIONS.REVERT_STOCK ? Math.min(snapshot.reserved, quantity) : quantity;
        quantities.set(stockItemId, quantityToApply);
        if (action.type === ACTIONS.RESERVE_STOCK) {
          snapshot.reserved += quantityToApply;
          snapshot.available -= quantityToApply;
        } else if (action.type === ACTIONS.CONSUME_STOCK) {
          snapshot.reserved -= quantityToApply;
          snapshot.onHand -= quantityToApply;
        } else {
          snapshot.reserved -= quantityToApply;
          snapshot.available += quantityToApply;
        }
      }
    }

    for (const action of ordered) {
      if (action.type === ACTIONS.MARK_INVOICE_SENT) {
        await this.saleOrderRepo.markInvoiceSent(order.id, tx);
        continue;
      }
      if (action.type === ACTIONS.MARK_PREGUIDE) {
        await this.saleOrderRepo.markPreguide(order.id, tx);
        continue;
      }
      if (action.type === ACTIONS.MARK_PREPARED) {
        await this.saleOrderRepo.markPrepared(order.id, tx);
        continue;
      }
      if (action.type === ACTIONS.UNMARK_PREGUIDE) {
        await this.saleOrderRepo.unmarkPreguide(order.id, tx);
        continue;
      }
      if (action.type === ACTIONS.UNMARK_PREPARED) {
        await this.saleOrderRepo.unmarkPrepared(order.id, tx);
        continue;
      }
      if (
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE ||
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW
      ) {
        continue;
      }
      if (action.type === ACTIONS.CONSUME_STOCK) {
        const effectiveDate = await this.resolveConsumptionEffectiveDate(
          effectiveOrder,
          tx,
          currentConditions,
        );
        await this.stockConsumption.consume(
          effectiveOrder,
          requirements,
          tx,
          effectiveDate,
        );
        await this.saleOrderRepo.setReserveBool(
          { saleOrderId: effectiveOrder.id, reserveBool: false },
          tx,
        );
        continue;
      }
      for (const { stockItemId, quantity } of requirements) {
        const quantityToApply = quantitiesByAction.get(action)?.get(stockItemId) ?? quantity;
        if (quantityToApply === 0) {
          continue;
        }
        const base = { warehouseId: effectiveOrder.warehouseId, stockItemId, locationId: null };
        const reservedDelta = action.type === ACTIONS.RESERVE_STOCK ? quantityToApply : -quantityToApply;
        await this.inventoryRepo.incrementReserved({ ...base, delta: reservedDelta }, tx);
      }
      if (action.type === ACTIONS.RESERVE_STOCK || action.type === ACTIONS.REVERT_STOCK) {
        await this.saleOrderRepo.setReserveBool(
          {
            saleOrderId: effectiveOrder.id,
            reserveBool: action.type === ACTIONS.RESERVE_STOCK,
          },
          tx,
        );
      }
    }
    return { order: effectiveOrder, outcomes };
  }
}
