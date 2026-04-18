import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductCatalogInventoryDocumentItem } from "src/modules/product-catalog/domain/entities/inventory-document-item";
import { ProductCatalogInventoryDocument } from "src/modules/product-catalog/domain/entities/inventory-document";
import { ProductCatalogInventoryDocumentListItem, ProductCatalogInventoryDocumentRepository } from "src/modules/product-catalog/domain/ports/inventory-document.repository";
import { ProductCatalogInventoryDocumentItemEntity } from "../entities/inventory-document-item.entity";
import { ProductCatalogInventoryDocumentEntity } from "../entities/inventory-document.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { ProductCatalogDocumentSerieEntity } from "../entities/document-serie.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { User as UserEntity } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

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
      row.productType ?? null,
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
      productType: document.productType ?? null,
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

  async list(
    params: {
      page: number;
      limit: number;
      from?: Date;
      toExclusive?: Date;
      docType?: DocType;
      productType?: ProductCatalogProductType;
      status?: DocStatus;
      warehouseIds?: string[];
      q?: string;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductCatalogInventoryDocumentListItem[]; total: number; page: number; limit: number }> {
    const qb = this.getDocRepo(tx)
      .createQueryBuilder("d")
      .leftJoin(ProductCatalogDocumentSerieEntity, "s", "s.id = d.serieId")
      .leftJoin(WarehouseEntity, "fw", "fw.id = d.fromWarehouseId")
      .leftJoin(WarehouseEntity, "tw", "tw.id = d.toWarehouseId")
      .leftJoin(UserEntity, "cu", "cu.id = d.createdBy")
      .leftJoin(UserEntity, "pu", "pu.id = d.postedBy");

    if (params.docType) qb.andWhere("d.docType = :docType", { docType: params.docType });
    if (params.productType) qb.andWhere("d.productType = :productType", { productType: params.productType });
    if (params.status) qb.andWhere("d.status = :status", { status: params.status });

    if (params.from) qb.andWhere("d.createdAt >= :from", { from: params.from });
    if (params.toExclusive) qb.andWhere("d.createdAt < :toExclusive", { toExclusive: params.toExclusive });

    if (params.warehouseIds?.length) {
      qb.andWhere("(d.fromWarehouseId IN (:...warehouseIds) OR d.toWarehouseId IN (:...warehouseIds))", {
        warehouseIds: params.warehouseIds,
      });
    }

    const q = params.q?.trim();
    if (q) {
      const parts = q.split("-").map((p) => p.trim()).filter(Boolean);
      const maybeSerie = parts.length >= 2 ? parts[0] : undefined;
      const maybeCorrelative = parts.length >= 2 ? parts.slice(1).join("") : undefined;
      const correlativeNumber = maybeCorrelative ? Number(maybeCorrelative.replace(/^0+/, "") || "0") : Number.NaN;

      if (maybeSerie && Number.isInteger(correlativeNumber) && correlativeNumber >= 0) {
        qb.andWhere("LOWER(s.code) = :serieCode AND d.correlative = :correlative", {
          serieCode: maybeSerie.toLowerCase(),
          correlative: correlativeNumber,
        });
      } else {
        const qLike = `%${q.toLowerCase()}%`;
        qb.andWhere(
          "(" +
            "LOWER(COALESCE(s.code, '')) LIKE :qLike " +
            "OR CAST(COALESCE(d.correlative, 0) AS text) LIKE :qLike " +
            "OR LOWER(" +
              "COALESCE(s.code, '') || COALESCE(s.separator, '-') || " +
              "LPAD(COALESCE(d.correlative, 0)::text, COALESCE(s.padding, 1), '0')" +
            ") LIKE :qLike" +
          ")",
          { qLike },
        );
      }
    }

    const countQb = qb.clone();
    const total = await countQb.getCount();

    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? params.limit : 10;

    const rows = await qb
      .select("d.id", "id")
      .addSelect("d.docType", "docType")
      .addSelect("d.productType", "productType")
      .addSelect("d.status", "status")
      .addSelect("d.serieId", "serieId")
      .addSelect("s.code", "serieCode")
      .addSelect("s.separator", "serieSeparator")
      .addSelect("s.padding", "seriePadding")
      .addSelect("d.correlative", "correlative")
      .addSelect("d.fromWarehouseId", "fromWarehouseId")
      .addSelect("fw.name", "fromWarehouseName")
      .addSelect("d.toWarehouseId", "toWarehouseId")
      .addSelect("tw.name", "toWarehouseName")
      .addSelect("d.referenceId", "referenceId")
      .addSelect("d.referenceType", "referenceType")
      .addSelect("d.note", "note")
      .addSelect("d.createdBy", "createdById")
      .addSelect("cu.name", "createdByName")
      .addSelect("cu.email", "createdByEmail")
      .addSelect("d.postedBy", "postedById")
      .addSelect("pu.name", "postedByName")
      .addSelect("pu.email", "postedByEmail")
      .addSelect("d.postedAt", "postedAt")
      .addSelect("d.createdAt", "createdAt")
      .orderBy("d.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany<{
        id: string;
        docType: DocType;
        productType: ProductCatalogProductType | null;
        status: DocStatus;
        serieId: string | null;
        serieCode: string | null;
        serieSeparator: string | null;
        seriePadding: number | null;
        correlative: number | null;
        fromWarehouseId: string | null;
        fromWarehouseName: string | null;
        toWarehouseId: string | null;
        toWarehouseName: string | null;
        referenceId: string | null;
        referenceType: ReferenceType | null;
        note: string | null;
        createdById: string | null;
        createdByName: string | null;
        createdByEmail: string | null;
        postedById: string | null;
        postedByName: string | null;
        postedByEmail: string | null;
        postedAt: Date | null;
        createdAt: Date;
      }>();

    return {
      items: rows.map((row) => ({
        id: row.id,
        docType: row.docType,
        productType: row.productType ?? null,
        status: row.status,
        serieId: row.serieId,
        serie: row.serieCode ?? null,
        serieCode: row.serieCode ?? null,
        serieSeparator: row.serieSeparator ?? null,
        seriePadding: row.seriePadding !== null && row.seriePadding !== undefined ? Number(row.seriePadding) : null,
        correlative: row.correlative !== null && row.correlative !== undefined ? Number(row.correlative) : null,
        fromWarehouseId: row.fromWarehouseId,
        fromWarehouseName: row.fromWarehouseName ?? null,
        fromWarehouse: row.fromWarehouseId
          ? { warehouseId: row.fromWarehouseId, name: row.fromWarehouseName ?? null }
          : null,
        toWarehouseId: row.toWarehouseId,
        toWarehouseName: row.toWarehouseName ?? null,
        toWarehouse: row.toWarehouseId
          ? { warehouseId: row.toWarehouseId, name: row.toWarehouseName ?? null }
          : null,
        referenceId: row.referenceId,
        referenceType: row.referenceType,
        note: row.note,
        createdById: row.createdById,
        createdBy: row.createdById
          ? { id: row.createdById, name: row.createdByName ?? null, email: row.createdByEmail ?? null }
          : null,
        postedById: row.postedById,
        postedBy: row.postedById
          ? { id: row.postedById, name: row.postedByName ?? null, email: row.postedByEmail ?? null }
          : null,
        postedAt: row.postedAt ?? null,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
    };
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

