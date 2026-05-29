import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { BankAccountsController } from "./adapters/in/controllers/bank-accounts.controller";
import { BankAccountEntity } from "./adapters/out/persistence/typeorm/entities/bank-account.entity";
import { bankAccountsModuleProviders } from "./composition/container";
import { BANK_ACCOUNT_REPOSITORY } from "./domain/ports/bank-account.repository";

@Module({
  imports: [TypeOrmModule.forFeature([BankAccountEntity]), CompaniesModule, AccessControlModule],
  controllers: [BankAccountsController],
  providers: [...bankAccountsModuleProviders],
  exports: [BANK_ACCOUNT_REPOSITORY],
})
export class BankAccountsModule {}

