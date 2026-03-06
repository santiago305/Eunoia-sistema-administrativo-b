import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PurchaseOrderItemEntity } from "../entities/purchase-order-item.entity";
import { Money } from "src/modules/catalog/domain/value-object/money.vo";

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

  private toDomain(row: PurchaseOrderItemEntity): PurchaseOrderItem {
    return new PurchaseOrderItem(
      row.id,
      row.poId,
      row.stockItemId,
      row.unitBase,
      row.equivalencia,
      row.factor,
      row.afectType,
      row.quantity,
      Money.create(Number(row.porcentageIgv ?? 0)),
      Money.create(Number(row.baseWithoutIgv ?? 0)),
      Money.create(Number(row.amountIgv ?? 0)),
      Money.create(Number(row.unitValue ?? 0)),
      Money.create(Number(row.unitPrice ?? 0)),
      Money.create(Number(row.purchaseValue ?? 0)),
    );
  }

  async add(item: PurchaseOrderItem, tx?: TransactionContext): Promise<PurchaseOrderItem> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: item.poItemId,
      poId: item.poId,
      stockItemId: item.stockItemId,
      unitBase: item.unitBase,
      equivalencia: item.equivalence,
      factor:item.factor,
      afectType: item.afectType ?? null,
      quantity: item.quantity,
      porcentageIgv: item.porcentageIgv.getAmount(),
      baseWithoutIgv: item.baseWithoutIgv.getAmount(),
      amountIgv: item.amountIgv.getAmount(),
      unitValue: item.unitValue.getAmount(),
      unitPrice: item.unitPrice.getAmount(),
      purchaseValue: item.purchaseValue.getAmount(),
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async remove(poItemId: string, tx?: TransactionContext): Promise<boolean> {
    const result = await this.getRepo(tx).delete({ id: poItemId });
    return (result.affected ?? 0) > 0;
  }

  async getByPurchaseId(poId: string, tx?: TransactionContext): Promise<PurchaseOrderItem[]> {
    const rows = await this.getRepo(tx).find({ where: { poId } });
    return rows.map((r) => this.toDomain(r));
  }
}
