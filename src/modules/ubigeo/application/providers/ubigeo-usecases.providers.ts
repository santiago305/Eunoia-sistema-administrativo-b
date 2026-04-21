import { Provider } from "@nestjs/common";
import { GetUbigeoByCodeUsecase } from "../usecases/get-ubigeo-by-code.usecase";
import { GetUbigeoCatalogUsecase } from "../usecases/get-ubigeo-catalog.usecase";
import { ListDepartmentsUsecase } from "../usecases/list-departments.usecase";
import { ListDistrictsUsecase } from "../usecases/list-districts.usecase";
import { ListProvincesUsecase } from "../usecases/list-provinces.usecase";

export const ubigeoUsecasesProviders: Provider[] = [
  GetUbigeoCatalogUsecase,
  ListDepartmentsUsecase,
  ListProvincesUsecase,
  ListDistrictsUsecase,
  GetUbigeoByCodeUsecase,
];
