import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { DeepPartial } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { SalePaymentEntity } from "../entities/sale-payment.entity";
import { SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SalePayment } from "src/modules/sale-orders/domain/entities/sale-payment";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

const maskedAccountNumber = (account: CompanyPaymentAccountEntity): string | null => {
  const suffix =
    account.cardLastFour ??
    account.accountLastFour ??
    account.cciLastFour ??
    account.walletPhoneLastFour;

  return suffix ? `****${suffix}` : null;
};

const normalizeOperationNumber = (value?: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized || null;
};

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
    bankAccount?: CompanyPaymentAccountEntity | null,
  ): SalePayment {
    return new SalePayment(
      row.id,
      row.saleOrderId,
      row.companyPaymentAccountId ?? null,
      row.date,
      row.method,
      row.operationNumber ?? null,
      Number(row.amount ?? 0),
      row.note ?? null,
      row.paymentPhoto ?? null,
      row.createdAt,
      bankAccount
        ? {
            id: bankAccount.id,
            name: bankAccount.name,
            number: maskedAccountNumber(bankAccount),
          }
        : null,
      row.companyPaymentAccountId ?? null,
      row.paymentMethodId ?? null,
      row.currency,
      row.status,
      row.operationCode ?? null,
      row.voidedAt ?? null,
      row.voidedByUserId ?? null,
      row.voidReason ?? null,
    );
  }

  async bulkCreate(input: Parameters<SalePaymentRepository["bulkCreate"]>[0], tx?: TransactionContext): Promise<SalePayment[]> {
    if (!input.length) return [];
    const manager = this.getManager(tx);
    const entities: DeepPartial<SalePaymentEntity>[] = input.map((row) => ({
        saleOrderId: row.saleOrderId,
        companyPaymentAccountId: row.companyPaymentAccountId ?? row.bankAccountId ?? null,
        paymentMethodId: row.paymentMethodId ?? null,
        currency: row.currency ?? CurrencyType.PEN,
        status: row.status ?? "PENDING_CONFIRMATION",
        operationCode: normalizeOperationNumber(row.operationCode),
        date: row.date,
        method: row.method,
        operationNumber: normalizeOperationNumber(row.operationNumber),
        amount: row.amount,
        note: row.note ?? null,
        paymentPhoto: row.paymentPhoto ?? null,
      }));
    const saved = await manager.getRepository(SalePaymentEntity).save(entities);
    return saved.map((row) => this.toDomain(row as SalePaymentEntity));
  }

  async deleteBySaleOrderId(saleOrderId: string, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SalePaymentEntity).delete({ saleOrderId });
  }

  async listBySaleOrderId(
    saleOrderId: string,
    tx?: TransactionContext,
  ): Promise<SalePayment[]> {
    return this.listBySaleOrderIds([saleOrderId], tx);
  }

  async update(
    input: Parameters<SalePaymentRepository['update']>[0],
    tx?: TransactionContext,
  ): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SalePaymentEntity).update(
      { id: input.paymentId, saleOrderId: input.saleOrderId },
      {
        companyPaymentAccountId: input.companyPaymentAccountId ?? input.bankAccountId ?? null,
        paymentMethodId: input.paymentMethodId ?? null,
        operationCode: normalizeOperationNumber(input.operationCode),
        date: input.date,
        method: input.method,
        operationNumber: normalizeOperationNumber(input.operationNumber),
        amount: input.amount,
        note: input.note ?? null,
      },
    );
  }

  async deleteByIds(
    input: Parameters<SalePaymentRepository['deleteByIds']>[0],
    tx?: TransactionContext,
  ): Promise<void> {
    if (!input.paymentIds.length) return;
    const manager = this.getManager(tx);
    await manager.getRepository(SalePaymentEntity).delete({
      id: In(input.paymentIds),
      saleOrderId: input.saleOrderId,
    });
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
    const accountIds = Array.from(
      new Set(rows.map((row) => row.companyPaymentAccountId).filter(Boolean)),
    ) as string[];
    const bankAccounts = accountIds.length
      ? await manager.getRepository(CompanyPaymentAccountEntity).find({
          where: { id: In(accountIds) },
        })
      : [];
    const bankAccountById = new Map(bankAccounts.map((row) => [row.id, row]));

    return rows.map((row) =>
      this.toDomain(
        row,
        row.companyPaymentAccountId
          ? bankAccountById.get(row.companyPaymentAccountId) ?? null
          : null,
      ),
    );
  }

  async voidPostedPayment(
    input: Parameters<SalePaymentRepository["voidPostedPayment"]>[0],
    tx?: TransactionContext,
  ): Promise<{ payment: SalePayment; transitioned: boolean } | null> {
    const manager = this.getManager(tx);
    const paymentRepository = manager.getRepository(SalePaymentEntity);
    const row = await paymentRepository
      .createQueryBuilder("payment")
      .where("payment.id = :paymentId", { paymentId: input.paymentId })
      .andWhere("payment.sale_order_id = :saleOrderId", { saleOrderId: input.saleOrderId })
      .setLock("pessimistic_write")
      .getOne();

    if (!row) return null;
    if (row.status !== "POSTED" && row.status !== "PENDING_CONFIRMATION") return { payment: this.toDomain(row), transitioned: false };

    row.status = row.status === "POSTED" ? "REVERSED" : "CANCELLED";
    row.voidedAt = input.voidedAt;
    row.voidedByUserId = input.voidedByUserId;
    row.voidReason = input.voidReason;
    const saved = await paymentRepository.save(row);
    return { payment: this.toDomain(saved), transitioned: true };
  }
}
