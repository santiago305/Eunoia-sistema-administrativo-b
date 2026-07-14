import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { SaleOrderEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity';
import { SalePaymentEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity';
import {
  FILE_STORAGE,
  FileStorage,
} from 'src/shared/application/ports/file-storage.port';
import {
  IMAGE_PROCESSOR,
  ImageProcessor,
} from 'src/shared/application/ports/image-processor.port';
import {
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
import { prepareImageForStorage } from 'src/shared/utilidades/utils/prepare-image-for-storage';
import { SaleOrderAttachment } from '../../domain/entities/sale-order-attachment';
import {
  SALE_ORDER_ATTACHMENT_REPOSITORY,
  SaleOrderAttachmentRepository,
} from '../../domain/ports/sale-order-attachment.repository';
import { SaleOrderAttachmentType } from '../../domain/value-objects/sale-order-attachment-type';
import { SaleOrderAttachmentOutput } from '../dtos/sale-order-attachment.output';
import { SaleOrderAttachmentOutputMapper } from '../mappers/sale-order-attachment-output.mapper';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class UploadSaleOrderAttachmentUsecase {
  constructor(
    @Inject(SALE_ORDER_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: SaleOrderAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
  ) {}

  async execute(
    input: {
      saleOrderId: string;
      saleOrderPaymentId?: string | null;
      type: SaleOrderAttachmentType | `${SaleOrderAttachmentType}`;
      file: Express.Multer.File;
      note?: string | null;
    },
    userId?: string,
  ): Promise<SaleOrderAttachmentOutput> {
    this.validateFile(input.file);

    const type = input.type as SaleOrderAttachmentType;
    const saleOrder = await this.entityManager
      .getRepository(SaleOrderEntity)
      .findOne({ where: { id: input.saleOrderId }, select: ['id'] });
    if (!saleOrder) throw new NotFoundException('Pedido no encontrado');

    if (type === SaleOrderAttachmentType.PAYMENT_PROOF) {
      if (!input.saleOrderPaymentId) {
        throw new BadRequestException(
          'La foto de pago requiere saleOrderPaymentId',
        );
      }
      const payment = await this.entityManager
        .getRepository(SalePaymentEntity)
        .findOne({
          where: { id: input.saleOrderPaymentId },
          select: ['id', 'saleOrderId'],
        });
      if (!payment) throw new NotFoundException('Pago no encontrado');
      if (payment.saleOrderId !== input.saleOrderId) {
        throw new BadRequestException(
          'El pago no pertenece al pedido indicado',
        );
      }
    }

    const preparedFile = await prepareImageForStorage(input.file, this.imageProcessor, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 80,
      maxInputBytes: MAX_IMAGE_BYTES,
      maxInputPixels: 20_000_000,
      maxOutputBytes: 2 * 1024 * 1024,
    });

    const savedFile = await this.fileStorage.save({
      directory: `sale-order-attachments/${input.saleOrderId}`,
      buffer: preparedFile.buffer,
      extension: preparedFile.extension,
      filenamePrefix: type.toLowerCase(),
    });

    let previous: SaleOrderAttachment[] = [];
    let created: SaleOrderAttachment;
    try {
      created = await this.uow.runInTransaction(async (tx) => {
        previous = await this.attachmentRepo.list(
          {
            saleOrderId: input.saleOrderId,
            saleOrderPaymentId: input.saleOrderPaymentId ?? undefined,
            type,
          },
          tx,
        );
        const deletedAt = new Date();
        for (const attachment of previous) {
          await this.attachmentRepo.markDeleted(
            attachment.id!,
            deletedAt,
            tx,
          );
        }
        return this.attachmentRepo.create(
          SaleOrderAttachment.create({
            saleOrderId: input.saleOrderId,
            saleOrderPaymentId: input.saleOrderPaymentId ?? null,
            type,
            filename: savedFile.filename,
            originalName: input.file.originalname,
            mimeType: preparedFile.mimeType,
            sizeBytes: preparedFile.sizeBytes,
            url: savedFile.relativePath,
            storagePath: savedFile.relativePath,
            uploadedByUserId: userId ?? null,
            note: input.note ?? null,
          }),
          tx,
        );
      });
    } catch (error) {
      await this.fileStorage.delete(savedFile.relativePath);
      throw error;
    }

    for (const attachment of previous) {
      await this.fileStorage.delete(attachment.storagePath);
    }

    return SaleOrderAttachmentOutputMapper.toOutput(created);
  }

  private validateFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes enviar una imagen');
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imagenes JPEG, PNG o WEBP',
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('La imagen supera el limite de 15 MB');
    }
  }
}
