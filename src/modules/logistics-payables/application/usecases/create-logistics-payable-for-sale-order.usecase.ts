import { BadRequestException, Inject } from "@nestjs/common";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import {
  LOGISTICS_PAYABLES_REPOSITORY,
  LogisticsPayablesRepository,
} from "../../domain/ports/logistics-payables.repository";

export type CreateLogisticsPayableForSaleOrderInput = {
  saleOrderId: string;
  serie?: string | null;
  correlative?: number | null;
  agencySubsidiaryId?: string | null;
  deliveryCost?: number | null;
  deliveryDate?: string | null;
  scheduleDate?: string | null;
  createdByUserId?: string | null;
};

export type CreateLogisticsPayableForSaleOrderOutput =
  | { created: false; reason: "NO_AGENCY" | "NO_AMOUNT" | "AGENCY_NOT_PAYABLE" | "ALREADY_EXISTS" | "UPDATED" | "CANCELLED" | "UNCHANGED" }
  | { created: true; purchaseId: string; accountPayableId: string };

export class CreateLogisticsPayableForSaleOrderUsecase {
  constructor(
    @Inject(LOGISTICS_PAYABLES_REPOSITORY)
    private readonly repo: LogisticsPayablesRepository,
  ) {}

  async execute(
    input: CreateLogisticsPayableForSaleOrderInput,
    tx?: TransactionContext,
  ): Promise<CreateLogisticsPayableForSaleOrderOutput> {
    const agencySubsidiaryId = input.agencySubsidiaryId?.trim();
    if (!agencySubsidiaryId) return { created: false, reason: "NO_AGENCY" };

    const amount = Number(input.deliveryCost ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return { created: false, reason: "NO_AMOUNT" };

    const existing = await this.repo.findActiveBySaleOrderId(input.saleOrderId, tx);
    if (existing) return { created: false, reason: "ALREADY_EXISTS" };

    const config = await this.repo.findSubsidiaryPayableConfig(agencySubsidiaryId, tx);
    if (!config?.generatesPayable) return { created: false, reason: "AGENCY_NOT_PAYABLE" };
    if (!config.payableSupplierId) {
      throw new BadRequestException("La agencia pagable no tiene proveedor asociado");
    }

    const dueDate = this.resolveDueDate(input);
    const orderCode = [input.serie, input.correlative].filter(Boolean).join("-") || input.saleOrderId.slice(0, 8);
    const description = config.payableDescription?.trim() || `Envio pedido ${orderCode}`;
    const purchase = await this.repo.createInternalPurchase(
      {
        supplierId: config.payableSupplierId,
        total: amount,
        currency: CurrencyType.PEN,
        note: `Egreso logistico pedido ${orderCode}`,
        createdByUserId: input.createdByUserId ?? null,
        dateIssue: new Date(),
        dateExpiration: dueDate,
      },
      tx,
    );

    const payable = await this.repo.createAccountPayable(
      {
        purchaseId: purchase.purchaseId,
        supplierId: config.payableSupplierId,
        description,
        currency: CurrencyType.PEN,
        amountTotal: amount,
        dueDate,
        createdByUserId: input.createdByUserId ?? null,
      },
      tx,
    );

    await this.repo.createLink(
      {
        saleOrderId: input.saleOrderId,
        purchaseId: purchase.purchaseId,
        accountPayableId: payable.accountPayableId,
        agencySubsidiaryId,
        amount,
        status: "ACTIVE",
      },
      tx,
    );

    return {
      created: true,
      purchaseId: purchase.purchaseId,
      accountPayableId: payable.accountPayableId,
    };
  }

  private resolveDueDate(input: CreateLogisticsPayableForSaleOrderInput): Date {
    const raw = input.deliveryDate || input.scheduleDate;
    const date = raw ? new Date(raw) : new Date();
    if (Number.isNaN(date.getTime())) return new Date();
    return date;
  }
}
