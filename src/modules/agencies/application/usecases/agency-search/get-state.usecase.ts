import { Inject } from "@nestjs/common";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { AgencySearchStateOutput } from "../../dtos/agency-search/output/agency-search-state.output";
import { AgencySearchSnapshot } from "../../dtos/agency-search/agency-search-snapshot";
import {
  AGENCY_ACTIVE_STATE_SEARCH_OPTIONS,
  buildAgencySearchLabel,
  sanitizeAgencySearchSnapshot,
} from "../../support/agency-search.utils";

const AGENCIES_SEARCH_TABLE_KEY = "agencies";

export class GetAgencySearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,
  ) {}

  async execute(userId: string): Promise<AgencySearchStateOutput> {
    const [state, ubigeoCatalog] = await Promise.all([
      this.searchStorage.listState({ userId, tableKey: AGENCIES_SEARCH_TABLE_KEY }),
      this.ubigeoRepo.getCatalog(),
    ]);

    const maps = {
      activeStates: new Map(AGENCY_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      departments: new Map(ubigeoCatalog.departments.map((item) => [item.id, item.name])),
      provinces: new Map(ubigeoCatalog.provinces.map((item) => [item.id, item.name])),
      districts: new Map(ubigeoCatalog.districts.map((item) => [item.id, item.name])),
    };

    const toOptions = (items: Array<{ id: string; name: string }>) =>
      items.map((item) => ({ id: item.id, label: item.name }));

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeAgencySearchSnapshot(item.snapshot as AgencySearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildAgencySearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeAgencySearchSnapshot(item.snapshot as AgencySearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildAgencySearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        activeStates: AGENCY_ACTIVE_STATE_SEARCH_OPTIONS,
        departments: toOptions(ubigeoCatalog.departments),
        provinces: toOptions(ubigeoCatalog.provinces),
        districts: toOptions(ubigeoCatalog.districts),
      },
    };
  }
}

