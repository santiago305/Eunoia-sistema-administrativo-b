import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import { UpdateTelephoneInput } from "../../dtos/telephone/input/update.input";
import { TelephoneNotFoundError } from "../../errors/telephone-not-found.error";

export class UpdateTelephoneUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async execute(input: UpdateTelephoneInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.telephoneRepo.findById(input.telephoneId, tx);
      if (!current) {
        throw new NotFoundException(new TelephoneNotFoundError().message);
      }

      if (input.isMain === true) {
        await this.telephoneRepo.unsetMainByClientId(current.clientId.value, tx);
      }

      const updated = await this.telephoneRepo.update(
        {
          telephoneId: current.telephoneId.value,
          number: input.number,
          isMain: input.isMain,
        },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("No se pudo actualizar el telefono");
      }

      return { message: "Telefono actualizado con exito" };
    });
  }
}
