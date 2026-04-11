import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
  ProductCatalogEquivalenceRepository,
} from "../../domain/ports/equivalence.repository";

@Injectable()
export class ListProductCatalogEquivalencesByProduct {
  constructor(
    @Inject(PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY)
    private readonly repo: ProductCatalogEquivalenceRepository,
  ) {}

  execute(productId: string) {
    return this.repo.listByProductId(productId);
  }
}
