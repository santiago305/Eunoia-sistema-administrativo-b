import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { SourceTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/source.typeorm.repo";
import { sourcesUsecasesProviders } from "../application/providers/sources-usecases.providers";
import { SOURCE_REPOSITORY } from "../domain/ports/source.repository";

export const sourcesModuleProviders: Provider[] = [
  ...sourcesUsecasesProviders,
  { provide: SOURCE_REPOSITORY, useClass: SourceTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];

