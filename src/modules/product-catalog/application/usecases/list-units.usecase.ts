import { Inject, Injectable } from "@nestjs/common";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";

@Injectable()
export class ListProductCatalogUnits {
  constructor(
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly repo: ProductCatalogUnitRepository,
  ) {}

  async execute(params: { q?: string }) {
    return this.repo.list({ q: params.q });
  }
}
