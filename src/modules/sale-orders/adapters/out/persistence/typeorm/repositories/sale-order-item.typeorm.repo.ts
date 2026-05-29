import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderItemEntity } from "../entities/sale-order-item.entity";
import { SaleOrderItemRepository } from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import { SaleOrderItem } from "src/modules/sale-orders/domain/entities/sale-order-item";

@Injectable()
export class SaleOrderItemTypeormRepository implements SaleOrderItemRepository {
  constructor(
    @InjectRepository(SaleOrderItemEntity)
    private readonly repo: Repository<SaleOrderItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private toDomain(row: SaleOrderItemEntity): SaleOrderItem {
    return new SaleOrderItem(
      row.id,
      row.saleOrderId,
      row.referencePackId ?? null,
      row.description ?? null,
      Number(row.quantity ?? 0),
      Number(row.unitPrice ?? 0),
      Number(row.total ?? 0),
      row.createdAt,
    );
  }

  async bulkCreate(input: Parameters<SaleOrderItemRepository["bulkCreate"]>[0], tx?: TransactionContext): Promise<SaleOrderItem[]> {
    if (!input.length) return [];
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderItemEntity).save(
      input.map((row) => ({
        saleOrderId: row.saleOrderId,
        referencePackId: row.referencePackId ?? null,
        description: row.description ?? null,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        total: row.total,
      })),
    );
    return saved.map((row) => this.toDomain(row));
  }

  async listBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<SaleOrderItem[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SaleOrderItemEntity).find({
      where: { saleOrderId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async deleteBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderItemEntity).delete({ saleOrderId });
  }
}
