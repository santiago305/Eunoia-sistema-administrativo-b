import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderItemComponent } from "../entities/sale-order-item-component";

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
}

