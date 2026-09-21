import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SupplierPaymentDestination } from "../entity/supplier-payment-destination";

export const SUPPLIER_PAYMENT_DESTINATION_REPOSITORY = Symbol("SUPPLIER_PAYMENT_DESTINATION_REPOSITORY");

export interface SupplierPaymentDestinationRepository {
  create(destination: SupplierPaymentDestination, tx?: TransactionContext): Promise<SupplierPaymentDestination>;
  listBySupplier(supplierId: string, params?: { currency?: string; methodId?: string; includeInactive?: boolean }, tx?: TransactionContext): Promise<SupplierPaymentDestination[]>;
  findById(id: string, tx?: TransactionContext): Promise<SupplierPaymentDestination | null>;
  findDuplicate(input: { supplierId: string; methodId: string; currency: string; sensitiveHash?: string | null }, tx?: TransactionContext): Promise<SupplierPaymentDestination | null>;
  update(destination: SupplierPaymentDestination, tx?: TransactionContext): Promise<SupplierPaymentDestination | null>;
  clearDefault(input: { supplierId: string; currency: string; type: string; exceptId?: string }, tx?: TransactionContext): Promise<void>;
}
