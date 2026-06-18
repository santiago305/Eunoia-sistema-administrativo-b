import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SalePayment } from "src/modules/sale-orders/domain/entities/sale-payment";
import { BankAccountEntity } from "src/modules/bank-accounts/adapters/out/persistence/typeorm/entities/bank-account.entity";

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

  private toDomain(
    row: SalePaymentEntity,
    bankAccount?: BankAccountEntity | null,
  ): SalePayment {
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
      bankAccount
        ? {
            id: bankAccount.id,
            name: bankAccount.name,
            number: bankAccount.number ?? null,
          }
        : null,
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

  async deleteBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SalePaymentEntity).delete({ saleOrderId });
  }

  async deleteById(
    input: { saleOrderId: string; paymentId: string },
    tx?: TransactionContext,
  ): Promise<boolean> {
    const manager = this.getManager(tx);
    const result = await manager.getRepository(SalePaymentEntity).delete({
      id: input.paymentId,
      saleOrderId: input.saleOrderId,
    });
    return (result.affected ?? 0) > 0;
  }

  async listBySaleOrderIds(saleOrderIds: string[], tx?: TransactionContext): Promise<SalePayment[]> {
    if (!saleOrderIds.length) return [];
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SalePaymentEntity).find({
      where: { saleOrderId: In(saleOrderIds) },
      order: { saleOrderId: "ASC", createdAt: "ASC" },
    });
    const bankAccountIds = Array.from(
      new Set(rows.map((row) => row.bankAccountId).filter(Boolean)),
    ) as string[];
    const bankAccounts = bankAccountIds.length
      ? await manager.getRepository(BankAccountEntity).find({
          where: { id: In(bankAccountIds) },
        })
      : [];
    const bankAccountById = new Map(bankAccounts.map((row) => [row.id, row]));

    return rows.map((row) =>
      this.toDomain(
        row,
        row.bankAccountId ? bankAccountById.get(row.bankAccountId) ?? null : null,
      ),
    );
  }
}
