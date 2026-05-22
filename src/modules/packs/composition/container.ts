import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { packsUsecasesProviders } from "../application/providers/packs-usecases.providers";
import { PACK_REPOSITORY } from "../domain/ports/pack.repository";
import { PACK_ITEM_REPOSITORY } from "../domain/ports/pack-item.repository";
import { PackTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/pack.typeorm.repo";
import { PackItemTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/pack-item.typeorm.repo";

export const packsModuleProviders: Provider[] = [
  ...packsUsecasesProviders,
  { provide: PACK_REPOSITORY, useClass: PackTypeormRepository },
  { provide: PACK_ITEM_REPOSITORY, useClass: PackItemTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
