import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { PurchaseOrder } from "../entities/purchase-order";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";
import {
  InvalidExpectedAtError,
  InvalidExpirationDateError,
  InvalidIssueDateError,
} from "../errors/purchase-order.errors";

type DateInput = Date | string | undefined | null;

export class PurchaseOrderFactory {
  static createNew(params: {
    supplierId: string;
    warehouseId: string;
    creditDays?: number;
    numQuotas?: number;
    totalTaxed?: number | Money;
    totalExempted?: number | Money;
    totalIgv?: number | Money;
    purchaseValue?: number | Money;
    total?: number | Money;
    documentType?: VoucherDocType;
    serie?: string;
    correlative?: number;
    currency?: CurrencyType;
    paymentForm?: PaymentFormType;
    note?: string;
    status?: PurchaseOrderStatus;
    isActive?: boolean;
    expectedAt?: DateInput;
    dateIssue?: DateInput;
    dateExpiration?: DateInput;
    createdAt?: Date;
    createdBy?: string;
  }): PurchaseOrder {
    const currency = params.currency ?? CurrencyType.PEN;
    const expectedAt = this.parseDate(params.expectedAt, InvalidExpectedAtError);
    const dateIssue = this.parseDate(params.dateIssue, InvalidIssueDateError);
    const dateExpiration = this.parseDate(params.dateExpiration, InvalidExpirationDateError);

    return new PurchaseOrder(
      undefined,
      params.supplierId,
      params.warehouseId,
      params.creditDays ?? 0,
      params.numQuotas ?? 0,
      Money.create(params.totalTaxed ?? 0, currency),
      Money.create(params.totalExempted ?? 0, currency),
      Money.create(params.totalIgv ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
      Money.create(params.total ?? 0, currency),
      params.documentType,
      params.serie,
      params.correlative,
      currency,
      params.paymentForm,
      params.note,
      params.status ?? PurchaseOrderStatus.DRAFT,
      params.isActive ?? true,
      expectedAt,
      dateIssue,
      dateExpiration,
      params.createdAt,
      params.createdBy,
    );
  }

  static reconstitute(params: {
    poId: string;
    supplierId: string;
    warehouseId: string;
    creditDays?: number;
    numQuotas?: number;
    totalTaxed: number | Money;
    totalExempted: number | Money;
    totalIgv: number | Money;
    purchaseValue: number | Money;
    total: number | Money;
    documentType?: VoucherDocType;
    serie?: string;
    correlative?: number;
    currency?: CurrencyType;
    paymentForm?: PaymentFormType;
    note?: string;
    status: PurchaseOrderStatus;
    isActive?: boolean;
    expectedAt?: DateInput;
    dateIssue?: DateInput;
    dateExpiration?: DateInput;
    createdAt?: Date;
    createdBy?: string;
  }): PurchaseOrder {
    const currency = params.currency ?? CurrencyType.PEN;
    const expectedAt = this.parseDate(params.expectedAt, InvalidExpectedAtError);
    const dateIssue = this.parseDate(params.dateIssue, InvalidIssueDateError);
    const dateExpiration = this.parseDate(params.dateExpiration, InvalidExpirationDateError);

    return new PurchaseOrder(
      params.poId,
      params.supplierId,
      params.warehouseId,
      params.creditDays ?? 0,
      params.numQuotas ?? 0,
      Money.create(params.totalTaxed ?? 0, currency),
      Money.create(params.totalExempted ?? 0, currency),
      Money.create(params.totalIgv ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
      Money.create(params.total ?? 0, currency),
      params.documentType,
      params.serie,
      params.correlative,
      currency,
      params.paymentForm,
      params.note,
      params.status,
      params.isActive ?? true,
      expectedAt,
      dateIssue,
      dateExpiration,
      params.createdAt,
      params.createdBy,
    );
  }

  private static parseDate(
    value: DateInput,
    ErrorType: new () => Error,
  ): Date | undefined {
    if (value === undefined || value === null) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ErrorType();
    }
    return date;
  }
}
