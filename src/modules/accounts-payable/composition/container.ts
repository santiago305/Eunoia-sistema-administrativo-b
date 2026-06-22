import { Provider } from "@nestjs/common";
import { CLOCK } from "src/shared/application/ports/clock.port";
import { AccountPayableTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/account-payable.typeorm.repo";
import { CreateAccountPayableUsecase } from "../application/usecases/create-account-payable.usecase";
import { ListAccountPayablesUsecase } from "../application/usecases/list-account-payables.usecase";
import { MarkOverdueAccountPayablesUsecase } from "../application/usecases/mark-overdue-account-payables.usecase";
import { RecalculateAccountPayableUsecase } from "../application/usecases/recalculate-account-payable.usecase";
import { ACCOUNT_PAYABLE_REPOSITORY } from "../domain/ports/account-payable.repository";

export const accountsPayableModuleProviders: Provider[] = [
  CreateAccountPayableUsecase,
  ListAccountPayablesUsecase,
  RecalculateAccountPayableUsecase,
  MarkOverdueAccountPayablesUsecase,
  { provide: ACCOUNT_PAYABLE_REPOSITORY, useClass: AccountPayableTypeormRepository },
  { provide: CLOCK, useValue: { now: () => new Date() } },
];

