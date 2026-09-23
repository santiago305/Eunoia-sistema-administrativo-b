import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SaleOrder } from 'src/modules/sale-orders/domain/entities/sale-order';
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from 'src/modules/product-catalog/domain/ports/inventory.repository';
import {
  INVENTORY_LOCK,
  InventoryLock,
} from 'src/modules/product-catalog/integration/inventory/ports/inventory-lock.port';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { WorkflowAction } from '../../domain/entities/workflow-action';
import { SaleOrderStockRequirementsService } from './sale-order-stock-requirements.service';
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from 'src/modules/sale-orders/domain/ports/sale-order.repository';
import { ACTIONS } from '../../domain/constants/workflow-action.constants';
import {
  SALE_ORDER_STATE_HISTORY_REPOSITORY,
  SaleOrderStateHistoryRepository,
} from '../../domain/ports/sale-order-state-history.repository';
import {
  WORKFLOW_TRANSITION_REPOSITORY,
  WorkflowTransitionRepository,
} from '../../domain/ports/workflow-transition.repository';
import { SaleOrderStockConsumptionService } from './sale-order-stock-consumption.service';
import { SaleOrderStockConsumptionReversalService } from './sale-order-stock-consumption-reversal.service';
import {
  SaleOrderWarehouseAssignmentService,
  WorkflowActionOutcome,
} from './sale-order-warehouse-assignment.service';
import { ActionFactory } from '../../domain/factories/action.factory';
import { CONDITIONS } from '../../domain/constants/workflow-condition.constants';
import { WorkflowCondition } from '../../domain/entities/workflow-condition';
import { SaleOrderReservationReconciliationService } from 'src/modules/sale-orders/application/services/sale-order-reservation-reconciliation.service';
import { WorkflowActionHandlerRegistry } from './action-handlers/workflow-action-handler-registry';
import { WorkflowActionMutableState } from './action-handlers/idempotent-workflow-action-handler';

