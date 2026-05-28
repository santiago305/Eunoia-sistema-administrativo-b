import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { BankAccount } from "src/modules/bank-accounts/domain/entity/bank-account";
import { BankAccountRepository } from "src/modules/bank-accounts/domain/ports/bank-account.repository";
import { BankAccountEntity } from "../entities/bank-account.entity";

@Injectable()
export class BankAccountTypeormRepository implements BankAccountRepository {
  constructor(
    @InjectRepository(BankAccountEntity)
    private readonly repo: Repository<BankAccountEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(BankAccountEntity);
  }

  private toDomain(row: BankAccountEntity): BankAccount {
    return BankAccount.create({
      bankAccountId: row.id,
      companyId: row.companyId,
      name: row.name,
      number: row.number ?? null,
      isActive: Boolean(row.isActive),
    });
  }

  async findById(bankAccountId: string, tx?: TransactionContext): Promise<BankAccount | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: bankAccountId } });
    return row ? this.toDomain(row) : null;
  }

  async listByCompany(companyId: string, tx?: TransactionContext): Promise<BankAccount[]> {
    const rows = await this.getRepo(tx).find({ where: { companyId }, order: { name: "ASC" } });
    return rows.map((r) => this.toDomain(r));
  }

  async findDuplicate(companyId: string, number: string, tx?: TransactionContext): Promise<BankAccount | null> {
    const row = await this.getRepo(tx).findOne({ where: { companyId, number } });
    return row ? this.toDomain(row) : null;
  }

  async create(account: BankAccount, tx?: TransactionContext): Promise<BankAccount> {
    const saved = await this.getRepo(tx).save({
      id: account.bankAccountId,
      companyId: account.companyId,
      name: account.name,
      number: account.number ?? null,
      isActive: account.isActive ?? true,
    });
    return this.toDomain(saved);
  }

  async update(
    params: { bankAccountId: string; name?: string; number?: string | null },
    tx?: TransactionContext,
  ): Promise<BankAccount | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<BankAccountEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.number !== undefined) patch.number = params.number ?? null;

    await repo.update({ id: params.bankAccountId }, patch);
    const updated = await repo.findOne({ where: { id: params.bankAccountId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(bankAccountId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: bankAccountId }, { isActive });
  }
}

