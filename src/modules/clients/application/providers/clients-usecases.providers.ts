import { Provider } from "@nestjs/common";
import { CreateClientUsecase } from "../usecases/client/create.usecase";
import { GetClientUsecase } from "../usecases/client/get-by-id.usecase";
import { ListClientsUsecase } from "../usecases/client/list.usecase";
import { SetClientActiveUsecase } from "../usecases/client/set-active.usecase";
import { UpdateClientUsecase } from "../usecases/client/update.usecase";
import { CreateTelephoneUsecase } from "../usecases/telephone/create.usecase";
import { ListTelephonesByClientUsecase } from "../usecases/telephone/list-by-client.usecase";
import { UpdateTelephoneUsecase } from "../usecases/telephone/update.usecase";
import { SetTelephoneMainUsecase } from "../usecases/telephone/set-main.usecase";
import { DeleteClientSearchMetricUsecase } from "../usecases/client-search/delete-metric.usecase";
import { GetClientSearchStateUsecase } from "../usecases/client-search/get-state.usecase";
import { SaveClientSearchMetricUsecase } from "../usecases/client-search/save-metric.usecase";

export const clientsUsecasesProviders: Provider[] = [
  CreateClientUsecase,
  GetClientUsecase,
  ListClientsUsecase,
  UpdateClientUsecase,
  SetClientActiveUsecase,
  GetClientSearchStateUsecase,
  SaveClientSearchMetricUsecase,
  DeleteClientSearchMetricUsecase,
  CreateTelephoneUsecase,
  ListTelephonesByClientUsecase,
  UpdateTelephoneUsecase,
  SetTelephoneMainUsecase,
];
