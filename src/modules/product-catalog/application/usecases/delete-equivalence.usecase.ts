import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
  ProductCatalogEquivalenceRepository,
} from "../../domain/ports/equivalence.repository";

@Injectable()
export class DeleteProductCatalogEquivalence {
  constructor(
    @Inject(PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY)
    private readonly repo: ProductCatalogEquivalenceRepository,
  ) {}

  async execute(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException("Equivalence not found");
    await this.repo.delete(id);
    return { message: "Equivalence deleted" };
  }
}
