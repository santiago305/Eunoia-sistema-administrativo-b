import { Provider } from "@nestjs/common";
import { CreatePackUsecase } from "../usecases/pack/create.usecase";
import { GetPackUsecase } from "../usecases/pack/get-by-id.usecase";
import { ListPacksUsecase } from "../usecases/pack/list.usecase";
import { SetPackActiveUsecase } from "../usecases/pack/set-active.usecase";
import { UpdatePackUsecase } from "../usecases/pack/update.usecase";
import { GetPackSearchStateUsecase } from "../usecases/pack-search/get-state.usecase";
import { SavePackSearchMetricUsecase } from "../usecases/pack-search/save-metric.usecase";
import { DeletePackSearchMetricUsecase } from "../usecases/pack-search/delete-metric.usecase";

export const packsUsecasesProviders: Provider[] = [
  CreatePackUsecase,
  ListPacksUsecase,
  GetPackUsecase,
  SetPackActiveUsecase,
  UpdatePackUsecase,
  GetPackSearchStateUsecase,
  SavePackSearchMetricUsecase,
  DeletePackSearchMetricUsecase,
];
