import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Company } from "src/modules/companies/domain/entity/company";
import { CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { CompanyEntity } from "../entities/company.entity";

@Injectable()
export class CompanyTypeormRepository implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly repo: Repository<CompanyEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CompanyEntity);
  }

  private toDomain(row: CompanyEntity): Company {
    return new Company(
      row.id,
      row.name,
      row.ruc,
      row.ubigeo ?? undefined,
      row.department ?? undefined,
      row.province ?? undefined,
      row.district ?? undefined,
      row.urbanization ?? undefined,
      row.address ?? undefined,
      row.phone ?? undefined,
      row.email ?? undefined,
      row.codLocal ?? undefined,
      row.solUser ?? undefined,
      row.solPass ?? undefined,
      row.logoPath ?? undefined,
      row.certPath ?? undefined,
      row.production,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  async findSingle(tx?: TransactionContext): Promise<Company | null> {
    const rows = await this.getRepo(tx).find({
      order: { createdAt: "DESC" },
      take: 1,
    });
    return rows.length ? this.toDomain(rows[0]) : null;
  }

  async findById(companyId: string, tx?: TransactionContext): Promise<Company | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: companyId } });
    return row ? this.toDomain(row) : null;
  }

  async existsByEmail(email: string, tx?: TransactionContext): Promise<boolean> {
    if (!email) return false;
    const row = await this.getRepo(tx).findOne({ where: { email } });
    return !!row;
  }

  async create(company: Company, tx?: TransactionContext): Promise<Company> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: company.companyId,
      name: company.name,
      ruc: company.ruc,
      ubigeo: company.ubigeo ?? null,
      department: company.department ?? null,
      province: company.province ?? null,
      district: company.district ?? null,
      urbanization: company.urbanization ?? null,
      address: company.address ?? null,
      phone: company.phone ?? null,
      email: company.email ?? null,
      codLocal: company.codLocal ?? null,
      solUser: company.solUser ?? null,
      solPass: company.solPass ?? null,
      logoPath: company.logoPath ?? null,
      certPath: company.certPath ?? null,
      production: company.production ?? true,
      isActive: company.isActive ?? true,
      createdAt: company.createdAt ?? undefined,
      updatedAt: company.updatedAt ?? undefined,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
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
    const repo = this.getRepo(tx);
    const patch: Partial<CompanyEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.ruc !== undefined) patch.ruc = params.ruc;
    if (params.ubigeo !== undefined) patch.ubigeo = params.ubigeo;
    if (params.department !== undefined) patch.department = params.department;
    if (params.province !== undefined) patch.province = params.province;
    if (params.district !== undefined) patch.district = params.district;
    if (params.urbanization !== undefined) patch.urbanization = params.urbanization;
    if (params.address !== undefined) patch.address = params.address;
    if (params.phone !== undefined) patch.phone = params.phone;
    if (params.email !== undefined) patch.email = params.email;
    if (params.codLocal !== undefined) patch.codLocal = params.codLocal;
    if (params.solUser !== undefined) patch.solUser = params.solUser;
    if (params.solPass !== undefined) patch.solPass = params.solPass;
    if (params.logoPath !== undefined) patch.logoPath = params.logoPath;
    if (params.certPath !== undefined) patch.certPath = params.certPath;
    if (params.production !== undefined) patch.production = params.production;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.createdAt !== undefined) patch.createdAt = params.createdAt;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.companyId }, patch);
    const updated = await repo.findOne({ where: { id: params.companyId } });
    return updated ? this.toDomain(updated) : null;
  }
}
