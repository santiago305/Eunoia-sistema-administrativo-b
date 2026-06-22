import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PurchaseAttachment } from "src/modules/purchase-attachments/domain/entity/purchase-attachment";
import {
  ListPurchaseAttachmentsParams,
  PurchaseAttachmentRepository,
} from "src/modules/purchase-attachments/domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentEntity } from "../entities/purchase-attachment.entity";
import { PurchaseAttachmentMapper } from "../mappers/purchase-attachment.mapper";

@Injectable()
export class PurchaseAttachmentTypeormRepository implements PurchaseAttachmentRepository {
  constructor(
    @InjectRepository(PurchaseAttachmentEntity)
    private readonly repo: Repository<PurchaseAttachmentEntity>,
  ) {}

  private getRepo(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager.getRepository(PurchaseAttachmentEntity);
    }
    return this.repo;
  }

  async create(attachment: PurchaseAttachment, tx?: TransactionContext): Promise<PurchaseAttachment> {
    const repo = this.getRepo(tx);
    const saved = await repo.save(repo.create(PurchaseAttachmentMapper.toPersistence(attachment)));
    return PurchaseAttachmentMapper.toDomain(saved);
  }

  async findActiveById(attachmentId: string, tx?: TransactionContext): Promise<PurchaseAttachment | null> {
    const row = await this.getRepo(tx).findOne({ where: { id: attachmentId, deletedAt: IsNull() } });
    return row ? PurchaseAttachmentMapper.toDomain(row) : null;
  }

  async list(params: ListPurchaseAttachmentsParams, tx?: TransactionContext): Promise<PurchaseAttachment[]> {
    const qb = this.getRepo(tx)
      .createQueryBuilder("attachment")
      .where("attachment.deleted_at IS NULL");

    if (params.purchaseId) qb.andWhere("attachment.purchase_id = :purchaseId", { purchaseId: params.purchaseId });
    if (params.paymentId) qb.andWhere("attachment.payment_id = :paymentId", { paymentId: params.paymentId });
    if (params.receptionId) qb.andWhere("attachment.reception_id = :receptionId", { receptionId: params.receptionId });
    if (params.type) qb.andWhere("attachment.type = :type", { type: params.type });

    const rows = await qb.orderBy("attachment.created_at", "DESC").getMany();
    return rows.map(PurchaseAttachmentMapper.toDomain);
  }

  async markDeleted(attachmentId: string, deletedAt: Date, tx?: TransactionContext): Promise<void> {
    await this.getRepo(tx).update({ id: attachmentId }, { deletedAt });
  }
}

