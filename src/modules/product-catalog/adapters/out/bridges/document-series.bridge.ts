import { Inject, Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import DocumentSerie from "src/modules/product-catalog/integration/inventory/entities/document-serie";
import {
  DocumentSeriesRepository,
} from "src/modules/product-catalog/integration/inventory/ports/document-series.repository.port";
import {
  PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY,
  ProductCatalogDocumentSerieRepository,
} from "src/modules/product-catalog/domain/ports/document-serie.repository";
import { ProductCatalogDocumentSerie } from "src/modules/product-catalog/domain/entities/document-serie";

@Injectable()
export class DocumentSeriesBridge implements DocumentSeriesRepository {
  constructor(
    @Inject(PRODUCT_CATALOG_DOCUMENT_SERIE_REPOSITORY)
    private readonly repo: ProductCatalogDocumentSerieRepository,
  ) {}

  async findActiveFor(
    params: { docType?: DocType; isActive?: boolean; warehouseId: string },
    tx?: TransactionContext,
  ): Promise<DocumentSerie[]> {
    const rows = await this.repo.findActiveFor(params, tx);
    return rows.map(
      (row) =>
        new DocumentSerie(
          row.id!,
          row.code,
          row.name,
          row.docType,
          row.warehouseId,
          row.nextNumber,
          row.padding,
          row.separator,
          row.isActive,
          row.createdAt,
        ),
    );
  }

  async reserveNextNumber(serieId: string, tx: TransactionContext): Promise<number> {
    return this.repo.reserveNextNumber(serieId, tx);
  }

  async findById(serieId: string, tx?: TransactionContext): Promise<DocumentSerie | null> {
    const row = await this.repo.findById(serieId, tx);
    if (!row) return null;
    return new DocumentSerie(
      row.id!,
      row.code,
      row.name,
      row.docType,
      row.warehouseId,
      row.nextNumber,
      row.padding,
      row.separator,
      row.isActive,
      row.createdAt,
    );
  }

  async creatDocumentSerie(documentSerie: DocumentSerie, tx?: TransactionContext): Promise<DocumentSerie> {
    const row = await this.repo.create(
      ProductCatalogDocumentSerie.create({
        id: documentSerie.id,
        code: documentSerie.code,
        name: documentSerie.name,
        docType: documentSerie.docType,
        warehouseId: documentSerie.warehouseId,
        nextNumber: documentSerie.nextNumber,
        padding: documentSerie.padding,
        separator: documentSerie.separator,
        isActive: documentSerie.isActive,
        createdAt: documentSerie.createdAt,
      }),
      tx,
    );
    return new DocumentSerie(
      row.id!,
      row.code,
      row.name,
      row.docType,
      row.warehouseId,
      row.nextNumber,
      row.padding,
      row.separator,
      row.isActive,
      row.createdAt,
    );
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.repo.setActive(id, isActive, tx);
  }
}