export type WorkflowActionRunResult = {
  order: SaleOrder;
  outcomes: WorkflowActionOutcome[];
  stockStatus?: 'NONE' | 'RESERVED' | 'REVERTED' | 'CONSUMED';
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
    private readonly reservationReconciliation: SaleOrderReservationReconciliationService,
    private readonly actionHandlerRegistry: WorkflowActionHandlerRegistry,
  ) {}

  private async hasActiveReservation(
    saleOrderId: string,
    tx: TransactionContext,
  ): Promise<boolean> {
    const history = await this.historyRepo.listBySaleOrderId(saleOrderId, tx);
    let active = false;

    for (const entry of history) {
      if (!entry.transitionId) continue;
      const transition = await this.transitionRepo.findDetailedById(
        entry.transitionId,
        tx,
      );
      const branch = entry.metadata?.branch === 'ELSE' ? 'ELSE' : 'THEN';
      const actions = [...(transition?.actions ?? [])]
        .filter((action) => (action.branch ?? 'THEN') === branch)
        .sort((a, b) => a.position - b.position);
      for (const action of actions) {
        if (action.type === ACTIONS.RESERVE_STOCK) {
          active = true;
        } else if (
          action.type === ACTIONS.CONSUME_STOCK ||
          action.type === ACTIONS.REVERT_STOCK ||
          action.type === ACTIONS.RESTORE_STOCK
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
        if (order.currentStateId && entry.toStateId !== order.currentStateId)
          continue;

        const transition = await this.transitionRepo.findDetailedById(
          entry.transitionId,
          tx,
        );
        daysBefore = resolveDaysBefore(transition?.conditions ?? []);
        if (daysBefore !== null) break;
      }
    }

    const [year, month, day] = deliveryDate.split('-').map(Number);
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
    for (const action of ordered) {
      if (!this.actionHandlerRegistry.get(action.type as any)) {
        throw new BadRequestException(`La acción ${action.type} no está soportada`);
      }
    }
    let effectiveOrder = order;
    const outcomes: WorkflowActionOutcome[] = [];
    let stockStatus: WorkflowActionRunResult['stockStatus'];
    const markerState: WorkflowActionMutableState = {
      invoiceSent: Boolean(order.invoiceSend),
      preguide: Boolean(order.preguide),
      prepared: Boolean(order.prepared),
    };
    const runMarkerAction = async (action: WorkflowAction): Promise<boolean> => {
      if (
        action.type === ACTIONS.RESERVE_STOCK ||
        action.type === ACTIONS.CONSUME_STOCK ||
        action.type === ACTIONS.REVERT_STOCK ||
        action.type === ACTIONS.RESTORE_STOCK
      ) {
        return false;
      }
      const handler = this.actionHandlerRegistry.get(action.type);
      if (!handler) {
        throw new BadRequestException(`La acción ${action.type} no está soportada`);
      }

      const decision = await handler.inspect({
        order: effectiveOrder,
        action,
        tx,
        executedBy,
        currentConditions,
        state: markerState,
      });
      if (decision.status === 'CONFLICT') {
        throw new BadRequestException(decision.reason);
      }
      if (decision.status === 'ALREADY_SATISFIED') {
        outcomes.push({
          actionType: action.type,
          status: 'SKIPPED',
          message: 'La accion ya estaba satisfecha',
        });
        return true;
      }

      const result = await handler.execute({
        order: effectiveOrder,
        action,
        tx,
        executedBy,
        currentConditions,
        state: markerState,
      });
      if (result.order) effectiveOrder = result.order;
      outcomes.push(result.outcome);
      return true;
    };
    for (const action of ordered) {
      if (
        action.type !== ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE &&
        action.type !== ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW
      ) {
        continue;
      }

      ActionFactory.validate(action);
      await runMarkerAction(action);
    }

    let stockActions = ordered.filter((action) =>
      [
        ACTIONS.RESERVE_STOCK,
        ACTIONS.CONSUME_STOCK,
        ACTIONS.REVERT_STOCK,
      ].includes(action.type as any),
    );

    const skippedConsumeActionIds = new Set<string>();
    const skippedReserveActionIds = new Set<string>();
    const completedRevertActionIds = new Set<string>();
    let resolvedRequirements:
      | Array<{ stockItemId: string; quantity: number }>
      | undefined;
    const resolveRequirements = async () => {
      resolvedRequirements ??= await this.requirements.resolve(effectiveOrder, tx);
      return resolvedRequirements;
    };
    for (const action of stockActions) {
      const handler = this.actionHandlerRegistry.get(action.type);
      if (!handler) continue;
      const decision = await handler.inspect({
        order: effectiveOrder,
        action,
        tx,
        executedBy,
        currentConditions,
        state: markerState,
      });
      if (decision.status === 'CONFLICT') {
        throw new BadRequestException(decision.reason);
      }
    }
    const inspectActiveReservation = async () => {
      const health = await this.reservationReconciliation.inspect(
        effectiveOrder,
        await resolveRequirements(),
        tx,
      );
      if (health.status !== 'COMPLETE') {
        throw new BadRequestException(
          health.status === 'INSUFFICIENT_STOCK'
            ? 'La reserva activa del pedido no tiene stock suficiente'
            : 'La reserva activa del pedido no coincide con las existencias reservadas',
        );
      }
      return health;
    };
    let consumptionState:
      | Awaited<ReturnType<SaleOrderStockConsumptionReversalService['inspectConsumption']>>
      | undefined;

    if (
      stockActions.some(
        (action) =>
          action.type === ACTIONS.CONSUME_STOCK ||
          action.type === ACTIONS.RESERVE_STOCK,
      )
    ) {
      consumptionState = await this.stockConsumptionReversal.inspectConsumption(
        effectiveOrder.id,
        tx,
      );
      if (consumptionState.status === 'INCONSISTENT') {
        throw new BadRequestException(
          'El pedido tiene multiples consumos de stock vigentes y requiere conciliacion',
        );
      }
      if (consumptionState.status === 'CONSUMED') {
        if (
          stockActions.some((action) => action.type === ACTIONS.RESERVE_STOCK)
        ) {
          throw new BadRequestException(
            'El stock del pedido ya fue consumido y no puede reservarse nuevamente',
          );
        }
        for (const action of stockActions) {
          if (action.type === ACTIONS.CONSUME_STOCK) {
            skippedConsumeActionIds.add(action.id);
          }
        }
        stockActions = stockActions.filter(
          (action) => action.type !== ACTIONS.CONSUME_STOCK,
        );
        stockStatus = 'CONSUMED';
      }
    }

    if (effectiveOrder.reserveBool === true) {
      if (stockActions.some((action) => action.type === ACTIONS.RESERVE_STOCK)) {
        await inspectActiveReservation();
      }
      for (const action of stockActions) {
        if (action.type === ACTIONS.RESERVE_STOCK) {
          skippedReserveActionIds.add(action.id);
        }
      }
      stockActions = stockActions.filter(
        (action) => action.type !== ACTIONS.RESERVE_STOCK,
      );
      if (skippedReserveActionIds.size) stockStatus = 'RESERVED';
    }

    const restoreStockAction = ordered.find(
      (action) => action.type === ACTIONS.RESTORE_STOCK,
    );
    let restoreStockOutcome: WorkflowActionOutcome | undefined;
    if (restoreStockAction) {
      consumptionState ??=
        await this.stockConsumptionReversal.inspectConsumption(
          effectiveOrder.id,
          tx,
        );
      if (consumptionState.status === 'INCONSISTENT') {
        throw new BadRequestException(
          'El pedido tiene multiples consumos de stock vigentes y requiere conciliacion',
        );
      }
      if (consumptionState.status === 'NONE') {
        throw new BadRequestException(
          'El pedido no tiene consumo de stock pendiente de reponer',
        );
      }
      if (consumptionState.status === 'RESTORED') {
        restoreStockOutcome = {
          actionType: restoreStockAction.type,
          status: 'SKIPPED',
          message: 'El consumo de stock ya estaba restaurado',
        };
      } else {
        const restored = await this.stockConsumptionReversal.restoreAndRelease(
          effectiveOrder,
          executedBy ?? effectiveOrder.createdBy,
          tx,
        );
        if (!restored) {
          throw new BadRequestException(
            'No se pudo restaurar el consumo vigente del pedido',
          );
        }
        restoreStockOutcome = {
          actionType: restoreStockAction.type,
          status: 'APPLIED',
        };
      }
      stockStatus = 'REVERTED';
    }

    if (!stockActions.length) {
      for (const action of ordered) {
        if (skippedConsumeActionIds.has(action.id)) {
          await this.saleOrderRepo.setReserveBool(
            { saleOrderId: effectiveOrder.id, reserveBool: false },
            tx,
          );
          outcomes.push({
            actionType: action.type,
            status: 'SKIPPED',
            message: 'El stock del pedido ya estaba consumido',
          });
          continue;
        }
        if (skippedReserveActionIds.has(action.id)) {
          outcomes.push({
            actionType: action.type,
            status: 'SKIPPED',
            message: 'El stock del pedido ya estaba reservado',
          });
          continue;
        }
        if (action.id === restoreStockAction?.id && restoreStockOutcome) {
          outcomes.push(restoreStockOutcome);
          continue;
        }
        await runMarkerAction(action);
      }
      return { order: effectiveOrder, outcomes, stockStatus };
    }

    const onlyRevertsStock = stockActions.every(
      (action) => action.type === ACTIONS.REVERT_STOCK,
    );
    let restoredDuringRevert = false;
    let activeReservation = false;
    if (onlyRevertsStock && effectiveOrder.reserveBool === true) {
      await inspectActiveReservation();
      activeReservation = true;
    }
    if (onlyRevertsStock && effectiveOrder.warehouseId) {
      restoredDuringRevert = await this.stockConsumptionReversal.restoreAndRelease(
        effectiveOrder,
        executedBy ?? effectiveOrder.createdBy,
        tx,
      );
    }
    if (
      onlyRevertsStock &&
      !(activeReservation || (await this.hasActiveReservation(effectiveOrder.id, tx)))
    ) {
      await this.saleOrderRepo.setReserveBool(
        { saleOrderId: effectiveOrder.id, reserveBool: false },
        tx,
      );
      for (const action of stockActions) completedRevertActionIds.add(action.id);
      stockActions = [];
      stockStatus = 'REVERTED';
    }
    if (stockActions.length && !effectiveOrder.warehouseId && onlyRevertsStock) {
      await this.saleOrderRepo.setReserveBool(
        { saleOrderId: effectiveOrder.id, reserveBool: false },
        tx,
      );
      for (const action of stockActions) completedRevertActionIds.add(action.id);
      stockActions = [];
      stockStatus = 'REVERTED';
    }
    if (!stockActions.length) {
      for (const action of ordered) {
        if (completedRevertActionIds.has(action.id)) {
          outcomes.push({
            actionType: action.type,
            status: restoredDuringRevert ? 'APPLIED' : 'SKIPPED',
            message: restoredDuringRevert
              ? 'Se restauro el consumo vigente del pedido'
              : 'El pedido no tenia una reserva activa',
          });
          continue;
        }
        await runMarkerAction(action);
      }
      return { order: effectiveOrder, outcomes, stockStatus };
    }
    if (!effectiveOrder.warehouseId) {
      throw new BadRequestException(
        'El pedido no tiene almacen para ejecutar acciones de stock',
      );
    }

    const requirements = await resolveRequirements();
    const requiresEffectiveStock = stockActions.some(
      (action) =>
        action.type === ACTIONS.RESERVE_STOCK ||
        action.type === ACTIONS.CONSUME_STOCK,
    );
    if (
      requiresEffectiveStock &&
      (!requirements.length ||
        requirements.some(
          (requirement) =>
            !Number.isFinite(Number(requirement.quantity)) ||
            Number(requirement.quantity) <= 0,
        ))
    ) {
      throw new BadRequestException(
        'El pedido no tiene requisitos de stock validos y positivos',
      );
    }
    const keys = requirements
      .map(({ stockItemId }) => ({
        warehouseId: effectiveOrder.warehouseId!,
        stockItemId,
      }))
      .sort((a, b) =>
        `${a.warehouseId}:${a.stockItemId}`.localeCompare(
          `${b.warehouseId}:${b.stockItemId}`,
        ),
      );
    if (keys.length) {
      await this.inventoryLock.lockSnapshots(keys, tx);
    }
    await this.reservationReconciliation.reconcile(
      effectiveOrder,
      requirements,
      tx,
    );

    const snapshots = new Map<
      string,
      { onHand: number; reserved: number; available: number }
    >();
    for (const requirement of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: effectiveOrder.warehouseId,
          stockItemId: requirement.stockItemId,
          locationId: null,
        },
        tx,
      );
      if (!snapshot) {
        if (onlyRevertsStock) {
          continue;
        }
        throw new BadRequestException('Stock no encontrado');
      }
      snapshots.set(requirement.stockItemId, {
        onHand: Number(snapshot.onHand ?? 0),
        reserved: Number(snapshot.reserved ?? 0),
        available: Number(
          snapshot.available ?? snapshot.onHand - snapshot.reserved,
        ),
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
        if (
          action.type === ACTIONS.RESERVE_STOCK &&
          snapshot.available < quantity
        ) {
          throw new BadRequestException('Stock disponible insuficiente');
        }
        if (
          action.type === ACTIONS.CONSUME_STOCK &&
          snapshot.reserved < quantity
        ) {
          throw new BadRequestException('Stock reservado insuficiente');
        }
        if (
          action.type === ACTIONS.CONSUME_STOCK &&
          snapshot.onHand < quantity
        ) {
          throw new BadRequestException('Stock fisico insuficiente');
        }

        const quantityToApply =
          action.type === ACTIONS.REVERT_STOCK
            ? Math.min(snapshot.reserved, quantity)
            : quantity;
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

    let releasedReservedStock = false;
    for (const action of ordered) {
      if (
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE ||
        action.type === ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW
      ) {
        continue;
      }
      if (await runMarkerAction(action)) {
        continue;
      }
      if (skippedConsumeActionIds.has(action.id)) {
        await this.saleOrderRepo.setReserveBool(
          { saleOrderId: effectiveOrder.id, reserveBool: false },
          tx,
        );
        outcomes.push({
          actionType: action.type,
          status: 'SKIPPED',
          message: 'El stock del pedido ya estaba consumido',
        });
        continue;
      }
      if (skippedReserveActionIds.has(action.id)) {
        outcomes.push({
          actionType: action.type,
          status: 'SKIPPED',
          message: 'El stock del pedido ya estaba reservado',
        });
        continue;
      }
      if (action.id === restoreStockAction?.id && restoreStockOutcome) {
        outcomes.push(restoreStockOutcome);
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
        stockStatus = 'CONSUMED';
        outcomes.push({ actionType: action.type, status: 'APPLIED' });
        continue;
      }
      for (const { stockItemId, quantity } of requirements) {
        const quantityToApply =
          quantitiesByAction.get(action)?.get(stockItemId) ?? quantity;
        if (quantityToApply === 0) {
          continue;
        }
        const base = {
          warehouseId: effectiveOrder.warehouseId,
          stockItemId,
          locationId: null,
        };
        const reservedDelta =
          action.type === ACTIONS.RESERVE_STOCK
            ? quantityToApply
            : -quantityToApply;
        await this.inventoryRepo.incrementReserved(
          { ...base, delta: reservedDelta },
          tx,
        );
        if (action.type === ACTIONS.REVERT_STOCK && quantityToApply > 0) {
          releasedReservedStock = true;
        }
      }
      if (
        action.type === ACTIONS.RESERVE_STOCK ||
        action.type === ACTIONS.REVERT_STOCK
      ) {
        await this.saleOrderRepo.setReserveBool(
          {
            saleOrderId: effectiveOrder.id,
            reserveBool: action.type === ACTIONS.RESERVE_STOCK,
          },
          tx,
        );
        stockStatus =
          action.type === ACTIONS.RESERVE_STOCK ? 'RESERVED' : 'REVERTED';
        outcomes.push({ actionType: action.type, status: 'APPLIED' });
      }
    }
    if (releasedReservedStock) {
      await this.saleOrderRepo.markStockReverted(effectiveOrder.id, tx);
    }
    return { order: effectiveOrder, outcomes, stockStatus };
  }
}
