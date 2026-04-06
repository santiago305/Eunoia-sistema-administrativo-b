import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from '../adapters/in/controller/inventory.controller';
import { DocumentsController } from '../adapters/in/controller/documents.controller';
import { LedgerController } from '../adapters/in/controller/ledger.controller';
import { DocumentSeriesController } from '../adapters/in/controller/documente-series.controller';
import { InventoryEntity } from '../adapters/out/typeorm/entities/inventory.entity';
import { InventoryDocumentEntity } from '../adapters/out/typeorm/entities/inventory_document.entity';
import { InventoryDocumentItemEntity } from '../adapters/out/typeorm/entities/inventory_document_item.entity';
import { InventoryLedgerEntity } from '../adapters/out/typeorm/entities/inventory_ledger.entity';
import { DocumentSerie } from '../adapters/out/typeorm/entities/document_serie.entity';
import { StockItemEntity } from '../adapters/out/typeorm/entities/stock-item.entity';
import { UsersModule } from 'src/modules/users/infrastructure/users.module';
import { WarehousesModule } from 'src/modules/warehouses/warehouses.module';
import { INVENTORY_REPOSITORY } from '../application/ports/inventory.repository.port';
import { DOCUMENT_REPOSITORY } from '../application/ports/document.repository.port';
import { LEDGER_REPOSITORY } from '../application/ports/ledger.repository.port';
import { SERIES_REPOSITORY } from '../application/ports/document-series.repository.port';
import { INVENTORY_LOCK } from '../application/ports/inventory-lock.port';
import { CLOCK } from '../application/ports/clock.port';
import { STOCK_ITEM_REPOSITORY } from '../application/ports/stock-item.repository.port';
import { CreateDocumentSerieUseCase } from '../application/use-cases/document-serie/create-document-serie.usecase';
import { CreateStockItemForProduct } from '../application/use-cases/stock-item/create-for-product.usecase';
import { CreateStockItemForVariant } from '../application/use-cases/stock-item/create-for-variant.usecase';
import { CreateDocumentUseCase } from '../application/use-cases/document-inventory/create-document.usecase';
import { AddItemUseCase } from '../application/use-cases/document-item-inventory/add-item.usecase';
import { PostDocumentoIn } from '../application/use-cases/document-inventory/post-document-in.usecase';
import { GetActiveDocumentSerieUseCase } from '../application/use-cases/document-serie/get-document-series.usecase';
import { inventoryModuleProviders } from '../composition/container';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryEntity,
      InventoryDocumentEntity,
      InventoryDocumentItemEntity,
      InventoryLedgerEntity,
      DocumentSerie,
      StockItemEntity,
    ]),
    UsersModule,
    forwardRef(() => WarehousesModule),
  ],
  controllers: [InventoryController, DocumentsController, LedgerController, DocumentSeriesController],
  providers: [...inventoryModuleProviders],
  exports: [
    INVENTORY_REPOSITORY,
    DOCUMENT_REPOSITORY,
    LEDGER_REPOSITORY,
    SERIES_REPOSITORY,
    INVENTORY_LOCK,
    CLOCK,
    STOCK_ITEM_REPOSITORY,
    CreateDocumentSerieUseCase,
    CreateStockItemForProduct,
    CreateStockItemForVariant,
    CreateDocumentUseCase,
    AddItemUseCase,
    PostDocumentoIn,
    GetActiveDocumentSerieUseCase,
  ],
})
export class InventoryModule {}
