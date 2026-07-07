import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { SaleOrderAttachment } from 'src/modules/sale-order-attachments/domain/entities/sale-order-attachment';
import {
  SaleOrderAttachmentRepository,
} from 'src/modules/sale-order-attachments/domain/ports/sale-order-attachment.repository';
import { SaleOrderAttachmentEntity } from '../entities/sale-order-attachment.entity';

@Injectable()
export class SaleOrderAttachmentTypeormRepository
  implements SaleOrderAttachmentRepository
{
  constructor(
    @InjectRepository(SaleOrderAttachmentEntity)
    private readonly repo: Repository<SaleOrderAttachmentEntity>,
  ) {}

  private getManager(tx?: TransactionContext): EntityManager {
    return tx && (tx as TypeormTransactionContext).manager
      ? (tx as TypeormTransactionContext).manager
      : this.repo.manager;
  }

  private toDomain(row: SaleOrderAttachmentEntity): SaleOrderAttachment {
    return SaleOrderAttachment.create({
      id: row.id,
      saleOrderId: row.saleOrderId,
      saleOrderPaymentId: row.saleOrderPaymentId ?? null,
      type: row.type,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes),
      url: row.url,
      storagePath: row.storagePath,
      uploadedByUserId: row.uploadedByUserId ?? null,
      note: row.note ?? null,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
    });
  }

  async create(
    attachment: SaleOrderAttachment,
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment> {
    const saved = await this.getManager(tx)
      .getRepository(SaleOrderAttachmentEntity)
      .save({
        id: attachment.id,
        saleOrderId: attachment.saleOrderId,
        saleOrderPaymentId: attachment.saleOrderPaymentId,
        type: attachment.type,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        url: attachment.url,
        storagePath: attachment.storagePath,
        uploadedByUserId: attachment.uploadedByUserId,
        note: attachment.note,
        deletedAt: attachment.deletedAt,
      });
    return this.toDomain(saved);
  }

  async findActiveById(
    attachmentId: string,
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment | null> {
    const row = await this.getManager(tx)
      .getRepository(SaleOrderAttachmentEntity)
      .findOne({ where: { id: attachmentId, deletedAt: IsNull() } });
    return row ? this.toDomain(row) : null;
  }

  async list(
    params: Parameters<SaleOrderAttachmentRepository['list']>[0],
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment[]> {
    const rows = await this.getManager(tx)
      .getRepository(SaleOrderAttachmentEntity)
      .find({
        where: {
          deletedAt: IsNull(),
          ...(params.saleOrderId
            ? { saleOrderId: params.saleOrderId }
            : {}),
          ...(params.saleOrderPaymentId
            ? { saleOrderPaymentId: params.saleOrderPaymentId }
            : {}),
          ...(params.type ? { type: params.type } : {}),
        },
        order: { createdAt: 'DESC' },
      });
    return rows.map((row) => this.toDomain(row));
  }

  async markDeleted(
    attachmentId: string,
    deletedAt: Date,
    tx?: TransactionContext,
  ): Promise<void> {
    await this.getManager(tx)
      .getRepository(SaleOrderAttachmentEntity)
      .update({ id: attachmentId }, { deletedAt });
  }
}
