import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";
import { PaymentMethodRepository, PaymentMethodWithNumber } from "src/modules/payment-methods/domain/ports/payment-method.repository";
import { CompanyMethodEntity } from "../entities/company-method.entity";
import { PaymentMethodEntity } from "../entities/payment-method.entity";
import { SupplierMethodEntity } from "../entities/supplier-method.entity";

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
      isActive: row.isActive,
    });
  }

  async findById(methodId: string, tx?: TransactionContext): Promise<PaymentMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: methodId } });
    return row ? this.toDomain(row) : null;
  }

  async getByCompany(companyId: string, tx?: TransactionContext): Promise<PaymentMethodWithNumber[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("pm")
      .innerJoin(CompanyMethodEntity, "cm", "cm.methodId = pm.id")
      .where("cm.companyId = :companyId", { companyId })
      .select([
        "cm.id AS relation_id",
        "cm.number AS relation_number",
        "pm.id AS method_id",
        "pm.name AS method_name",
        "pm.isActive AS method_is_active",
      ])
      .orderBy("pm.name", "ASC")
      .addOrderBy("cm.number", "ASC", "NULLS FIRST")
      .addOrderBy("cm.id", "ASC")
      .getRawMany<{
        relation_id: string;
        relation_number?: string | null;
        method_id: string;
        method_name: string;
        method_is_active: boolean;
      }>();

    return rows.map((row) => ({
      relationId: row.relation_id,
      method: PaymentMethod.create({
        methodId: row.method_id,
        name: row.method_name,
        isActive: row.method_is_active,
      }),
      number: row.relation_number ?? undefined,
    }));
  }

  async getBySupplier(supplierId: string, tx?: TransactionContext): Promise<PaymentMethodWithNumber[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("pm")
      .innerJoin(SupplierMethodEntity, "sm", "sm.methodId = pm.id")
      .where("sm.supplierId = :supplierId", { supplierId })
      .select([
        "sm.id AS relation_id",
        "sm.number AS relation_number",
        "pm.id AS method_id",
        "pm.name AS method_name",
        "pm.isActive AS method_is_active",
      ])
      .orderBy("pm.name", "ASC")
      .addOrderBy("sm.number", "ASC", "NULLS FIRST")
      .addOrderBy("sm.id", "ASC")
      .getRawMany<{
        relation_id: string;
        relation_number?: string | null;
        method_id: string;
        method_name: string;
        method_is_active: boolean;
      }>();

    return rows.map((row) => ({
      relationId: row.relation_id,
      method: PaymentMethod.create({
        methodId: row.method_id,
        name: row.method_name,
        isActive: row.method_is_active,
      }),
      number: row.relation_number ?? undefined,
    }));
  }

  async getRecords(tx?: TransactionContext): Promise<PaymentMethod[]> {
    const rows = await this.getRepo(tx).find({ order: { name: "ASC" } });
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
      isActive: method.isActive ?? true,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: { methodId: string; name?: string },
    tx?: TransactionContext,
  ): Promise<PaymentMethod | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<PaymentMethodEntity> = {};

    if (params.name !== undefined) patch.name = params.name;

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
