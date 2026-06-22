import { Provider } from "@nestjs/common";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { COMPANY_PAYMENT_ACCOUNT_REPOSITORY } from "../domain/ports/company-payment-account.repository";
import { CompanyPaymentAccountTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/company-payment-account.typeorm.repo";
import { CreateCompanyPaymentAccountUsecase } from "../application/usecases/create-company-payment-account.usecase";
import { ListCompanyPaymentAccountsUsecase } from "../application/usecases/list-company-payment-accounts.usecase";
import { UpdateCompanyPaymentAccountUsecase } from "../application/usecases/update-company-payment-account.usecase";
import { SetCompanyPaymentAccountActiveUsecase } from "../application/usecases/set-company-payment-account-active.usecase";

export const companyPaymentAccountsModuleProviders: Provider[] = [
  CreateCompanyPaymentAccountUsecase,
  ListCompanyPaymentAccountsUsecase,
  UpdateCompanyPaymentAccountUsecase,
  SetCompanyPaymentAccountActiveUsecase,
  { provide: COMPANY_PAYMENT_ACCOUNT_REPOSITORY, useClass: CompanyPaymentAccountTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
];
