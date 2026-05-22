import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { ListingSearchTypeormRepository } from "src/shared/listing-search/adapters/out/persistence/typeorm/repositories/listing-search.typeorm.repo";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import { clientsUsecasesProviders } from "../application/providers/clients-usecases.providers";
import { CLIENT_REPOSITORY } from "../domain/ports/client.repository";
import { TELEPHONE_REPOSITORY } from "../domain/ports/telephone.repository";
import { ClientTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/client.typeorm.repo";
import { TelephoneTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/telephone.typeorm.repo";

export const clientsModuleProviders: Provider[] = [
  ...clientsUsecasesProviders,
  { provide: CLIENT_REPOSITORY, useClass: ClientTypeormRepository },
  { provide: TELEPHONE_REPOSITORY, useClass: TelephoneTypeormRepository },
  { provide: LISTING_SEARCH_STORAGE, useClass: ListingSearchTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];
