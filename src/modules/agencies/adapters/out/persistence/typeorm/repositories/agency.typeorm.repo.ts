import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { AgencyRepository } from "src/modules/agencies/domain/ports/agency.repository";
import { Agency } from "src/modules/agencies/domain/entities/agency";
import { Subsidiary } from "src/modules/agencies/domain/entities/subsidiary";
import { AgencyFactory } from "src/modules/agencies/domain/factories/agency.factory";
import { AgencyId } from "src/modules/agencies/domain/value-objects/agency-id.vo";
import { SubsidiaryId } from "src/modules/agencies/domain/value-objects/subsidiary-id.vo";
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
import { SubsidiaryEntity } from "../entities/subsidiary.entity";

@Injectable()
export class AgencyTypeormRepository implements AgencyRepository {
  constructor(
    @InjectRepository(AgencyEntity)
    private readonly repo: Repository<AgencyEntity>,
    @InjectRepository(SubsidiaryEntity)
    private readonly subsidiaryRepo: Repository<SubsidiaryEntity>,
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

  private getSubsidiaryRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SubsidiaryEntity);
  }

  private toDomain(row: AgencyEntity): Agency {
    return AgencyFactory.createAgency({
      agencyId: new AgencyId(row.id),
      name: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toSubsidiaryDomain(row: SubsidiaryEntity): Subsidiary {
    return AgencyFactory.createSubsidiary({
      subsidiaryId: new SubsidiaryId(row.id),
      agencyId: new AgencyId(row.agencyId),
      alias: row.alias,
      departmentId: new UbigeoDepartmentId(row.departmentId),
      provinceId: new UbigeoProvinceId(row.provinceId),
      districtId: new UbigeoDistrictId(row.districtId),
      address: row.address ?? undefined,
      basePrice: Number(row.basePrice ?? 0),
      note: row.note ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toSubsidiaryRow(subsidiary: Subsidiary): Partial<SubsidiaryEntity> {
    return {
      id: subsidiary.subsidiaryId.value,
      agencyId: subsidiary.agencyId.value,
      alias: subsidiary.alias,
      departmentId: subsidiary.departmentId.value,
      provinceId: subsidiary.provinceId.value,
      districtId: subsidiary.districtId.value,
      address: subsidiary.address ?? null,
      basePrice: subsidiary.basePrice.toFixed(2),
      note: subsidiary.note ?? null,
      isActive: subsidiary.isActive,
      createdAt: subsidiary.createdAt,
      updatedAt: subsidiary.updatedAt,
    };
  }

  async findById(agencyId: string, tx?: TransactionContext): Promise<Agency | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: agencyId } });
    return row ? this.toDomain(row) : null;
  }

  async create(agency: Agency, tx?: TransactionContext): Promise<Agency> {
    return this.createWithSubsidiaries(agency, [], tx);
  }

  async createWithSubsidiaries(agency: Agency, subsidiaries: Subsidiary[], tx?: TransactionContext): Promise<Agency> {
    const repo = this.getRepo(tx);
    const subsidiaryRepo = this.getSubsidiaryRepo(tx);
    const row = repo.create({
      id: agency.agencyId.value,
      name: agency.name,
      isActive: agency.isActive,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    });

    const saved = await repo.save(row);
    if (subsidiaries.length) {
      await subsidiaryRepo.save(subsidiaries.map((subsidiary) => subsidiaryRepo.create(this.toSubsidiaryRow(subsidiary))));
    }
    return this.toDomain(saved);
  }

  async update(
    params: { agencyId: string; name?: string; isActive?: boolean; updatedAt?: Date },
    tx?: TransactionContext,
  ): Promise<Agency | null> {
    return this.updateWithSubsidiaries(params, tx);
  }

  async updateWithSubsidiaries(
    params: {
      agencyId: string;
      name?: string;
      isActive?: boolean;
      updatedAt?: Date;
      subsidiaries?: Subsidiary[];
    },
    tx?: TransactionContext,
  ): Promise<Agency | null> {
    const repo = this.getRepo(tx);
    const subsidiaryRepo = this.getSubsidiaryRepo(tx);
    const patch: Partial<AgencyEntity> = {};

    if (params.name !== undefined) patch.name = params.name;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.agencyId }, patch);

    if (params.subsidiaries) {
      const current = await subsidiaryRepo.find({ where: { agencyId: params.agencyId } });
      const currentById = new Map(current.map((row) => [row.id, row]));
      const incomingIds = new Set<string>();

      for (const subsidiary of params.subsidiaries) {
        const id = subsidiary.subsidiaryId.value;
        const existing = currentById.get(id);
        if (!existing && !(subsidiary as any).__isNew) {
          throw new Error("La sucursal no pertenece a la agencia");
        }
        incomingIds.add(id);
        await subsidiaryRepo.save(subsidiaryRepo.create(this.toSubsidiaryRow(subsidiary)));
      }

      const omittedIds = current.filter((row) => !incomingIds.has(row.id)).map((row) => row.id);
      if (omittedIds.length) {
        await subsidiaryRepo.update({ id: In(omittedIds), agencyId: params.agencyId }, { isActive: false });
      }
    }

    const updated = await repo.findOne({ where: { id: params.agencyId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(agencyId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: agencyId }, { isActive });
  }

  async findByIdWithSubsidiaries(
    agencyId: string,
    params?: { includeInactiveSubsidiaries?: boolean },
    tx?: TransactionContext,
  ): Promise<{ agency: Agency; subsidiaries: Subsidiary[] } | null> {
    const agency = await this.findById(agencyId, tx);
    if (!agency) return null;

    const where: any = { agencyId };
    if (!params?.includeInactiveSubsidiaries) where.isActive = true;
    const subsidiaries = await this.getSubsidiaryRepo(tx).find({
      where,
      order: { createdAt: "ASC" },
    });

    return {
      agency,
      subsidiaries: subsidiaries.map((row) => this.toSubsidiaryDomain(row)),
    };
  }

  async listSubsidiaries(
    params: { q?: string; agencyId?: string; isActive?: boolean },
    tx?: TransactionContext,
  ): Promise<Subsidiary[]> {
    const qb = this.getSubsidiaryRepo(tx).createQueryBuilder("s");

    if (params.agencyId) qb.andWhere("s.agencyId = :agencyId", { agencyId: params.agencyId });
    if (params.isActive !== undefined) qb.andWhere("s.isActive = :isActive", { isActive: params.isActive });
    if (params.q?.trim()) {
      qb.andWhere(
        [
          "(",
          "unaccent(coalesce(s.alias, '')) ILIKE unaccent(:q)",
          "OR s.departmentId ILIKE :q",
          "OR s.provinceId ILIKE :q",
          "OR s.districtId ILIKE :q",
          "OR unaccent(coalesce(s.address, '')) ILIKE unaccent(:q)",
          ")",
        ].join(" "),
        { q: `%${params.q.trim()}%` },
      );
    }

    const rows = await qb.orderBy("s.alias", "ASC").limit(50).getMany();
    return rows.map((row) => this.toSubsidiaryDomain(row));
  }

  async list(
    params: { q?: string; isActive?: boolean; filters?: AgencySearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Agency[]; total: number }> {
    const repo = this.getRepo(tx);
    const baseQb = repo.createQueryBuilder("a");

    baseQb.innerJoin(SubsidiaryEntity, "s", "s.agency_id = a.id");
    baseQb.leftJoin("ubigeo_departments", "ud", "ud.id = s.departmentId");
    baseQb.leftJoin("ubigeo_provinces", "up", "up.id = s.provinceId");
    baseQb.leftJoin("ubigeo_districts", "udi", "udi.id = s.districtId");

    if (params.isActive !== undefined) {
      baseQb.andWhere("s.isActive = :isActive", { isActive: params.isActive });
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
            baseQb.andWhere(`s.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case AgencySearchFields.DEPARTMENT_ID:
          if (filter.values?.length) baseQb.andWhere(`s.departmentId ${catalogOperator} (:...${valuesParam})`, { [valuesParam]: filter.values });
          break;
        case AgencySearchFields.PROVINCE_ID:
          if (filter.values?.length) baseQb.andWhere(`s.provinceId ${catalogOperator} (:...${valuesParam})`, { [valuesParam]: filter.values });
          break;
        case AgencySearchFields.DISTRICT_ID:
          if (filter.values?.length) baseQb.andWhere(`s.districtId ${catalogOperator} (:...${valuesParam})`, { [valuesParam]: filter.values });
          break;
        case AgencySearchFields.NAME:
        case AgencySearchFields.ALIAS:
        case AgencySearchFields.ADDRESS: {
          if (!filter.value) break;
          const column =
            filter.field === AgencySearchFields.NAME ? "a.name" :
            filter.field === AgencySearchFields.ALIAS ? "s.alias" :
            "s.address";
          if (filter.operator === AgencySearchOperators.EQ) {
            baseQb.andWhere(`unaccent(coalesce(${column}, '')) = unaccent(:${valueParam})`, { [valueParam]: filter.value });
          } else {
            baseQb.andWhere(`unaccent(coalesce(${column}, '')) ILIKE unaccent(:${valueParam})`, { [valueParam]: `%${filter.value}%` });
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
      baseQb.andWhere(
        [
          "(",
          "unaccent(coalesce(a.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(s.alias, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(s.address, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.normalized_name, '')) ILIKE unaccent(:q)",
          matchedActiveStates.length ? "OR s.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].join(" "),
        {
          q: `%${q}%`,
          ...(matchedActiveStates.length ? { matchedActiveStates: matchedActiveStates.map((value) => value === "true") } : {}),
        },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const totalRow = await baseQb
      .clone()
      .select("COUNT(DISTINCT a.id)", "total")
      .getRawOne<{ total: string }>();
    const total = Number(totalRow?.total ?? 0);
    const idRows = await baseQb
      .clone()
      .select("a.id", "id")
      .addSelect("a.createdAt", "createdAt")
      .distinct(true)
      .orderBy("a.createdAt", "DESC")
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: string }>();

    const ids = idRows.map((row) => row.id);
    if (!ids.length) return { items: [], total };

    const agencies = await repo.find({ where: { id: In(ids) } });
    const subsidiaries = await this.getSubsidiaryRepo(tx).find({
      where: { agencyId: In(ids) },
      order: { createdAt: "ASC" },
    });
    const subsidiariesByAgency = new Map<string, Subsidiary[]>();
    subsidiaries.forEach((row) => {
      const list = subsidiariesByAgency.get(row.agencyId) ?? [];
      list.push(this.toSubsidiaryDomain(row));
      subsidiariesByAgency.set(row.agencyId, list);
    });

    const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
    const ordered = ids
      .map((id) => agencyById.get(id))
      .filter(Boolean)
      .map((agency) => {
        const domain = this.toDomain(agency!);
        (domain as any).__subsidiaries = subsidiariesByAgency.get(agency!.id) ?? [];
        return domain;
      });

    return { items: ordered, total };
  }
}
