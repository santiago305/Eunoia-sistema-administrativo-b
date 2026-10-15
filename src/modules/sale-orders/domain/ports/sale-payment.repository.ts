import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SalePayment } from "../entities/sale-payment";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export const SALE_PAYMENT_REPOSITORY = Symbol("SALE_PAYMENT_REPOSITORY");

export interface SalePaymentRepository {
  bulkCreate(
    input: Array<{
      saleOrderId: string;
      bankAccountId?: string | null;
      companyPaymentAccountId?: string | null;
      paymentMethodId?: string | null;
      currency?: CurrencyType;
      status?: "PENDING_CONFIRMATION" | "POSTED" | "CANCELLED" | "REVERSED";
      operationCode?: string | null;
      date: Date;
      method: string;
      operationNumber?: string | null;
      amount: number;
      note?: string | null;
      paymentPhoto?: string | null;
      createdByUserId?: string | null;
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
      companyPaymentAccountId?: string | null;
      paymentMethodId?: string | null;
      operationCode?: string | null;
      date: Date;
      method: string;
      operationNumber?: string | null;
      amount: number;
      note?: string | null;
      updatedByUserId?: string | null;
      expectedVersion?: number;
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

  getPostedAppliedTotalsBySaleOrderIds?(
    saleOrderIds: string[],
    tx?: TransactionContext,
  ): Promise<Array<{ saleOrderId: string; amount: number }>>;

  /** Total operativo del pedido; incluye por confirmar y contabilizados aplicados. */
  getOperationalAppliedTotalsBySaleOrderIds?(
    saleOrderIds: string[],
    tx?: TransactionContext,
  ): Promise<Array<{ saleOrderId: string; amount: number }>>;

  voidPostedPayment(
    input: {
      saleOrderId: string;
      paymentId: string;
      voidedByUserId: string;
      voidReason: string;
      voidedAt: Date;
    },
    tx?: TransactionContext,
  ): Promise<{ payment: SalePayment; transitioned: boolean } | null>;
}
