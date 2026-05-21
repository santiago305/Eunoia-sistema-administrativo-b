import { Provider } from "@nestjs/common";
import { CreatePackUsecase } from "../usecases/pack/create.usecase";
import { GetPackUsecase } from "../usecases/pack/get-by-id.usecase";
import { ListPacksUsecase } from "../usecases/pack/list.usecase";
import { SetPackActiveUsecase } from "../usecases/pack/set-active.usecase";

export const packsUsecasesProviders: Provider[] = [
  CreatePackUsecase,
  ListPacksUsecase,
  GetPackUsecase,
  SetPackActiveUsecase,
];

