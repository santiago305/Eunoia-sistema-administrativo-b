import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";

export class ListPacksUsecase {
  constructor(
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
  ) {}

  async execute(input: { q?: string; isActive?: boolean; page?: number; limit?: number }) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.packRepo.list({
      q: input.q,
      isActive: input.isActive,
      page,
      limit,
    });

    const response: PaginatedResult<any> = { items, total, page, limit };
    return response;
  }
}

