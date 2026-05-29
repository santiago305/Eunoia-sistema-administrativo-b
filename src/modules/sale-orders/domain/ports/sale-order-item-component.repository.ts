import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderItemComponent } from "../entities/sale-order-item-component";
import { SaleOrderComponentsOutput } from "../../application/dtos/sale-order-search/output/sale-order-search-state.output";

export const SALE_ORDER_ITEM_COMPONENT_REPOSITORY = Symbol("SALE_ORDER_ITEM_COMPONENT_REPOSITORY");

export interface SaleOrderItemComponentRepository {
  bulkCreate(
    input: Array<{
      saleOrderItemId: string;
      skuId: string;
      referencePackItemId?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>,
    tx?: TransactionContext,
  ): Promise<SaleOrderItemComponent[]>;

  listBySaleOrderItemIds(saleOrderItemIds: string[], tx?: TransactionContext): Promise<SaleOrderItemComponent[]>;
  deleteBySaleOrderItemIds(saleOrderItemIds: string[], tx?: TransactionContext): Promise<void>;

  findComponentsBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderComponentsOutput>;
}
