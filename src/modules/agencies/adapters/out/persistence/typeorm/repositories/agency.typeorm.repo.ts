import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { Agency } from "src/modules/agencies/domain/entities/agency";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { UbigeoDepartmentId } from "src/modules/agencies/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/agencies/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/agencies/domain/value-objects/ubigeo-district-id.vo";
import { AgencySearchRule } from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";
import {
  AGENCY_ACTIVE_STATE_SEARCH_OPTIONS,
  matchSearchOptionIds,
  sanitizeAgencySearchFilters,
} from "src/modules/agencies/application/support/agency-search.utils";
import {
  AgencySearchFields,
  AgencySearchOperators,
} from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";
import { AgencyEntity } from "../entities/agency.entity";

@Injectable()
export class AgencyTypeormRepository implements AgencyRepository {
  constructor(
    @InjectRepository(AgencyEntity)
    private readonly repo: Repository<AgencyEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(AgencyEntity);
  }

  private toDomain(row: AgencyEntity): Agency {
    return AgencyFactory.createAgency({
      agencyId: new AgencyId(row.id),
      name: row.name,
      reference: row.reference ?? undefined,
      address: row.address ?? undefined,
      departmentId: new UbigeoDepartmentId(row.departmentId),
      provinceId: new UbigeoProvinceId(row.provinceId),
      districtId: new UbigeoDistrictId(row.districtId),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(agencyId: string, tx?: TransactionContext): Promise<Agency | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: agencyId } });
    return row ? this.toDomain(row) : null;
  }

  async create(agency: Agency, tx?: TransactionContext): Promise<Agency> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: agency.agencyId.value,
      name: agency.name,
      reference: agency.reference ?? null,
      address: agency.address ?? null,
      departmentId: agency.departmentId.value,
      provinceId: agency.provinceId.value,
      districtId: agency.districtId.value,
      isActive: agency.isActive ?? true,
      createdAt: agency.createdAt ?? undefined,
      updatedAt: agency.updatedAt ?? undefined,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      agencyId: string;
      name?: string;
      reference?: string;
      address?: string;
      departmentId?: string;
      provinceId?: string;
      districtId?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Agency | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<AgencyEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.reference !== undefined) patch.reference = params.reference ?? null;
    if (params.address !== undefined) patch.address = params.address ?? null;
    if (params.departmentId !== undefined) patch.departmentId = params.departmentId;
    if (params.provinceId !== undefined) patch.provinceId = params.provinceId;
    if (params.districtId !== undefined) patch.districtId = params.districtId;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.agencyId }, patch);

    const updated = await repo.findOne({ where: { id: params.agencyId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(agencyId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: agencyId }, { isActive });
  }

  async list(
    params: { q?: string; isActive?: boolean; filters?: AgencySearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Agency[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("a");

    qb.leftJoin("ubigeo_departments", "ud", "ud.id = a.departmentId");
    qb.leftJoin("ubigeo_provinces", "up", "up.id = a.provinceId");
    qb.leftJoin("ubigeo_districts", "udi", "udi.id = a.districtId");

    if (params.isActive !== undefined) {
      qb.andWhere("a.isActive = :isActive", { isActive: params.isActive });
    }

    const filters = sanitizeAgencySearchFilters(params.filters ?? []);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case AgencySearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`a.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case AgencySearchFields.DEPARTMENT_ID:
          if (filter.values?.length) {
            qb.andWhere(`a.departmentId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case AgencySearchFields.PROVINCE_ID:
          if (filter.values?.length) {
            qb.andWhere(`a.provinceId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case AgencySearchFields.DISTRICT_ID:
          if (filter.values?.length) {
            qb.andWhere(`a.districtId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case AgencySearchFields.NAME:
        case AgencySearchFields.REFERENCE:
        case AgencySearchFields.ADDRESS: {
          if (!filter.value) break;

          const column =
            filter.field === AgencySearchFields.NAME ? "a.name" :
            filter.field === AgencySearchFields.REFERENCE ? "a.reference" :
            "a.address";

          if (filter.operator === AgencySearchOperators.EQ) {
            qb.andWhere(`unaccent(coalesce(${column}, '')) = unaccent(:${valueParam})`, {
              [valueParam]: filter.value,
            });
          } else {
            qb.andWhere(`unaccent(coalesce(${column}, '')) ILIKE unaccent(:${valueParam})`, {
              [valueParam]: `%${filter.value}%`,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    if (params.q) {
      const q = params.q.trim();
      const matchedActiveStates = matchSearchOptionIds(q, AGENCY_ACTIVE_STATE_SEARCH_OPTIONS);
      qb.andWhere(
        [
          "(",
          "unaccent(coalesce(a.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(a.reference, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(a.address, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.normalized_name, '')) ILIKE unaccent(:q)",
          matchedActiveStates.length ? "OR a.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].join(" "),
        {
          q: `%${q}%`,
          ...(matchedActiveStates.length
            ? { matchedActiveStates: matchedActiveStates.map((value) => value === "true") }
            : {}),
        },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const [rows, total] = await qb
      .orderBy("a.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
