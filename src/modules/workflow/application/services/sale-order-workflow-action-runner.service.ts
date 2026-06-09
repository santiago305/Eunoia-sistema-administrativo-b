import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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
  ) {}

  async run(order: SaleOrder, actions: WorkflowAction[], tx: TransactionContext): Promise<void> {
    if (!actions.length) return;
    const ordered = [...actions].sort((a, b) => a.position - b.position);
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
      }
      return;
    }

    const onlyRevertsStock = stockActions.every((action) => action.type === ACTIONS.REVERT_STOCK);
    if (!order.warehouseId && onlyRevertsStock) {
      return;
    }
    if (!order.warehouseId) {
      throw new BadRequestException("El pedido no tiene almacen para ejecutar acciones de stock");
    }

    const requirements = await this.requirements.resolve(order, tx);
    const keys = requirements
      .map(({ stockItemId }) => ({ warehouseId: order.warehouseId!, stockItemId }))
      .sort((a, b) => `${a.warehouseId}:${a.stockItemId}`.localeCompare(`${b.warehouseId}:${b.stockItemId}`));
    if (keys.length) {
      await this.inventoryLock.lockSnapshots(keys, tx);
    }

    const snapshots = new Map<string, { onHand: number; reserved: number; available: number }>();
    for (const requirement of requirements) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        { warehouseId: order.warehouseId, stockItemId: requirement.stockItemId, locationId: null },
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
      for (const { stockItemId, quantity } of requirements) {
        const quantityToApply = quantitiesByAction.get(action)?.get(stockItemId) ?? quantity;
        if (quantityToApply === 0) {
          continue;
        }
        const base = { warehouseId: order.warehouseId, stockItemId, locationId: null };
        const reservedDelta = action.type === ACTIONS.RESERVE_STOCK ? quantityToApply : -quantityToApply;
        await this.inventoryRepo.incrementReserved({ ...base, delta: reservedDelta }, tx);
        if (action.type === ACTIONS.CONSUME_STOCK) {
          await this.inventoryRepo.incrementOnHand({ ...base, delta: -quantityToApply }, tx);
        }
      }
    }
  }
}
