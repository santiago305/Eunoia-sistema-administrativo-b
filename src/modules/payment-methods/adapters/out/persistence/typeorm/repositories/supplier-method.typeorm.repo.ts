import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "src/modules/payment-methods/domain/entity/payment-method";
import { SupplierMethod } from "src/modules/payment-methods/domain/entity/supplier-method";
import {
  SupplierMethodRepository,
  SupplierMethodWithMethod,
} from "src/modules/payment-methods/domain/ports/supplier-method.repository";
import { SupplierMethodEntity } from "../entities/supplier-method.entity";

@Injectable()
export class SupplierMethodTypeormRepository implements SupplierMethodRepository {
  constructor(
    @InjectRepository(SupplierMethodEntity)
    private readonly repo: Repository<SupplierMethodEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(SupplierMethodEntity);
  }

  private toDomain(row: SupplierMethodEntity): SupplierMethod {
    return SupplierMethod.create({
      supplierMethodId: row.id,
      supplierId: row.supplierId,
      methodId: row.methodId,
      number: row.number ?? undefined,
    });
  }

  private toMethodDomain(row: SupplierMethodEntity): PaymentMethod {
    return PaymentMethod.create({
      methodId: row.method.id,
      name: row.method.name,
      isActive: row.method.isActive,
    });
  }

  private toDetail(row: SupplierMethodEntity): SupplierMethodWithMethod {
    return {
      relation: this.toDomain(row),
      method: this.toMethodDomain(row),
    };
  }

  async findById(supplierMethodId: string, tx?: TransactionContext): Promise<SupplierMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: supplierMethodId } });
    return row ? this.toDomain(row) : null;
  }

  async findDetailById(
    supplierMethodId: string,
    tx?: TransactionContext,
  ): Promise<SupplierMethodWithMethod | null> {
    const row = await this.getRepo(tx)
      .createQueryBuilder("sm")
      .leftJoinAndSelect("sm.method", "method")
      .where("sm.id = :supplierMethodId", { supplierMethodId })
      .getOne();

    return row ? this.toDetail(row) : null;
  }

  async listBySupplier(supplierId: string, tx?: TransactionContext): Promise<SupplierMethodWithMethod[]> {
    const rows = await this.getRepo(tx)
      .createQueryBuilder("sm")
      .leftJoinAndSelect("sm.method", "method")
      .where("sm.supplierId = :supplierId", { supplierId })
      .orderBy("method.name", "ASC")
      .addOrderBy("sm.number", "ASC", "NULLS FIRST")
      .addOrderBy("sm.id", "ASC")
      .getMany();

    return rows.map((row) => this.toDetail(row));
  }

  async findDuplicate(
    supplierId: string,
    methodId: string,
    number: string | null,
    tx?: TransactionContext,
  ): Promise<SupplierMethod | null> {
    const normalizedNumber = number?.trim() ?? "";
    const row = await this.getRepo(tx)
      .createQueryBuilder("sm")
      .where("sm.supplierId = :supplierId", { supplierId })
      .andWhere("sm.methodId = :methodId", { methodId })
      .andWhere("COALESCE(BTRIM(sm.number), '') = :normalizedNumber", { normalizedNumber })
      .getOne();

    return row ? this.toDomain(row) : null;
  }

  async create(method: SupplierMethod, tx?: TransactionContext): Promise<SupplierMethod> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      id: method.supplierMethodId,
      supplierId: method.supplierId,
      methodId: method.methodId,
      number: method.number ?? null,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async update(
    params: {
      supplierMethodId: string;
      methodId?: string;
      number?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<SupplierMethod | null> {
    const repo = this.getRepo(tx);
    const patch: Partial<SupplierMethodEntity> = {};

    if (params.methodId !== undefined) patch.methodId = params.methodId;
    if (Object.prototype.hasOwnProperty.call(params, "number")) patch.number = params.number ?? null;

    await repo.update({ id: params.supplierMethodId }, patch);
    const updated = await repo.findOne({ where: { id: params.supplierMethodId } });
    return updated ? this.toDomain(updated) : null;
  }

  async delete(supplierMethodId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getRepo(tx);
    const result = await repo.delete({ id: supplierMethodId });
    return (result.affected ?? 0) > 0;
  }
}
