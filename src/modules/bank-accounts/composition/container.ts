import { Provider } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { BankAccountTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/bank-account.typeorm.repo";
import { bankAccountsUsecasesProviders } from "../application/providers/bank-accounts-usecases.providers";
import { BANK_ACCOUNT_REPOSITORY } from "../domain/ports/bank-account.repository";

export const bankAccountsModuleProviders: Provider[] = [
  ...bankAccountsUsecasesProviders,
  { provide: BANK_ACCOUNT_REPOSITORY, useClass: BankAccountTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
];

