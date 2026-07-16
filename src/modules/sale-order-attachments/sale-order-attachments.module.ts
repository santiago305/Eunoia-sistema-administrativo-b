import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleOrderEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity';
import { SalePaymentEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity';
import { IMAGE_PROCESSOR } from 'src/shared/application/ports/image-processor.port';
import { UNIT_OF_WORK } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormUnitOfWork } from 'src/shared/infrastructure/typeorm/typeorm.unit-of-work';
import { SharpImageProcessorService } from 'src/shared/utilidades/services/sharp-image-processor.service';
import { SaleOrderAttachmentsController } from './adapters/in/controllers/sale-order-attachments.controller';
import { SaleOrderAttachmentEntity } from './adapters/out/persistence/typeorm/entities/sale-order-attachment.entity';
import { SaleOrderAttachmentTypeormRepository } from './adapters/out/persistence/typeorm/repositories/sale-order-attachment.typeorm.repo';
import { DeleteSaleOrderAttachmentUsecase } from './application/usecases/delete-sale-order-attachment.usecase';
import { ListSaleOrderAttachmentsUsecase } from './application/usecases/list-sale-order-attachments.usecase';
import { UploadSaleOrderAttachmentUsecase } from './application/usecases/upload-sale-order-attachment.usecase';
import { SALE_ORDER_ATTACHMENT_REPOSITORY } from './domain/ports/sale-order-attachment.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrderAttachmentEntity,
      SaleOrderEntity,
      SalePaymentEntity,
    ]),
  ],
  controllers: [SaleOrderAttachmentsController],
  providers: [
    UploadSaleOrderAttachmentUsecase,
    ListSaleOrderAttachmentsUsecase,
    DeleteSaleOrderAttachmentUsecase,
    {
      provide: SALE_ORDER_ATTACHMENT_REPOSITORY,
      useClass: SaleOrderAttachmentTypeormRepository,
    },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessorService },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [
    SALE_ORDER_ATTACHMENT_REPOSITORY,
    UploadSaleOrderAttachmentUsecase,
    ListSaleOrderAttachmentsUsecase,
  ],
})
export class SaleOrderAttachmentsModule {}
