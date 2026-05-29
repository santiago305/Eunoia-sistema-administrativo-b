import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SaleOrderItem } from "../entities/sale-order-item";

export const SALE_ORDER_ITEM_REPOSITORY = Symbol("SALE_ORDER_ITEM_REPOSITORY");

export interface SaleOrderItemRepository {
  bulkCreate(
    input: Array<{
      saleOrderId: string;
      referencePackId?: string | null;
      description?: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>,
    tx?: TransactionContext,
  ): Promise<SaleOrderItem[]>;

  listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderItem[]>;
  deleteBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<void>;
}
