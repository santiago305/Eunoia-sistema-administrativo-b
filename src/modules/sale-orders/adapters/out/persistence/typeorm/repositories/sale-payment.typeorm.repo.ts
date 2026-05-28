import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SalePayment } from "src/modules/sale-orders/domain/entities/sale-payment";

@Injectable()
export class SalePaymentTypeormRepository implements SalePaymentRepository {
  constructor(
    @InjectRepository(SalePaymentEntity)
    private readonly repo: Repository<SalePaymentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private toDomain(row: SalePaymentEntity): SalePayment {
    return new SalePayment(
      row.id,
      row.saleOrderId,
      row.bankAccountId ?? null,
      row.date,
      row.method,
      row.operationNumber ?? null,
      Number(row.amount ?? 0),
      row.note ?? null,
      row.createdAt,
    );
  }

  async bulkCreate(input: Parameters<SalePaymentRepository["bulkCreate"]>[0], tx?: TransactionContext): Promise<SalePayment[]> {
    if (!input.length) return [];
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SalePaymentEntity).save(
      input.map((row) => ({
        saleOrderId: row.saleOrderId,
        bankAccountId: row.bankAccountId ?? null,
        date: row.date,
        method: row.method,
        operationNumber: row.operationNumber ?? null,
        amount: row.amount,
        note: row.note ?? null,
      })),
    );
    return saved.map((row) => this.toDomain(row));
  }
}
