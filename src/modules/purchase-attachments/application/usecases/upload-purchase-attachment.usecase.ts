import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR, ImageProcessor } from "src/shared/application/ports/image-processor.port";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";
import { prepareImageForStorage } from "src/shared/utilidades/utils/prepare-image-for-storage";
import { PurchaseAttachment } from "../../domain/entity/purchase-attachment";
import {
  PURCHASE_ATTACHMENT_REPOSITORY,
  PurchaseAttachmentRepository,
} from "../../domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";
import { PurchaseAttachmentOutput } from "../dtos/purchase-attachment.output";
import { PurchaseAttachmentOutputMapper } from "../mappers/purchase-attachment-output.mapper";

const fiscalAttachmentTypes = new Set<PurchaseAttachmentType>([
  PurchaseAttachmentType.FISCAL_DOCUMENT,
  PurchaseAttachmentType.INVOICE,
  PurchaseAttachmentType.RECEIPT,
]);

const isImageOrPdf = (mimeType?: string) =>
  mimeType === "application/pdf" || Boolean(mimeType?.startsWith("image/"));

@Injectable()
export class UploadPurchaseAttachmentUsecase {
  constructor(
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: PurchaseAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Optional()
    private readonly history?: PurchaseHistoryService,
  ) {}

  async execute(
    input: {
      purchaseId: string;
      type: PurchaseAttachmentType;
      file: Express.Multer.File;
      paymentId?: string | null;
      receptionId?: string | null;
      fiscalDocumentType?: VoucherDocType | null;
      note?: string | null;
    },
    userId?: string,
  ): Promise<PurchaseAttachmentOutput> {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException("Debes enviar un archivo.");
    }

    const purchase = await this.entityManager.getRepository(PurchaseOrderEntity).findOne({
      where: { id: input.purchaseId },
      select: ["id", "documentType"],
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

    const isFiscalDocument = fiscalAttachmentTypes.has(input.type);
    const fiscalDocumentType = input.fiscalDocumentType ?? purchase.documentType ?? null;
    if (input.type === PurchaseAttachmentType.FISCAL_DOCUMENT) {
      if (!fiscalDocumentType) {
        throw new BadRequestException("Selecciona el tipo de documento fiscal.");
      }
      if (!isImageOrPdf(input.file.mimetype)) {
        throw new BadRequestException("El comprobante fiscal debe ser una imagen o PDF.");
      }
    }

    if (isFiscalDocument) {
      const existingFiscalDocuments = await this.attachmentRepo.list({ purchaseId: input.purchaseId });
      if (existingFiscalDocuments.some((attachment) => fiscalAttachmentTypes.has(attachment.type))) {
        throw new BadRequestException("Esta compra ya tiene un comprobante fiscal registrado.");
      }
    }

    const preparedFile = await prepareImageForStorage(input.file, this.imageProcessor, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 80,
      maxInputBytes: 15 * 1024 * 1024,
      maxInputPixels: 20_000_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });

    const saved = await this.fileStorage.save({
      area: "public",
      directory: `purchase-attachments/${input.purchaseId}`,
      buffer: preparedFile.buffer,
      extension: preparedFile.extension,
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
        mimeType: preparedFile.mimeType,
        sizeBytes: preparedFile.sizeBytes,
        url: saved.relativePath,
        storagePath: saved.relativePath,
        note: input.note ?? null,
        uploadedByUserId: userId ?? null,
        fiscalDocumentType: isFiscalDocument ? fiscalDocumentType : null,
      }),
    );

    await this.history?.record({
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
        fiscalDocumentType: attachment.fiscalDocumentType ?? null,
      },
    });

    return PurchaseAttachmentOutputMapper.toOutput(attachment);
  }
}

