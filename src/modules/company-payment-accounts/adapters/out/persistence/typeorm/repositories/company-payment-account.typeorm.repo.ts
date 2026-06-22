import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyPaymentAccount } from "src/modules/company-payment-accounts/domain/entity/company-payment-account";
import { CompanyPaymentAccountRepository } from "src/modules/company-payment-accounts/domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountEntity } from "../entities/company-payment-account.entity";

@Injectable()
export class CompanyPaymentAccountTypeormRepository implements CompanyPaymentAccountRepository {
  constructor(
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly repo: Repository<CompanyPaymentAccountEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) return (tx as TypeormTransactionContext).manager;
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CompanyPaymentAccountEntity);
  }

  private toDomain(row: CompanyPaymentAccountEntity): CompanyPaymentAccount {
    return CompanyPaymentAccount.create({
      companyPaymentAccountId: row.id,
      companyId: row.companyId,
      type: row.type,
      name: row.name,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      accountLastFour: row.accountLastFour,
      cardLastFour: row.cardLastFour,
      walletName: row.walletName,
      currency: row.currency,
      isActive: row.isActive,
    });
  }

  async findById(id: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByCompany(companyId: string, tx?: TransactionContext): Promise<CompanyPaymentAccount[]> {
    const rows = await this.getRepo(tx).find({
      where: { companyId },
      order: { isActive: "DESC", name: "ASC" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findDuplicate(companyId: string, accountNumber: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null> {
    const row = await this.getRepo(tx).findOne({ where: { companyId, accountNumber } });
    return row ? this.toDomain(row) : null;
  }

  async create(account: CompanyPaymentAccount, tx?: TransactionContext): Promise<CompanyPaymentAccount> {
    const repo = this.getRepo(tx);
    const saved = await repo.save(repo.create({
      id: account.companyPaymentAccountId,
      companyId: account.companyId,
      type: account.type,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountLastFour: account.accountLastFour,
      cardLastFour: account.cardLastFour,
      walletName: account.walletName,
      currency: account.currency,
      isActive: account.isActive,
    }));
    return this.toDomain(saved);
  }

  async update(params: Parameters<CompanyPaymentAccountRepository["update"]>[0], tx?: TransactionContext) {
    const repo = this.getRepo(tx);
    const existing = await repo.findOne({ where: { id: params.id } });
    if (!existing) return null;

    const next = CompanyPaymentAccount.create({
      companyPaymentAccountId: existing.id,
      companyId: existing.companyId,
      type: params.type ?? existing.type,
      name: params.name ?? existing.name,
      bankName: params.bankName === undefined ? existing.bankName : params.bankName,
      accountNumber: params.accountNumber === undefined ? existing.accountNumber : params.accountNumber,
      cardLastFour: params.cardLastFour === undefined ? existing.cardLastFour : params.cardLastFour,
      walletName: params.walletName === undefined ? existing.walletName : params.walletName,
      currency: params.currency ?? existing.currency,
      isActive: existing.isActive,
    });

    await repo.update({ id: params.id }, {
      type: next.type,
      name: next.name,
      bankName: next.bankName,
      accountNumber: next.accountNumber,
      accountLastFour: next.accountLastFour,
      cardLastFour: next.cardLastFour,
      walletName: next.walletName,
      currency: next.currency,
    });

    const updated = await repo.findOne({ where: { id: params.id } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id }, { isActive });
  }
}
