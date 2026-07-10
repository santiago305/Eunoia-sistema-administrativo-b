import { randomUUID } from "crypto";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import {
  calculateFirstRecurringDueDate,
  calculateNextRecurringDueDate,
  getBillingAnchorDay,
} from "../services/recurring-due-date-calculator";
import { RecurringFrequency } from "../value-objects/recurring-frequency";
import { RecurringStatus } from "../value-objects/recurring-status";

const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0];

export const getRecurringPeriodKey = (date: Date, frequency: RecurringFrequency) => {
  const year = date.getUTCFullYear();
  if (frequency === "ANNUAL") return String(year);
  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export class RecurringPurchaseTemplate {
  private constructor(
    public readonly recurringPurchaseTemplateId: string,
    public readonly supplierId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly frequency: RecurringFrequency,
    public readonly purchaseType: PurchaseType,
    public readonly currency: CurrencyType,
    public readonly amount: number,
    public readonly startDate: Date,
    public readonly nextDueDate: Date,
    public readonly billingAnchorDay: number,
    public readonly status: RecurringStatus,
    public readonly reminderDaysBefore: number[],
    public readonly createdByUserId: string | undefined,
    public readonly lastGeneratedAt?: Date,
    public readonly lastGeneratedPeriodKey?: string,
    public readonly lastGeneratedPurchaseId?: string,
    public readonly lastGeneratedAccountPayableId?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(params: {
    recurringPurchaseTemplateId?: string;
    supplierId: string;
    name: string;
    description?: string;
    frequency: RecurringFrequency;
    purchaseType?: PurchaseType;
    currency: CurrencyType | "PEN" | "USD";
    amount: number;
    startDate: Date;
    nextDueDate?: Date;
    billingAnchorDay?: number;
    status?: RecurringStatus;
    reminderDaysBefore?: number[];
    createdByUserId?: string;
    lastGeneratedAt?: Date;
    lastGeneratedPeriodKey?: string;
    lastGeneratedPurchaseId?: string;
    lastGeneratedAccountPayableId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.supplierId?.trim()) throw new Error("La recurrencia debe tener proveedor");
    if (!params.name?.trim()) throw new Error("La recurrencia debe tener nombre");
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error("El monto recurrente debe ser mayor a cero");
    }
    if (Number.isNaN(params.startDate.getTime())) throw new Error("La fecha inicial no es valida");
    const billingAnchorDay = params.billingAnchorDay ?? getBillingAnchorDay(params.startDate);
    if (!Number.isInteger(billingAnchorDay) || billingAnchorDay < 1 || billingAnchorDay > 31) {
      throw new Error("El dia ancla de facturacion no es valido");
    }

    const reminderDaysBefore = (params.reminderDaysBefore?.length
      ? params.reminderDaysBefore
      : DEFAULT_REMINDER_DAYS
    )
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0)
      .sort((a, b) => b - a);

    return new RecurringPurchaseTemplate(
      params.recurringPurchaseTemplateId ?? randomUUID(),
      params.supplierId,
      params.name.trim(),
      params.description?.trim() || undefined,
      params.frequency,
      params.purchaseType ?? PurchaseType.SUBSCRIPTION,
      params.currency as CurrencyType,
      Number(params.amount),
      params.startDate,
      params.nextDueDate ?? calculateFirstRecurringDueDate(params.startDate, params.frequency),
      billingAnchorDay,
      params.status ?? "ACTIVE",
      reminderDaysBefore,
      params.createdByUserId,
      params.lastGeneratedAt,
      params.lastGeneratedPeriodKey,
      params.lastGeneratedPurchaseId,
      params.lastGeneratedAccountPayableId,
      params.createdAt,
      params.updatedAt,
    );
  }

  pause(now = new Date()) {
    if (this.status === "CANCELLED") throw new Error("No se puede pausar una recurrencia cancelada");
    return this.withState("PAUSED", now);
  }

  resume(now = new Date()) {
    if (this.status === "CANCELLED") throw new Error("No se puede reanudar una recurrencia cancelada");
    return this.withState("ACTIVE", now);
  }

  cancel(now = new Date()) {
    return this.withState("CANCELLED", now);
  }

  isDue(now: Date) {
    return this.status === "ACTIVE" && this.nextDueDate.getTime() <= now.getTime();
  }

  currentPeriodKey() {
    return getRecurringPeriodKey(this.nextDueDate, this.frequency);
  }

  markGenerated(params: {
    purchaseId: string;
    accountPayableId: string;
    generatedAt: Date;
  }) {
    return RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: this.recurringPurchaseTemplateId,
      supplierId: this.supplierId,
      name: this.name,
      description: this.description,
      frequency: this.frequency,
      purchaseType: this.purchaseType,
      currency: this.currency,
      amount: this.amount,
      startDate: this.startDate,
      nextDueDate: calculateNextRecurringDueDate(
        this.nextDueDate,
        this.frequency,
        this.billingAnchorDay,
      ),
      billingAnchorDay: this.billingAnchorDay,
      status: this.status,
      reminderDaysBefore: this.reminderDaysBefore,
      createdByUserId: this.createdByUserId,
      lastGeneratedAt: params.generatedAt,
      lastGeneratedPeriodKey: this.currentPeriodKey(),
      lastGeneratedPurchaseId: params.purchaseId,
      lastGeneratedAccountPayableId: params.accountPayableId,
      createdAt: this.createdAt,
      updatedAt: params.generatedAt,
    });
  }

  private withState(status: RecurringStatus, updatedAt: Date) {
    return RecurringPurchaseTemplate.create({
      recurringPurchaseTemplateId: this.recurringPurchaseTemplateId,
      supplierId: this.supplierId,
      name: this.name,
      description: this.description,
      frequency: this.frequency,
      purchaseType: this.purchaseType,
      currency: this.currency,
      amount: this.amount,
      startDate: this.startDate,
      nextDueDate: this.nextDueDate,
      billingAnchorDay: this.billingAnchorDay,
      status,
      reminderDaysBefore: this.reminderDaysBefore,
      createdByUserId: this.createdByUserId,
      lastGeneratedAt: this.lastGeneratedAt,
      lastGeneratedPeriodKey: this.lastGeneratedPeriodKey,
      lastGeneratedPurchaseId: this.lastGeneratedPurchaseId,
      lastGeneratedAccountPayableId: this.lastGeneratedAccountPayableId,
      createdAt: this.createdAt,
      updatedAt,
    });
  }
}
