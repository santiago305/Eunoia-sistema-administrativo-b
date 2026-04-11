import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { ProductCatalogUnit } from "../../domain/entities/unit";
import { PRODUCT_CATALOG_UNIT_REPOSITORY, ProductCatalogUnitRepository } from "../../domain/ports/unit.repository";

@Injectable()
export class CreateProductCatalogUnit {
  constructor(
    @Inject(PRODUCT_CATALOG_UNIT_REPOSITORY)
    private readonly repo: ProductCatalogUnitRepository,
  ) {}

  async execute(input: { name: string; code: string }) {
    const name = input.name.trim();
    const code = input.code.trim();
    const exists = await this.repo.findByCode(code);
    if (exists) throw new ConflictException("Unit code already exists");
    return this.repo.create(new ProductCatalogUnit(undefined, name, code));
  }
}
