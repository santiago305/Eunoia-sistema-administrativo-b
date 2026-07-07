import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
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
  UNIT_OF_WORK,
  UnitOfWork,
} from 'src/shared/domain/ports/unit-of-work.port';
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

type SaveSaleOrderWithClientInput = {
  saleOrderId?: string;
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
  ) {}

  async execute(input: SaveSaleOrderWithClientInput) {
    const newFilePaths: string[] = [];
    const staleFilePaths: string[] = [];
    let clientEvent: ClientUpdatedEvent | null = null;

    try {
      const result = await this.uow.runInTransaction(async (tx) => {
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
            )
          : await this.createOrder.executeInTransaction(
              {
                ...orderFields,
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
            payments: payments.map((payment) => ({
              id: payment.id,
              clientKey: payment.clientKey,
              bankAccountId: payment.bankAccountId ?? null,
              date: this.parsePaymentDate(payment.date),
              method: payment.method,
              operationNumber: payment.operationNumber ?? null,
              amount: payment.amount,
              note: payment.note ?? null,
            })),
          },
          tx,
        );

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

        return {
          ...orderResult,
          clientId: clientResult.clientId,
        };
      });

      await Promise.allSettled(
        staleFilePaths.map((path) => this.fileStorage.delete(path)),
      );
      if (clientEvent) {
        this.clientRealtime.emitClientUpdated(clientEvent);
      }
      return result;
    } catch (error) {
      await Promise.allSettled(
        newFilePaths.map((path) => this.fileStorage.delete(path)),
      );
      throw error;
    }
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
    const stored = await this.fileStorage.save({
      directory: `sale-order-attachments/${saleOrderId}`,
      buffer: file.buffer,
      extension: this.extensionFromName(file.originalname),
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
        mimeType: file.mimetype,
        sizeBytes: file.size,
        url: stored.relativePath,
        storagePath: stored.relativePath,
        uploadedByUserId: userId,
      }),
      tx,
    );
  }

  private extensionFromName(name: string): string {
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    return /^[a-z0-9]+$/.test(extension) ? extension : 'bin';
  }
}
