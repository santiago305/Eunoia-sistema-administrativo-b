import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { PAYMENT_METHOD_REPOSITORY, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY, CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
import { UpdateCompanyMethodInput } from "../../dtos/company-method/input/update.input";
import { PaymentMethodNotFoundError } from "../../errors/payment-method-not-found.error";
import { PaymentMethodRelationNotFoundError } from "../../errors/payment-method-relation-not-found.error";
import { PaymentMethodOutputMapper } from "../../mappers/payment-method-output.mapper";

export class UpdateCompanyMethodUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: PaymentMethodRepository,
    @Inject(COMPANY_METHOD_REPOSITORY)
    private readonly companyMethodRepo: CompanyMethodRepository,
  ) {}

  async execute(input: UpdateCompanyMethodInput) {
    return this.uow.runInTransaction(async (tx) => {
      const hasNumber = Object.prototype.hasOwnProperty.call(input, "number");
      if (input.methodId === undefined && !hasNumber) {
        throw new BadRequestException("Debe enviar al menos un campo para actualizar");
      }

      const current = await this.companyMethodRepo.findDetailById(input.companyMethodId, tx);
      if (!current) {
        throw new NotFoundException(new PaymentMethodRelationNotFoundError().message);
      }

      let nextMethod = current.method;
      let nextMethodId = current.relation.methodId;
      if (input.methodId !== undefined) {
        const method = await this.paymentMethodRepo.findById(input.methodId, tx);
        if (!method) {
          throw new NotFoundException(new PaymentMethodNotFoundError().message);
        }
        nextMethod = method;
        nextMethodId = input.methodId;
      }

      const nextNumber = hasNumber ? input.number ?? null : current.relation.number ?? null;
      const duplicate = await this.companyMethodRepo.findDuplicate(
        current.relation.companyId,
        nextMethodId,
        nextNumber,
        tx,
      );
      if (duplicate && duplicate.companyMethodId !== current.relation.companyMethodId) {
        throw new ConflictException("La relacion ya existe");
      }

      try {
        const updated = await this.companyMethodRepo.update(
          {
            companyMethodId: input.companyMethodId,
            methodId: input.methodId,
            ...(hasNumber ? { number: nextNumber } : {}),
          },
          tx,
        );
        if (!updated) {
          throw new BadRequestException("No se pudo actualizar la relacion");
        }

        return successResponse("Relacion actualizada correctamente", PaymentMethodOutputMapper.toCompanyMethodOutput({
          relation: updated,
          method: nextMethod,
        }));
      } catch (error: any) {
        if (error?.code === "23505") {
          throw new ConflictException("La relacion ya existe");
        }
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          throw error;
        }
        throw new BadRequestException("No se pudo actualizar la relacion");
      }
    });
  }
}
