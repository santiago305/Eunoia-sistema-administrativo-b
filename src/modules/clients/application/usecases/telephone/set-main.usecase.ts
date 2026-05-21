import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";

export class SetTelephoneMainUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async execute(input: { telephoneId: string }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const tel = await this.telephoneRepo.findById(input.telephoneId, tx);
      if (!tel) {
        throw new NotFoundException("Telefono no encontrado");
      }

      await this.telephoneRepo.unsetMainByClientId(tel.clientId.value, tx);
      await this.telephoneRepo.setMain(tel.telephoneId.value, tx);

      return { message: "Telefono principal actualizado" };
    });
  }
}
