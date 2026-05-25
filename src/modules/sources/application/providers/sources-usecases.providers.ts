import { Provider } from "@nestjs/common";
import { CreateSourceUsecase } from "../usecases/source/create.usecase";
import { GetSourceUsecase } from "../usecases/source/get-by-id.usecase";
import { ListSourcesUsecase } from "../usecases/source/list.usecase";
import { SetSourceActiveUsecase } from "../usecases/source/set-active.usecase";
import { UpdateSourceUsecase } from "../usecases/source/update.usecase";
import { DeleteSourceSearchMetricUsecase } from "../usecases/source-search/delete-metric.usecase";
import { GetSourceSearchStateUsecase } from "../usecases/source-search/get-state.usecase";
import { SaveSourceSearchMetricUsecase } from "../usecases/source-search/save-metric.usecase";

export const sourcesUsecasesProviders: Provider[] = [
  CreateSourceUsecase,
  GetSourceUsecase,
  ListSourcesUsecase,
  UpdateSourceUsecase,
  SetSourceActiveUsecase,
  GetSourceSearchStateUsecase,
  SaveSourceSearchMetricUsecase,
  DeleteSourceSearchMetricUsecase,
];

