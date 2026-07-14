import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { LocalFileStorageService } from "src/shared/utilidades/services/local-file-storage.service";
import { SharpImageProcessorService } from "src/shared/utilidades/services/sharp-image-processor.service";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { PurchaseAttachmentEntity } from "./adapters/out/persistence/typeorm/entities/purchase-attachment.entity";
import { PurchaseAttachmentTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/purchase-attachment.typeorm.repo";
import { PurchaseAttachmentsController } from "./adapters/in/controllers/purchase-attachments.controller";
import { DeletePurchaseAttachmentUsecase } from "./application/usecases/delete-purchase-attachment.usecase";
import { ListPurchaseAttachmentsUsecase } from "./application/usecases/list-purchase-attachments.usecase";
import { UploadPurchaseAttachmentUsecase } from "./application/usecases/upload-purchase-attachment.usecase";
import { PURCHASE_ATTACHMENT_REPOSITORY } from "./domain/ports/purchase-attachment.repository";
import { PurchaseHistoryService } from "src/modules/purchases/application/services/purchase-history.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseAttachmentEntity,
      PurchaseOrderEntity,
      PaymentDocumentEntity,
      PurchaseHistoryEventEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [PurchaseAttachmentsController],
  providers: [
    UploadPurchaseAttachmentUsecase,
    ListPurchaseAttachmentsUsecase,
    DeletePurchaseAttachmentUsecase,
    PurchaseHistoryService,
    { provide: PURCHASE_ATTACHMENT_REPOSITORY, useClass: PurchaseAttachmentTypeormRepository },
    { provide: FILE_STORAGE, useClass: LocalFileStorageService },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessorService },
  ],
  exports: [UploadPurchaseAttachmentUsecase, ListPurchaseAttachmentsUsecase, PURCHASE_ATTACHMENT_REPOSITORY],
})
export class PurchaseAttachmentsModule {}

