import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { PACK_REPOSITORY, PackRepository, PackWithItems } from "src/modules/packs/domain/ports/pack.repository";
import { PackSearchRule } from "src/modules/packs/application/dtos/pack-search/pack-search-snapshot";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { hasPackSearchCriteria, sanitizePackSearchSnapshot } from "src/modules/packs/application/support/pack-search.utils";

const PACKS_SEARCH_TABLE_KEY = "packs";

export class ListPacksUsecase {
  constructor(
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: { q?: string; isActive?: boolean; page?: number; limit?: number; filters?: PackSearchRule[]; requestedBy?: string }) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizePackSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.packRepo.list({
      q: input.q,
      isActive: input.isActive,
      filters: snapshot.filters,
      page,
      limit,
    });

    if (input.requestedBy && hasPackSearchCriteria(snapshot)) {
      try {
        await this.searchStorage.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: PACKS_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // non-blocking
      }
    }

    const response: PaginatedResult<PackWithItems> = { items, total, page, limit };
    return response;
  }
}
