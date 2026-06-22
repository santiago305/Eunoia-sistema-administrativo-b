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
    if (amountPaid < 0 || amountPending < 0) {
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
      params.createdByUserId,
      params.createdAt,
      params.updatedAt,
    );
  }

  withBalance(amountPaid: number, now = new Date()) {
    const normalizedPaid = Math.min(Math.max(Number(amountPaid), 0), this.amountTotal);
    const amountPending = Math.max(this.amountTotal - normalizedPaid, 0);
    let status: PayableStatus = "PENDING";
    if (amountPending <= 0) status = "PAID";
    else if (normalizedPaid > 0) status = "PARTIAL";
    else if (this.status === "OVERDUE") status = "OVERDUE";

    return AccountPayable.create({
      accountPayableId: this.accountPayableId,
      purchaseId: this.purchaseId,
      quotaId: this.quotaId,
      supplierId: this.supplierId,
      description: this.description,
      currency: this.currency,
      amountTotal: this.amountTotal,
      amountPaid: normalizedPaid,
      amountPending,
      dueDate: this.dueDate,
      status,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }
}

