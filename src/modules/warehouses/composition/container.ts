import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { LocationTypeormRepo } from "../adapters/out/persistence/typeorm/repositories/location.typeorm.repo";
import { WarehouseTypeormRepo } from "../adapters/out/persistence/typeorm/repositories/warehouse.typeorm.repo";
import { LOCATION_REPOSITORY } from "../application/ports/location.repository.port";
import { WAREHOUSE_REPOSITORY } from "../application/ports/warehouse.repository.port";
import { warehousesUsecasesProviders } from "../application/providers/warehouses-usecases.providers";

export const warehousesModuleProviders: Provider[] = [
  ...warehousesUsecasesProviders,
  { provide: WAREHOUSE_REPOSITORY, useClass: WarehouseTypeormRepo },
  { provide: LOCATION_REPOSITORY, useClass: LocationTypeormRepo },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];

