import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import {
  SaleOrderImportLoteAuditRecord,
  SaleOrderImportLoteRecord,
  SaleOrderImportLoteRepository,
  SaleOrderImportLoteWrite,
} from "src/modules/sale-orders/domain/ports/sale-order-import-lote.repository";
import { SaleOrderImportLoteEntity } from "../entities/sale-order-import-lote.entity";
import { SaleOrderImportLoteAuditEntity } from "../entities/sale-order-import-lote-audit.entity";

@Injectable()
export class SaleOrderImportLoteTypeormRepository implements SaleOrderImportLoteRepository {
  constructor(
    @InjectRepository(SaleOrderImportLoteEntity)
    private readonly repo: Repository<SaleOrderImportLoteEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  async reserveNextLote(tx: TransactionContext): Promise<number> {
    const manager = this.getManager(tx);
    await manager.query("SELECT pg_advisory_xact_lock(hashtext('sale_order_import_lotes'))");
    const rows = await manager.query(`
      SELECT lote
      FROM lotes_imports
      ORDER BY lote DESC, created_at DESC
      LIMIT 1
    `);
    return Number(rows?.[0]?.lote ?? 0) + 1;
  }

  async create(input: SaleOrderImportLoteWrite, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord> {
    const manager = this.getManager(tx);
    const saved = await manager.getRepository(SaleOrderImportLoteEntity).save({
      lote: input.lote,
      createdBy: input.createdBy,
      isActive: input.isActive ?? true,
    });
    const record = await this.findById(saved.id, tx);
    if (!record) throw new BadRequestException("Lote de importacion no encontrado");
    return record;
  }

  async findByIdForUpdate(id: string, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord | null> {
    return this.findById(id, tx, Boolean(tx));
  }

  async list(tx?: TransactionContext): Promise<SaleOrderImportLoteRecord[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SaleOrderImportLoteEntity).find({
      relations: { creator: true },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async setActive(input: { id: string; isActive: boolean }, tx?: TransactionContext): Promise<SaleOrderImportLoteRecord> {
    const manager = this.getManager(tx);
    const repo = manager.getRepository(SaleOrderImportLoteEntity);
    const row = await repo.findOne({
      where: { id: input.id },
      lock: tx ? { mode: "pessimistic_write" } : undefined,
    });
    if (!row) throw new BadRequestException("Lote de importacion no encontrado");

    await repo.update({ id: input.id }, { isActive: input.isActive });
    const updated = await this.findById(input.id, tx);
    if (!updated) throw new BadRequestException("Lote de importacion no encontrado");
    return updated;
  }

  async createAudit(input: { loteId: string; executedBy: string; actionExecution: "delete" | "restore" }, tx?: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    await manager.getRepository(SaleOrderImportLoteAuditEntity).save({
      loteId: input.loteId,
      executedBy: input.executedBy,
      actionExecution: input.actionExecution,
    });
  }

  async listAudit(loteId: string, tx?: TransactionContext): Promise<SaleOrderImportLoteAuditRecord[]> {
    const manager = this.getManager(tx);
    const rows = await manager.getRepository(SaleOrderImportLoteAuditEntity).find({
      where: { loteId },
      relations: { executor: true },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      loteId: row.loteId,
      createdAt: row.createdAt,
      executedBy: row.executedBy,
      executedByName: row.executor?.name ?? null,
      executedByEmail: row.executor?.email ?? null,
      actionExecution: row.actionExecution,
    }));
  }

  private async findById(id: string, tx?: TransactionContext, forUpdate = false): Promise<SaleOrderImportLoteRecord | null> {
    const manager = this.getManager(tx);
    const row = await manager.getRepository(SaleOrderImportLoteEntity).findOne({
      where: { id },
      relations: forUpdate ? undefined : { creator: true },
      lock: forUpdate ? { mode: "pessimistic_write" } : undefined,
    });
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: SaleOrderImportLoteEntity): SaleOrderImportLoteRecord {
    return {
      id: row.id,
      lote: Number(row.lote),
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      createdByName: row.creator?.name ?? null,
      createdByEmail: row.creator?.email ?? null,
      isActive: Boolean(row.isActive),
    };
  }
}
