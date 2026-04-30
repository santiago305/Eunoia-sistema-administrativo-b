import { Provider } from "@nestjs/common";
import { ProductionFilterOptionsTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/production-filter-options.typeorm.repo";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { ProductionOrderTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/production-order.typeorm.repo";
import { PRODUCTION_FILTER_OPTIONS_REPOSITORY } from "../application/ports/production-filter-options.repository";
import { PRODUCTION_ORDER_REPOSITORY } from "../application/ports/production-order.repository";
import { productionUsecasesProviders } from "../application/providers/production-usecases.providers";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { SharpImageProcessorService } from "src/shared/utilidades/services/sharp-image-processor.service";
import { LocalFileStorageService } from "src/shared/utilidades/services/local-file-storage.service";

export const productionModuleProviders: Provider[] = [
  ...productionUsecasesProviders,
  { provide: PRODUCTION_ORDER_REPOSITORY, useClass: ProductionOrderTypeormRepository },
  { provide: PRODUCTION_FILTER_OPTIONS_REPOSITORY, useClass: ProductionFilterOptionsTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
  { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessorService },
  { provide: FILE_STORAGE, useClass: LocalFileStorageService },
];
