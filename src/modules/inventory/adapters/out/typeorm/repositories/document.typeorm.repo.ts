import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRepository } from '../../../../domain/ports/document.repository.port';
import { InventoryDocument } from '../../../../domain/entities/inventory-document';
import InventoryDocumentItem from '../../../../domain/entities/inventory-document-item';
import { DocStatus } from '../../../../domain/value-objects/doc-status';
import { InventoryDocumentEntity } from '../entities/inventory_document.entity';
import { InventoryDocumentItemEntity } from '../entities/inventory_document_item.entity';
import { TransactionContext } from '../../../../domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from '../uow/typeorm.transaction-context';

@Injectable()
export class DocumentTypeormRepository implements DocumentRepository {
  constructor(
    @InjectRepository(InventoryDocumentEntity)
    private readonly docRepo: Repository<InventoryDocumentEntity>,
    @InjectRepository(InventoryDocumentItemEntity)
    private readonly itemRepo: Repository<InventoryDocumentItemEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.docRepo.manager;
  }

  private getDocRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(InventoryDocumentEntity);
  }

  private getItemRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(InventoryDocumentItemEntity);
  }


  async createDraft(doc: InventoryDocument, tx?: TransactionContext): Promise<InventoryDocument> {
    const repo = this.getDocRepo(tx);
    const saved = await repo.save({
      docType: doc.docType,
      status: doc.status,
      serieId: doc.serieId,
      correlative: doc.correlative,
      fromWarehouseId: doc.fromWarehouseId,
      toWarehouseId: doc.toWarehouseId,
      referenceId: doc.referenceId,
      referenceType: doc.referenceType,
      note: doc.note,
      createdBy: doc.createdBy,
    });

    return new InventoryDocument(
      saved.id,
      saved.docType as any,
      saved.status as any,
      saved.serieId,
      saved.correlative,
      saved.fromWarehouseId,
      saved.toWarehouseId,
      saved.referenceId,
      saved.referenceType,
      saved.note,
      saved.createdBy,
      saved.postedBy,
      saved.postedAt,
      saved.createdAt,
    );
  }

  async findById(id: string, tx?: TransactionContext): Promise<InventoryDocument | null> {
    const repo = this.getDocRepo(tx);
    const row = await repo.findOne({ where: { id } });
    if (!row) return null;

    return new InventoryDocument(
      row.id,
      row.docType as any,
      row.status as any,
      row.serieId,
      row.correlative,          // <-- nuevo
      row.fromWarehouseId,      // <-- este estaba mal/omitido
      row.toWarehouseId,
      row.referenceId,
      row.referenceType,
      row.note,
      row.createdBy,
      row.postedBy,
      row.postedAt,
      row.createdAt,
    );

  }

  async list(
    params: {
      status?: DocStatus;
      docType?: string;
      warehouseId?: string;
      from?: Date;
      to?: Date;
    },
    tx?: TransactionContext,
  ): Promise<InventoryDocument[]> {
    const repo = this.getDocRepo(tx);
    const qb = repo.createQueryBuilder('d');

    if (params.status) {
      qb.andWhere('d.status = :status', { status: params.status });
    }
    if (params.docType) {
      qb.andWhere('d.docType = :docType', { docType: params.docType });
    }
    if (params.warehouseId) {
      qb.andWhere('(d.fromWarehouseId = :wid OR d.toWarehouseId = :wid)', { wid: params.warehouseId });
    }
    if (params.from) {
      qb.andWhere('d.createdAt >= :from', { from: params.from });
    }
    if (params.to) {
      qb.andWhere('d.createdAt <= :to', { to: params.to });
    }

    const rows = await qb.orderBy('d.createdAt', 'DESC').getMany();
    return rows.map(
      (row) =>
        new InventoryDocument(
          row.id,
          row.docType as any,
          row.status as any,
          row.serieId,
          row.correlative,
          row.fromWarehouseId,
          row.toWarehouseId,
          row.referenceId,
          row.referenceType,
          row.note,
          row.createdBy,
          row.postedBy,
          row.postedAt,
          row.createdAt,
        ),
    );
  }

  async listItems(docId: string, tx?: TransactionContext): Promise<InventoryDocumentItem[]> {
    const repo = this.getItemRepo(tx);
    const rows = await repo.find({ where: { docId } });
    return rows.map(
      (r) =>
        new InventoryDocumentItem(
          r.id,
          r.docId,
          r.variantId,
          r.quantity,
          r.fromLocationId,
          r.toLocationId,
          r.unitCost ?? null,
        ),
    );
  }

  async getByIdWithItems(
    docId: string,
    tx?: TransactionContext,
  ): Promise<{ doc: InventoryDocument; items: InventoryDocumentItem[] } | null> {
    const doc = await this.findById(docId, tx);
    if (!doc) return null;
    const items = await this.listItems(docId, tx);
    return { doc, items };
  }

  async addItem(item: InventoryDocumentItem, tx?: TransactionContext): Promise<InventoryDocumentItem> {
    const repo = this.getItemRepo(tx);
    const saved = await repo.save({
      docId: item.docId,
      variantId: item.variantId,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
      quantity: item.quantity,
      unitCost: item.unitCost ?? null,
    });

    return new InventoryDocumentItem(
      saved.id,
      saved.docId,
      saved.variantId,
      saved.quantity,
      saved.fromLocationId,
      saved.toLocationId,
      saved.unitCost ?? null,
    );
  }

  async updateItem(
    params: {
      docId: string;
      itemId: string;
      quantity?: number;
      fromLocationId?: string;
      toLocationId?: string;
      unitCost?: number | null;
    },
    tx?: TransactionContext,
  ): Promise<InventoryDocumentItem | null> {
    const repo = this.getItemRepo(tx);
    const patch: any = {};

    if (params.quantity !== undefined) patch.quantity = params.quantity;
    if (params.fromLocationId !== undefined) patch.fromLocationId = params.fromLocationId;
    if (params.toLocationId !== undefined) patch.toLocationId = params.toLocationId;
    if (params.unitCost !== undefined) patch.unitCost = params.unitCost;

    await repo.update({ id: params.itemId, docId: params.docId }, patch);

    const updated = await repo.findOne({ where: { id: params.itemId, docId: params.docId } });
    if (!updated) return null;

    return new InventoryDocumentItem(
      updated.id,
      updated.docId,
      updated.variantId,
      updated.quantity,
      updated.fromLocationId,
      updated.toLocationId,
      updated.unitCost ?? null,
    );
  }

  async removeItem(docId: string, itemId: string, tx?: TransactionContext): Promise<void> {
    const repo = this.getItemRepo(tx);
    await repo.delete({ id: itemId, docId });
  }

  async markPosted(
    params: {
      docId: string;
      postedBy?: string;
      postedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void> {
    const repo = this.getDocRepo(tx);
    await repo.update(params.docId, {
      status: DocStatus.POSTED,
      postedBy: params.postedBy,
      postedAt: params.postedAt,
    });
  }

  async markCancelled(docId: string, tx?: TransactionContext): Promise<void> {
    const repo = this.getDocRepo(tx);
    await repo.update(docId, {
      status: DocStatus.CANCELLED,
    });
  }
}
