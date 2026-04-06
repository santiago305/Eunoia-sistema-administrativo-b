import { Provider } from "@nestjs/common";
import { InventoryRulesService } from "../domain/services/inventory-rules.service";
import { DocumentPostOutValidationService } from "../domain/services/document-post-out-validation.service";
import { inventoryUsecasesProviders } from "../application/providers/inventory-usecases.providers";
import { SERIES_REPOSITORY, DocumentSeriesRepository } from "../application/ports/document-series.repository.port";
import { INVENTORY_REPOSITORY } from "../application/ports/inventory.repository.port";
import { DOCUMENT_REPOSITORY } from "../application/ports/document.repository.port";
import { LEDGER_REPOSITORY } from "../application/ports/ledger.repository.port";
import { STOCK_ITEM_REPOSITORY } from "../application/ports/stock-item.repository.port";
import { INVENTORY_LOCK } from "../application/ports/inventory-lock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK } from "../application/ports/clock.port";
import { InventoryTypeormRepository } from "../adapters/out/typeorm/repositories/inventory.typeorm.repo";
import { DocumentTypeormRepository } from "../adapters/out/typeorm/repositories/document.typeorm.repo";
import { LedgerTypeormRepository } from "../adapters/out/typeorm/repositories/ledger.typeorm.repo";
import { DocumentSeriesTypeormRepository } from "../adapters/out/typeorm/repositories/document_serie.typeorm.repo";
import { StockItemTypeormRepository } from "../adapters/out/typeorm/repositories/stock-item.typeorm.repo";
import { PgInventoryLock } from "../adapters/out/typeorm/locks/pg-inventory-lock";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";

export const inventoryModuleProviders: Provider[] = [
  ...inventoryUsecasesProviders,
  {
    provide: InventoryRulesService,
    useFactory: (seriesRepo: DocumentSeriesRepository) => new InventoryRulesService(seriesRepo),
    inject: [SERIES_REPOSITORY],
  },
  DocumentPostOutValidationService,
  { provide: INVENTORY_REPOSITORY, useClass: InventoryTypeormRepository },
  { provide: DOCUMENT_REPOSITORY, useClass: DocumentTypeormRepository },
  { provide: LEDGER_REPOSITORY, useClass: LedgerTypeormRepository },
  { provide: SERIES_REPOSITORY, useClass: DocumentSeriesTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: INVENTORY_LOCK, useClass: PgInventoryLock },
  { provide: STOCK_ITEM_REPOSITORY, useClass: StockItemTypeormRepository },
  {
    provide: CLOCK,
    useValue: { now: () => new Date() },
  },
];
