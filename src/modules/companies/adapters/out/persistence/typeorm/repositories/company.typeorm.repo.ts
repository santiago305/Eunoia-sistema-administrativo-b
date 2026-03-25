import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Company } from "src/modules/companies/domain/entity/company";
import { CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

import { CompanyEntity } from "../entities/company.entity";
import { CompanyTypeormMapper } from "../mappers/company-typeorm.mapper";

export class CompanyTypeormRepository implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly repository: Repository<CompanyEntity>,
  ) {}

  async findSingle(tx?: TransactionContext): Promise<Company | null> {
    const repo = this.getRepository(tx);

    const row = await repo.findOne({
      order: { createdAt: "ASC" },
    });

    if (!row) return null;

    return CompanyTypeormMapper.toDomain(row);
  }

  async findById(companyId: string, tx?: TransactionContext): Promise<Company | null> {
    const repo = this.getRepository(tx);

    const row = await repo.findOne({
      where: { id: companyId },
    });

    if (!row) return null;

    return CompanyTypeormMapper.toDomain(row);
  }

  async existsByEmail(email: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getRepository(tx);

    if (!email?.trim()) {
      return false;
    }

    const count = await repo.count({
      where: { email: email.trim().toLowerCase() },
    });

    return count > 0;
  }

  async create(company: Company, tx?: TransactionContext): Promise<Company> {
    const repo = this.getRepository(tx);

    const entity = repo.create(CompanyTypeormMapper.toPersistence(company));
    const saved = await repo.save(entity);

    return CompanyTypeormMapper.toDomain(saved);
  }

  async update(
    params: {
      companyId: string;
      name?: string;
      ruc?: string;
      ubigeo?: string;
      department?: string;
      province?: string;
      district?: string;
      urbanization?: string;
      address?: string;
      phone?: string;
      email?: string;
      codLocal?: string;
      solUser?: string;
      solPass?: string;
      logoPath?: string;
      certPath?: string;
      production?: boolean;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Company | null> {
    const repo = this.getRepository(tx);

    const patch = CompanyTypeormMapper.toUpdatePatch(params);

    if (Object.keys(patch).length === 0) {
      const current = await repo.findOne({ where: { id: params.companyId } });
      return current ? CompanyTypeormMapper.toDomain(current) : null;
    }

    await repo.update({ id: params.companyId }, patch);

    const updated = await repo.findOne({
      where: { id: params.companyId },
    });

    if (!updated) return null;

    return CompanyTypeormMapper.toDomain(updated);
  }

  private getRepository(tx?: TransactionContext): Repository<CompanyEntity> {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager.getRepository(CompanyEntity);
    }

    return this.repository;
  }
}
