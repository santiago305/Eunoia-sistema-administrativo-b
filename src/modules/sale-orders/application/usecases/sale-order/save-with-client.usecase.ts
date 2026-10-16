import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  CLIENT_REALTIME,
  ClientRealtime,
  ClientUpdatedEvent,
} from 'src/modules/clients/integration/client/ports/client-realtime.port';
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
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { prepareImageForStorage } from 'src/shared/utilidades/utils/prepare-image-for-storage';
import {
  SALE_ORDER_ATTACHMENT_REPOSITORY,
  SaleOrderAttachmentRepository,
} from 'src/modules/sale-order-attachments/domain/ports/sale-order-attachment.repository';
import { SaleOrderAttachment } from 'src/modules/sale-order-attachments/domain/entities/sale-order-attachment';
import { SaleOrderAttachmentType } from 'src/modules/sale-order-attachments/domain/value-objects/sale-order-attachment-type';
import { HttpSaveSaleOrderWithClientDto } from '../../../adapters/in/dtos/http-save-sale-order-with-client.dto';
import { SaleOrderClientCommandService } from '../../services/sale-order-client-command.service';
import { SaleOrderPaymentReconcilerService } from '../../services/sale-order-payment-reconciler.service';
import { CreateSaleOrderUsecase } from './create.usecase';
import { UpdateSaleOrderUsecase } from './update.usecase';
import { SaleOrderCommandAuthorizationService } from '../../services/sale-order-command-authorization.service';
import { SaleOrderPaymentWorkflowReconciliationService } from '../../services/sale-order-payment-workflow-reconciliation.service';
import { SaleOrderStockCorrectionService } from '../../services/sale-order-stock-correction.service';

type SaveSaleOrderWithClientInput = {
  saleOrderId?: string;
  idempotencyKey?: string;
  data: HttpSaveSaleOrderWithClientDto;
  shippingPhoto?: Express.Multer.File;
  paymentPhotoByClientKey: Map<string, Express.Multer.File>;
  userId: string;
};

