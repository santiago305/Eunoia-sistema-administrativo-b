import { Inject, Injectable } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ListProductionOrdersInput } from "../../dto/production-order/input/list-production-orders";
import { PaginatedProductionOrderOutput } from "../../dto/production-order/output/production-order-paginated";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  hasProductionSearchCriteria,
  legacyProductionFiltersToRules,
  sanitizeProductionSearchSnapshot,
} from "../../support/production-search.utils";

const PRODUCTION_SEARCH_TABLE_KEY = "production-orders";

@Injectable()
export class ListProductionOrders {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListProductionOrdersInput): Promise<PaginatedProductionOrderOutput> {
    const snapshot = sanitizeProductionSearchSnapshot({
      q: input.q,
      filters: [
        ...legacyProductionFiltersToRules({
          status: input.status,
          warehouseId: input.warehouseId,
          skuId: input.skuId,
          from: formatDateInLima(input.from),
          to: formatDateInLima(input.to),
        }),
        ...(input.filters ?? []),
      ],
    });

    const result = await this.orderRepo.list({
      ...input,
      q: input.q,
      filters: snapshot.filters,
    });

    if (input.requestedBy && hasProductionSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: PRODUCTION_SEARCH_TABLE_KEY,
        snapshot,
      });
    }

    return {
      items: result.items.map((item) => ProductionOrderOutputMapper.toListItemOutput(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}

function formatDateInLima(value?: Date) {
  if (!value) return undefined;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(value);
}
