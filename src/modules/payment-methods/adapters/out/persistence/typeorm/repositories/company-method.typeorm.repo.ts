import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";
import { CompanyMethod } from "src/modules/payment-methods/domain/entity/company-method";
import {
  CompanyMethodRepository,
  CompanyMethodWithMethod,
} from "src/modules/payment-methods/domain/ports/company-method.repository";
import { CompanyMethodEntity } from "../entities/company-method.entity";

@Injectable()
export class CompanyMethodTypeormRepository implements CompanyMethodRepository {
  constructor(
    @InjectRepository(CompanyMethodEntity)
    private readonly repo: Repository<CompanyMethodEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CompanyMethodEntity);
  }

  private toDomain(row: CompanyMethodEntity): CompanyMethod {
    return CompanyMethod.create({
      companyMethodId: row.id,
      companyId: row.companyId,
      methodId: row.methodId,
      evidencePolicy: row.evidencePolicy,
      enabled: row.enabled,
      isDefault: row.isDefault,
    });
  }

  private toMethodDomain(row: CompanyMethodEntity): PaymentMethod {
    return PaymentMethod.create({
      methodId: row.method.id,
      name: row.method.name,
      code: row.method.code,
      isActive: row.method.isActive,
      requiresVoucher: row.method.requiresVoucher,
      category: row.method.category as any,
      requiresSourceAccount: row.method.requiresSourceAccount,
      requiresDestination: row.method.requiresDestination,
      requiresOperationReference: row.method.requiresOperationReference,
      isSystem: row.method.isSystem,
    });
  }

  private toDetail(row: CompanyMethodEntity): CompanyMethodWithMethod {
    return {
      relation: this.toDomain(row),
      method: this.toMethodDomain(row),
    };
  }

  async findById(companyMethodId: string, tx?: TransactionContext): Promise<CompanyMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: companyMethodId } });
    return row ? this.toDomain(row) : null;
  }

  async findDetailById(
    companyMethodId: string,
    tx?: TransactionContext,
  ): Promise<CompanyMethodWithMethod | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder("cm")
      .leftJoinAndSelect("cm.method", "method")
      .where("cm.id = :companyMethodId", { companyMethodId })
      .getOne();

    return row ? this.toDetail(row) : null;
  }

  async listByCompany(companyId: string, tx?: TransactionContext): Promise<CompanyMethodWithMethod[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("cm")
      .leftJoinAndSelect("cm.method", "method")
      .where("cm.companyId = :companyId", { companyId })
      .orderBy("method.name", "ASC")
      .addOrderBy("cm.id", "ASC")
      .getMany();

    return rows.map((row) => this.toDetail(row));
  }

  async findDuplicate(
    companyId: string,
    methodId: string,
    tx?: TransactionContext,
  ): Promise<CompanyMethod | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder("cm")
      .where("cm.companyId = :companyId", { companyId })
      .andWhere("cm.methodId = :methodId", { methodId })
      .getOne();

    return row ? this.toDomain(row) : null;
  }

  async create(method: CompanyMethod, tx?: TransactionContext): Promise<CompanyMethod> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: method.companyMethodId,
      companyId: method.companyId,
      methodId: method.methodId,
      evidencePolicy: method.evidencePolicy,
      enabled: method.enabled,
      isDefault: method.isDefault,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      companyMethodId: string;
      methodId?: string;
      evidencePolicy?: CompanyMethod["evidencePolicy"];
      enabled?: boolean;
      isDefault?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<CompanyMethod | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<CompanyMethodEntity> = {};

    if (params.methodId !== undefined) patch.methodId = params.methodId;
    if (params.evidencePolicy !== undefined) patch.evidencePolicy = params.evidencePolicy;
    if (params.enabled !== undefined) patch.enabled = params.enabled;
    if (params.isDefault !== undefined) patch.isDefault = params.isDefault;

    await repo.update({ id: params.companyMethodId }, patch);
    const updated = await repo.findOne({ where: { id: params.companyMethodId } });
    return updated ? this.toDomain(updated) : null;
  }

  async clearDefaultByCompany(
    companyId: string,
    exceptCompanyMethodId?: string,
    tx?: TransactionContext,
  ): Promise<void> {
    const qb = this.getRepo(tx)
      .createQueryBuilder()
      .update(CompanyMethodEntity)
      .set({ isDefault: false })
      .where("company_id = :companyId", { companyId })
      .andWhere("is_default = true");

    if (exceptCompanyMethodId) {
      qb.andWhere("company_method_id <> :exceptCompanyMethodId", {
        exceptCompanyMethodId,
      });
    }

    await qb.execute();
  }

  async delete(companyMethodId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getRepo(tx);
    const result = await repo.delete({ id: companyMethodId });
    return (result.affected ?? 0) > 0;
  }
}
