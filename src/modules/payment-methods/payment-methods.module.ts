import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { PaymentMethodsController } from "./adapters/in/controllers/payment-method.controller";
import { CompanyMethodsController } from "./adapters/in/controllers/company-method.controller";
import { SupplierMethodsController } from "./adapters/in/controllers/supplier-method.controller";
import { PaymentMethodEntity } from "./adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyMethodEntity } from "./adapters/out/persistence/typeorm/entities/company-method.entity";
import { SupplierMethodEntity } from "./adapters/out/persistence/typeorm/entities/supplier-method.entity";
import { PAYMENT_METHOD_REPOSITORY } from "./domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY } from "./domain/ports/company-method.repository";
import { SUPPLIER_METHOD_REPOSITORY } from "./domain/ports/supplier-method.repository";
import { paymentMethodsModuleProviders } from "./composition/container";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethodEntity, CompanyMethodEntity, SupplierMethodEntity]),
    CompaniesModule,
    SuppliersModule,
  ],
  controllers: [PaymentMethodsController, CompanyMethodsController, SupplierMethodsController],
  providers: [...paymentMethodsModuleProviders],
  exports: [PAYMENT_METHOD_REPOSITORY, COMPANY_METHOD_REPOSITORY, SUPPLIER_METHOD_REPOSITORY],
})
export class PaymentMethodsModule {}
