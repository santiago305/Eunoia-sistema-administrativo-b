import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCTION_FILTER_OPTIONS_REPOSITORY,
  ProductionFilterOptionsOutput,
  ProductionFilterOptionsRepository,
  ProductionStatusFilterOption,
} from "../../ports/production-filter-options.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

const STATUS_OPTIONS: ProductionStatusFilterOption[] = [
  {
    value: ProductionStatus.DRAFT,
    label: "Borrador",
    order: 1,
    active: true,
    color: "slate",
  },
  {
    value: ProductionStatus.IN_PROGRESS,
    label: "En proceso",
    order: 2,
    active: true,
    color: "blue",
  },
  {
    value: ProductionStatus.PARTIAL,
    label: "Parcial",
    order: 3,
    active: true,
    color: "amber",
  },
  {
    value: ProductionStatus.COMPLETED,
    label: "Completado",
    order: 4,
    active: true,
    color: "green",
  },
  {
    value: ProductionStatus.CANCELLED,
    label: "Cancelado",
    order: 5,
    active: true,
    color: "red",
  },
];

@Injectable()
export class GetProductionOrderFilterOptions {
  constructor(
    @Inject(PRODUCTION_FILTER_OPTIONS_REPOSITORY)
    private readonly repository: ProductionFilterOptionsRepository,
  ) {}

  async execute(): Promise<ProductionFilterOptionsOutput> {
    const options = await this.repository.getOptions();

    return {
      statuses: STATUS_OPTIONS,
      warehouses: options.warehouses,
      products: options.products,
    };
  }
}
