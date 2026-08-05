import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { PACK_ITEM_REPOSITORY, PackItemRepository } from "src/modules/packs/domain/ports/pack-item.repository";

export class SetPackActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(PACK_ITEM_REPOSITORY)
    private readonly itemRepo: PackItemRepository,
  ) {}

  async execute(input: { packId: string; isActive: boolean }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.packRepo.findById(input.packId, tx);
      if (!current) {
        throw new NotFoundException("Pack no encontrado");
      }

      if (input.isActive) {
        const items = await this.itemRepo.listByPackId(input.packId, tx);
        if (!items.length) throw new BadRequestException("No se puede activar un pack vacío");
        const invalidSkuIds = await this.itemRepo.findInvalidSellableSkuIds(
          items.map((item) => item.skuId),
          tx,
        );
        if (invalidSkuIds.length) {
          throw new BadRequestException("No se puede activar el pack porque contiene productos eliminados o inactivos");
        }
      }

      await this.packRepo.setActive(input.packId, input.isActive, tx);
      return { message: "Estado del pack actualizado" };
    });
  }
}

