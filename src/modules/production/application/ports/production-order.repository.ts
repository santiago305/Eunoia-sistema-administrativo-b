import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrder } from "../../domain/entity/production-order.entity";
import { ProductionOrderItem } from "../../domain/entity/production-order-item";
import { ProductionOrderListItemRM, ProductionOrderListSerieRM } from "../../domain/read-models/production-order-list-item.rm";
import { ProductionStatus } from "../../domain/value-objects/production-status.vo";
import { ProductionSearchRule } from "../dto/production-search/production-search-snapshot";

export const PRODUCTION_ORDER_REPOSITORY = Symbol('PRODUCTION_ORDER_REPOSITORY');

export interface ProductionOrderRepository {
  create(order: ProductionOrder, tx?: TransactionContext): Promise<ProductionOrder>;
  findById(id: string, tx?: TransactionContext): Promise<ProductionOrder | null>;
  listAllByStatus(status: ProductionStatus, tx?: TransactionContext): Promise<ProductionOrder[]>;
  list(
    params: {
      filters?: ProductionSearchRule[];
      q?: string;
      status?: ProductionStatus;
      warehouseId?: string;
      skuId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: ProductionOrderListItemRM[];
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
      manufactureDate?: Date;
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
  removeItems(productionId: string, tx?: TransactionContext): Promise<number>;
  getByIdWithItems(
    productionId: string,
    tx?: TransactionContext,
  ): Promise<{ order: ProductionOrder; items: ProductionOrderItem[]; serie?: ProductionOrderListSerieRM | null } | null>;
  addItem(item: ProductionOrderItem, tx?: TransactionContext): Promise<ProductionOrderItem>;
  updateItem(
    params: {
      productionId: string;
      itemId: string;
      finishedItemId?: string;
      fromLocationId?: string | null;
      toLocationId?: string | null;
      quantity?: number;
      wasteQty?: number;
      unitCost?: number;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrderItem | null>;
  removeItem(productionId: string, itemId: string, tx?: TransactionContext): Promise<boolean>;
}
