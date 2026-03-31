import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { CreateCreditQuotaInput } from "../../dtos/credit-quota/input/create.input";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";

export class CreateCreditQuotaUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateCreditQuotaInput, poId?:string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (input.totalPaid !== undefined && input.totalPaid > input.totalToPay) {
        throw new BadRequestException({
          type: "error",
          message: "El total pagado no puede ser mayor al total a pagar",
        });
      }

      const expirationDate = new Date(input.expirationDate);
      if (Number.isNaN(expirationDate.getTime())) {
        throw new BadRequestException({
          type: "error",
          message: "Fecha de expiracion invalida",
        });
      }

      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : undefined;
      if (paymentDate && Number.isNaN(paymentDate.getTime())) {
        throw new BadRequestException({
          type: "error",
          message: "Fecha de pago invalida",
        });
      }

      const quota = new CreditQuota(
        undefined,
        input.number,
        expirationDate,
        input.totalToPay,
        input.totalPaid ?? 0,
        PayDocType.PURCHASE,
        paymentDate,
        this.clock.now(),
        input.poId ?? poId,
      );

      let created: CreditQuota;
      try {
        created = await this.creditQuotaRepo.create(quota, tx);
      } catch {
        throw new BadRequestException({
          type: "error",
          message: "No se pudo crear la cuota",
        });
      }

      return { type: "success", message: "Cuota creada con exito" };
    });
  }
}
