import { Inject, NotFoundException } from "@nestjs/common";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";

export class GetPackUsecase {
  constructor(
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
  ) {}

  async execute(input: { packId: string }) {
    const details = await this.packRepo.findByIdWithItems(input.packId);
    if (!details) {
      throw new NotFoundException("Pack no encontrado");
    }
    return details;
  }
}
