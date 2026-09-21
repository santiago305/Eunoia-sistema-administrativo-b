import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyPaymentAccount } from "src/modules/company-payment-accounts/domain/entity/company-payment-account";
import { CompanyPaymentAccountRepository } from "src/modules/company-payment-accounts/domain/ports/company-payment-account.repository";
import {
  decryptPaymentAccountSensitiveData,
  encryptPaymentAccountSensitiveData,
  hashPaymentAccountIdentifier,
} from "src/modules/company-payment-accounts/infrastructure/security/payment-account-sensitive-data";
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
    const sensitive = decryptPaymentAccountSensitiveData(row.sensitiveIdentifierEncrypted);
    return CompanyPaymentAccount.create({
      companyPaymentAccountId: row.id,
      companyId: row.companyId,
      type: row.type,
      usage: row.usage,
      name: row.name,
      institutionName: row.institutionName ?? row.bankName,
      accountNumber: sensitive.accountNumber ?? row.accountNumber,
      accountLastFour: row.accountLastFour,
      cci: sensitive.cci,
      cciLastFour: row.cciLastFour,
      cardLastFour: row.cardLastFour,
      walletProvider: row.walletProvider ?? row.walletName,
      walletPhone: sensitive.walletPhone,
      walletPhoneLastFour: row.walletPhoneLastFour,
      holderName: row.holderName,
      currency: row.currency,
      isActive: row.isActive,
      isDefault: row.isDefault,
      allowLegacyIncomplete: true,
    });
  }

  private persistenceValues(account: CompanyPaymentAccount) {
    return {
      type: account.type,
      usage: account.usage,
      name: account.name,
      institutionName: account.institutionName,
      bankName: account.institutionName,
      accountNumber: null,
      accountLastFour: account.accountLastFour,
      cciLastFour: account.cciLastFour,
      cardLastFour: account.cardLastFour,
      walletProvider: account.walletProvider,
      walletName: account.walletProvider,
      walletPhoneLastFour: account.walletPhoneLastFour,
      holderName: account.holderName,
      sensitiveIdentifierEncrypted: encryptPaymentAccountSensitiveData({
        accountNumber: account.accountNumber,
        cci: account.cci,
        walletPhone: account.walletPhone,
      }),
      sensitiveIdentifierHash: hashPaymentAccountIdentifier(account),
      maskedLabel: account.maskedLabel,
      currency: account.currency,
      isActive: account.isActive,
      isDefault: account.isDefault,
    };
  }

  async findById(id: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder("account")
      .addSelect("account.sensitiveIdentifierEncrypted")
      .addSelect("account.sensitiveIdentifierHash")
      .where("account.id = :id", { id })
      .getOne();
    return row ? this.toDomain(row) : null;
  }

  async listByCompany(
    companyId: string,
    options: { includeSensitive?: boolean } = {},
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount[]> {
    const query = this.getRepo(tx)
      .createQueryBuilder("account")
      .where("account.companyId = :companyId", { companyId })
      .orderBy("account.isActive", "DESC")
      .addOrderBy("account.name", "ASC");
    if (options.includeSensitive) query.addSelect("account.sensitiveIdentifierEncrypted");
    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findDuplicate(
    account: CompanyPaymentAccount,
    exceptId?: string,
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount | null> {
    const identifierHash = hashPaymentAccountIdentifier(account);
    if (!identifierHash) return null;

    const query = this.getRepo(tx)
      .createQueryBuilder("account")
      .addSelect("account.sensitiveIdentifierEncrypted")
      .where("account.companyId = :companyId", { companyId: account.companyId })
      .andWhere("account.sensitiveIdentifierHash = :identifierHash", { identifierHash });
    if (exceptId) query.andWhere("account.id != :exceptId", { exceptId });
    const row = await query.getOne();
    return row ? this.toDomain(row) : null;
  }

  async create(account: CompanyPaymentAccount, tx?: TransactionContext): Promise<CompanyPaymentAccount> {
    const repo = this.getRepo(tx);
    const saved = await repo.save(repo.create({
      id: account.companyPaymentAccountId,
      companyId: account.companyId,
      ...this.persistenceValues(account),
    }));
    return this.findById(saved.id, tx) as Promise<CompanyPaymentAccount>;
  }

  async update(params: Parameters<CompanyPaymentAccountRepository["update"]>[0], tx?: TransactionContext) {
    const current = await this.findById(params.id, tx);
    if (!current) return null;

    const value = <T>(key: keyof typeof params, fallback: T): T =>
      Object.prototype.hasOwnProperty.call(params, key) ? (params[key] as T) : fallback;
    const next = CompanyPaymentAccount.create({
      companyPaymentAccountId: current.companyPaymentAccountId,
      companyId: current.companyId,
      type: params.type ?? current.type,
      usage: params.usage ?? current.usage,
      name: params.name ?? current.name,
      institutionName: value("institutionName", value("bankName", current.institutionName)),
      accountNumber: value("accountNumber", current.accountNumber),
      cci: value("cci", current.cci),
      cardLastFour: value("cardLastFour", current.cardLastFour),
      walletProvider: value("walletProvider", value("walletName", current.walletProvider)),
      walletPhone: value("walletPhone", current.walletPhone),
      holderName: value("holderName", current.holderName),
      currency: params.currency ?? current.currency,
      isActive: current.isActive,
      isDefault: params.isDefault ?? current.isDefault,
    });

    await this.getRepo(tx).update({ id: params.id }, this.persistenceValues(next));
    return this.findById(params.id, tx);
  }

  async setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id }, { isActive });
  }

  async clearDefaultForScope(
    companyId: string,
    currency: CompanyPaymentAccount["currency"],
    usage: CompanyPaymentAccount["usage"],
    exceptId?: string,
    tx?: TransactionContext,
  ): Promise<void> {
    const query = this.getRepo(tx)
      .createQueryBuilder()
      .update(CompanyPaymentAccountEntity)
      .set({ isDefault: false })
      .where("company_id = :companyId", { companyId })
      .andWhere("currency = :currency", { currency })
      .andWhere("usage = :usage", { usage });
    if (exceptId) query.andWhere("company_payment_account_id != :exceptId", { exceptId });
    await query.execute();
  }
}
