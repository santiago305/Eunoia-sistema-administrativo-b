import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SalePayment } from "../entities/sale-payment";

export const SALE_PAYMENT_REPOSITORY = Symbol("SALE_PAYMENT_REPOSITORY");

export interface SalePaymentRepository {
  bulkCreate(
    input: Array<{
      saleOrderId: string;
      bankAccountId?: string | null;
      date: Date;
      method: string;
      operationNumber?: string | null;
      amount: number;
      note?: string | null;
      paymentPhoto?: string | null;
    }>,
    tx?: TransactionContext,
  ): Promise<SalePayment[]>;

  deleteBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<void>;

  listBySaleOrderId(
    saleOrderId: string,
    tx?: TransactionContext,
  ): Promise<SalePayment[]>;

  update(
    input: {
      saleOrderId: string;
      paymentId: string;
      bankAccountId?: string | null;
      date: Date;
      method: string;
      operationNumber?: string | null;
      amount: number;
      note?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<void>;

  deleteByIds(
    input: { saleOrderId: string; paymentIds: string[] },
    tx?: TransactionContext,
  ): Promise<void>;

  deleteById(
    input: { saleOrderId: string; paymentId: string },
    tx?: TransactionContext,
  ): Promise<boolean>;

  listBySaleOrderIds(
    saleOrderIds: string[],
    tx?: TransactionContext,
  ): Promise<SalePayment[]>;
}
