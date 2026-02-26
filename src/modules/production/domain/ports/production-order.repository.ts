import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrder } from "../entity/production-order.entity";
import { ProductionOrderItem } from "../entity/production-order-item";
import { ProductionStatus } from "../value-objects/production-status";

export const PRODUCTION_ORDER_REPOSITORY = Symbol('PRODUCTION_ORDER_REPOSITORY');

export interface ProductionOrderRepository {
  create(order: ProductionOrder, tx?: TransactionContext): Promise<ProductionOrder>;
  findById(id: string, tx?: TransactionContext): Promise<ProductionOrder | null>;
  list(
    params: {
      status?: ProductionStatus;
      warehouseId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: ProductionOrder[];
    total: number;
    page: number;
    limit: number;
  }>;
  update(
    params: {
      productionId: string;
      fromWarehouseId?: string;
      toWarehouseId?: string;
      serieId?: string;
      correlative?: number;
      reference?: string;
      manufactureTime?: number;
      updatedBy?: string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrder | null>;
  setStatus(
    params: {
      productionId: string;
      status: ProductionStatus;
      updatedBy?:string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void>;


  findItemById(productionId: string, itemId: string, tx?: TransactionContext): Promise<ProductionOrderItem | null>;

  listItems(productionId: string, tx?: TransactionContext): Promise<ProductionOrderItem[]>;
  getByIdWithItems(
    productionId: string,
    tx?: TransactionContext,
  ): Promise<{ order: ProductionOrder; items: ProductionOrderItem[] } | null>;
  addItem(item: ProductionOrderItem, tx?: TransactionContext): Promise<ProductionOrderItem>;
  updateItem(
    params: {
      productionId: string;
      itemId: string;
      finishedVariantId?: string;
      fromLocationId?: string;
      toLocationId?: string;
      quantity?: number;
      unitCost?: number;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrderItem | null>;
  removeItem(productionId: string, itemId: string, tx?: TransactionContext): Promise<boolean>;
}
