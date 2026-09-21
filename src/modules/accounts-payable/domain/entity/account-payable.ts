import { randomUUID } from "crypto";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayableStatus } from "../value-objects/payable-status";

export class AccountPayable {
  private constructor(
    public readonly accountPayableId: string,
    public readonly purchaseId: string,
    public readonly quotaId: string | undefined,
    public readonly supplierId: string | undefined,
    public readonly description: string | undefined,
    public readonly currency: CurrencyType,
    public readonly amountTotal: number,
    public readonly amountPaid: number,
    public readonly amountPending: number,
    public readonly dueDate: Date | undefined,
    public readonly status: PayableStatus,
    public readonly requiresManualReview: boolean,
    public readonly reconciliationNote: string | undefined,
    public readonly createdByUserId: string | undefined,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    accountPayableId?: string;
    purchaseId: string;
    quotaId?: string;
    supplierId?: string;
    description?: string;
    currency: CurrencyType | "PEN" | "USD";
    amountTotal: number;
    amountPaid?: number;
    amountPending?: number;
    dueDate?: Date;
    status?: PayableStatus;
    requiresManualReview?: boolean;
    reconciliationNote?: string;
    createdByUserId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.purchaseId?.trim()) {
      throw new Error("La cuenta por pagar debe estar vinculada a una compra");
    }
    if (!Number.isFinite(params.amountTotal) || params.amountTotal <= 0) {
      throw new Error("El total de la cuenta por pagar debe ser mayor a cero");
    }

    const amountPaid = params.amountPaid ?? 0;
    const amountPending = params.amountPending ?? Math.max(params.amountTotal - amountPaid, 0);
    const balanceDifference = Math.abs(Number(params.amountTotal) - (Number(amountPaid) + Number(amountPending)));
    if (amountPaid < 0 || amountPending < 0 || balanceDifference > 0.01) {
      throw new Error("Los importes de la cuenta por pagar no pueden ser negativos");
    }

    return new AccountPayable(
      params.accountPayableId ?? randomUUID(),
      params.purchaseId,
      params.quotaId,
      params.supplierId,
      params.description?.trim() || undefined,
      params.currency as CurrencyType,
      Number(params.amountTotal),
      Number(amountPaid),
      Number(amountPending),
      params.dueDate,
      params.status ?? "PENDING",
      params.requiresManualReview ?? false,
      params.reconciliationNote?.trim() || undefined,
      params.createdByUserId,
      params.createdAt,
      params.updatedAt,
    );
  }

  withBalance(amountPaid: number, now = new Date()) {
    const normalizedPaid = Number(amountPaid);
    if (!Number.isFinite(normalizedPaid) || normalizedPaid < 0) {
      throw new Error("El importe pagado no puede ser negativo");
    }
    if (normalizedPaid > this.amountTotal + 0.01) {
      throw new Error("El importe pagado no puede superar el total de la cuenta por pagar");
    }
    const settledPaid = Math.min(normalizedPaid, this.amountTotal);
    const amountPending = Math.max(this.amountTotal - settledPaid, 0);
    let status: PayableStatus = "PENDING";
    if (amountPending <= 0) status = "PAID";
    else if (settledPaid > 0) status = "PARTIAL";
    else if (this.status === "OVERDUE") status = "OVERDUE";

    return AccountPayable.create({
      accountPayableId: this.accountPayableId,
      purchaseId: this.purchaseId,
      quotaId: this.quotaId,
      supplierId: this.supplierId,
      description: this.description,
      currency: this.currency,
      amountTotal: this.amountTotal,
      amountPaid: settledPaid,
      amountPending,
      dueDate: this.dueDate,
      status,
      requiresManualReview: this.requiresManualReview,
      reconciliationNote: this.reconciliationNote,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }
}

