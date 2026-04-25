import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_PUBLICATION_REPOSITORY,
  ProductCatalogPublicationRepository,
} from "../../domain/ports/publication.repository";

@Injectable()
export class ListProductCatalogChannelSkus {
  constructor(
    @Inject(PRODUCT_CATALOG_PUBLICATION_REPOSITORY)
    private readonly repo: ProductCatalogPublicationRepository,
  ) {}

  execute(params: {
    channelCode: string;
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
  }) {
    return this.repo.listByChannel({
      channelCode: params.channelCode,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      q: params.q,
      isActive: params.isActive,
    });
  }
}
