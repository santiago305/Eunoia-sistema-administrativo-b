import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { encryptPaymentAccountSensitiveData, decryptPaymentAccountSensitiveData, hashPaymentAccountIdentifier } from "src/modules/company-payment-accounts/infrastructure/security/payment-account-sensitive-data";
import { SupplierPaymentDestination } from "../../../../../domain/entity/supplier-payment-destination";
import { SupplierPaymentDestinationRepository } from "../../../../../domain/ports/supplier-payment-destination.repository";
import { SupplierPaymentDestinationEntity } from "../entities/supplier-payment-destination.entity";

@Injectable()
export class SupplierPaymentDestinationTypeormRepository implements SupplierPaymentDestinationRepository {
  constructor(@InjectRepository(SupplierPaymentDestinationEntity) private readonly repo: Repository<SupplierPaymentDestinationEntity>) {}

  private manager(tx?: TransactionContext): EntityManager {
    return tx && (tx as TypeormTransactionContext).manager ? (tx as TypeormTransactionContext).manager : this.repo.manager;
  }

  private toDomain(row: SupplierPaymentDestinationEntity, includeSensitive = false) {
    const sensitive = includeSensitive ? decryptPaymentAccountSensitiveData(row.sensitiveIdentifierEncrypted) : {};
    return SupplierPaymentDestination.create({
      id: row.id, supplierId: row.supplierId, methodId: row.methodId, type: row.type, currency: row.currency,
      name: row.name, institutionName: row.institutionName, providerName: row.providerName,
      accountNumber: sensitive.accountNumber ?? null, accountLastFour: row.accountLastFour,
      cci: sensitive.cci ?? null, cciLastFour: row.cciLastFour,
      walletIdentifier: sensitive.walletPhone ?? null, walletIdentifierLastFour: row.walletIdentifierLastFour,
      holderName: row.holderName, holderDocument: sensitive.holderDocument ?? null,
      isActive: row.isActive, isDefault: row.isDefault, requiresManualReview: row.requiresManualReview,
    });
  }

  private toRow(destination: SupplierPaymentDestination) {
    return {
      id: destination.id, supplierId: destination.supplierId, methodId: destination.methodId,
      type: destination.type, currency: destination.currency, name: destination.name,
      institutionName: destination.institutionName, providerName: destination.providerName,
      accountNumber: null, accountLastFour: destination.accountLastFour, cciLastFour: destination.cciLastFour,
      walletIdentifierLastFour: destination.walletIdentifierLastFour, holderName: destination.holderName,
      sensitiveIdentifierEncrypted: encryptPaymentAccountSensitiveData({
        accountNumber: destination.accountNumber, cci: destination.cci, walletPhone: destination.walletIdentifier,
        holderDocument: destination.holderDocument,
      }),
      sensitiveIdentifierHash: hashPaymentAccountIdentifier({
        type: destination.type, institutionName: destination.institutionName, walletProvider: destination.providerName,
        accountNumber: destination.accountNumber, cci: destination.cci, walletPhone: destination.walletIdentifier,
        cardLastFour: destination.accountLastFour,
      }),
      maskedLabel: destination.maskedLabel, isActive: destination.isActive, isDefault: destination.isDefault,
      requiresManualReview: destination.requiresManualReview,
    };
  }

  async create(destination: SupplierPaymentDestination, tx?: TransactionContext) {
    const row = await this.manager(tx).getRepository(SupplierPaymentDestinationEntity).save(this.toRow(destination));
    return this.toDomain(row);
  }

  async listBySupplier(supplierId: string, params: { currency?: string; methodId?: string; includeInactive?: boolean } = {}, tx?: TransactionContext) {
    const qb = this.manager(tx).getRepository(SupplierPaymentDestinationEntity).createQueryBuilder("destination")
      .where("destination.supplierId = :supplierId", { supplierId });
    if (params.currency) qb.andWhere("destination.currency = :currency", { currency: params.currency });
    if (params.methodId) qb.andWhere("destination.methodId = :methodId", { methodId: params.methodId });
    if (!params.includeInactive) qb.andWhere("destination.isActive = true AND destination.requiresManualReview = false");
    const rows = await qb.orderBy("destination.isDefault", "DESC").addOrderBy("destination.name", "ASC").getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string, tx?: TransactionContext) {
    const row = await this.manager(tx).getRepository(SupplierPaymentDestinationEntity).createQueryBuilder("destination")
      .addSelect("destination.sensitiveIdentifierEncrypted")
      .where("destination.id = :id", { id })
      .getOne();
    return row ? this.toDomain(row, true) : null;
  }

  async findDuplicate(input: { supplierId: string; methodId: string; currency: string; sensitiveHash?: string | null }, tx?: TransactionContext) {
    if (!input.sensitiveHash) return null;
    const row = await this.manager(tx).getRepository(SupplierPaymentDestinationEntity).findOne({ where: { supplierId: input.supplierId, methodId: input.methodId, currency: input.currency as any, sensitiveIdentifierHash: input.sensitiveHash } });
    return row ? this.toDomain(row) : null;
  }

  async update(destination: SupplierPaymentDestination, tx?: TransactionContext) {
    const repo = this.manager(tx).getRepository(SupplierPaymentDestinationEntity);
    await repo.update({ id: destination.id }, this.toRow(destination));
    const row = await repo.findOne({ where: { id: destination.id } });
    return row ? this.toDomain(row) : null;
  }

  async clearDefault(input: { supplierId: string; currency: string; type: string; exceptId?: string }, tx?: TransactionContext) {
    const qb = this.manager(tx).getRepository(SupplierPaymentDestinationEntity).createQueryBuilder().update(SupplierPaymentDestinationEntity)
      .set({ isDefault: false }).where("supplier_id = :supplierId AND currency = :currency AND type = :type", input);
    if (input.exceptId) qb.andWhere("supplier_payment_destination_id != :exceptId", { exceptId: input.exceptId });
    await qb.execute();
  }
}
