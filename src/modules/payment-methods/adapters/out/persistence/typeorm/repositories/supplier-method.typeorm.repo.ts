import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SupplierMethod } from "src/modules/payment-methods/domain/entity/supplier-method";
import { SupplierMethodRepository } from "src/modules/payment-methods/domain/ports/supplier-method.repository";
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
    return new SupplierMethod(row.supplierId, row.methodId);
  }

  async findById(supplierId: string, methodId: string, tx?: TransactionContext): Promise<SupplierMethod | null> {
    const row = await this.getRepo(tx).findOne({ where: { supplierId, methodId } });
    return row ? this.toDomain(row) : null;
  }

  async create(method: SupplierMethod, tx?: TransactionContext): Promise<SupplierMethod> {
    const repo = this.getRepo(tx);
    const row = repo.create({
      supplierId: method.supplierId,
      methodId: method.methodId,
    });
    const saved = await repo.save(row);
    return this.toDomain(saved);
  }

  async delete(supplierId: string, methodId: string, tx?: TransactionContext): Promise<boolean> {
    const repo = this.getRepo(tx);
    const result = await repo.delete({ supplierId, methodId });
    return (result.affected ?? 0) > 0;
  }
}
