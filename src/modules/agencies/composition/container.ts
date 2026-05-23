import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { AgencyTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/agency.typeorm.repo";
import { agenciesUsecasesProviders } from "../application/providers/agencies-usecases.providers";
import { AGENCY_REPOSITORY } from "../domain/ports/agency.repository";

export const agenciesModuleProviders: Provider[] = [
  ...agenciesUsecasesProviders,
  { provide: AGENCY_REPOSITORY, useClass: AgencyTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];

