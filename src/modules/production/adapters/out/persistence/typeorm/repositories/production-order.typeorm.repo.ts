import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionOrder } from "src/modules/production/domain/entity/production-order.entity";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { ProductionOrderEntity } from "../entities/production_order.entity";
import { ProductionOrderItemEntity } from "../entities/production_order_item.entity";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

@Injectable()
export class ProductionOrderTypeormRepository implements ProductionOrderRepository {
  constructor(
    @InjectRepository(ProductionOrderEntity)
    private readonly orderRepo: Repository<ProductionOrderEntity>,
    @InjectRepository(ProductionOrderItemEntity)
    private readonly itemRepo: Repository<ProductionOrderItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.orderRepo.manager;
  }

  private getOrderRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductionOrderEntity);
  }

  private getItemRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ProductionOrderItemEntity);
  }

  async findItemById(productionId: string, itemId: string, tx?: TransactionContext): Promise<ProductionOrderItem | null> {
  const repo = this.getItemRepo(tx);
  const row = await repo.findOne({ where: { id: itemId, productionId } });
  if (!row) return null;

  return new ProductionOrderItem(
    row.id,
    row.productionId,
    row.finishedVariantId,
    row.fromLocationId,
    row.toLocationId,
    row.quantity,
    row.unitCost,
  );
}


  async create(order: ProductionOrder, tx?: TransactionContext): Promise<ProductionOrder> {
    const repo = this.getOrderRepo(tx);
    const saved = await repo.save({
      fromWarehouseId: order.fromWarehouseId,
      toWarehouseId: order.toWarehouseId,
      serieId: order.serieId,
      correlative: order.correlative,
      status: order.status,
      reference: order.referense,
      manufactureTime: order.manufactureTime,
      createdBy: order.createdBy,
      updatedBy: order.updateBy ?? null,
    });

    return new ProductionOrder(
      saved.id,
      saved.fromWarehouseId,
      saved.toWarehouseId,
      saved.serieId,
      saved.correlative,
      saved.status as ProductionStatus,
      saved.manufactureTime,
      saved.createdBy,
      saved.createdAt,
      saved.reference ?? null,
      saved.updatedAt ?? null,
      saved.updatedBy ?? null,
    );
  }

  async findById(id: string, tx?: TransactionContext): Promise<ProductionOrder | null> {
    const repo = this.getOrderRepo(tx);
    const row = await repo.findOne({ where: { id } });
    if (!row) return null;

    return new ProductionOrder(
      row.id,
      row.fromWarehouseId,
      row.toWarehouseId,
      row.serieId,
      row.correlative,
      row.status as ProductionStatus,
      row.manufactureTime,
      row.createdBy,
      row.createdAt,
      row.reference?? null,
      row.updatedAt?? null,
      row.updatedBy ?? null,
    );
  }

  async list(
    params: {
      status?: ProductionStatus;
      warehouseId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: ProductionOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const repo = this.getOrderRepo(tx);
    const qb = repo.createQueryBuilder("p");

    if (params.status) {
      qb.andWhere("p.status = :status", { status: params.status });
    }
    if (params.warehouseId) {
      qb.andWhere("(p.fromWarehouseId = :wid OR p.toWarehouseId = :wid)", { wid: params.warehouseId });
    }
    if (params.from) {
      qb.andWhere("p.createdAt >= :from", { from: params.from });
    }
    if (params.to) {
      qb.andWhere("p.createdAt <= :to", { to: params.to });
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await qb
      .orderBy("p.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: rows.map(
        (row) =>
          new ProductionOrder(
            row.id,
            row.fromWarehouseId,
            row.toWarehouseId,
            row.serieId,
            row.correlative,
            row.status as ProductionStatus,
            row.manufactureTime,
            row.createdBy,
            row.createdAt,
            row.reference,
            row.updatedAt,
            row.updatedBy ?? null,
          ),
      ),
      total,
      page,
      limit,
    };
  }

  async update(
    params: {
      productionId: string;
      fromWarehouseId?: string;
      toWarehouseId?: string;
      serieId?: string;
      correlative?: number;
      reference?: string;
      manufactureTime?: number;
      updatedBy?: string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrder | null> {
    const repo = this.getOrderRepo(tx);
    const patch: Partial<ProductionOrderEntity> = {};

    if (params.fromWarehouseId !== undefined) patch.fromWarehouseId = params.fromWarehouseId;
    if (params.toWarehouseId !== undefined) patch.toWarehouseId = params.toWarehouseId;
    if (params.serieId !== undefined) patch.serieId = params.serieId;
    if (params.correlative !== undefined) patch.correlative = params.correlative;
    if (params.reference !== undefined) patch.reference = params.reference;
    if (params.manufactureTime !== undefined) patch.manufactureTime = params.manufactureTime;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;
    if (params.updatedBy !== undefined) {
      (patch as any).updatedBy = params.updatedBy;
    }

    await repo.update({ id: params.productionId }, patch);
    return this.findById(params.productionId, tx);
  }

  async setStatus(
    params: {
      productionId: string;
      status: ProductionStatus;
      updatedBy?: string;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void> {
    const repo = this.getOrderRepo(tx);
    const patch: Partial<ProductionOrderEntity> = {
      status: params.status,
    };
    if (params.updatedAt) patch.updatedAt = params.updatedAt;
    if (params.updatedBy) {
      (patch as any).updatedBy = params.updatedBy;
    }
    await repo.update(params.productionId, patch);
  }

  async listItems(productionId: string, tx?: TransactionContext): Promise<ProductionOrderItem[]> {
    const repo = this.getItemRepo(tx);
    const rows = await repo.find({ where: { productionId } });
    return rows.map(
      (r) =>
        new ProductionOrderItem(
          r.id,
          r.productionId,
          r.finishedVariantId,
          r.fromLocationId,
          r.toLocationId,
          r.quantity,
          r.unitCost,
        ),
    );
  }

  async getByIdWithItems(
    productionId: string,
    tx?: TransactionContext,
  ): Promise<{ order: ProductionOrder; items: ProductionOrderItem[] } | null> {
    const order = await this.findById(productionId, tx);
    if (!order) return null;
    const items = await this.listItems(productionId, tx);
    return { order, items };
  }

  async addItem(item: ProductionOrderItem, tx?: TransactionContext): Promise<ProductionOrderItem> {
    const repo = this.getItemRepo(tx);
    const saved = await repo.save({
      productionId: item.productionId,
      finishedVariantId: item.finishedVariantId,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    });

    return new ProductionOrderItem(
      saved.id,
      saved.productionId,
      saved.finishedVariantId,
      saved.fromLocationId,
      saved.toLocationId,
      saved.quantity,
      saved.unitCost,
    );
  }

  async updateItem(
    params: {
      productionId: string;
      itemId: string;
      finishedVariantId?: string;
      fromLocationId?: string;
      toLocationId?: string;
      quantity?: number;
      unitCost?: number;
    },
    tx?: TransactionContext,
  ): Promise<ProductionOrderItem | null> {
    const repo = this.getItemRepo(tx);
    const patch: Partial<ProductionOrderItemEntity> = {};

    if (params.finishedVariantId !== undefined) patch.finishedVariantId = params.finishedVariantId;
    if (params.fromLocationId !== undefined) patch.fromLocationId = params.fromLocationId;
    if (params.toLocationId !== undefined) patch.toLocationId = params.toLocationId;
    if (params.quantity !== undefined) patch.quantity = params.quantity;
    if (params.unitCost !== undefined) {
      (patch as any).unitCost = params.unitCost;
    }

    await repo.update({ id: params.itemId, productionId: params.productionId }, patch);
    const updated = await repo.findOne({ where: { id: params.itemId, productionId: params.productionId } });
    if (!updated) return null;

    return new ProductionOrderItem(
      updated.id,
      updated.productionId,
      updated.finishedVariantId,
      updated.fromLocationId,
      updated.toLocationId,
      updated.quantity,
      updated.unitCost,
    );
  }

  async removeItem(productionId: string, itemId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getItemRepo(tx);
    const result = await repo.delete({ id: itemId, productionId });
    return (result.affected ?? 0) > 0;
  }
}
