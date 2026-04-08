import { Inject, NotFoundException } from "@nestjs/common";
import { UpdateCatalogPublicationInput } from "../../dto/catalog-publications/input/update-catalog-publication";
import { CatalogPublicationOutput } from "../../dto/catalog-publications/output/catalog-publication-out";
import { CATALOG_PUBLICATION_REPOSITORY, CatalogPublicationRepository } from "../../ports/catalog-publication.repository";

export class UpdateCatalogPublication {
  constructor(
    @Inject(CATALOG_PUBLICATION_REPOSITORY)
    private readonly publicationRepo: CatalogPublicationRepository,
  ) {}

  async execute(input: UpdateCatalogPublicationInput): Promise<{ type: string; message: string; publication: CatalogPublicationOutput }> {
    const existing = await this.publicationRepo.findById(input.id);
    if (!existing) {
      throw new NotFoundException("Publicacion no encontrada");
    }

    const publication = await this.publicationRepo.update({
      id: input.id,
      isVisible: input.isVisible,
      sortOrder: input.sortOrder,
      priceOverride: input.priceOverride,
      displayNameOverride: input.displayNameOverride === undefined ? undefined : (input.displayNameOverride?.trim() || null),
    });

    if (!publication) {
      throw new NotFoundException("Publicacion no encontrada");
    }

    return {
      type: "success",
      message: "Publicacion actualizada con exito",
      publication,
    };
  }
}