@Injectable()
export class SaveSaleOrderWithClientUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    private readonly clientCommands: SaleOrderClientCommandService,
    private readonly createOrder: CreateSaleOrderUsecase,
    private readonly updateOrder: UpdateSaleOrderUsecase,
    private readonly paymentReconciler: SaleOrderPaymentReconcilerService,
    @Inject(SALE_ORDER_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: SaleOrderAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @Inject(CLIENT_REALTIME)
    private readonly clientRealtime: ClientRealtime,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Optional()
    private readonly commandAuthorization?: SaleOrderCommandAuthorizationService,
    @Optional()
    private readonly paymentWorkflowReconciliation?: SaleOrderPaymentWorkflowReconciliationService,
    @Optional()
    private readonly stockCorrection?: SaleOrderStockCorrectionService,
  ) {}

  async execute(input: SaveSaleOrderWithClientInput) {
    if (!input.saleOrderId && !input.data.workflowId?.trim()) {
      throw new BadRequestException('El tipo de pedido es requerido');
    }
    if (input.idempotencyKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
      throw new BadRequestException('Envía una clave de idempotencia UUID válida.');
    }

    await this.commandAuthorization?.authorizeWithClient(
      input.userId,
      input.data as any,
      input.saleOrderId ? 'update' : 'create',
    );
    const newFilePaths: string[] = [];
    const staleFilePaths: string[] = [];
    let clientEvent: ClientUpdatedEvent | null = null;

    try {
      const transactionResult = await this.uow.runInTransaction(async (tx) => {
        const manager = (tx as TypeormTransactionContext).manager;
        const scopeKey = `sale-order-with-client:${input.userId}:${input.saleOrderId ?? 'create'}`;
        const requestHash = this.createRequestHash(input);
        if (input.idempotencyKey) {
          if (!manager) {
            throw new BadRequestException('El guardado idempotente requiere una transacción de base de datos.');
          }
          const inserted = await manager.query(
            `INSERT INTO financial_idempotency_records (scope_key, idempotency_key, request_hash, status)
             VALUES ($1, $2::uuid, $3, 'IN_PROGRESS')
             ON CONFLICT (scope_key, idempotency_key) DO NOTHING RETURNING id`,
            [scopeKey, input.idempotencyKey, requestHash],
          );
          if (!inserted.length) {
            const [prior] = await manager.query(
              `SELECT request_hash, status, response_body FROM financial_idempotency_records
               WHERE scope_key = $1 AND idempotency_key = $2::uuid FOR UPDATE`,
              [scopeKey, input.idempotencyKey],
            );
            if (!prior || prior.request_hash !== requestHash) {
              throw new ConflictException({
                code: 'IDEMPOTENCY_KEY_REUSED',
                message: 'La clave de guardado ya se usó con otros datos. Restaura la solicitud original o vuelve a abrir el pedido.',
              });
            }
            if (prior.status === 'COMPLETED' && prior.response_body) {
              return { value: prior.response_body, replayed: true };
            }
            throw new ConflictException({
              code: 'OPERATION_IN_PROGRESS',
              message: 'El guardado del pedido sigue en curso; vuelve a consultar el pedido antes de intentarlo otra vez.',
            });
          }
        }

        const clientResult = await this.clientCommands.execute(
          input.data.client,
          tx,
        );
        clientEvent = clientResult.event;

        const {
          client: _client,
          payments = [],
          removedAttachmentIds = [],
          ...orderFields
        } = input.data;
        void _client;

        const orderResult = input.saleOrderId
          ? await this.updateOrder.executeInTransaction(
              {
                ...orderFields,
                saleOrderId: input.saleOrderId,
                warehouseId: orderFields.warehouseId!,
                clientId: clientResult.clientId,
                payments: undefined,
              },
              tx,
              {
                deferPaymentWorkflowReconciliation: true,
                executedBy: input.userId,
              },
            )
          : await this.createOrder.executeInTransaction(
              {
                ...orderFields,
                companyId: orderFields.companyId ?? null,
                workflowId: orderFields.workflowId!,
                clientId: clientResult.clientId,
                payments: undefined,
              },
              input.userId,
              tx,
            );

        const activeAttachments = await this.attachmentRepo.list(
          { saleOrderId: orderResult.orderId },
          tx,
        );
        const paymentResult = await this.paymentReconciler.reconcile(
          {
            saleOrderId: orderResult.orderId,
            executedBy: input.userId,
            payments: payments.map((payment) => ({
              id: payment.id,
              version: payment.version,
              clientKey: payment.clientKey,
              bankAccountId:
                payment.companyPaymentAccountId ?? payment.bankAccountId ?? null,
              companyPaymentAccountId:
                payment.companyPaymentAccountId ?? payment.bankAccountId ?? null,
              paymentMethodId: payment.paymentMethodId ?? null,
              date: this.parsePaymentDate(payment.date),
              method: payment.method,
              operationNumber: payment.operationNumber ?? null,
              amount: payment.amount,
              note: payment.note ?? null,
            })),
          },
          tx,
        );

        const paymentWorkflowResult =
          input.saleOrderId &&
          this.paymentWorkflowReconciliation &&
          !(
            'workflowChanged' in orderResult &&
            orderResult.workflowChanged === true
          )
            ? await this.paymentWorkflowReconciliation.reconcile(
                {
                  saleOrderId: orderResult.orderId,
                  executedBy: input.userId,
                  source: 'sale-order-with-client-save',
                  previousTotal:
                    'previousTotal' in orderResult
                      ? Number(orderResult.previousTotal)
                      : undefined,
                  ...('deliveryDateChanged' in orderResult &&
                  orderResult.deliveryDateChanged === true
                    ? {
                        previousDeliveryDate:
                          'previousDeliveryDate' in orderResult
                            ? (orderResult.previousDeliveryDate as
                                | string
                                | null)
                            : null,
                        currentDeliveryDate:
                          'deliveryDate' in orderResult
                            ? (orderResult.deliveryDate as string | null)
                            : null,
                      }
                    : {}),
                },
                tx,
              )
            : null;

        if (
          'stockCompositionReplaced' in orderResult &&
          orderResult.stockCompositionReplaced === true &&
          !(
            'workflowChanged' in orderResult &&
            orderResult.workflowChanged === true
          ) &&
          'previousStockStatus' in orderResult &&
          orderResult.previousStockStatus === 'CONSUMED' &&
          paymentWorkflowResult?.stateChanged !== true
        ) {
          if (!this.stockCorrection) {
            throw new BadRequestException(
              'No se pudo completar la corrección segura del inventario',
            );
          }
          await this.stockCorrection.consumeCorrectedSaleOrder(
            orderResult.orderId,
            tx,
          );
        }

        await this.reconcileAttachments(
          {
            saleOrderId: orderResult.orderId,
            removedAttachmentIds,
            retiredPaymentIds: paymentResult.retiredPaymentIds,
            paymentIdByClientKey: paymentResult.paymentIdByClientKey,
            shippingPhoto: input.shippingPhoto,
            paymentPhotoByClientKey: input.paymentPhotoByClientKey,
            userId: input.userId,
            activeAttachments,
          },
          tx,
          newFilePaths,
          staleFilePaths,
        );

        const value = {
          ...orderResult,
          currentStateId:
            paymentWorkflowResult?.currentState?.id ??
            orderResult.currentStateId,
          clientId: clientResult.clientId,
        };
        if (input.idempotencyKey) {
          await manager.query(
            `UPDATE financial_idempotency_records SET status = 'COMPLETED', response_status = 200,
               response_body = $3::jsonb, completed_at = now()
             WHERE scope_key = $1 AND idempotency_key = $2::uuid AND status = 'IN_PROGRESS'`,
            [scopeKey, input.idempotencyKey, JSON.stringify(value)],
          );
        }
        return { value, replayed: false };
      });

      if (!transactionResult.replayed) {
        await Promise.allSettled(
          staleFilePaths.map((path) => this.fileStorage.delete(path)),
        );
        if (clientEvent) {
          this.clientRealtime.emitClientUpdated(clientEvent);
        }
        return transactionResult.value;
      }
      return { ...transactionResult.value, __idempotentReplay: true };
    } catch (error) {
      await Promise.allSettled(
        newFilePaths.map((path) => this.fileStorage.delete(path)),
      );
      throw error;
    }
  }

  private createRequestHash(input: SaveSaleOrderWithClientInput): string {
    const fingerprintFile = (file?: Express.Multer.File) => file
      ? {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          sha256: createHash('sha256').update(file.buffer).digest('hex'),
        }
      : null;
    const paymentPhotos = [...input.paymentPhotoByClientKey.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([clientKey, file]) => [clientKey, fingerprintFile(file)]);
    return createHash('sha256')
      .update(JSON.stringify({
        saleOrderId: input.saleOrderId ?? null,
        userId: input.userId,
        data: input.data,
        shippingPhoto: fingerprintFile(input.shippingPhoto),
        paymentPhotos,
      }))
      .digest('hex');
  }

  private parsePaymentDate(value?: string): Date {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Fecha de pago invalida');
    }
    return date;
  }

  private async reconcileAttachments(
    input: {
      saleOrderId: string;
      removedAttachmentIds: string[];
      retiredPaymentIds: string[];
      paymentIdByClientKey: Map<string, string>;
      shippingPhoto?: Express.Multer.File;
      paymentPhotoByClientKey: Map<string, Express.Multer.File>;
      userId: string;
      activeAttachments: SaleOrderAttachment[];
    },
    tx: Parameters<SaleOrderAttachmentRepository['list']>[1],
    newFilePaths: string[],
    staleFilePaths: string[],
  ): Promise<void> {
    const mustReconcile =
      input.removedAttachmentIds.length > 0 ||
      input.retiredPaymentIds.length > 0 ||
      Boolean(input.shippingPhoto) ||
      input.paymentPhotoByClientKey.size > 0;
    if (!mustReconcile) return;

    const active = input.activeAttachments;
    const activeById = new Map(
      active
        .filter((attachment) => attachment.id)
        .map((attachment) => [attachment.id!, attachment]),
    );
    const retiredIds = new Set<string>();

    for (const attachmentId of input.removedAttachmentIds) {
      if (!activeById.has(attachmentId)) {
        throw new BadRequestException(
          `El adjunto ${attachmentId} no pertenece al pedido`,
        );
      }
      retiredIds.add(attachmentId);
    }

    const retiredPaymentIds = new Set(input.retiredPaymentIds);
    for (const attachment of active) {
      if (
        attachment.id &&
        attachment.saleOrderPaymentId &&
        retiredPaymentIds.has(attachment.saleOrderPaymentId)
      ) {
        retiredIds.add(attachment.id);
      }
    }

    if (input.shippingPhoto) {
      for (const attachment of active) {
        if (
          attachment.id &&
          attachment.type === SaleOrderAttachmentType.SHIPPING_PHOTO
        ) {
          retiredIds.add(attachment.id);
        }
      }
    }

    for (const clientKey of input.paymentPhotoByClientKey.keys()) {
      const paymentId = input.paymentIdByClientKey.get(clientKey);
      if (!paymentId) {
        throw new BadRequestException(
          `No se encontro el pago asociado a ${clientKey}`,
        );
      }
      for (const attachment of active) {
        if (
          attachment.id &&
          attachment.type === SaleOrderAttachmentType.PAYMENT_PROOF &&
          attachment.saleOrderPaymentId === paymentId
        ) {
          retiredIds.add(attachment.id);
        }
      }
    }

    const deletedAt = new Date();
    for (const attachmentId of retiredIds) {
      const attachment = activeById.get(attachmentId);
      if (!attachment) continue;
      await this.attachmentRepo.markDeleted(attachmentId, deletedAt, tx);
      staleFilePaths.push(attachment.storagePath);
    }

    if (input.shippingPhoto) {
      await this.createAttachment(
        input.saleOrderId,
        null,
        SaleOrderAttachmentType.SHIPPING_PHOTO,
        input.shippingPhoto,
        input.userId,
        tx,
        newFilePaths,
      );
    }

    for (const [clientKey, file] of input.paymentPhotoByClientKey) {
      await this.createAttachment(
        input.saleOrderId,
        input.paymentIdByClientKey.get(clientKey)!,
        SaleOrderAttachmentType.PAYMENT_PROOF,
        file,
        input.userId,
        tx,
        newFilePaths,
      );
    }
  }

  private async createAttachment(
    saleOrderId: string,
    paymentId: string | null,
    type: SaleOrderAttachmentType,
    file: Express.Multer.File,
    userId: string,
    tx: Parameters<SaleOrderAttachmentRepository['create']>[1],
    newFilePaths: string[],
  ): Promise<void> {
    const preparedFile = await prepareImageForStorage(
      file,
      this.imageProcessor,
      {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 80,
        maxInputBytes: 15 * 1024 * 1024,
        maxInputPixels: 20_000_000,
        maxOutputBytes: 2 * 1024 * 1024,
      },
    );

    const stored = await this.fileStorage.save({
      area: 'public',
      directory: `sale-order-attachments/${saleOrderId}`,
      buffer: preparedFile.buffer,
      extension: preparedFile.extension,
      filenamePrefix: type.toLowerCase(),
    });
    newFilePaths.push(stored.relativePath);

    await this.attachmentRepo.create(
      SaleOrderAttachment.create({
        saleOrderId,
        saleOrderPaymentId: paymentId,
        type,
        filename: stored.filename,
        originalName: file.originalname,
        mimeType: preparedFile.mimeType,
        sizeBytes: preparedFile.sizeBytes,
        url: stored.relativePath,
        storagePath: stored.relativePath,
        uploadedByUserId: userId,
      }),
      tx,
    );
  }
}
