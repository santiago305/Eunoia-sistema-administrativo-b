import { Provider } from "@nestjs/common";
import { ubigeoUsecasesProviders } from "../application/providers/ubigeo-usecases.providers";
import { UBIGEO_REPOSITORY } from "../domain/ports/ubigeo.repository";
import { UbigeoTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/ubigeo.typeorm.repo";

export const ubigeoModuleProviders: Provider[] = [
  ...ubigeoUsecasesProviders,
  { provide: UBIGEO_REPOSITORY, useClass: UbigeoTypeormRepository },
];
