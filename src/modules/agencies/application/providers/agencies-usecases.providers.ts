import { Provider } from "@nestjs/common";
import { CreateAgencyUsecase } from "../usecases/agency/create.usecase";
import { GetAgencyUsecase } from "../usecases/agency/get-by-id.usecase";
import { GetAgencyWithSubsidiariesUsecase } from "../usecases/agency/get-with-subsidiaries.usecase";
import { ListAgenciesUsecase } from "../usecases/agency/list.usecase";
import { ListSubsidiariesUsecase } from "../usecases/agency/list-subsidiaries.usecase";
import { SetAgencyActiveUsecase } from "../usecases/agency/set-active.usecase";
import { UpdateAgencyUsecase } from "../usecases/agency/update.usecase";
import { DeleteAgencySearchMetricUsecase } from "../usecases/agency-search/delete-metric.usecase";
import { GetAgencySearchStateUsecase } from "../usecases/agency-search/get-state.usecase";
import { SaveAgencySearchMetricUsecase } from "../usecases/agency-search/save-metric.usecase";

export const agenciesUsecasesProviders: Provider[] = [
  CreateAgencyUsecase,
  GetAgencyUsecase,
  GetAgencyWithSubsidiariesUsecase,
  ListAgenciesUsecase,
  ListSubsidiariesUsecase,
  UpdateAgencyUsecase,
  SetAgencyActiveUsecase,
  GetAgencySearchStateUsecase,
  SaveAgencySearchMetricUsecase,
  DeleteAgencySearchMetricUsecase,
];

