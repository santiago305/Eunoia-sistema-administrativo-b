import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { AGENCY_REPOSITORY, AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { ListAgenciesInput } from "../../dtos/agency/input/list.input";
import { AgencyOutput } from "../../dtos/agency/output/agency.output";
import { AgencyOutputMapper } from "../../mappers/agency-output.mapper";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { hasAgencySearchCriteria, sanitizeAgencySearchSnapshot } from "src/modules/agencies/application/support/agency-search.utils";

const AGENCIES_SEARCH_TABLE_KEY = "agencies";

export class ListAgenciesUsecase {
  constructor(
    @Inject(AGENCY_REPOSITORY)
    private readonly agencyRepo: AgencyRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListAgenciesInput): Promise<PaginatedResult<AgencyOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizeAgencySearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.agencyRepo.list({
      q: input.q,
      isActive: input.isActive,
      filters: snapshot.filters,
      page,
      limit,
    });

    if (input.requestedBy && hasAgencySearchCriteria(snapshot)) {
      try {
        await this.searchStorage.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: AGENCIES_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // non-blocking
      }
    }

    return {
      items: items.map((agency) => AgencyOutputMapper.toOutput(agency)),
      total,
      page,
      limit,
    };
  }
}

