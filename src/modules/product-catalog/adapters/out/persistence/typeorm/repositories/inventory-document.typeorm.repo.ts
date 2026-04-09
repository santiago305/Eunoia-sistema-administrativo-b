import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductCatalogInventoryDocumentItem } from "src/modules/product-catalog/domain/entities/inventory-document-item";
import { ProductCatalogInventoryDocument } from "src/modules/product-catalog/domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentRepository } from "src/modules/product-catalog/domain/ports/inventory-document.repository";
import { ProductCatalogInventoryDocumentItemEntity } from "../entities/inventory-document-item.entity";
import { ProductCatalogInventoryDocumentEntity } from "../entities/inventory-document.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class ProductCatalogInventoryDocumentTypeormRepository implements ProductCatalogInventoryDocumentRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryDocumentEntity)
    private readonly repo: Repository<ProductCatalogInventoryDocumentEntity>,
    @InjectRepository(ProductCatalogInventoryDocumentItemEntity)
    private readonly itemRepo: Repository<ProductCatalogInventoryDocumentItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getDocRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryDocumentEntity);
  }

  private getItemRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryDocumentItemEntity);
  }

  private toDocument(row: ProductCatalogInventoryDocumentEntity): ProductCatalogInventoryDocument {
    return new ProductCatalogInventoryDocument(
      row.id,
      row.docType,
      row.status,
      row.serieId,
      row.correlative,
      row.fromWarehouseId,
      row.toWarehouseId,
      row.referenceId,
      row.referenceType,
      row.note,
      row.createdBy,
      row.postedBy,
      row.postedAt,
      row.createdAt,
    );
  }

  private toItem(row: ProductCatalogInventoryDocumentItemEntity): ProductCatalogInventoryDocumentItem {
    return new ProductCatalogInventoryDocumentItem(
      row.id,
      row.docId,
      row.stockItemId,
      row.quantity,
      Number(row.wasteQty ?? 0),
      row.fromLocationId,
      row.toLocationId,
      row.unitCost !== null && row.unitCost !== undefined ? Number(row.unitCost) : null,
    );
  }

  async create(document: ProductCatalogInventoryDocument, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument> {
    const saved = await this.getDocRepo(tx).save({
      docType: document.docType,
      status: document.status,
      serieId: document.serieId,
      correlative: document.correlative,
      fromWarehouseId: document.fromWarehouseId,
      toWarehouseId: document.toWarehouseId,
      referenceId: document.referenceId,
      referenceType: document.referenceType,
      note: document.note,
      createdBy: document.createdBy,
      postedBy: document.postedBy,
      postedAt: document.postedAt,
    });
    return this.toDocument(saved);
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument | null> {
    const row = await this.getDocRepo(tx).findOne({ where: { id } });
    return row ? this.toDocument(row) : null;
  }

  async findByReference(
    input: { referenceType: ReferenceType; referenceId: string; docType?: string },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryDocument[]> {
    const qb = this.getDocRepo(tx).createQueryBuilder("d")
      .where("d.referenceId = :referenceId", { referenceId: input.referenceId })
      .andWhere("d.referenceType = :referenceType", { referenceType: input.referenceType });
    if (input.docType) qb.andWhere("d.docType = :docType", { docType: input.docType });
    return (await qb.orderBy("d.createdAt", "DESC").getMany()).map((row) => this.toDocument(row));
  }

  async listItems(docId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem[]> {
    const rows = await this.getItemRepo(tx).find({ where: { docId } });
    return rows.map((row) => this.toItem(row));
  }

  async addItem(item: ProductCatalogInventoryDocumentItem, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem> {
    const saved = await this.getItemRepo(tx).save({
      docId: item.docId,
      stockItemId: item.stockItemId,
      quantity: item.quantity,
      wasteQty: item.wasteQty,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
      unitCost: item.unitCost,
    });
    return this.toItem(saved);
  }

  async updateItem(
    input: { docId: string; itemId: string; quantity?: number; fromLocationId?: string | null; toLocationId?: string | null; unitCost?: number | null; wasteQty?: number | null },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryDocumentItem | null> {
    const repo = this.getItemRepo(tx);
    const row = await repo.findOne({ where: { id: input.itemId, docId: input.docId } });
    if (!row) return null;
    if (input.quantity !== undefined) row.quantity = input.quantity;
    if (input.fromLocationId !== undefined) row.fromLocationId = input.fromLocationId ?? null;
    if (input.toLocationId !== undefined) row.toLocationId = input.toLocationId ?? null;
    if (input.unitCost !== undefined) row.unitCost = input.unitCost ?? null;
    if (input.wasteQty !== undefined) row.wasteQty = input.wasteQty ?? 0;
    return this.toItem(await repo.save(row));
  }

  async markPosted(input: { docId: string; postedBy?: string | null; postedAt: Date }, tx?: TransactionContext): Promise<void> {
    await this.getDocRepo(tx).update(
      { id: input.docId },
      {
        status: DocStatus.POSTED,
        postedBy: input.postedBy ?? null,
        postedAt: input.postedAt,
      },
    );
  }
}

