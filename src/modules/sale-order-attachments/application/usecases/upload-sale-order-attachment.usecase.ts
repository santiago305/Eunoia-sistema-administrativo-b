import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
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
import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type EvidenceUploadOperationStatus = 'PREPARING' | 'STAGED' | 'PROMOTED' | 'COMPLETED' | 'FAILED' | 'QUARANTINED';
type EvidenceUploadOperation = {
  id: string;
  status: EvidenceUploadOperationStatus;
  source_content_sha256: string;
  prepared_content_sha256: string | null;
  staging_key: string | null;
  promoted_key: string | null;
  quarantine_key: string | null;
  lease_until: Date | string | null;
};

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
      storageArea?: 'public' | 'private';
      idempotencyKey?: string;
      onPersisted?: (input: {
        tx: TransactionContext;
        created: SaleOrderAttachment;
        previous: SaleOrderAttachment[];
      }) => Promise<void>;
    },
    userId?: string,
  ): Promise<SaleOrderAttachmentOutput> {
    this.validateFile(input.file);

    const type = input.type as SaleOrderAttachmentType;
    let contentSha256: string | undefined;
    const saleOrder = await this.entityManager
      .getRepository(SaleOrderEntity)
      .findOne({ where: { id: input.saleOrderId }, select: ['id', 'isActive'] });
    if (!saleOrder) throw new NotFoundException('Pedido no encontrado');
    if (!saleOrder.isActive) throw new BadRequestException('Los pedidos eliminados son de solo lectura');

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

    if (input.idempotencyKey) {
      if (
        !input.saleOrderPaymentId ||
        !userId ||
        (type !== SaleOrderAttachmentType.PAYMENT_PROOF &&
          type !== SaleOrderAttachmentType.SALE_PAYMENT_PROOF)
      ) {
        throw new BadRequestException(
          'La idempotencia de evidencia requiere un pago y un usuario autenticado',
        );
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
        throw new BadRequestException('Envía una clave de idempotencia UUID válida.');
      }
      contentSha256 = createHash('sha256').update(input.file.buffer).digest('hex');
      const priorUpload = await this.attachmentRepo.findByUploadIdempotencyKey(
        input.saleOrderPaymentId,
        userId,
        input.idempotencyKey,
      );
      if (priorUpload) {
        if (priorUpload.contentSha256 !== contentSha256) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'La clave de idempotencia ya se usó con otro archivo.',
          });
        }
        return {
          ...SaleOrderAttachmentOutputMapper.toOutput(priorUpload),
          idempotentReplay: true,
        };
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

    const preservePreviousFiles =
      type === SaleOrderAttachmentType.PAYMENT_PROOF ||
      type === SaleOrderAttachmentType.SALE_PAYMENT_PROOF;
    let uploadOperation: EvidenceUploadOperation | null = null;
    if (preservePreviousFiles && input.idempotencyKey && userId && input.saleOrderPaymentId) {
      uploadOperation = await this.acquireEvidenceUploadOperation({
        saleOrderPaymentId: input.saleOrderPaymentId,
        saleOrderId: input.saleOrderId,
        userId,
        idempotencyKey: input.idempotencyKey,
        sourceContentSha256: contentSha256!,
        preparedContentSha256: createHash('sha256').update(preparedFile.buffer).digest('hex'),
        originalName: input.file.originalname,
        mimeType: preparedFile.mimeType,
        sizeBytes: preparedFile.sizeBytes,
      });
      if (uploadOperation.status === 'COMPLETED') {
        const completedAttachment = await this.attachmentRepo.findByUploadIdempotencyKey(
          input.saleOrderPaymentId,
          userId,
          input.idempotencyKey,
        );
        if (completedAttachment) {
          return {
            ...SaleOrderAttachmentOutputMapper.toOutput(completedAttachment),
            idempotentReplay: true,
          };
        }
        throw new ConflictException('La operación de evidencia se completó, pero falta su revisión asociada. Requiere conciliación.');
      }
      if (uploadOperation.status === 'QUARANTINED') {
        throw new ConflictException({
          code: 'PAYMENT_EVIDENCE_UPLOAD_QUARANTINED',
          message: 'La carga quedó en cuarentena y requiere revisión. Usa una nueva clave después de resolverla.',
        });
      }
    }
    let savedFile: Awaited<ReturnType<FileStorage['save']>> | null = null;
    if (!preservePreviousFiles) {
      savedFile = await this.fileStorage.save({
        area: input.storageArea ?? 'public',
        directory: `sale-order-attachments/${input.saleOrderId}`,
        buffer: preparedFile.buffer,
        extension: preparedFile.extension,
        filenamePrefix: type.toLowerCase(),
      });
    } else {
      try {
        savedFile = await this.stageAndPromoteEvidence({
          saleOrderId: input.saleOrderId,
          type,
          preparedFile,
          operation: uploadOperation,
        });
      } catch (error) {
        if (uploadOperation) await this.releaseEvidenceUploadOperation(uploadOperation.id);
        throw error;
      }
    }
    if (!savedFile) throw new Error('PAYMENT_EVIDENCE_PROMOTION_FAILED');

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
        const attachment = await this.attachmentRepo.create(
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
            uploadIdempotencyKey: input.idempotencyKey ?? null,
            contentSha256: contentSha256 ?? null,
          }),
          tx,
        );
        if (uploadOperation) {
          const txManager = (tx as TypeormTransactionContext).manager;
          await txManager.query(
            `UPDATE payment_evidence_upload_operations
             SET status = 'COMPLETED', attachment_id = $2, lease_until = NULL,
                 completed_at = now(), updated_at = now(), last_error = NULL
             WHERE id = $1`,
            [uploadOperation.id, attachment.id],
          );
        }
        await input.onPersisted?.({ tx, created: attachment, previous });
        return attachment;
      });
    } catch (error) {
      if (uploadOperation) {
        await this.releaseEvidenceUploadOperation(uploadOperation.id);
      } else {
        await this.fileStorage.delete(savedFile.relativePath);
      }
      if (
        input.idempotencyKey &&
        input.saleOrderPaymentId &&
        userId &&
        ((error as { driverError?: { code?: string }; code?: string })?.driverError?.code === '23505' ||
          (error as { code?: string })?.code === '23505')
      ) {
        const priorUpload = await this.attachmentRepo.findByUploadIdempotencyKey(
          input.saleOrderPaymentId,
          userId,
          input.idempotencyKey,
        );
        if (priorUpload) {
          if (priorUpload.contentSha256 !== contentSha256) {
            if (uploadOperation) await this.fileStorage.delete(savedFile.relativePath).catch(() => undefined);
            throw new ConflictException({
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'La clave de idempotencia ya se usó con otro archivo.',
            });
          }
          if (uploadOperation) {
            await this.fileStorage.delete(savedFile.relativePath).catch(() => undefined);
            await this.entityManager.query(
              `UPDATE payment_evidence_upload_operations
               SET status = 'COMPLETED', attachment_id = $2, staging_key = NULL, promoted_key = NULL,
                   lease_until = NULL, completed_at = now(), updated_at = now(), last_error = NULL
               WHERE id = $1`,
              [uploadOperation.id, priorUpload.id],
            );
          }
          return {
            ...SaleOrderAttachmentOutputMapper.toOutput(priorUpload),
            idempotentReplay: true,
          };
        }
      }
      throw error;
    }

    // Payment evidence is financial history. Keep the previous binary after
    // marking its attachment row inactive so a failed replacement or later
    // audit never destroys the only copy of an earlier proof. Other attachment
    // types retain their existing replace-and-delete behavior.
    if (!preservePreviousFiles) {
      for (const attachment of previous) {
        await this.fileStorage.delete(attachment.storagePath);
      }
    }

    return SaleOrderAttachmentOutputMapper.toOutput(created);
  }

  private async acquireEvidenceUploadOperation(input: {
    saleOrderPaymentId: string;
    saleOrderId: string;
    userId: string;
    idempotencyKey: string;
    sourceContentSha256: string;
    preparedContentSha256: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<EvidenceUploadOperation> {
    const insertedResult = await this.entityManager.query<EvidenceUploadOperation[]>(
      `INSERT INTO payment_evidence_upload_operations
        (sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, lease_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PREPARING', now() + interval '5 minutes')
       ON CONFLICT (sale_order_payment_id, uploaded_by_user_id, idempotency_key) DO NOTHING
       RETURNING id, status, source_content_sha256, prepared_content_sha256,
                 staging_key, promoted_key, quarantine_key, lease_until`,
      [input.saleOrderPaymentId, input.saleOrderId, input.userId, input.idempotencyKey,
        input.sourceContentSha256, input.preparedContentSha256, input.originalName,
        input.mimeType, input.sizeBytes],
    );
    const inserted = this.normalizeEvidenceUploadOperationRows(insertedResult);
    if (inserted[0]) return inserted[0];

    const existingResult = await this.entityManager.query<EvidenceUploadOperation[]>(
      `SELECT id, status, source_content_sha256, prepared_content_sha256,
              staging_key, promoted_key, quarantine_key, lease_until
       FROM payment_evidence_upload_operations
       WHERE sale_order_payment_id = $1 AND uploaded_by_user_id = $2 AND idempotency_key = $3`,
      [input.saleOrderPaymentId, input.userId, input.idempotencyKey],
    );
    const existingRows = this.normalizeEvidenceUploadOperationRows(existingResult);
    const existing = existingRows[0];
    if (!existing) throw new ConflictException('No se pudo recuperar el estado de la carga de evidencia. Reintenta.');
    if (existing.source_content_sha256 !== input.sourceContentSha256) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'La clave de idempotencia ya se usó con otro archivo.',
      });
    }
    if (existing.prepared_content_sha256 && existing.prepared_content_sha256 !== input.preparedContentSha256) {
      throw new ConflictException({
        code: 'PAYMENT_EVIDENCE_PREPARATION_MISMATCH',
        message: 'La imagen no coincide con el archivo preparado anteriormente. Usa una nueva carga.',
      });
    }
    if (existing.status === 'COMPLETED' || existing.status === 'QUARANTINED') return existing;
    const leaseUntil = existing.lease_until ? new Date(existing.lease_until).getTime() : 0;
    if (leaseUntil > Date.now()) {
      throw new ConflictException({
        code: 'PAYMENT_EVIDENCE_UPLOAD_IN_PROGRESS',
        message: 'La carga de evidencia sigue en proceso. Espera un momento y vuelve a intentar con el mismo archivo.',
      });
    }

    const claimedResult = await this.entityManager.query<EvidenceUploadOperation[]>(
      `UPDATE payment_evidence_upload_operations
       SET status = CASE
             WHEN status = 'FAILED' AND promoted_key IS NOT NULL THEN 'PROMOTED'
             WHEN status = 'FAILED' AND staging_key IS NOT NULL THEN 'STAGED'
             WHEN status = 'FAILED' THEN 'PREPARING'
             ELSE status
           END,
           prepared_content_sha256 = COALESCE(prepared_content_sha256, $2),
           lease_until = now() + interval '5 minutes', attempts = attempts + 1,
           updated_at = now(), last_error = NULL
       WHERE id = $1 AND (lease_until IS NULL OR lease_until <= now())
       RETURNING id, status, source_content_sha256, prepared_content_sha256,
                 staging_key, promoted_key, quarantine_key, lease_until`,
      [existing.id, input.preparedContentSha256],
    );
    const claimed = this.normalizeEvidenceUploadOperationRows(claimedResult);
    if (!claimed[0]) {
      throw new ConflictException({
        code: 'PAYMENT_EVIDENCE_UPLOAD_IN_PROGRESS',
        message: 'La carga de evidencia fue tomada por otro proceso. Vuelve a intentar con el mismo archivo.',
      });
    }
    return claimed[0];
  }

  private normalizeEvidenceUploadOperationRows(
    result: EvidenceUploadOperation[] | [EvidenceUploadOperation[]],
  ): EvidenceUploadOperation[] {
    // TypeORM's Postgres raw-query shape is normally rows[], while some adapter
    // versions wrap RETURNING rows once. Normalize both without treating a
    // single row array as an operation object.
    return Array.isArray(result?.[0])
      ? result[0] as EvidenceUploadOperation[]
      : result as EvidenceUploadOperation[];
  }

  private async stageAndPromoteEvidence(input: {
    saleOrderId: string;
    type: SaleOrderAttachmentType;
    preparedFile: Awaited<ReturnType<typeof prepareImageForStorage>>;
    operation: EvidenceUploadOperation | null;
  }): Promise<Awaited<ReturnType<FileStorage['save']>>> {
    const { preparedFile, operation } = input;
    const preparedHash = createHash('sha256').update(preparedFile.buffer).digest('hex');
    if (operation?.promoted_key && await this.fileStorage.exists(operation.promoted_key)) {
      const promotedBytes = await this.fileStorage.read(operation.promoted_key);
      if (this.matchesPreparedEvidence(promotedBytes, preparedFile.sizeBytes, preparedHash)) {
        const promotedFile = this.fileStorage.resolve(operation.promoted_key);
        await this.updateEvidenceUploadOperation(operation, 'PROMOTED', operation.staging_key, operation.promoted_key);
        return promotedFile;
      }
      await this.quarantineEvidenceOperationFile(operation.promoted_key, operation, 'PAYMENT_EVIDENCE_PROMOTION_INTEGRITY_FAILED');
      throw new BadRequestException({
        code: 'PAYMENT_EVIDENCE_PROMOTION_INTEGRITY_FAILED',
        message: 'La evidencia promovida no coincide con la verificación. Se aisló para revisión.',
      });
    }

    let stagedFile = operation?.staging_key && await this.fileStorage.exists(operation.staging_key)
      ? this.fileStorage.resolve(operation.staging_key)
      : null;
    if (!stagedFile) {
      if (operation?.staging_key || operation?.promoted_key) {
        await this.updateEvidenceUploadOperation(operation, 'PREPARING', null, null, 'RECOVERY_FILE_MISSING');
      }
      stagedFile = await this.fileStorage.save({
        area: 'staging',
        directory: `sale-order-attachments/${input.saleOrderId}`,
        buffer: preparedFile.buffer,
        extension: preparedFile.extension,
        filenamePrefix: input.type.toLowerCase(),
      });
      const targetKey = `private/sale-order-attachments/${input.saleOrderId}/${stagedFile.filename}`;
      if (operation) {
        await this.updateEvidenceUploadOperation(operation, 'STAGED', stagedFile.key, targetKey);
      }
    }

    const stagedBytes = await this.fileStorage.read(stagedFile.key);
    if (!this.matchesPreparedEvidence(stagedBytes, preparedFile.sizeBytes, preparedHash)) {
      if (operation) await this.quarantineEvidenceOperationFile(stagedFile.key, operation, 'PAYMENT_EVIDENCE_STAGING_INTEGRITY_FAILED');
      else await this.fileStorage.delete(stagedFile.key).catch(() => undefined);
      throw new BadRequestException({
        code: 'PAYMENT_EVIDENCE_STAGING_INTEGRITY_FAILED',
        message: 'La evidencia temporal no coincide con la verificación. Se aisló para revisión.',
      });
    }

    let promotedFile: Awaited<ReturnType<FileStorage['save']>> | null = null;
    const targetKey = operation?.promoted_key ?? `private/sale-order-attachments/${input.saleOrderId}/${stagedFile.filename}`;
    if (await this.fileStorage.exists(targetKey)) {
      const existingPromoted = await this.fileStorage.read(targetKey);
      if (this.matchesPreparedEvidence(existingPromoted, preparedFile.sizeBytes, preparedHash)) {
        promotedFile = this.fileStorage.resolve(targetKey);
      } else if (operation) {
        await this.quarantineEvidenceOperationFile(targetKey, operation, 'PAYMENT_EVIDENCE_PROMOTION_INTEGRITY_FAILED');
      }
    }
    if (!promotedFile) {
      promotedFile = this.fileStorage.move
        ? await this.fileStorage.move(stagedFile.key, targetKey)
        : null;
      if (!promotedFile) {
        promotedFile = await this.fileStorage.save({
          area: 'private',
          directory: `sale-order-attachments/${input.saleOrderId}`,
          filename: stagedFile.filename,
          extension: preparedFile.extension,
          buffer: stagedBytes,
        });
      }
    }
    const promotedBytes = await this.fileStorage.read(promotedFile.key);
    if (!this.matchesPreparedEvidence(promotedBytes, preparedFile.sizeBytes, preparedHash)) {
      if (operation) await this.quarantineEvidenceOperationFile(promotedFile.key, operation, 'PAYMENT_EVIDENCE_PROMOTION_INTEGRITY_FAILED');
      else await this.fileStorage.delete(promotedFile.key).catch(() => undefined);
      throw new BadRequestException({
        code: 'PAYMENT_EVIDENCE_PROMOTION_INTEGRITY_FAILED',
        message: 'La evidencia guardada no coincide con la verificación. Se aisló para revisión.',
      });
    }
    if (operation) {
      await this.updateEvidenceUploadOperation(operation, 'PROMOTED', null, promotedFile.key);
    }
    await this.fileStorage.delete(stagedFile.key).catch(() => undefined);
    return promotedFile;
  }

  private matchesPreparedEvidence(content: Buffer, expectedSize: number, expectedHash: string): boolean {
    return content.length === expectedSize && createHash('sha256').update(content).digest('hex') === expectedHash;
  }

  private async updateEvidenceUploadOperation(
    operation: EvidenceUploadOperation | null,
    status: EvidenceUploadOperationStatus,
    stagingKey: string | null,
    promotedKey: string | null,
    errorCode: string | null = null,
  ) {
    if (!operation) return;
    await this.entityManager.query(
      `UPDATE payment_evidence_upload_operations
       SET status = $2::varchar, staging_key = $3, promoted_key = $4, quarantine_key = $5,
           lease_until = CASE WHEN $2::varchar IN ('COMPLETED', 'FAILED', 'QUARANTINED') THEN NULL ELSE now() + interval '5 minutes' END,
           last_error = $6, updated_at = now()
       WHERE id = $1`,
      [operation.id, status, stagingKey, promotedKey, operation.quarantine_key, errorCode],
    );
    operation.status = status;
    operation.staging_key = stagingKey;
    operation.promoted_key = promotedKey;
    if (status === 'FAILED' || status === 'QUARANTINED' || status === 'COMPLETED') operation.lease_until = null;
  }

  private async quarantineEvidenceOperationFile(
    key: string,
    operation: EvidenceUploadOperation | null,
    reason: string,
  ) {
    const file = this.fileStorage.resolve(key);
    const quarantineDirectory = `payment-evidence/${operation?.id ?? randomUUID()}`;
    const quarantineKey = `quarantine/${quarantineDirectory}/${file.filename}`;
    let quarantined = this.fileStorage.move ? await this.fileStorage.move(key, quarantineKey) : null;
    if (!quarantined) {
      const bytes = await this.fileStorage.read(key);
      quarantined = await this.fileStorage.save({
        area: 'quarantine', directory: quarantineDirectory,
        filename: file.filename, extension: file.filename.split('.').pop() ?? 'bin', buffer: bytes,
      });
      await this.fileStorage.delete(key);
    }
    if (operation) {
      await this.entityManager.query(
        `UPDATE payment_evidence_upload_operations
         SET status = 'QUARANTINED', staging_key = NULL, promoted_key = NULL,
             quarantine_key = $2, lease_until = NULL, attempts = attempts + 1,
             last_error = $3, updated_at = now()
         WHERE id = $1`,
        [operation.id, quarantined.key, reason],
      );
      operation.status = 'QUARANTINED';
      operation.staging_key = null;
      operation.promoted_key = null;
      operation.quarantine_key = quarantined.key;
      operation.lease_until = null;
    }
    return quarantined.key;
  }

  private async releaseEvidenceUploadOperation(operationId: string) {
    await this.entityManager.query(
      `UPDATE payment_evidence_upload_operations
       SET lease_until = NULL, attempts = attempts + 1,
           last_error = 'UPLOAD_RETRY_REQUIRED', updated_at = now()
       WHERE id = $1 AND status <> 'COMPLETED'`,
      [operationId],
    ).catch(() => undefined);
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
