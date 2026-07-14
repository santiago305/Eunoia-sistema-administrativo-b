import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import {
  LOGISTICS_PAYABLES_REPOSITORY,
  LogisticsPayablesRepository,
} from "../../domain/ports/logistics-payables.repository";
import {
  CreateLogisticsPayableForSaleOrderInput,
  CreateLogisticsPayableForSaleOrderUsecase,
} from "./create-logistics-payable-for-sale-order.usecase";

@Injectable()
export class ReconcileLogisticsPayableForSaleOrderUsecase {
  constructor(
    private readonly createLogisticsPayable: CreateLogisticsPayableForSaleOrderUsecase,
    @Inject(LOGISTICS_PAYABLES_REPOSITORY)
    private readonly repo: LogisticsPayablesRepository,
  ) {}

  async execute(input: CreateLogisticsPayableForSaleOrderInput, tx?: TransactionContext) {
    const existing = await this.repo.findActiveBySaleOrderId(input.saleOrderId, tx);
    if (!existing) return this.createLogisticsPayable.execute(input, tx);

    const nextAmount = Number(input.deliveryCost ?? 0);
    if (!input.agencySubsidiaryId || !Number.isFinite(nextAmount) || nextAmount <= 0) {
      if (existing.amountPaid > 0) {
        throw new BadRequestException("No se puede cancelar un egreso logistico con pagos aprobados");
      }
      await this.repo.cancelPending({ saleOrderId: input.saleOrderId, ...existing }, tx);
      return { created: false as const, reason: "CANCELLED" as const };
    }

    if (nextAmount === existing.amount) return { created: false as const, reason: "UNCHANGED" as const };
    if (existing.amountPaid > 0 && nextAmount < existing.amount) {
      throw new BadRequestException("No se puede reducir un egreso logistico con pagos aprobados");
    }

    await this.repo.updatePendingAmounts(
      {
        saleOrderId: input.saleOrderId,
        purchaseId: existing.purchaseId,
        accountPayableId: existing.accountPayableId,
        amount: nextAmount,
      },
      tx,
    );
    return { created: false as const, reason: "UPDATED" as const };
  }
}
