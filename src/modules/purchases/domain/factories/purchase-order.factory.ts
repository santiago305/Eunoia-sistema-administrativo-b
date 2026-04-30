import { Money } from "src/shared/value-objets/money.vo";
import { PurchaseOrder } from "../entities/purchase-order";
import { CurrencyType } from "../value-objects/currency-type";
import { PaymentFormType } from "../value-objects/payment-form-type";
import { PurchaseOrderStatus } from "../value-objects/po-status";
import { VoucherDocType } from "../value-objects/voucher-doc-type";
import { PurchaseOrderId } from "../value-objects/purchase-order-id.vo";
import { PurchaseSupplierId } from "../value-objects/purchase-supplier-id.vo";
import { PurchaseWarehouseId } from "../value-objects/purchase-warehouse-id.vo";
import { PurchaseCreditDays } from "../value-objects/credit-days.vo";
import { PurchaseNumQuotas } from "../value-objects/num-quotas.vo";
import { PurchaseOrderDocument } from "../value-objects/purchase-order-document.vo";
import { PurchaseExpectedAt } from "../value-objects/expected-at.vo";
import { PurchaseIssueDate } from "../value-objects/issue-date.vo";
import { PurchaseExpirationDate } from "../value-objects/expiration-date.vo";

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
    imageProdution?: string[];
  }): PurchaseOrder {
    const currency = params.currency ?? CurrencyType.PEN;
    const supplierId = new PurchaseSupplierId(params.supplierId).value;
    const warehouseId = new PurchaseWarehouseId(params.warehouseId).value;
    const creditDays = PurchaseCreditDays.create(params.creditDays ?? 0).value;
    const numQuotas = PurchaseNumQuotas.create(params.numQuotas ?? 0).value;
    const document = PurchaseOrderDocument.create({
      documentType: params.documentType,
      serie: params.serie,
      correlative: params.correlative,
    });
    const expectedAt = params.expectedAt ? PurchaseExpectedAt.create(params.expectedAt) : undefined;
    const dateIssue = params.dateIssue ? PurchaseIssueDate.create(params.dateIssue) : undefined;
    const dateExpiration = params.dateExpiration ? PurchaseExpirationDate.create(params.dateExpiration) : undefined;

    return new PurchaseOrder(
      undefined,
      supplierId,
      warehouseId,
      creditDays,
      numQuotas,
      Money.create(params.totalTaxed ?? 0, currency),
      Money.create(params.totalExempted ?? 0, currency),
      Money.create(params.totalIgv ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
      Money.create(params.total ?? 0, currency),
      document?.documentType,
      document?.serie,
      document?.correlative,
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
      params.imageProdution ?? [],
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
    imageProdution?: string[];
  }): PurchaseOrder {
    const currency = params.currency ?? CurrencyType.PEN;
    const poId = new PurchaseOrderId(params.poId).value;
    const supplierId = new PurchaseSupplierId(params.supplierId).value;
    const warehouseId = new PurchaseWarehouseId(params.warehouseId).value;
    const creditDays = PurchaseCreditDays.create(params.creditDays ?? 0).value;
    const numQuotas = PurchaseNumQuotas.create(params.numQuotas ?? 0).value;
    const document = PurchaseOrderDocument.create({
      documentType: params.documentType,
      serie: params.serie,
      correlative: params.correlative,
    });
    const expectedAt = params.expectedAt ? PurchaseExpectedAt.create(params.expectedAt) : undefined;
    const dateIssue = params.dateIssue ? PurchaseIssueDate.create(params.dateIssue) : undefined;
    const dateExpiration = params.dateExpiration ? PurchaseExpirationDate.create(params.dateExpiration) : undefined;

    return new PurchaseOrder(
      poId,
      supplierId,
      warehouseId,
      creditDays,
      numQuotas,
      Money.create(params.totalTaxed ?? 0, currency),
      Money.create(params.totalExempted ?? 0, currency),
      Money.create(params.totalIgv ?? 0, currency),
      Money.create(params.purchaseValue ?? 0, currency),
      Money.create(params.total ?? 0, currency),
      document?.documentType,
      document?.serie,
      document?.correlative,
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
      params.imageProdution ?? [],
    );
  }

  private constructor() {}
}
