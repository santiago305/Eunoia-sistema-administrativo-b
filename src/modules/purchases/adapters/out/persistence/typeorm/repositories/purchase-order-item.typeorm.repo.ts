import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseOrderItemEntity } from "../entities/purchase-order-item.entity";
import { PurchaseOrderItemMapper } from "../mappers/purchase-order-item.mapper";

@Injectable()
export class PurchaseOrderItemTypeormRepository implements PurchaseOrderItemRepository {
  constructor(
    @InjectRepository(PurchaseOrderItemEntity)
    private readonly repo: Repository<PurchaseOrderItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PurchaseOrderItemEntity);
  }

  async add(item: PurchaseOrderItem, tx?: TransactionContext): Promise<PurchaseOrderItem> {
    const repo = this.getRepo(tx);
    const row = repo.create(PurchaseOrderItemMapper.toPersistence(item));
    const saved = await repo.save(row);
    return PurchaseOrderItemMapper.toDomain(saved);
  }

  async remove(poItemId: string, tx?: TransactionContext): Promise<boolean> {
    const result = await this.getRepo(tx).delete({ id: poItemId });
    return (result.affected ?? 0) > 0;
  }

  async removeByPurchaseId(poId: string, tx?: TransactionContext): Promise<number> {
    const result = await this.getRepo(tx).delete({ poId });
    return result.affected ?? 0;
  }

  async getByPurchaseId(poId: string, tx?: TransactionContext): Promise<PurchaseOrderItem[]> {
    const rows = await this.getRepo(tx).find({ where: { poId } });
    return rows.map((r) => PurchaseOrderItemMapper.toDomain(r));
  }
}
