import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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
    if (!updated) throw new NotFoundException("Publication not found");
    return updated;
  }
}
