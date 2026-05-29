import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SOURCE_REPOSITORY, SourceRepository } from "src/modules/sources/domain/ports/source.repository";
import { ListSourcesInput } from "../../dtos/source/input/list.input";
import { SourceOutput } from "../../dtos/source/output/source.output";
import { SourceOutputMapper } from "../../mappers/source-output.mapper";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { hasSourceSearchCriteria, sanitizeSourceSearchSnapshot } from "src/modules/sources/application/support/source-search.utils";

const SOURCES_SEARCH_TABLE_KEY = "sources";

export class ListSourcesUsecase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepo: SourceRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListSourcesInput): Promise<PaginatedResult<SourceOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizeSourceSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.sourceRepo.list({
      q: input.q,
      isActive: input.isActive,
      filters: snapshot.filters,
      page,
      limit,
    });

    if (input.requestedBy && hasSourceSearchCriteria(snapshot)) {
      try {
        await this.searchStorage.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: SOURCES_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // non-blocking
      }
    }

    return {
      items: items.map((source) => SourceOutputMapper.toOutput(source)),
      total,
      page,
      limit,
    };
  }
}

