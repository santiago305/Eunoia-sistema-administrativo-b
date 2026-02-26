import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryController } from '../adapters/in/controller/inventory.controller';
import { DocumentsController } from '../adapters/in/controller/documents.controller';
import { LedgerController } from '../adapters/in/controller/ledger.controller';

import { InventoryEntity } from '../adapters/out/typeorm/entities/inventory.entity';
import { InventoryDocumentEntity } from '../adapters/out/typeorm/entities/inventory_document.entity';
import { InventoryDocumentItemEntity } from '../adapters/out/typeorm/entities/inventory_document_item.entity';
import { InventoryLedgerEntity } from '../adapters/out/typeorm/entities/inventory_ledger.entity';
import { DocumentSerie } from '../adapters/out/typeorm/entities/document_serie.entity';

import { InventoryTypeormRepository } from '../adapters/out/typeorm/repositories/inventory.typeorm.repo';
import { DocumentTypeormRepository } from '../adapters/out/typeorm/repositories/document.typeorm.repo';
import { LedgerTypeormRepository } from '../adapters/out/typeorm/repositories/ledger.typeorm.repo';
import { DocumentSeriesTypeormRepository } from '../adapters/out/typeorm/repositories/document_serie.typeorm.repo';

import { TypeormUnitOfWork } from 'src/shared/infrastructure/typeorm/typeorm.unit-of-work';
import { PgInventoryLock } from '../adapters/out/typeorm/locks/pg-inventory-lock';

import { CreateDocumentUseCase } from '../application/use-cases/document-inventory/create-document.usecase';
import { AddItemUseCase } from '../application/use-cases/document-item-inventory/add-item.usecase';
import { GetAvailabilityUseCase } from '../application/use-cases/inventory/get-availability.usecase';
import { GetLedgerUseCase } from '../application/use-cases/ledger/get-ledger.usecase';
import { ListInventoryUseCase } from '../application/use-cases/inventory/list-inventory.usecase';
import { ListDocumentsUseCase } from '../application/use-cases/document-inventory/list-documents.usecase';
import { GetDocumentUseCase } from '../application/use-cases/document-inventory/get-document.usecase';
import { ListDocumentItemsUseCase } from '../application/use-cases/document-item-inventory/list-items.usecase';
import { UpdateItemUseCase } from '../application/use-cases/document-item-inventory/update-item.usecase';
import { RemoveItemUseCase } from '../application/use-cases/document-item-inventory/remove-item.usecase';
import { CancelDocumentUseCase } from '../application/use-cases/document-inventory/cancel-document.usecase';
import { DocumentSeriesController } from '../adapters/in/controller/documente-series.controller';
import { PostDocumentoOut } from '../application/use-cases/document-inventory/post-document-out.usecase';
import { PostDocumentoIn } from '../application/use-cases/document-inventory/post-document-in.usecase';
import { PostDocumentoTransfer } from '../application/use-cases/document-inventory/post-document-transfer.usecase';
import { PostDocumentoAdjustment } from '../application/use-cases/document-inventory/post-document-adjustment.usecase';
import { CreateStockItemForProduct } from '../application/use-cases/stock-item/create-for-product.usecase';
import { CreateStockItemForVariant } from '../application/use-cases/stock-item/create-for-variant.usecase';

import { CreateDocumentSerieUseCase } from '../application/use-cases/document-serie/create-document-serie.usecase';
import { GetDocumentSerieUseCase } from '../application/use-cases/document-serie/get-document-serie.usecase';
import { GetActiveDocumentSerieUseCase } from '../application/use-cases/document-serie/get-document-series.usecase';

import { InventoryRulesService } from '../domain/services/inventory-rules.service';

