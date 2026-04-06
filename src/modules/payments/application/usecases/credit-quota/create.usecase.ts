import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CreateCreditQuotaInput } from "../../dtos/credit-quota/input/create.input";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { PaymentsFactory } from "src/modules/payments/domain/factories/payments.factory";

export class CreateCreditQuotaUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateCreditQuotaInput, poId?: string): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (input.totalPaid !== undefined && input.totalPaid > input.totalToPay) {
        throw new BadRequestException("El total pagado no puede ser mayor al total a pagar");
      }

      const expirationDate = new Date(input.expirationDate);
      if (Number.isNaN(expirationDate.getTime())) {
        throw new BadRequestException("Fecha de expiracion invalida");
      }

      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : undefined;
      if (paymentDate && Number.isNaN(paymentDate.getTime())) {
        throw new BadRequestException("Fecha de pago invalida");
      }

      const quota = PaymentsFactory.createCreditQuota({
        number: input.number,
        expirationDate,
        totalToPay: input.totalToPay,
        totalPaid: input.totalPaid ?? 0,
        fromDocumentType: PayDocType.PURCHASE,
        paymentDate,
        createdAt: this.clock.now(),
        poId: input.poId ?? poId,
      });

      try {
        await this.creditQuotaRepo.create(quota, tx);
      } catch {
        throw new BadRequestException("No se pudo crear la cuota");
      }

      return { message: "Cuota creada con exito" };
    });
  }
}
