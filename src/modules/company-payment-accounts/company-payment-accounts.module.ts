import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { CompanyPaymentAccountsController } from "./adapters/in/controllers/company-payment-accounts.controller";
import { CompanyPaymentAccountEntity } from "./adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { companyPaymentAccountsModuleProviders } from "./composition/container";
import { COMPANY_PAYMENT_ACCOUNT_REPOSITORY } from "./domain/ports/company-payment-account.repository";

@Module({
  imports: [TypeOrmModule.forFeature([CompanyPaymentAccountEntity]), CompaniesModule, AccessControlModule],
  controllers: [CompanyPaymentAccountsController],
  providers: [...companyPaymentAccountsModuleProviders],
  exports: [COMPANY_PAYMENT_ACCOUNT_REPOSITORY],
})
export class CompanyPaymentAccountsModule {}