import { INVENTORY_REPOSITORY } from '../domain/ports/inventory.repository.port';
import { DOCUMENT_REPOSITORY } from '../domain/ports/document.repository.port';
import { LEDGER_REPOSITORY } from '../domain/ports/ledger.repository.port';
import { UNIT_OF_WORK } from 'src/shared/domain/ports/unit-of-work.port';
import { INVENTORY_LOCK } from '../domain/ports/inventory-lock.port';
import { CLOCK } from '../domain/ports/clock.port';
import { DocumentPostOutValidationService } from '../domain/services/document-post-out-validation.service';
import { SERIES_REPOSITORY, DocumentSeriesRepository } from '../domain/ports/document-series.repository.port';
import { SetDocumentSerieActive } from 'src/modules/inventory/application/use-cases/document-serie/set-active.usecase';
import { StockItemEntity } from '../adapters/out/typeorm/entities/stock-item/stock-item.entity';
import { StockItemProductEntity } from '../adapters/out/typeorm/entities/stock-item/stock-item-product.entity';
import { StockItemVariantEntity } from '../adapters/out/typeorm/entities/stock-item/stock-item-variant.entity';
import { STOCK_ITEM_REPOSITORY } from '../domain/ports/stock-item/stock-item.repository.port';
import { StockItemTypeormRepository } from '../adapters/out/typeorm/repositories/stock-item/stock-item.typeorm.repo';
import { STOCK_ITEM_PRODUCT_REPOSITORY } from '../domain/ports/stock-item/stock-item-product.repository.port';
import { StockItemProductTypeormRepository } from '../adapters/out/typeorm/repositories/stock-item/stock-item-product.typeorm';
import { STOCK_ITEM_VARIANT_REPOSITORY } from '../domain/ports/stock-item/stock-item-variant.repository.port';
import { StockItemVariantTypeormRepository } from '../adapters/out/typeorm/repositories/stock-item/stock-item-variant.typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryEntity,
      InventoryDocumentEntity,
      InventoryDocumentItemEntity,
      InventoryLedgerEntity,
      DocumentSerie,
      StockItemEntity,
      StockItemProductEntity,
      StockItemVariantEntity
    ]),
  ],
  controllers: [InventoryController, DocumentsController, LedgerController, DocumentSeriesController],
  providers: [
    {
      provide: InventoryRulesService,
      useFactory: (seriesRepo: DocumentSeriesRepository) => new InventoryRulesService(seriesRepo),
      inject: [SERIES_REPOSITORY],
    },
    CreateDocumentSerieUseCase,
    GetDocumentSerieUseCase,
    GetActiveDocumentSerieUseCase,
    CreateDocumentUseCase,
    AddItemUseCase,
    GetAvailabilityUseCase,
    PostDocumentoOut,
    PostDocumentoIn,
    PostDocumentoTransfer,
    PostDocumentoAdjustment,
    CreateStockItemForProduct,
    CreateStockItemForVariant,
    GetLedgerUseCase,
    ListInventoryUseCase,
    ListDocumentsUseCase,
    GetDocumentUseCase,
    ListDocumentItemsUseCase,
    UpdateItemUseCase,
    RemoveItemUseCase,
    CancelDocumentUseCase,
    SetDocumentSerieActive,
    DocumentPostOutValidationService,
    { provide: INVENTORY_REPOSITORY, useClass: InventoryTypeormRepository },
    { provide: DOCUMENT_REPOSITORY, useClass: DocumentTypeormRepository },
    { provide: LEDGER_REPOSITORY, useClass: LedgerTypeormRepository },
    { provide: SERIES_REPOSITORY, useClass: DocumentSeriesTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: INVENTORY_LOCK, useClass: PgInventoryLock },
    { provide: STOCK_ITEM_REPOSITORY, useClass: StockItemTypeormRepository },
    { provide: STOCK_ITEM_PRODUCT_REPOSITORY, useClass: StockItemProductTypeormRepository },
    { provide: STOCK_ITEM_VARIANT_REPOSITORY, useClass: StockItemVariantTypeormRepository },
    {
      provide: CLOCK,
      useValue: { now: () => new Date() },
    },
  ],
  // al final de @Module
  exports: [
    INVENTORY_REPOSITORY,
    DOCUMENT_REPOSITORY,
    LEDGER_REPOSITORY,
    SERIES_REPOSITORY,
    INVENTORY_LOCK,
    CLOCK,
    CreateStockItemForProduct,
    CreateStockItemForVariant,
  ],
})
export class InventoryModule {}
