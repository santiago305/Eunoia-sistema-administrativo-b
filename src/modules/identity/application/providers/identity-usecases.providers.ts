import { Provider } from "@nestjs/common";
import { LookupIdentityUsecase } from "../usecases/lookup-identity.usecase";

export const identityUsecasesProviders: Provider[] = [LookupIdentityUsecase];
