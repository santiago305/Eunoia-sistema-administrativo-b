import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseAttachment } from "../../domain/entity/purchase-attachment";
import {
  PURCHASE_ATTACHMENT_REPOSITORY,
  PurchaseAttachmentRepository,
} from "../../domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";
import { PurchaseAttachmentOutput } from "../dtos/purchase-attachment.output";
import { PurchaseAttachmentOutputMapper } from "../mappers/purchase-attachment-output.mapper";

const extensionFromName = (name: string) => {
  const raw = name.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]+$/.test(raw) ? raw : "bin";
};

@Injectable()
export class UploadPurchaseAttachmentUsecase {
  constructor(
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: PurchaseAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async execute(
    input: {
      purchaseId: string;
      type: PurchaseAttachmentType;
      file: Express.Multer.File;
      paymentId?: string | null;
      receptionId?: string | null;
      note?: string | null;
    },
    userId?: string,
  ): Promise<PurchaseAttachmentOutput> {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException("Debes enviar un archivo.");
    }

    const purchase = await this.entityManager.getRepository(PurchaseOrderEntity).findOne({
      where: { id: input.purchaseId },
      select: ["id"],
    });
    if (!purchase) {
      throw new NotFoundException("Compra no encontrada.");
    }

    if (input.paymentId) {
      const payment = await this.entityManager.getRepository(PaymentDocumentEntity).findOne({
        where: { id: input.paymentId },
        select: ["id", "poId"],
      });
      if (!payment) {
        throw new NotFoundException("Pago no encontrado.");
      }
      if (payment.poId && payment.poId !== input.purchaseId) {
        throw new BadRequestException("El pago no pertenece a la compra indicada.");
      }
    }

    const saved = await this.fileStorage.save({
      directory: `purchase-attachments/${input.purchaseId}`,
      buffer: input.file.buffer,
      extension: extensionFromName(input.file.originalname),
      filenamePrefix: `${input.type.toLowerCase()}-${input.purchaseId.slice(0, 8)}`,
    });

    const attachment = await this.attachmentRepo.create(
      PurchaseAttachment.create({
        purchaseId: input.purchaseId,
        paymentId: input.paymentId ?? null,
        receptionId: input.receptionId ?? null,
        type: input.type,
        filename: saved.filename,
        originalName: input.file.originalname,
        mimeType: input.file.mimetype,
        sizeBytes: input.file.size,
        url: saved.relativePath,
        storagePath: saved.relativePath,
        note: input.note ?? null,
        uploadedByUserId: userId ?? null,
      }),
    );

    await this.entityManager.getRepository(PurchaseHistoryEventEntity).save({
      purchaseId: input.purchaseId,
      eventType: "PURCHASE_ATTACHMENT_UPLOADED",
      description: "Se subió un documento a la compra.",
      performedByUserId: userId ?? null,
      metadata: {
        attachmentId: attachment.attachmentId,
        type: attachment.type,
        originalName: attachment.originalName,
        paymentId: attachment.paymentId ?? null,
        receptionId: attachment.receptionId ?? null,
      },
    });

    return PurchaseAttachmentOutputMapper.toOutput(attachment);
  }
}

