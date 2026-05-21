import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { ListClientsInput } from "../../dtos/client/input/list.input";
import { ClientOutput } from "../../dtos/client/output/client.output";
import { ClientOutputMapper } from "../../mappers/client-output.mapper";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  hasClientSearchCriteria,
  sanitizeClientSearchSnapshot,
} from "src/modules/clients/application/support/client-search.utils";

const CLIENTS_SEARCH_TABLE_KEY = "clients";

export class ListClientsUsecase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListClientsInput): Promise<PaginatedResult<ClientOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizeClientSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.clientRepo.list({
      q: input.q,
      isActive: input.isActive,
      filters: snapshot.filters,
      page,
      limit,
    });

    if (input.requestedBy && hasClientSearchCriteria(snapshot)) {
      try {
        await this.searchStorage.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: CLIENTS_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // non-blocking
      }
    }

    return {
      items: items.map((client) => ClientOutputMapper.toOutput(client)),
      total,
      page,
      limit,
    };
  }
}
