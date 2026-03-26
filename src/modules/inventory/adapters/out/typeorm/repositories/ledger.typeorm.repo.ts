import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { LedgerRepository } from '../../../../domain/ports/ledger.repository.port';
import {
  LedgerDocumentSnapshot,
  LedgerEntry,
  LedgerReferenceDocSnapshot,
  LedgerStockItemSnapshot
} from '../../../../domain/entities/ledger-entry';
import { InventoryLedgerEntity } from '../entities/inventory_ledger.entity';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';
import { PurchaseOrderEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { ProductionOrderEntity } from 'src/modules/production/adapters/out/persistence/typeorm/entities/production_order.entity';
import { WarehouseEntity } from 'src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { SupplierEntity } from 'src/modules/suppliers/adapters/out/persistence/typeorm/entities/supplier.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { DocumentSerie } from 'src/modules/inventory/adapters/out/typeorm/entities/document_serie.entity';
import { ProductEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/product.entity';
import { UnitEntity } from 'src/modules/catalog/adapters/out/persistence/typeorm/entities/unit.entity';


@Injectable()
export class LedgerTypeormRepository implements LedgerRepository {
  constructor(
    @InjectRepository(InventoryLedgerEntity)
    private readonly repo: Repository<InventoryLedgerEntity>,
  ) {}
  private getManager(tx?: TransactionContext) {
  if (tx && (tx as TypeormTransactionContext).manager) {
    return (tx as TypeormTransactionContext).manager;
  }
  return this.repo.manager;
}

private getRepo(tx?: TransactionContext) {
  return this.getManager(tx).getRepository(InventoryLedgerEntity);
}
  async append(entries: LedgerEntry[], tx?: TransactionContext): Promise<void> {
    const repo = this.getRepo(tx);
    const rows = entries.map((e) => ({
      docId: e.docId,
      docItemId: e.docItemId ?? null,
      warehouseId: e.warehouseId,
      locationId: e.locationId ?? null,
      stockItemId: e.stockItemId,
      direction: e.direction,
      quantity: e.quantity,
      wasteQty: e.wasteQty ?? 0,
      unitCost: e.unitCost ?? null,
    }));
    await repo.save(rows);
  }
  private normalizeRange(params: { from?: Date; to?: Date }) {
    let from = params.from ? new Date(params.from) : undefined;
    let to = params.to ? new Date(params.to) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  private applyFilters(
    qb: ReturnType<Repository<InventoryLedgerEntity>["createQueryBuilder"]>,
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      docId?: string;
    },
  ) {
    if (params.warehouseId) qb.andWhere('l.warehouseId = :warehouseId', { warehouseId: params.warehouseId });
    if (params.stockItemId) qb.andWhere('l.stockItemId = :stockItemId', { stockItemId: params.stockItemId });
    if (params.docId) qb.andWhere('l.docId = :docId', { docId: params.docId });
    if (params.locationId !== undefined) {
      if (params.locationId === null) {
        qb.andWhere('l.locationId IS NULL');
      } else {
        qb.andWhere('l.locationId = :locationId', { locationId: params.locationId });
      }
    }
  }

  private async sumInOut(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      docId?: string;
    },
    fromDate?: Date,
    toDate?: Date,
    tx?: TransactionContext,
  ): Promise<{ inQty: number; outQty: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder('l');
    qb
      .select(
        "COALESCE(SUM(l.quantity) FILTER (WHERE l.direction = :dirIn), 0)",
        "inQty",
      )
      .addSelect(
        "COALESCE(SUM(l.quantity) FILTER (WHERE l.direction = :dirOut), 0)",
        "outQty",
      );
    qb.setParameters({ dirIn: "IN", dirOut: "OUT" });
    this.applyFilters(qb, params);
    if (fromDate && toDate) {
      qb.andWhere('l.createdAt BETWEEN :from AND :to', { from: fromDate, to: toDate });
    } else if (fromDate) {
      qb.andWhere('l.createdAt >= :from', { from: fromDate });
    } else if (toDate) {
      qb.andWhere('l.createdAt <= :to', { to: toDate });
    }
    const raw = await qb.getRawOne<{ inQty: string | number; outQty: string | number }>();
    return {
      inQty: Number(raw?.inQty ?? 0),
      outQty: Number(raw?.outQty ?? 0),
    };
  }

  async getBalances(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<{
    entradaRango: number;
    salidaRango: number;
    balanceRango: number;
    balanceInicial: number;
    balanceFinal: number;
    balanceTotal: number;
  }> {
    const { from, to } = this.normalizeRange(params);
    const range = await this.sumInOut(params, from, to, tx);
    const entradaRango = range.inQty;
    const salidaRango = range.outQty;
    const balanceRango = entradaRango - salidaRango;

    let balanceInicial = 0;
    if (from) {
      const beforeFrom = new Date(from.getTime() - 1);
      const initial = await this.sumInOut(params, undefined, beforeFrom, tx);
      balanceInicial = initial.inQty - initial.outQty;
    }

    const totalUpTo = await this.sumInOut(params, undefined, to, tx);
    const balanceTotal = totalUpTo.inQty - totalUpTo.outQty;
    const balanceFinal = balanceInicial + balanceRango;

    return {
      entradaRango,
      salidaRango,
      balanceRango,
      balanceInicial,
      balanceFinal,
      balanceTotal,
    };
  }

  async getDailyTotals(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
    },
    tx?: TransactionContext,
  ): Promise<
    {
      day: string;
      entrada: number;
      salida: number;
      balance: number;
    }[]
  > {
    const repo = this.getRepo(tx);
    const { from, to } = this.normalizeRange(params);

    const qb = repo.createQueryBuilder('l');
    qb
      .select('DATE(l.createdAt)', 'day')
      .addSelect(
        "COALESCE(SUM(l.quantity) FILTER (WHERE l.direction = :dirIn), 0)",
        "inQty",
      )
      .addSelect(
        "COALESCE(SUM(l.quantity) FILTER (WHERE l.direction = :dirOut), 0)",
        "outQty",
      );
    qb.setParameters({ dirIn: "IN", dirOut: "OUT" });
    this.applyFilters(qb, params);
    if (from && to) {
      qb.andWhere('l.createdAt BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.andWhere('l.createdAt >= :from', { from });
    } else if (to) {
      qb.andWhere('l.createdAt <= :to', { to });
    }

    qb.groupBy('DATE(l.createdAt)').orderBy('DATE(l.createdAt)', 'ASC');

    const rows = await qb.getRawMany<{ day: string | Date; inQty: string | number; outQty: string | number }>();

    return rows.map((r) => {
      const inQty = Number(r.inQty ?? 0);
      const outQty = Number(r.outQty ?? 0);
      const day =
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day);
      return {
        day,
        entrada: inQty,
        salida: outQty,
        balance: inQty - outQty,
      };
    });
  }

  async list(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      from?: Date;
      to?: Date;
      docId?: string;
      page?:number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: LedgerEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const repo = this.getRepo(tx);
    const where: any = {};
    
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.stockItemId) where.stockItemId = params.stockItemId;
    if (params.docId) where.docId = params.docId;
    if (params.locationId !== undefined) {
        where.locationId = params.locationId;
    }
    const { from, to } = this.normalizeRange(params);

    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;
    const total = await repo.count({ where });

    const balanceQb = repo.createQueryBuilder('l');
    this.applyFilters(balanceQb, params);
    if (from && to) {
      balanceQb.andWhere('l.createdAt BETWEEN :from AND :to', { from, to });
    } else if (from) {
      balanceQb.andWhere('l.createdAt >= :from', { from });
    } else if (to) {
      balanceQb.andWhere('l.createdAt <= :to', { to });
    }

    balanceQb
      .select('l.id', 'id')
      .addSelect(
        "SUM(CASE WHEN l.direction = 'IN' THEN l.quantity ELSE -l.quantity END) OVER (ORDER BY l.createdAt ASC, l.id ASC)",
        'running_balance',
      )
      .orderBy('l.createdAt', 'ASC')
      .addOrderBy('l.id', 'ASC')
      .skip(skip)
      .take(limit);

    const rawPage = await balanceQb.getRawMany<{ id: string; running_balance: string | number }>();
    if (!rawPage.length) {
      return { items: [], total, page, limit };
    }

    const ids = rawPage.map((r) => r.id);
    const balanceById = new Map(
      rawPage.map((r) => [r.id, Number(r.running_balance ?? 0)]),
    );

    const rowsUnordered = await repo.find({
      where: { id: In(ids) },
      relations: { warehouse: true, stockItem: { product: true, variant: true }, document: true },
    });
    const rowById = new Map(rowsUnordered.map((r) => [r.id, r]));
    const rows = ids
      .map((id) => rowById.get(id))
      .filter((r): r is InventoryLedgerEntity => !!r);
    const purchaseIds = new Set<string>();
    const productionIds = new Set<string>();
    for (const r of rows) {
      const refId = r.document?.referenceId;
      const refType = r.document?.referenceType;
      if (!refId || !refType) continue;
      if (refType === ReferenceType.PURCHASE) purchaseIds.add(refId);
      if (refType === ReferenceType.PRODUCTION) productionIds.add(refId);
    }

    const manager = this.getManager(tx);
    const purchaseRepo = manager.getRepository(PurchaseOrderEntity);
    const productionRepo = manager.getRepository(ProductionOrderEntity);
    const warehouseRepo = manager.getRepository(WarehouseEntity);
    const supplierRepo = manager.getRepository(SupplierEntity);
    const userRepo = manager.getRepository(User);
    const serieRepo = manager.getRepository(DocumentSerie);
    const productRepo = manager.getRepository(ProductEntity);
    const unitRepo = manager.getRepository(UnitEntity);

    const purchases = purchaseIds.size
      ? await purchaseRepo.find({ where: { id: In([...purchaseIds]) } })
      : [];
    const productions = productionIds.size
      ? await productionRepo.find({ where: { id: In([...productionIds]) } })
      : [];

    const warehouseIds = new Set<string>();
    const supplierIds = new Set<string>();
    const userIds = new Set<string>();
    const serieIds = new Set<string>();

    const unitIds = new Set<string>();
    const productIdsForUnits = new Set<string>();

    for (const r of rows) {
      if (r.document?.serieId) serieIds.add(r.document.serieId);
      if (r.document?.fromWarehouseId) warehouseIds.add(r.document.fromWarehouseId);
      if (r.document?.toWarehouseId) warehouseIds.add(r.document.toWarehouseId);
      if (r.document?.createdBy) userIds.add(r.document.createdBy);
      if (r.stockItem?.product?.baseUnitId) unitIds.add(r.stockItem.product.baseUnitId);
      if (r.stockItem?.variant?.productId) productIdsForUnits.add(r.stockItem.variant.productId);
    }

    for (const p of purchases) {
      warehouseIds.add(p.warehouseId);
      supplierIds.add(p.supplierId);
      if (p.createdBy) userIds.add(p.createdBy);
    }
    for (const p of productions) {
      warehouseIds.add(p.fromWarehouseId);
      warehouseIds.add(p.toWarehouseId);
      if (p.serieId) serieIds.add(p.serieId);
      if (p.createdBy) userIds.add(p.createdBy);
    }

    const warehouses = warehouseIds.size
      ? await warehouseRepo.find({ where: { id: In([...warehouseIds]) } })
      : [];
    const suppliers = supplierIds.size
      ? await supplierRepo.find({ where: { id: In([...supplierIds]) } })
      : [];
    const users = userIds.size
      ? await userRepo.find({ where: { id: In([...userIds]) } })
      : [];
    const series = serieIds.size
      ? await serieRepo.find({ where: { id: In([...serieIds]) } })
      : [];

    const productsForUnits = productIdsForUnits.size
      ? await productRepo.find({ select: ['id', 'baseUnitId', 'name'], where: { id: In([...productIdsForUnits]) } })
      : [];
    for (const p of productsForUnits) {
      if (p.baseUnitId) unitIds.add(p.baseUnitId);
    }
    const units = unitIds.size
      ? await unitRepo.find({ where: { id: In([...unitIds]) } })
      : [];

    const purchaseById = new Map(purchases.map((p) => [p.id, p]));
    const productionById = new Map(productions.map((p) => [p.id, p]));
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const serieById = new Map(series.map((s) => [s.id, s]));
    const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

    const unitById = new Map(units.map((u) => [u.id, u]));
    const productById = new Map(productsForUnits.map((p) => [p.id, p]));
    const productUnitByProductId = new Map(productsForUnits.map((p) => [p.id, p.baseUnitId]));

    return {
      items: rows.map(
        (r) =>
          {
            const productUnitName = r.stockItem?.product?.baseUnitId
              ? unitById.get(r.stockItem.product.baseUnitId)?.name ?? null
              : null;
            const variantProduct = r.stockItem?.variant?.productId
              ? productById.get(r.stockItem.variant.productId)
              : undefined;
            const variantUnitId = r.stockItem?.variant?.productId
              ? productUnitByProductId.get(r.stockItem.variant.productId)
              : undefined;
            const variantUnitName = variantUnitId ? unitById.get(variantUnitId)?.name ?? null : null;

            const stockItem: LedgerStockItemSnapshot | undefined = r.stockItem
              ? {
                  id: r.stockItem.id,
                  type: r.stockItem.type,
                  productId: r.stockItem.productId ?? null,
                  variantId: r.stockItem.variantId ?? null,
                  product: r.stockItem.product
                    ? {
                        id: r.stockItem.product.id,
                        name: r.stockItem.product.name,
                        sku: r.stockItem.product.sku,
                        unidad: productUnitName,
                      }
                    : null,
                  variant: r.stockItem.variant
                    ? {
                        id: r.stockItem.variant.id,
                        productId: r.stockItem.variant.productId,
                        name: variantProduct?.name ?? null,
                        sku: r.stockItem.variant.sku,
                        unidad: variantUnitName,
                      }
                    : null,
                }
              : undefined;

            const document: LedgerDocumentSnapshot | undefined = r.document
              ? {
                  id: r.document.id,
                  docType: r.document.docType,
                  status: r.document.status,
                  serieId: r.document.serieId,
                  serie: r.document.serieId
                    ? (() => {
                        const s = serieById.get(r.document.serieId);
                        return s ? { id: s.id, code: s.code } : null;
                      })()
                    : null,
                  correlative: r.document.correlative ?? 0,
                  fromWarehouseId: r.document.fromWarehouseId,
                  toWarehouseId: r.document.toWarehouseId,
                  fromWarehouse: r.document.fromWarehouseId
                    ? (() => {
                        const w = warehouseById.get(r.document.fromWarehouseId);
                        return w ? { id: w.id, name: w.name } : null;
                      })()
                    : null,
                  toWarehouse: r.document.toWarehouseId
                    ? (() => {
                        const w = warehouseById.get(r.document.toWarehouseId);
                        return w ? { id: w.id, name: w.name } : null;
                      })()
                    : null,
                  referenceId: r.document.referenceId,
                  referenceType: r.document.referenceType,
                  createdBy: r.document.createdBy
                   ? (() => {
                        const u = userById.get(r.document.createdBy);
                        return u ? {
                          id: u.id,
                          name: u.name,
                          email: u.email,
                        } : null;
                      })()
                    : null,
                }
              : undefined;

            let referenceDoc: LedgerReferenceDocSnapshot | undefined;
            if (r.document?.referenceId && r.document?.referenceType) {
              if (r.document.referenceType === ReferenceType.PURCHASE) {
                const po = purchaseById.get(r.document.referenceId);
                if (po) {
                  const supplierRef = supplierById.get(po.supplierId);
                  const createdByUser = userById.get(po.createdBy);
                  referenceDoc = {
                    type: ReferenceType.PURCHASE,
                    purchase: {
                      id: po.id,
                      supplierId: po.supplierId,
                      warehouseId: po.warehouseId,
                      documentType: po.documentType ?? null,
                      serie: po.serie ?? null,
                      correlative: po.correlative ?? null,
                      expectedAt: po.expectedAt ?? null,
                      dateIssue: po.dateIssue ?? null,
                      dateExpiration: po.dateExpiration ?? null,
                      createdAt: po.createdAt,
                    },
                    supplier: supplierRef
                      ? {
                          id: supplierRef.id,
                          documentType: supplierRef.documentType,
                          documentNumber: supplierRef.documentNumber,
                          name: supplierRef.name ?? null,
                          lastName: supplierRef.lastName ?? null,
                          tradeName: supplierRef.tradeName ?? null,
                          phone: supplierRef.phone ?? null,
                          email: supplierRef.email ?? null,
                          address: supplierRef.address ?? null,
                          note: supplierRef.note ?? null,
                          leadTimeDays: supplierRef.leadTimeDays ?? null,
                          isActive: supplierRef.isActive,
                          createdAt: supplierRef.createdAt,
                          updatedAt: supplierRef.updatedAt,
                        }
                      : undefined,
                    createdBy: createdByUser
                      ? {
                          id: createdByUser.id,
                          name: createdByUser.name,
                          email: createdByUser.email,
                        }
                      : undefined,
                  };
                }
              } else if (r.document.referenceType === ReferenceType.PRODUCTION) {
                const prod = productionById.get(r.document.referenceId);
                if (prod) {
                  const userRef = prod.createdBy ? userById.get(prod.createdBy) : undefined;
                  const serieRef = prod.serieId ? serieById.get(prod.serieId) : undefined;
                  referenceDoc = {
                    type: ReferenceType.PRODUCTION,
                    production: {
                      id: prod.id,
                      fromWarehouseId: prod.fromWarehouseId,
                      toWarehouseId: prod.toWarehouseId,
                      docType: prod.docType,
                      serieId: prod.serieId,
                      serie: serieRef?.code ?? null,
                      correlative: prod.correlative,
                      status: prod.status,
                      reference: prod.reference ?? null,
                      manufactureDate: prod.manufactureDate,
                      createdBy: prod.createdBy,
                      updatedBy: prod.updatedBy ?? undefined,
                      createdAt: prod.createdAt,
                      updatedAt: prod.updatedAt,
                    },
                    createdBy: userRef
                      ? {
                          id: userRef.id,
                          name: userRef.name,
                          email: userRef.email,
                        }
                      : undefined,
                  };
                }
              }
            }

            return new LedgerEntry(
              r.id,
              r.docId,
              r.warehouseId,
              r.stockItemId,
              r.direction as any,
              r.quantity,
              r.unitCost ?? null,
              r.docItemId ?? null,
              r.wasteQty ?? 0,
              r.locationId,
              r.createdAt,
              stockItem,
              document,
              referenceDoc,
              balanceById.get(r.id),
            );
          },
      ),
      total,
      page,
      limit,
    };
  }

  async updateWasteByDocItem(
    params: { docItemId: string; wasteQty: number },
    tx?: TransactionContext,
  ): Promise<boolean> {
    const repo = this.getRepo(tx);
    const result = await repo.update(
      { docItemId: params.docItemId },
      { wasteQty: params.wasteQty },
    );
    return (result.affected ?? 0) > 0;
  }
  
}
