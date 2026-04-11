import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogPublicationNotFoundError } from "../errors/product-catalog-publication-not-found.error";
import {
  PRODUCT_CATALOG_PUBLICATION_REPOSITORY,
  ProductCatalogPublicationRepository,
} from "../../domain/ports/publication.repository";

@Injectable()
export class UpdateProductCatalogPublication {
  constructor(
    @Inject(PRODUCT_CATALOG_PUBLICATION_REPOSITORY)
    private readonly repo: ProductCatalogPublicationRepository,
  ) {}

  async execute(
    id: string,
    patch: {
      isVisible?: boolean;
      sortOrder?: number;
      priceOverride?: number | null;
      displayNameOverride?: string | null;
    },
  ) {
    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(new ProductCatalogPublicationNotFoundError().message);
    return updated;
  }
}
