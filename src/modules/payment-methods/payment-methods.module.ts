import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { PaymentMethodsController } from "./adapters/in/controllers/payment-method.controller";
import { CompanyMethodsController } from "./adapters/in/controllers/company-method.controller";
import { PaymentMethodEntity } from "./adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyMethodEntity } from "./adapters/out/persistence/typeorm/entities/company-method.entity";
import { PAYMENT_METHOD_REPOSITORY } from "./domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY } from "./domain/ports/company-method.repository";
import { paymentMethodsModuleProviders } from "./composition/container";
import { AccessControlModule } from "src/modules/access-control/infrastructure/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethodEntity, CompanyMethodEntity]),
    CompaniesModule,
    AccessControlModule,
  ],
  controllers: [PaymentMethodsController, CompanyMethodsController],
  providers: [...paymentMethodsModuleProviders],
  exports: [PAYMENT_METHOD_REPOSITORY, COMPANY_METHOD_REPOSITORY],
})
export class PaymentMethodsModule {}
