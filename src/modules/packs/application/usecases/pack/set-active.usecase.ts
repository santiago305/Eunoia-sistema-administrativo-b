import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";

export class SetPackActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
  ) {}

  async execute(input: { packId: string; isActive: boolean }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.packRepo.findById(input.packId, tx);
      if (!current) {
        throw new NotFoundException("Pack no encontrado");
      }

      await this.packRepo.setActive(input.packId, input.isActive, tx);
      return { message: "Estado del pack actualizado" };
    });
  }
}

