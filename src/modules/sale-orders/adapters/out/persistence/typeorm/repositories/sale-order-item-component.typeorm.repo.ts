import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SaleOrderItemComponentEntity } from "../entities/sale-order-item-component.entity";
import { SaleOrderItemComponentRepository } from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SaleOrderItemComponent } from "src/modules/sale-orders/domain/entities/sale-order-item-component";

@Injectable()
export class SaleOrderItemComponentTypeormRepository implements SaleOrderItemComponentRepository {
  constructor(
    @InjectRepository(SaleOrderItemComponentEntity)
    private readonly repo: Repository<SaleOrderItemComponentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private toDomain(row: SaleOrderItemComponentEntity): SaleOrderItemComponent {
    return new SaleOrderItemComponent(
      row.id,
      row.saleOrderItemId,
      row.skuId,
      row.referencePackItemId ?? null,
      Number(row.quantity ?? 0),
      Number(row.unitPrice ?? 0),
      Number(row.total ?? 0),
      row.createdAt,
    );
  }

  async bulkCreate(
    input: Parameters<SaleOrderItemComponentRepository["bulkCreate"]>[0],
    tx?: TransactionContext,
  ): Promise<SaleOrderItemComponent[]> {
    if (!input.length) return [];
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderItemComponentEntity).save(
      input.map((row) => ({
        saleOrderItemId: row.saleOrderItemId,
        skuId: row.skuId,
        referencePackItemId: row.referencePackItemId ?? null,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        total: row.total,
      })),
    );
    return saved.map((row) => this.toDomain(row));
  }
}

