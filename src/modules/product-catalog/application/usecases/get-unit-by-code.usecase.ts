import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";
import { errorResponse } from "src/shared/response-standard/response";

@Injectable()
export class GetProductCatalogUnitByCode {
  constructor(
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly repo: ProductCatalogUnitRepository,
  ) {}

  async execute(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const unit = await this.repo.findByCode(normalizedCode);
    if (!unit) throw new NotFoundException(errorResponse("Unidad no encontrada"));
    return unit;
  }
}
