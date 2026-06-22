import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";
import { PaymentDocumentEntity } from "src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity";
import { PAYMENT_DOCUMENT_REPOSITORY } from "src/modules/payments/domain/ports/payment-document.repository";
import { PaymentDocumentTypeormRepository } from "src/modules/payments/adapters/out/persistence/typeorm/repositories/payment-document.typeorm.repo";
import { AccountsPayableController } from "./adapters/in/controllers/accounts-payable.controller";
import { AccountPayableEntity } from "./adapters/out/persistence/typeorm/entities/account-payable.entity";
import { accountsPayableModuleProviders } from "./composition/container";
import { ACCOUNT_PAYABLE_REPOSITORY } from "./domain/ports/account-payable.repository";
import { CreateAccountPayableUsecase } from "./application/usecases/create-account-payable.usecase";
import { RecalculateAccountPayableUsecase } from "./application/usecases/recalculate-account-payable.usecase";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountPayableEntity, PaymentDocumentEntity]),
    AccessControlModule,
  ],
  controllers: [AccountsPayableController],
  providers: [
    ...accountsPayableModuleProviders,
    { provide: PAYMENT_DOCUMENT_REPOSITORY, useClass: PaymentDocumentTypeormRepository },
  ],
  exports: [ACCOUNT_PAYABLE_REPOSITORY, CreateAccountPayableUsecase, RecalculateAccountPayableUsecase],
})
export class AccountsPayableModule {}

