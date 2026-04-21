import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SUPPLIER_REPOSITORY, SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { ListSuppliersInput } from "../../dtos/supplier/input/list.input";
import { SupplierOutput } from "../../dtos/supplier/output/supplier.output";
import { SupplierOutputMapper } from "../../mappers/supplier-output.mapper";
import {
  hasSupplierSearchCriteria,
  sanitizeSupplierSearchSnapshot,
} from "../../support/supplier-search.utils";

const SUPPLIER_SEARCH_TABLE_KEY = "suppliers";

export class ListSuppliersUsecase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepo: SupplierRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: ListSuppliersInput): Promise<PaginatedResult<SupplierOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;
    const snapshot = sanitizeSupplierSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.supplierRepo.list({
      filters: snapshot.filters,
      q: input.q,
      page,
      limit,
    });

    if (input.requestedBy && hasSupplierSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: SUPPLIER_SEARCH_TABLE_KEY,
        snapshot,
      });
    }

    return {
      items: items.map((supplier) => SupplierOutputMapper.toSupplierOutput(supplier)),
      total,
      page,
      limit,
    };
  }
}
