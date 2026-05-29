import { Provider } from "@nestjs/common";
import { CreateBankAccountUsecase } from "../usecases/bank-account/create.usecase";
import { ListBankAccountsByCompanyUsecase } from "../usecases/bank-account/list-by-company.usecase";
import { GetBankAccountByIdUsecase } from "../usecases/bank-account/get-by-id.usecase";
import { UpdateBankAccountUsecase } from "../usecases/bank-account/update.usecase";
import { SetBankAccountActiveUsecase } from "../usecases/bank-account/set-active.usecase";

export const bankAccountsUsecasesProviders: Provider[] = [
  CreateBankAccountUsecase,
  ListBankAccountsByCompanyUsecase,
  GetBankAccountByIdUsecase,
  UpdateBankAccountUsecase,
  SetBankAccountActiveUsecase,
];

