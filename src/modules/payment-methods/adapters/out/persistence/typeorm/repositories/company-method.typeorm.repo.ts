import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyMethod } from "src/modules/payment-methods/domain/entity/company-method";
import { CompanyMethodRepository } from "src/modules/payment-methods/domain/ports/company-method.repository";
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
    return new CompanyMethod(row.companyId, row.methodId, row.number ?? undefined);
  }

  async findById(companyId: string, methodId: string, tx?: TransactionContext): Promise<CompanyMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { companyId, methodId } });
    return row ? this.toDomain(row) : null;
  }

  async create(method: CompanyMethod, tx?: TransactionContext): Promise<CompanyMethod> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      companyId: method.companyId,
      methodId: method.methodId,
      number: method.number ?? null,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async delete(companyId: string, methodId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getRepo(tx);
    const result = await repo.delete({ companyId, methodId });
    return (result.affected ?? 0) > 0;
  }
}
