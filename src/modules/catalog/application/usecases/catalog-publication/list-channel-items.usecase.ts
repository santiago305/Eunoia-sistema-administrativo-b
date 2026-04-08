import { Inject } from "@nestjs/common";
import { ListChannelCatalogItemsInput } from "../../dto/catalog-publications/input/list-channel-catalog-items";
import { ChannelCatalogItemOutput } from "../../dto/catalog-publications/output/channel-catalog-item-out";
import { CATALOG_PUBLICATION_REPOSITORY, CatalogPublicationRepository } from "../../ports/catalog-publication.repository";

export class ListChannelCatalogItems {
  constructor(
    @Inject(CATALOG_PUBLICATION_REPOSITORY)
    private readonly publicationRepo: CatalogPublicationRepository,
  ) {}

  async execute(input: ListChannelCatalogItemsInput): Promise<{
    items: ChannelCatalogItemOutput[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.publicationRepo.searchPublishedFlat({
      channelCode: input.channelCode.trim(),
      isActive: input.isActive,
      type: input.type,
      q: input.q?.trim() || undefined,
      page,
      limit,
    });

    return { items, total, page, limit };
  }
}
