import { Inject } from "@nestjs/common";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { ClientSearchStateOutput } from "../../dtos/client-search/output/client-search-state.output";
import { ClientSearchSnapshot } from "../../dtos/client-search/client-search-snapshot";
import {
  buildClientSearchLabel,
  CLIENT_ACTIVE_STATE_SEARCH_OPTIONS,
  CLIENT_DOC_TYPE_SEARCH_OPTIONS,
  CLIENT_TYPE_SEARCH_OPTIONS,
  sanitizeClientSearchSnapshot,
} from "../../support/client-search.utils";

const CLIENTS_SEARCH_TABLE_KEY = "clients";

export class GetClientSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,
  ) {}

  async execute(userId: string): Promise<ClientSearchStateOutput> {
    const [state, ubigeoCatalog] = await Promise.all([
      this.searchStorage.listState({ userId, tableKey: CLIENTS_SEARCH_TABLE_KEY }),
      this.ubigeoRepo.getCatalog(),
    ]);

    const maps = {
      activeStates: new Map(CLIENT_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      docTypes: new Map(CLIENT_DOC_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      clientTypes: new Map(CLIENT_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      departments: new Map(ubigeoCatalog.departments.map((item) => [item.id, item.name])),
      provinces: new Map(ubigeoCatalog.provinces.map((item) => [item.id, item.name])),
      districts: new Map(ubigeoCatalog.districts.map((item) => [item.id, item.name])),
    };

    const toOptions = (items: Array<{ id: string; name: string }>) =>
      items.map((item) => ({ id: item.id, label: item.name }));

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeClientSearchSnapshot(item.snapshot as ClientSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildClientSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeClientSearchSnapshot(item.snapshot as ClientSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildClientSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        activeStates: CLIENT_ACTIVE_STATE_SEARCH_OPTIONS,
        docTypes: CLIENT_DOC_TYPE_SEARCH_OPTIONS,
        clientTypes: CLIENT_TYPE_SEARCH_OPTIONS.filter((item) => item.id !== "UNDEFINED"),
        departments: toOptions(ubigeoCatalog.departments),
        provinces: toOptions(ubigeoCatalog.provinces),
        districts: toOptions(ubigeoCatalog.districts),
      },
    };
  }
}

