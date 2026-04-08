import { BadRequestException, ConflictException, Inject, NotFoundException } from "@nestjs/common";
import { CreateCatalogPublicationInput } from "../../dto/catalog-publications/input/create-catalog-publication";
import { CatalogPublicationOutput } from "../../dto/catalog-publications/output/catalog-publication-out";
import { CATALOG_PUBLICATION_REPOSITORY, CatalogPublicationRepository } from "../../ports/catalog-publication.repository";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../ports/product.repository";
import { PRODUCT_VARIANT_REPOSITORY, ProductVariantRepository } from "../../ports/product-variant.repository";
import { ProductId } from "src/modules/catalog/domain/value-object/product-id.vo";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export class CreateCatalogPublication {
  constructor(
    @Inject(CATALOG_PUBLICATION_REPOSITORY)
    private readonly publicationRepo: CatalogPublicationRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: ProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepo: ProductVariantRepository,
  ) {}

  async execute(input: CreateCatalogPublicationInput): Promise<{ type: string; message: string; publication: CatalogPublicationOutput }> {
    const channelCode = input.channelCode.trim();
    if (!channelCode) {
      throw new BadRequestException("channelCode es obligatorio");
    }

    if (input.sourceType === StockItemType.PRODUCT) {
      const product = await this.productRepo.findById(ProductId.create(input.itemId));
      if (!product) throw new NotFoundException("Producto no encontrado");
    } else {
      const variant = await this.variantRepo.findById(input.itemId);
      if (!variant) throw new NotFoundException("Variante no encontrada");
    }

    const exists = await this.publicationRepo.findByChannelAndItem(channelCode, input.sourceType, input.itemId);
    if (exists) {
      throw new ConflictException("La publicacion ya existe para ese canal e item");
    }

    const publication = await this.publicationRepo.create({
      channelCode,
      sourceType: input.sourceType,
      itemId: input.itemId,
      isVisible: input.isVisible ?? true,
      sortOrder: input.sortOrder ?? 0,
      priceOverride: input.priceOverride ?? null,
      displayNameOverride: input.displayNameOverride?.trim() || null,
    });

    return {
      type: "success",
      message: "Publicacion creada con exito",
      publication,
    };
  }
}
