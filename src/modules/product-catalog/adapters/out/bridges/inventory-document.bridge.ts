import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductType } from "src/shared/domain/value-objects/product-type";
import { DocumentRepository } from "src/modules/product-catalog/compat/ports/document.repository.port";
import { InventoryDocument } from "src/modules/product-catalog/compat/entities/inventory-document";
import InventoryDocumentItem from "src/modules/product-catalog/compat/entities/inventory-document-item";
import { ProductCatalogInventoryDocumentEntity } from "../persistence/typeorm/entities/inventory-document.entity";
import { ProductCatalogInventoryDocumentItemEntity } from "../persistence/typeorm/entities/inventory-document-item.entity";

@Injectable()
export class InventoryDocumentBridge implements DocumentRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryDocumentEntity)
    private readonly repo: Repository<ProductCatalogInventoryDocumentEntity>,
    @InjectRepository(ProductCatalogInventoryDocumentItemEntity)
    private readonly itemRepo: Repository<ProductCatalogInventoryDocumentItemEntity>,
  ) {}

  private manager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) return (tx as TypeormTransactionContext).manager;
    return this.repo.manager;
  }

  private docRepo(tx?: TransactionContext) {
    return this.manager(tx).getRepository(ProductCatalogInventoryDocumentEntity);
  }

  private itemRepository(tx?: TransactionContext) {
    return this.manager(tx).getRepository(ProductCatalogInventoryDocumentItemEntity);
  }

  private toDoc(row: ProductCatalogInventoryDocumentEntity): InventoryDocument {
    return new InventoryDocument(
      row.id,
      row.docType,
      row.status,
      row.serieId ?? undefined,
      row.correlative ?? undefined,
      row.fromWarehouseId ?? undefined,
      row.toWarehouseId ?? undefined,
      row.referenceId ?? undefined,
      row.referenceType ?? undefined,
      row.note ?? undefined,
      row.createdBy ?? undefined,
      row.postedBy ?? undefined,
      row.postedAt ?? undefined,
      row.createdAt,
      undefined as ProductType | undefined,
      [],
    );
  }

  private toItem(row: ProductCatalogInventoryDocumentItemEntity): InventoryDocumentItem {
    return new InventoryDocumentItem(
      row.id,
      row.docId,
      row.stockItemId,
      Number(row.quantity),
      row.wasteQty !== null && row.wasteQty !== undefined ? Number(row.wasteQty) : null,
      row.fromLocationId ?? undefined,
      row.toLocationId ?? undefined,
      row.unitCost !== null && row.unitCost !== undefined ? Number(row.unitCost) : null,
    );
  }

  async createDraft(doc: InventoryDocument, tx?: TransactionContext): Promise<InventoryDocument> {
    const saved = await this.docRepo(tx).save({
      docType: doc.docType,
      status: doc.status,
      serieId: doc.serieId,
      correlative: doc.correlative,
      fromWarehouseId: doc.fromWarehouseId,
      toWarehouseId: doc.toWarehouseId,
      referenceId: doc.referenceId,
      referenceType: doc.referenceType,
      note: doc.note,
      createdBy: doc.createdBy,
      postedBy: doc.postedBy,
      postedAt: doc.postedAt,
    });
    return this.toDoc(saved);
  }

  async findById(id: string, tx?: TransactionContext): Promise<InventoryDocument | null> {
    const row = await this.docRepo(tx).findOne({ where: { id } });
    return row ? this.toDoc(row) : null;
  }

  async list(): Promise<{ items: InventoryDocument[]; total: number; page: number; limit: number }> {
    throw new Error("Legacy inventory list no soportado en ProductCatalog bridge");
  }

  async findByReference(
    params: { referenceType: ReferenceType; referenceId: string; docType?: DocType },
    tx?: TransactionContext,
  ): Promise<InventoryDocument[]> {
    const qb = this.docRepo(tx).createQueryBuilder("d")
      .where("d.referenceId = :referenceId", { referenceId: params.referenceId })
      .andWhere("d.referenceType = :referenceType", { referenceType: params.referenceType });
    if (params.docType) qb.andWhere("d.docType = :docType", { docType: params.docType });
    return (await qb.orderBy("d.createdAt", "DESC").getMany()).map((row) => this.toDoc(row));
  }

  async listItems(docId: string, tx?: TransactionContext): Promise<InventoryDocumentItem[]> {
    const rows = await this.itemRepository(tx).find({ where: { docId } });
    return rows.map((row) => this.toItem(row));
  }

  async getByIdWithItems(docId: string, tx?: TransactionContext): Promise<{ doc: InventoryDocument; items: InventoryDocumentItem[] } | null> {
    const doc = await this.findById(docId, tx);
    if (!doc) return null;
    const items = await this.listItems(docId, tx);
    return { doc, items };
  }

  async addItem(item: InventoryDocumentItem, tx?: TransactionContext): Promise<InventoryDocumentItem> {
    const saved = await this.itemRepository(tx).save({
      docId: item.docId,
      stockItemId: item.stockItemId,
      quantity: item.quantity,
      wasteQty: item.wasteQty ?? 0,
      fromLocationId: item.fromLocationId ?? null,
      toLocationId: item.toLocationId ?? null,
      unitCost: item.unitCost ?? null,
    });
    return this.toItem(saved);
  }

  async updateItem(
    params: { docId: string; itemId: string; quantity?: number; fromLocationId?: string; toLocationId?: string; unitCost?: number | null; wasteQty?: number | null },
    tx?: TransactionContext,
  ): Promise<InventoryDocumentItem | null> {
    const repo = this.itemRepository(tx);
    const row = await repo.findOne({ where: { id: params.itemId, docId: params.docId } });
    if (!row) return null;
    if (params.quantity !== undefined) row.quantity = params.quantity;
    if (params.fromLocationId !== undefined) row.fromLocationId = params.fromLocationId ?? null;
    if (params.toLocationId !== undefined) row.toLocationId = params.toLocationId ?? null;
    if (params.unitCost !== undefined) row.unitCost = params.unitCost ?? null;
    if (params.wasteQty !== undefined) row.wasteQty = params.wasteQty ?? 0;
    return this.toItem(await repo.save(row));
  }

  async removeItem(docId: string, itemId: string, tx?: TransactionContext): Promise<boolean> {
    const result = await this.itemRepository(tx).delete({ id: itemId, docId });
    return (result.affected ?? 0) > 0;
  }

  async markPosted(params: { docId: string; postedBy?: string; note?: string; postedAt?: Date }, tx?: TransactionContext): Promise<void> {
    await this.docRepo(tx).update({ id: params.docId }, { status: DocStatus.POSTED, postedBy: params.postedBy ?? null, note: params.note ?? null, postedAt: params.postedAt ?? new Date() });
  }

  async markCancelled(params: { docId: string; postedBy?: string; note?: string; postedAt?: Date }, tx?: TransactionContext): Promise<void> {
    await this.docRepo(tx).update({ id: params.docId }, { status: DocStatus.CANCELLED, postedBy: params.postedBy ?? null, note: params.note ?? null, postedAt: params.postedAt ?? new Date() });
  }

  async existsBySerieId(serieId: string, params?: { excludeStatus?: DocStatus }, tx?: TransactionContext): Promise<boolean> {
    const qb = this.docRepo(tx).createQueryBuilder("d").where("d.serieId = :serieId", { serieId });
    if (params?.excludeStatus) qb.andWhere("d.status != :excludeStatus", { excludeStatus: params.excludeStatus });
    return (await qb.getCount()) > 0;
  }
}


