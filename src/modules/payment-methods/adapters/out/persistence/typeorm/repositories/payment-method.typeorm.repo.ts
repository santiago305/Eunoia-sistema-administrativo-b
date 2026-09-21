import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";
import { ConfiguredPaymentMethod, PaymentMethodRepository } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { CompanyMethodEntity } from "../entities/company-method.entity";
import { PaymentMethodEntity } from "../entities/payment-method.entity";

@Injectable()
export class PaymentMethodTypeormRepository implements PaymentMethodRepository {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(PaymentMethodEntity);
  }

  private toDomain(row: PaymentMethodEntity): PaymentMethod {
    return PaymentMethod.create({
      methodId: row.id,
      name: row.name,
      code: row.code,
      isActive: row.isActive,
      requiresVoucher: row.requiresVoucher,
      category: row.category as any,
      requiresSourceAccount: row.requiresSourceAccount,
      requiresDestination: row.requiresDestination,
      requiresOperationReference: row.requiresOperationReference,
      isSystem: row.isSystem,
    });
  }

  async findById(methodId: string, tx?: TransactionContext): Promise<PaymentMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: methodId } });
    return row ? this.toDomain(row) : null;
  }

  async getByCompany(companyId: string, tx?: TransactionContext): Promise<ConfiguredPaymentMethod[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("pm")
      .innerJoin(CompanyMethodEntity, "cm", "cm.methodId = pm.id")
      .where("cm.companyId = :companyId", { companyId })
      .andWhere("cm.enabled = true")
      .andWhere("pm.isActive = true")
      .select([
        "cm.id AS relation_id",
        "cm.requiresVoucher AS relation_requires_voucher",
        "cm.enabled AS relation_enabled",
        "pm.id AS method_id",
        "pm.name AS method_name",
        "pm.code AS method_code",
        "pm.category AS method_category",
        "pm.isActive AS method_is_active",
        "pm.requiresVoucher AS method_requires_voucher",
        "pm.requiresSourceAccount AS method_requires_source_account",
        "pm.requiresDestination AS method_requires_destination",
        "pm.requiresOperationReference AS method_requires_operation_reference",
        "pm.isSystem AS method_is_system",
      ])
      .orderBy("pm.name", "ASC")
      .addOrderBy("cm.id", "ASC")
      .getRawMany<{
        relation_id: string;
        relation_requires_voucher: boolean;
        relation_enabled: boolean;
        method_id: string;
        method_name: string;
        method_code: string;
        method_category: string;
        method_is_active: boolean;
        method_requires_voucher: boolean;
        method_requires_source_account: boolean;
        method_requires_destination: boolean;
        method_requires_operation_reference: boolean;
        method_is_system: boolean;
      }>();

    return rows.map((row) => ({
      relationId: row.relation_id,
      method: PaymentMethod.create({
        methodId: row.method_id,
        name: row.method_name,
        code: row.method_code,
        isActive: row.method_is_active,
        requiresVoucher: row.method_requires_voucher,
        category: row.method_category as any,
        requiresSourceAccount: row.method_requires_source_account,
        requiresDestination: row.method_requires_destination,
        requiresOperationReference: row.method_requires_operation_reference,
        isSystem: row.method_is_system,
      }),
      isDefault: false,
      requiresVoucher: row.relation_requires_voucher ?? row.method_requires_voucher,
      enabled: row.relation_enabled ?? true,
    }));
  }

  async getRecords(tx?: TransactionContext): Promise<PaymentMethod[]> {
    const rows = await this.getRepo(tx).find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async list(
    params: { name?: string; isActive?: boolean; page: number; limit: number },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentMethod[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("pm");

    if (params.name) qb.andWhere("LOWER(pm.name) ILIKE LOWER(:name)", { name: `%${params.name}%` });
    if (params.isActive !== undefined) qb.andWhere("pm.is_active = :isActive", { isActive: params.isActive });

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy("pm.name", "ASC")
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getMany();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async create(method: PaymentMethod, tx?: TransactionContext): Promise<PaymentMethod> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: method.methodId,
      name: method.name,
      code: method.code,
      isActive: method.isActive ?? true,
      requiresVoucher: method.requiresVoucher,
      category: method.category,
      requiresSourceAccount: method.requiresSourceAccount,
      requiresDestination: method.requiresDestination,
      requiresOperationReference: method.requiresOperationReference,
      isSystem: method.isSystem,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: { methodId: string; name?: string; requiresVoucher?: boolean },
    tx?: TransactionContext,
  ): Promise<PaymentMethod | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<PaymentMethodEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.requiresVoucher !== undefined) patch.requiresVoucher = params.requiresVoucher;

    await repo.update({ id: params.methodId }, patch);
    const updated = await repo.findOne({ where: { id: params.methodId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(methodId: string, isActive: boolean, tx?: TransactionContext): Promise<PaymentMethod | null> {
    const repo = this.getRepo(tx);
    await repo.update({ id: methodId }, { isActive });
    const updated = await repo.findOne({ where: { id: methodId } });
    return updated ? this.toDomain(updated) : null;
  }
}
