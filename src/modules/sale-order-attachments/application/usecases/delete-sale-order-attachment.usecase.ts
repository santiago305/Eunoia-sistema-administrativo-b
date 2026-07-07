import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
} from '../../domain/ports/sale-order-attachment.repository';

@Injectable()
export class DeleteSaleOrderAttachmentUsecase {
  constructor(
    @Inject(SALE_ORDER_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: SaleOrderAttachmentRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
  ) {}

  async execute(attachmentId: string): Promise<void> {
    const attachment = await this.attachmentRepo.findActiveById(attachmentId);
    if (!attachment) throw new NotFoundException('Adjunto no encontrado');

    await this.uow.runInTransaction((tx) =>
      this.attachmentRepo.markDeleted(attachmentId, new Date(), tx),
    );
    await this.fileStorage.delete(attachment.storagePath);
  }
}
