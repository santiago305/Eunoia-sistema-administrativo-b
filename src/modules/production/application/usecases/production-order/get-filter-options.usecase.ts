import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCTION_FILTER_OPTIONS_REPOSITORY,
  ProductionFilterOptionsOutput,
  ProductionFilterOptionsRepository,
} from "../../ports/production-filter-options.repository";
import { PRODUCTION_STATUS_OPTIONS } from "../../support/production-search.utils";

@Injectable()
export class GetProductionOrderFilterOptions {
  constructor(
    @Inject(PRODUCTION_FILTER_OPTIONS_REPOSITORY)
    private readonly repository: ProductionFilterOptionsRepository,
  ) {}

  async execute(): Promise<ProductionFilterOptionsOutput> {
    const options = await this.repository.getOptions();

    return {
      statuses: PRODUCTION_STATUS_OPTIONS,
      warehouses: options.warehouses,
      products: options.products,
    };
  }
}
