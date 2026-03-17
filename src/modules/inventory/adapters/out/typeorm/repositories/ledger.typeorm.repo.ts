import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { LedgerRepository } from '../../../../domain/ports/ledger.repository.port';
import {
  LedgerDocumentSnapshot,
  LedgerEntry,
  LedgerReferenceDocSnapshot,
  LedgerStockItemSnapshot,
  LedgerWarehouseSnapshot,
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
      warehouseId: e.warehouseId,
      locationId: e.locationId ?? null,
      stockItemId: e.stockItemId,
      direction: e.direction,
      quantity: e.quantity,
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

    const [rows, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip,
      take: limit,
      relations: { warehouse: true, stockItem: { product: true, variant: true }, document: true },
    });
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

    const purchases = purchaseIds.size
      ? await purchaseRepo.find({ where: { id: In([...purchaseIds]) } })
      : [];
    const productions = productionIds.size
      ? await productionRepo.find({ where: { id: In([...productionIds]) } })
      : [];

    const warehouseIds = new Set<string>();
    const supplierIds = new Set<string>();
    const userIds = new Set<string>();

    for (const p of purchases) {
      warehouseIds.add(p.warehouseId);
      supplierIds.add(p.supplierId);
    }
    for (const p of productions) {
      warehouseIds.add(p.fromWarehouseId);
      warehouseIds.add(p.toWarehouseId);
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

    const purchaseById = new Map(purchases.map((p) => [p.id, p]));
    const productionById = new Map(productions.map((p) => [p.id, p]));
    const warehouseById = new Map(warehouses.map((w) => [w.id, w]));
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      items: rows.map(
        (r) =>
          {
            const warehouse: LedgerWarehouseSnapshot | undefined = r.warehouse
              ? {
                  id: r.warehouse.id,
                  name: r.warehouse.name,
                  department: r.warehouse.department,
                  province: r.warehouse.province,
                  district: r.warehouse.district,
                  address: r.warehouse.address ?? null,
                  isActive: r.warehouse.isActive,
                  createdAt: r.warehouse.createdAt,
                }
              : undefined;

            const stockItem: LedgerStockItemSnapshot | undefined = r.stockItem
              ? {
                  id: r.stockItem.id,
                  type: r.stockItem.type,
                  productId: r.stockItem.productId ?? null,
                  variantId: r.stockItem.variantId ?? null,
                  isActive: r.stockItem.isActive,
                  createdAt: r.stockItem.createdAt,
                  product: r.stockItem.product
                    ? {
                        id: r.stockItem.product.id,
                        name: r.stockItem.product.name,
                        sku: r.stockItem.product.sku,
                        barcode: r.stockItem.product.barcode,
                        isActive: r.stockItem.product.isActive,
                        createdAt: r.stockItem.product.createdAt,
                      }
                    : null,
                  variant: r.stockItem.variant
                    ? {
                        id: r.stockItem.variant.id,
                        productId: r.stockItem.variant.productId,
                        sku: r.stockItem.variant.sku,
                        barcode: r.stockItem.variant.barcode,
                        isActive: r.stockItem.variant.isActive,
                        createdAt: r.stockItem.variant.createdAt,
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
                  correlative: r.document.correlative ?? 0,
                  fromWarehouseId: r.document.fromWarehouseId,
                  toWarehouseId: r.document.toWarehouseId,
                  referenceId: r.document.referenceId,
                  referenceType: r.document.referenceType,
                  note: r.document.note,
                  createdBy: r.document.createdBy,
                  postedBy: r.document.postedBy,
                  postedAt: r.document.postedAt,
                  createdAt: r.document.createdAt,
                }
              : undefined;

            let referenceDoc: LedgerReferenceDocSnapshot | undefined;
            if (r.document?.referenceId && r.document?.referenceType) {
              if (r.document.referenceType === ReferenceType.PURCHASE) {
                const po = purchaseById.get(r.document.referenceId);
                if (po) {
                  const warehouseRef = warehouseById.get(po.warehouseId);
                  const supplierRef = supplierById.get(po.supplierId);
                  referenceDoc = {
                    type: ReferenceType.PURCHASE,
                    purchase: {
                      id: po.id,
                      supplierId: po.supplierId,
                      warehouseId: po.warehouseId,
                      documentType: po.documentType ?? null,
                      serie: po.serie ?? null,
                      correlative: po.correlative ?? null,
                      currency: po.currency ?? null,
                      paymentForm: po.paymentForm ?? null,
                      creditDays: po.creditDays,
                      numQuotas: po.numQuotas,
                      totalTaxed: Number(po.totalTaxed),
                      totalExempted: Number(po.totalExempted),
                      totalIgv: Number(po.totalIgv),
                      purchaseValue: Number(po.purchaseValue),
                      total: Number(po.total),
                      note: po.note ?? null,
                      status: po.status,
                      isActive: po.isActive,
                      expectedAt: po.expectedAt ?? null,
                      dateIssue: po.dateIssue ?? null,
                      dateExpiration: po.dateExpiration ?? null,
                      createdAt: po.createdAt,
                    },
                    warehouse: warehouseRef
                      ? {
                          id: warehouseRef.id,
                          name: warehouseRef.name,
                          department: warehouseRef.department,
                          province: warehouseRef.province,
                          district: warehouseRef.district,
                          address: warehouseRef.address ?? null,
                          isActive: warehouseRef.isActive,
                          createdAt: warehouseRef.createdAt,
                        }
                      : undefined,
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
                  };
                }
              } else if (r.document.referenceType === ReferenceType.PRODUCTION) {
                const prod = productionById.get(r.document.referenceId);
                if (prod) {
                  const fromWarehouseRef = warehouseById.get(prod.fromWarehouseId);
                  const toWarehouseRef = warehouseById.get(prod.toWarehouseId);
                  const userRef = prod.createdBy ? userById.get(prod.createdBy) : undefined;
                  referenceDoc = {
                    type: ReferenceType.PRODUCTION,
                    production: {
                      id: prod.id,
                      fromWarehouseId: prod.fromWarehouseId,
                      toWarehouseId: prod.toWarehouseId,
                      docType: prod.docType,
                      serieId: prod.serieId,
                      correlative: prod.correlative,
                      status: prod.status,
                      reference: prod.reference ?? null,
                      manufactureDate: prod.manufactureDate,
                      createdBy: prod.createdBy,
                      updatedBy: prod.updatedBy ?? undefined,
                      createdAt: prod.createdAt,
                      updatedAt: prod.updatedAt,
                    },
                    fromWarehouse: fromWarehouseRef
                      ? {
                          id: fromWarehouseRef.id,
                          name: fromWarehouseRef.name,
                          department: fromWarehouseRef.department,
                          province: fromWarehouseRef.province,
                          district: fromWarehouseRef.district,
                          address: fromWarehouseRef.address ?? null,
                          isActive: fromWarehouseRef.isActive,
                          createdAt: fromWarehouseRef.createdAt,
                        }
                      : undefined,
                    toWarehouse: toWarehouseRef
                      ? {
                          id: toWarehouseRef.id,
                          name: toWarehouseRef.name,
                          department: toWarehouseRef.department,
                          province: toWarehouseRef.province,
                          district: toWarehouseRef.district,
                          address: toWarehouseRef.address ?? null,
                          isActive: toWarehouseRef.isActive,
                          createdAt: toWarehouseRef.createdAt,
                        }
                      : undefined,
                    createdBy: userRef
                      ? {
                          id: userRef.id,
                          name: userRef.name,
                          email: userRef.email,
                          avatarUrl: userRef.avatarUrl,
                          telefono: userRef.telefono,
                          deleted: userRef.deleted,
                          createdAt: userRef.createdAt,
                          updatedAt: userRef.updatedAt,
                          failedLoginAttempts: userRef.failedLoginAttempts,
                          lockoutLevel: userRef.lockoutLevel,
                          lockedUntil: userRef.lockedUntil,
                          securityDisabledAt: userRef.securityDisabledAt,
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
              r.locationId,
              r.createdAt,
              warehouse,
              stockItem,
              document,
              referenceDoc,
            );
          },
      ),
      total,
      page,
      limit,
    };
  }
  
}

