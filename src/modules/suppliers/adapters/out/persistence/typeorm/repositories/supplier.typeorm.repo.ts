import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Supplier } from "src/modules/suppliers/domain/entity/supplier";
import { SupplierRepository } from "src/modules/suppliers/domain/ports/supplier.repository";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { SupplierEntity } from "../entities/supplier.entity";
import {
  matchSearchOptionIds,
  sanitizeSupplierSearchFilters,
  SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS,
  SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS,
} from "src/modules/suppliers/application/support/supplier-search.utils";
import { SupplierSearchFields, SupplierSearchOperators, SupplierSearchRule } from "src/modules/suppliers/application/dtos/supplier-search/supplier-search-snapshot";

@Injectable()
export class SupplierTypeormRepository implements SupplierRepository {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly repo: Repository<SupplierEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SupplierEntity);
  }

  private toDomain(row: SupplierEntity): Supplier {
    return Supplier.create({
      supplierId: row.id,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      name: row.name ?? undefined,
      lastName: row.lastName ?? undefined,
      tradeName: row.tradeName ?? undefined,
      address: row.address ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      note: row.note ?? undefined,
      leadTimeDays: row.leadTimeDays ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(supplierId: string, tx?: TransactionContext): Promise<Supplier | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: supplierId } });
    return row ? this.toDomain(row) : null;
  }

  async findByDocument(
    documentType: SupplierDocType,
    documentNumber: string,
    tx?: TransactionContext,
  ): Promise<Supplier | null> {
    const row = await this.getRepo(tx).findOne({ where: { documentType, documentNumber } });
    return row ? this.toDomain(row) : null;
  }

  async create(supplier: Supplier, tx?: TransactionContext): Promise<Supplier> {
    const repo = this.getRepo(tx);

    const row = repo.create({
      id: supplier.supplierId,
      documentType: supplier.documentType,
      documentNumber: supplier.documentNumber,
      name: supplier.name ?? null,
      lastName: supplier.lastName ?? null,
      tradeName: supplier.tradeName ?? null,
      address: supplier.address ?? null,
      phone: supplier.phone ?? null,
      email: supplier.email ?? null,
      note: supplier.note ?? null,
      leadTimeDays: supplier.leadTimeDays ?? null,
      isActive: supplier.isActive ?? true,
      createdAt: supplier.createdAt ?? undefined,
      updatedAt: supplier.updatedAt ?? undefined,
    });

    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      supplierId: string;
      documentType?: SupplierDocType;
      documentNumber?: string;
      name?: string;
      lastName?: string;
      tradeName?: string;
      address?: string;
      phone?: string;
      email?: string;
      note?: string;
      leadTimeDays?: number;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<Supplier> {
    const repo = this.getRepo(tx);
    const patch: Partial<SupplierEntity> = {};

    if (params.documentType !== undefined) patch.documentType = params.documentType;
    if (params.documentNumber !== undefined) patch.documentNumber = params.documentNumber;
    if (params.name !== undefined) patch.name = params.name;
    if (params.lastName !== undefined) patch.lastName = params.lastName;
    if (params.tradeName !== undefined) patch.tradeName = params.tradeName;
    if (params.address !== undefined) patch.address = params.address;
    if (params.phone !== undefined) patch.phone = params.phone;
    if (params.email !== undefined) patch.email = params.email;
    if (params.note !== undefined) patch.note = params.note;
    if (params.leadTimeDays !== undefined) patch.leadTimeDays = params.leadTimeDays;
    if (params.isActive !== undefined) patch.isActive = params.isActive;
    if (params.createdAt !== undefined) patch.createdAt = params.createdAt;
    if (params.updatedAt !== undefined) patch.updatedAt = params.updatedAt;

    await repo.update({ id: params.supplierId }, patch);
    const updated = await repo.findOne({ where: { id: params.supplierId } });
    return updated ? this.toDomain(updated) : null;
  }

  async list(
    params: {
      filters?: SupplierSearchRule[];
      q?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Supplier[]; total: number }> {
    const repo = this.getRepo(tx);
    const qb = repo.createQueryBuilder("s");

    const filters = sanitizeSupplierSearchFilters(params.filters);
    filters.forEach((filter, index) => {
      const fieldParam = `filter_${index}`;
      const valuesParam = `${fieldParam}_values`;
      const valueParam = `${fieldParam}_value`;
      const catalogOperator = filter.mode === "exclude" ? "NOT IN" : "IN";

      switch (filter.field) {
        case SupplierSearchFields.DOCUMENT_TYPE:
          if (filter.values?.length) {
            qb.andWhere(`s.documentType ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values,
            });
          }
          break;
        case SupplierSearchFields.IS_ACTIVE:
          if (filter.values?.length) {
            qb.andWhere(`s.isActive ${catalogOperator} (:...${valuesParam})`, {
              [valuesParam]: filter.values.map((value) => value === "true"),
            });
          }
          break;
        case SupplierSearchFields.DOCUMENT_NUMBER:
          if (!filter.value) break;
          if (filter.operator === SupplierSearchOperators.EQ) {
            qb.andWhere("lower(s.documentNumber) = lower(:value)", {
              value: filter.value,
            });
          } else {
            qb.andWhere("s.documentNumber ILIKE :documentNumber", {
              documentNumber: `%${filter.value}%`,
            });
          }
          break;
        case SupplierSearchFields.NAME:
        case SupplierSearchFields.LAST_NAME:
        case SupplierSearchFields.TRADE_NAME:
        case SupplierSearchFields.PHONE:
        case SupplierSearchFields.EMAIL: {
          if (!filter.value) break;

          const column =
            filter.field === SupplierSearchFields.NAME ? "s.name" :
            filter.field === SupplierSearchFields.LAST_NAME ? "s.lastName" :
            filter.field === SupplierSearchFields.TRADE_NAME ? "s.tradeName" :
            filter.field === SupplierSearchFields.PHONE ? "s.phone" :
            "s.email";

          if (filter.operator === SupplierSearchOperators.EQ) {
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
      const matchedDocumentTypes = matchSearchOptionIds(q, SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS);
      const matchedActiveStates = matchSearchOptionIds(q, SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS);

      qb.andWhere(
        [
          "(unaccent(coalesce(s.name, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(s.lastName, '')) ILIKE unaccent(:q)",
          "OR unaccent(coalesce(s.tradeName, '')) ILIKE unaccent(:q)",
          "OR s.documentNumber ILIKE :q",
          "OR s.phone ILIKE :q",
          "OR s.email ILIKE :q",
          matchedDocumentTypes.length ? "OR s.documentType IN (:...matchedDocumentTypes)" : "",
          matchedActiveStates.length ? "OR s.isActive IN (:...matchedActiveStates)" : "",
          ")",
        ].join(" "),
        {
          q: `%${q}%`,
          ...(matchedDocumentTypes.length ? { matchedDocumentTypes } : {}),
          ...(matchedActiveStates.length
            ? { matchedActiveStates: matchedActiveStates.map((value) => value === "true") }
            : {}),
        },
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const [rows, total] = await qb
      .orderBy("s.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async setActive(supplierId: string, isActive: boolean, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: supplierId }, { isActive });
  }
}
