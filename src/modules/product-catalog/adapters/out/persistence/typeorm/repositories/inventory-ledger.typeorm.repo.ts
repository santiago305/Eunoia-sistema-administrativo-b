import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { ProductCatalogInventoryLedgerEntry } from "src/modules/product-catalog/domain/entities/inventory-ledger-entry";
import {
  ProductCatalogInventoryLedgerListItem,
  ProductCatalogInventoryLedgerMovementListResult,
  ProductCatalogInventoryLedgerRepository,
} from "src/modules/product-catalog/domain/ports/inventory-ledger.repository";
import { ProductCatalogInventoryLedgerEntity } from "../entities/inventory-ledger.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";
import { ProductCatalogStockItemEntity } from "../entities/stock-item.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";
import { ProductCatalogProductEntity } from "../entities/product.entity";
import { ProductCatalogUnitEntity } from "../entities/unit.entity";
import { ProductCatalogInventoryDocumentEntity } from "../entities/inventory-document.entity";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { Direction } from "src/shared/domain/value-objects/direction";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

@Injectable()
export class ProductCatalogInventoryLedgerTypeormRepository implements ProductCatalogInventoryLedgerRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryLedgerEntity)
    private readonly repo: Repository<ProductCatalogInventoryLedgerEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductCatalogInventoryLedgerEntity);
  }

  async append(entries: ProductCatalogInventoryLedgerEntry[], tx?: TransactionContext): Promise<void> {
    if (!entries.length) return;
    await this.getRepo(tx).save(
      entries.map((entry) => ({
        docId: entry.docId,
        docItemId: entry.docItemId,
        warehouseId: entry.warehouseId,
        stockItemId: entry.stockItemId,
        direction: entry.direction,
        quantity: entry.quantity,
        locationId: entry.locationId,
        wasteQty: entry.wasteQty ?? 0,
        unitCost: entry.unitCost,
      })),
    );
  }

  async listByStockItemId(stockItemId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryLedgerEntry[]> {
    const rows = await this.getRepo(tx).find({
      where: { stockItemId },
      order: { createdAt: "DESC" },
    });
    return rows.map(
      (row) =>
        new ProductCatalogInventoryLedgerEntry(
          row.id,
          row.docId,
          row.docItemId,
          row.warehouseId,
          row.stockItemId,
          row.direction,
          row.quantity,
          row.locationId,
          row.wasteQty !== null && row.wasteQty !== undefined ? Number(row.wasteQty) : null,
          row.unitCost !== null && row.unitCost !== undefined ? Number(row.unitCost) : null,
          row.createdAt,
        ),
    );
  }

  async list(
    params: { stockItemId: string; warehouseId?: string; from?: Date; toExclusive?: Date },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryLedgerListItem[]> {
    const qb = this.getRepo(tx)
      .createQueryBuilder("l")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = l.stock_item_id")
      .innerJoin(ProductCatalogSkuEntity, "sku", "sku.sku_id = si.sku_id")
      .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = sku.product_id")
      .leftJoin(ProductCatalogUnitEntity, "u", "u.unit_id = p.base_unit_id")
      .innerJoin(ProductCatalogInventoryDocumentEntity, "d", "d.doc_id = l.doc_id")
      .leftJoin("document_series", "ds", "ds.serie_id = d.serie_id")
      .leftJoin(
        "purchase_orders",
        "po",
        "po.po_id = d.reference_id AND d.reference_type = :purchaseRefType",
        { purchaseRefType: ReferenceType.PURCHASE },
      )
      .leftJoin(
        "production_orders",
        "pr",
        "pr.production_id = d.reference_id AND d.reference_type = :productionRefType",
        { productionRefType: ReferenceType.PRODUCTION },
      )
      .leftJoin("users", "u_created", "u_created.user_id = d.created_by")
      .leftJoin("users", "u_posted", "u_posted.user_id = d.posted_by")
      .leftJoin(
        "suppliers",
        "s",
        "s.supplier_id = po.supplier_id",
      )
      .where("l.stock_item_id = :stockItemId", { stockItemId: params.stockItemId });

    if (params.warehouseId) {
      qb.andWhere("l.warehouse_id = :warehouseId", { warehouseId: params.warehouseId });
    }

    if (params.from) {
      qb.andWhere("l.created_at >= :from", { from: params.from });
    }

    if (params.toExclusive) {
      qb.andWhere("l.created_at < :toExclusive", { toExclusive: params.toExclusive });
    }

    const rows = await qb
      .select("l.ledger_id", "id")
      .addSelect("l.doc_id", "docId")
      .addSelect("d.doc_type", "docType")
      .addSelect("d.reference_id", "referenceId")
      .addSelect("d.reference_type", "referenceType")
      .addSelect("l.doc_item_id", "docItemId")
      .addSelect("d.serie_id", "inventoryDocumentSerieId")
      .addSelect("d.correlative", "inventoryDocumentCorrelative")
      .addSelect("ds.code", "inventoryDocumentSerieCode")
      .addSelect("ds.name", "inventoryDocumentSerieName")
      .addSelect("l.warehouse_id", "warehouseId")
      .addSelect("si.sku_id", "skuId")
      .addSelect("l.direction", "direction")
      .addSelect("l.quantity", "quantity")
      .addSelect("l.location_id", "locationId")
      .addSelect("l.waste_qty", "wasteQty")
      .addSelect("l.unit_cost", "unitCost")
      .addSelect("l.created_at", "createdAt")
      .addSelect("sku.product_id", "productId")
      .addSelect("sku.backend_sku", "backendSku")
      .addSelect("sku.custom_sku", "customSku")
      .addSelect("sku.name", "skuName")
      .addSelect("p.name", "productName")
      .addSelect("p.type", "productType")
      .addSelect("p.base_unit_id", "baseUnitId")
      .addSelect("u.name", "baseUnitName")
      .addSelect("u.code", "baseUnitCode")
      .addSelect("po.po_id", "purchaseId")
      .addSelect("po.document_type", "purchaseDocumentType")
      .addSelect("po.serie", "purchaseSerie")
      .addSelect("po.correlative", "purchaseCorrelative")
      .addSelect("po.status", "purchaseStatus")
      .addSelect("po.date_issue", "purchaseDateIssue")
      .addSelect("po.warehouse_id", "purchaseWarehouseId")
      .addSelect("po.supplier_id", "purchaseSupplierId")
      .addSelect("s.name", "purchaseSupplierName")
      .addSelect("s.trade_name", "purchaseSupplierTradeName")
      .addSelect("s.document_number", "purchaseSupplierDocumentNumber")
      .addSelect("pr.production_id", "productionId")
      .addSelect("pr.doc_type", "productionDocType")
      .addSelect("pr.serie_id", "productionSerieId")
      .addSelect("pr.correlative", "productionCorrelative")
      .addSelect("pr.status", "productionStatus")
      .addSelect("pr.reference", "productionReference")
      .addSelect("pr.manufacture_date", "productionManufactureDate")
      .addSelect("pr.from_warehouse_id", "productionFromWarehouseId")
      .addSelect("pr.to_warehouse_id", "productionToWarehouseId")
      .addSelect("u_created.user_id", "createdBy")
      .addSelect("u_created.email", "createdByEmail")
      .addSelect("u_posted.user_id", "postedBy")
      .addSelect("u_posted.email", "postedByEmail")
      .orderBy("l.created_at", "DESC")
      .getRawMany<{
        id: string;
        docId: string;
        docType: DocType;
        referenceId: string | null;
        referenceType: ReferenceType | null;
        docItemId: string | null;
        inventoryDocumentSerieId: string | null;
        inventoryDocumentCorrelative: number | string | null;
        inventoryDocumentSerieCode: string | null;
        inventoryDocumentSerieName: string | null;
        warehouseId: string;
        skuId: string;
        direction: string;
        quantity: number | string;
        locationId: string | null;
        wasteQty: number | string | null;
        unitCost: number | string | null;
        createdAt: Date;
        createdBy: string | null;
        createdByName: string | null;
        createdByEmail: string | null;
        postedBy: string | null;
        postedByName: string | null;
        postedByEmail: string | null;
        productId: string;
        backendSku: string;
        customSku: string | null;
        skuName: string;
        productName: string;
        productType: string;
        baseUnitId: string | null;
        baseUnitName: string | null;
        baseUnitCode: string | null;
        purchaseId: string | null;
        purchaseDocumentType: string | null;
        purchaseSerie: string | null;
        purchaseCorrelative: number | string | null;
        purchaseStatus: string | null;
        purchaseDateIssue: Date | null;
        purchaseWarehouseId: string | null;
        purchaseSupplierId: string | null;
        purchaseSupplierName: string | null;
        purchaseSupplierTradeName: string | null;
        purchaseSupplierDocumentNumber: string | null;
        productionId: string | null;
        productionDocType: string | null;
        productionSerieId: string | null;
        productionCorrelative: number | string | null;
        productionStatus: string | null;
        productionReference: string | null;
        productionManufactureDate: Date | null;
        productionFromWarehouseId: string | null;
        productionToWarehouseId: string | null;
      }>();

    return rows.map((row) => ({
      referenceType: row.referenceType ?? null,
      reference:
        row.referenceId && row.referenceType
          ? row.referenceType === ReferenceType.PURCHASE
            ? {
                type: ReferenceType.PURCHASE,
                id: row.referenceId,
                purchase: row.purchaseId
                  ? {
                      id: row.purchaseId,
                      documentType: row.purchaseDocumentType ?? null,
                      serie: row.purchaseSerie ?? null,
                      correlative:
                        row.purchaseCorrelative !== null && row.purchaseCorrelative !== undefined
                          ? Number(row.purchaseCorrelative)
                          : null,
                      status: row.purchaseStatus ?? null,
                      dateIssue: row.purchaseDateIssue ?? null,
                      warehouseId: row.purchaseWarehouseId ?? null,
                      supplierId: row.purchaseSupplierId ?? null,
                      supplier: row.purchaseSupplierId
                      ? {
                          id: row.purchaseSupplierId,
                          name: row.purchaseSupplierTradeName ?? row.purchaseSupplierName ?? null,
                          documentNumber: row.purchaseSupplierDocumentNumber ?? null,
                        }
                      : null,
                    }
                  : null,
              }
            : {
                type: ReferenceType.PRODUCTION,
                id: row.referenceId,
                production:
                  row.productionId &&
                  row.productionDocType &&
                  row.productionSerieId &&
                  row.productionCorrelative !== null &&
                  row.productionCorrelative !== undefined
                  ? {
                      id: row.productionId,
                      docType: row.productionDocType,
                      serieId: row.productionSerieId,
                      correlative: Number(row.productionCorrelative),
                      status: row.productionStatus ?? null,
                      reference: row.productionReference ?? null,
                      manufactureDate: row.productionManufactureDate ?? null,
                      fromWarehouseId: row.productionFromWarehouseId ?? null,
                      toWarehouseId: row.productionToWarehouseId ?? null,
                    }
                  : null,
              }
          : null,
      id: row.id,
      docId: row.docId,
      docType: row.docType,
      referenceId: row.referenceId ?? null,
      docItemId: row.docItemId ?? null,
      serieId: row.inventoryDocumentSerieId ?? null,
       serie:
      row.inventoryDocumentSerieId
      ? {
          id: row.inventoryDocumentSerieId,
          code: row.inventoryDocumentSerieCode ?? null,
          name: row.inventoryDocumentSerieName ?? null,
        }
      : null,
      correlative: row.inventoryDocumentCorrelative !== null && row.inventoryDocumentCorrelative !== undefined ? Number(row.inventoryDocumentCorrelative) : null,
      warehouseId: row.warehouseId,
      skuId: row.skuId,
      direction: row.direction as ProductCatalogInventoryLedgerListItem["direction"],
      quantity: Number(row.quantity ?? 0),
      locationId: row.locationId ?? null,
      wasteQty: row.wasteQty !== null && row.wasteQty !== undefined ? Number(row.wasteQty) : null,
      unitCost: row.unitCost !== null && row.unitCost !== undefined ? Number(row.unitCost) : null,
      createdAt: row.createdAt,
      createdBy: row.createdBy
      ? {
          id: row.createdBy,
          email: row.createdByEmail,
        }
      : null,
      postedBy: row.postedBy
      ? {
          id: row.postedBy,
          email: row.postedByEmail,
        }
      : null,
      sku: {
        id: row.skuId,
        productId: row.productId,
        backendSku: row.backendSku,
        customSku: row.customSku ?? null,
        name: row.skuName,
      },
      product: {
        id: row.productId,
        name: row.productName,
        type: row.productType as ProductCatalogInventoryLedgerListItem["product"]["type"],
        baseUnitId: row.baseUnitId ?? null,
      },
      baseUnit:
        row.baseUnitId && row.baseUnitName && row.baseUnitCode
          ? { id: row.baseUnitId, name: row.baseUnitName, code: row.baseUnitCode }
          : null,
    }));
  }

  async updateWasteByDocItem(input: { docItemId: string; wasteQty: number }, tx?: TransactionContext): Promise<boolean> {
    const result = await this.getRepo(tx).update({ docItemId: input.docItemId }, { wasteQty: input.wasteQty });
    return (result.affected ?? 0) > 0;
  }

  async listMovementsPaged(
    params: {
      page: number;
      limit: number;
      productType?: ProductCatalogProductType;
      from?: Date;
      toExclusive?: Date;
      warehouseIdsIn?: string[];
      skuIdsIn?: string[];
      directionIn?: Direction[];
      userIdsIn?: string[];
      skuQuery?: string;
      q?: string;
    },
    tx?: TransactionContext,
  ): Promise<ProductCatalogInventoryLedgerMovementListResult> {
    const page = Number.isFinite(params.page) ? Math.max(1, Math.trunc(params.page)) : 1;
    const limit = Number.isFinite(params.limit) ? Math.max(1, Math.min(100, Math.trunc(params.limit))) : 10;
    const qb = this.getRepo(tx)
      .createQueryBuilder("l")
      .innerJoin(ProductCatalogStockItemEntity, "si", "si.stock_item_id = l.stock_item_id")
      .innerJoin(ProductCatalogSkuEntity, "sku", "sku.sku_id = si.sku_id")
      .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = sku.product_id")
      .innerJoin(ProductCatalogInventoryDocumentEntity, "d", "d.doc_id = l.doc_id")
      .leftJoin("warehouses", "w", "w.id = l.warehouse_id")
      .leftJoin("users", "u_created", "u_created.user_id = d.created_by")
      .leftJoin("users", "u_posted", "u_posted.user_id = d.posted_by");

    if (params.productType) {
      qb.andWhere("p.type = :productType", { productType: params.productType });
    }

    if (params.warehouseIdsIn?.length) {
      qb.andWhere("l.warehouse_id IN (:...warehouseIdsIn)", { warehouseIdsIn: params.warehouseIdsIn });
    }

    if (params.skuIdsIn?.length) {
      qb.andWhere("sku.sku_id IN (:...skuIdsIn)", { skuIdsIn: params.skuIdsIn });
    }

    if (params.directionIn?.length) {
      qb.andWhere("l.direction IN (:...directionIn)", { directionIn: params.directionIn });
    }

    if (params.userIdsIn?.length) {
      qb.andWhere("(d.created_by IN (:...userIdsIn) OR d.posted_by IN (:...userIdsIn))", { userIdsIn: params.userIdsIn });
    }

    if (params.from) {
      qb.andWhere("l.created_at >= :from", { from: params.from });
    }

    if (params.toExclusive) {
      qb.andWhere("l.created_at < :toExclusive", { toExclusive: params.toExclusive });
    }

    const applySearch = (alias: string, value: string) => {
      qb.andWhere(
        `(
          sku.backend_sku ILIKE :${alias}
          OR sku.custom_sku ILIKE :${alias}
          OR sku.name ILIKE :${alias}
          OR p.name ILIKE :${alias}
          OR u_created.email ILIKE :${alias}
          OR u_created.name ILIKE :${alias}
          OR u_posted.email ILIKE :${alias}
          OR u_posted.name ILIKE :${alias}
        )`,
        { [alias]: `%${value}%` },
      );
    };

    if (params.skuQuery?.trim()) {
      applySearch("skuQuery", params.skuQuery.trim());
    }

    if (params.q?.trim()) {
      applySearch("q", params.q.trim());
    }

    const total = await qb.clone().getCount();

    const skip = (page - 1) * limit;
    const rows = await qb
      .select("l.ledger_id", "id")
      .addSelect("l.created_at", "createdAt")
      .addSelect("l.quantity", "quantity")
      .addSelect("l.direction", "direction")
      .addSelect("l.warehouse_id", "warehouseId")
      .addSelect("w.name", "warehouseName")
      .addSelect("sku.sku_id", "skuId")
      .addSelect("sku.backend_sku", "backendSku")
      .addSelect("sku.custom_sku", "customSku")
      .addSelect("sku.name", "skuName")
      .addSelect("p.product_id", "productId")
      .addSelect("p.name", "productName")
      .addSelect("p.type", "productType")
      .addSelect("p.base_unit_id", "baseUnitId")
      .addSelect("u_created.user_id", "createdById")
      .addSelect("u_created.name", "createdByName")
      .addSelect("u_created.email", "createdByEmail")
      .addSelect("u_posted.user_id", "postedById")
      .addSelect("u_posted.name", "postedByName")
      .addSelect("u_posted.email", "postedByEmail")
      .orderBy("l.created_at", "DESC")
      .limit(limit)
      .offset(skip)
      .getRawMany<{
        id: string;
        createdAt: Date;
        quantity: number | string;
        direction: Direction;
        warehouseId: string;
        warehouseName: string | null;
        skuId: string;
        backendSku: string;
        customSku: string | null;
        skuName: string;
        productId: string;
        productName: string;
        productType: ProductCatalogProductType;
        baseUnitId: string | null;
        createdById: string | null;
        createdByName: string | null;
        createdByEmail: string | null;
        postedById: string | null;
        postedByName: string | null;
        postedByEmail: string | null;
      }>();

    const items = rows.map((row) => {
      const userId = row.createdById ?? row.postedById ?? null;
      const userName = row.createdByName ?? row.postedByName ?? null;
      const userEmail = row.createdByEmail ?? row.postedByEmail ?? null;

      return {
        id: row.id,
        createdAt: row.createdAt,
        quantity: Number(row.quantity ?? 0),
        direction: row.direction,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName ?? null,
        sku: {
          id: row.skuId,
          productId: row.productId,
          backendSku: row.backendSku,
          customSku: row.customSku ?? null,
          name: row.skuName,
        },
        product: {
          id: row.productId,
          name: row.productName,
          type: row.productType,
          baseUnitId: row.baseUnitId ?? null,
        },
        user: userId
          ? {
              id: userId,
              name: userName,
              email: userEmail,
            }
          : null,
      };
    });

    return { items, total };
  }
}
