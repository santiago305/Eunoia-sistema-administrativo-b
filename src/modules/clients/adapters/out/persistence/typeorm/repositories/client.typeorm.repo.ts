import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { Client } from "src/modules/clients/domain/entities/client";
import { ClientFactory } from "src/modules/clients/domain/factories/client.factory";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { UbigeoDepartmentId } from "src/modules/clients/domain/value-objects/ubigeo-department-id.vo";
import { UbigeoProvinceId } from "src/modules/clients/domain/value-objects/ubigeo-province-id.vo";
import { UbigeoDistrictId } from "src/modules/clients/domain/value-objects/ubigeo-district-id.vo";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { ClientSearchRule } from "src/modules/clients/application/dtos/client-search/client-search-snapshot";
import {
  CLIENT_ACTIVE_STATE_SEARCH_OPTIONS,
  matchSearchOptionIds,
  sanitizeClientSearchFilters,
} from "src/modules/clients/application/support/client-search.utils";
import {
  ClientSearchFields,
  ClientSearchOperators,
} from "src/modules/clients/application/dtos/client-search/client-search-snapshot";
import { ClientEntity } from "../entities/client.entity";

@Injectable()
export class ClientTypeormRepository implements ClientRepository {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repo: Repository<ClientEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(ClientEntity);
  }

  private toDomain(row: ClientEntity): Client {
    return ClientFactory.createClient({
      clientId: new ClientId(row.id),
      type: row.type as ClientType,
      fullName: row.fullName,
      docType: row.docType as ClientDocType,
      docNumber: row.docNumber ?? "",
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

  async findById(clientId: string, tx?: TransactionContext): Promise<Client | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: clientId } });
    return row ? this.toDomain(row) : null;
  }

  async findByDocument(
    docType: ClientDocType,
    docNumber: string,
    tx?: TransactionContext,
  ): Promise<Client | null> {
    const row = await this.getRepo(tx).findOne({ where: { docType, docNumber } });
    return row ? this.toDomain(row) : null;
  }

  async create(client: Client, tx?: TransactionContext): Promise<Client> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: client.clientId.value,
      type: client.type,
      fullName: client.fullName,
      docType: client.docType,
      docNumber: client.docType === ClientDocType.NONE ? null : client.docNumber,
      reference: client.reference ?? null,
      address: client.address ?? null,
      departmentId: client.departmentId.value,
      provinceId: client.provinceId.value,
      districtId: client.districtId.value,
      isActive: client.isActive ?? true,
      createdAt: client.createdAt ?? undefined,
      updatedAt: client.updatedAt ?? undefined,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      clientId: string;
      type?: ClientType;
      fullName?: string;
      docType?: ClientDocType;
      docNumber?: string;
      departmentId?: string;
      provinceId?: string;
      districtId?: string;
      reference?: string;
      address?: string;
      isActive?: boolean;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Client | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<ClientEntity> = {};

    if (params.type !== undefined) patch.type = params.type as any;
    if (params.fullName !== undefined) patch.fullName = params.fullName;
    if (params.docType !== undefined) patch.docType = params.docType as any;
    if (params.docNumber !== undefined) {
      const docType = params.docType;
      patch.docNumber = docType === ClientDocType.NONE ? null : params.docNumber;
    }
    if (params.departmentId !== undefined) patch.departmentId = params.departmentId;
    if (params.provinceId !== undefined) patch.provinceId = params.provinceId;
    if (params.districtId !== undefined) patch.districtId = params.districtId;
    if (params.reference !== undefined) patch.reference = params.reference ?? null;
    if (params.address !== undefined) patch.address = params.address ?? null;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.clientId }, patch);
    const updated = await repo.findOne({ where: { id: params.clientId } });
    return updated ? this.toDomain(updated) : null;
  }

  async setActive(clientId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: clientId }, { isActive });
  }

  async list(
    params: { q?: string; isActive?: boolean; filters?: ClientSearchRule[]; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Client[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("c");

    qb.leftJoin("ubigeo_departments", "ud", "ud.id = c.departmentId");
    qb.leftJoin("ubigeo_provinces", "up", "up.id = c.provinceId");
    qb.leftJoin("ubigeo_districts", "udi", "udi.id = c.districtId");

    if (params.isActive !== undefined) {
      qb.andWhere("c.isActive = :isActive", { isActive: params.isActive });
    }

    const filters = sanitizeClientSearchFilters(params.filters ?? []);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case ClientSearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`c.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case ClientSearchFields.TYPE:
          if (filter.values?.length) {
            qb.andWhere(`c.type ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ClientSearchFields.DOC_TYPE:
          if (filter.values?.length) {
            qb.andWhere(`c.docType ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ClientSearchFields.DEPARTMENT_ID:
          if (filter.values?.length) {
            qb.andWhere(`c.departmentId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ClientSearchFields.PROVINCE_ID:
          if (filter.values?.length) {
            qb.andWhere(`c.provinceId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ClientSearchFields.DISTRICT_ID:
          if (filter.values?.length) {
            qb.andWhere(`c.districtId ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case ClientSearchFields.FULL_NAME:
        case ClientSearchFields.DOC_NUMBER:
        case ClientSearchFields.REFERENCE:
        case ClientSearchFields.ADDRESS: {
          if (!filter.value) break;

          const column =
            filter.field === ClientSearchFields.FULL_NAME ? "c.fullName" :
            filter.field === ClientSearchFields.DOC_NUMBER ? "c.docNumber" :
            filter.field === ClientSearchFields.REFERENCE ? "c.reference" :
            "c.address";

          if (filter.operator === ClientSearchOperators.EQ) {
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
      const matchedActiveStates = matchSearchOptionIds(q, CLIENT_ACTIVE_STATE_SEARCH_OPTIONS);
      qb.andWhere(
        [
          "(",
          "unaccent(coalesce(c.docNumber, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(c.fullName, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(c.reference, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(c.address, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(ud.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(up.normalized_name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(udi.normalized_name, '')) ILIKE unaccent(:q)",
          matchedActiveStates.length ? "OR c.isActive IN (:...matchedActiveStates)" : "",
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
      .orderBy("c.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}
