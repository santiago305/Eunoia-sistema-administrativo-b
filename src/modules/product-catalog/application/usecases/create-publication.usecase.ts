import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_PUBLICATION_REPOSITORY,
  ProductCatalogPublicationRepository,
} from "../../domain/ports/publication.repository";

@Injectable()
export class CreateProductCatalogPublication {
  constructor(
    @Inject(PRODUCT_CATALOG_PUBLICATION_REPOSITORY)
    private readonly repo: ProductCatalogPublicationRepository,
  ) {}

  execute(input: {
    channelCode: string;
    skuId: string;
    isVisible?: boolean;
    sortOrder?: number;
    priceOverride?: number | null;
    displayNameOverride?: string | null;
  }) {
    return this.repo.create({
      channelCode: input.channelCode.trim(),
      skuId: input.skuId,
      isVisible: input.isVisible ?? true,
      sortOrder: input.sortOrder ?? 0,
      priceOverride: input.priceOverride ?? null,
      displayNameOverride: input.displayNameOverride ?? null,
    });
  }
}
