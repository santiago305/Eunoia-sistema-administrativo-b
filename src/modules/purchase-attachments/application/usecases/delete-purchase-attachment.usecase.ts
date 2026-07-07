import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import {
  PURCHASE_ATTACHMENT_REPOSITORY,
  PurchaseAttachmentRepository,
} from "../../domain/ports/purchase-attachment.repository";

@Injectable()
export class DeletePurchaseAttachmentUsecase {
  constructor(
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: PurchaseAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @Optional()
    private readonly history?: PurchaseHistoryService,
  ) {}

  async execute(attachmentId: string, userId?: string): Promise<void> {
    const attachment = await this.attachmentRepo.findActiveById(attachmentId);
    if (!attachment) {
      throw new NotFoundException("Adjunto no encontrado.");
    }

    const deleted = await this.fileStorage.delete(attachment.storagePath);
    if (!deleted) {
      throw new BadRequestException("No se encontró el archivo físico del adjunto.");
    }

    await this.attachmentRepo.markDeleted(attachmentId, new Date());
    await this.history?.record({
      purchaseId: attachment.purchaseId,
      eventType: "PURCHASE_ATTACHMENT_DELETED",
      description: "Se eliminó un documento de la compra.",
      performedByUserId: userId ?? null,
      metadata: {
        attachmentId: attachment.attachmentId,
        type: attachment.type,
        originalName: attachment.originalName,
        paymentId: attachment.paymentId ?? null,
        receptionId: attachment.receptionId ?? null,
      },
    });
  }
}

