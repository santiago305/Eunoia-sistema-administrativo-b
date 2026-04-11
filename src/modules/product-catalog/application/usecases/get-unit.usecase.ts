import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";
import { errorResponse } from "src/shared/response-standard/response";

@Injectable()
export class GetProductCatalogUnit {
  constructor(
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly repo: ProductCatalogUnitRepository,
  ) {}

  async execute(id: string) {
    const unit = await this.repo.findById(id);
    if (!unit) throw new NotFoundException(errorResponse("Unidad no encontrada"));
    return unit;
  }
}
