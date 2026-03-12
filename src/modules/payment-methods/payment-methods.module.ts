import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CompaniesModule } from "src/modules/companies/companies.module";
import { SuppliersModule } from "src/modules/suppliers/suppliers.module";
import { PaymentMethodsController } from "./adapters/in/controllers/payment-method.controller";
import { CompanyMethodsController } from "./adapters/in/controllers/company-method.controller";
import { SupplierMethodsController } from "./adapters/in/controllers/supplier-method.controller";
import { PaymentMethodEntity } from "./adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyMethodEntity } from "./adapters/out/persistence/typeorm/entities/company-method.entity";
import { SupplierMethodEntity } from "./adapters/out/persistence/typeorm/entities/supplier-method.entity";
import { PaymentMethodTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/payment-method.typeorm.repo";
import { CompanyMethodTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/company-method.typeorm.repo";
import { SupplierMethodTypeormRepository } from "./adapters/out/persistence/typeorm/repositories/supplier-method.typeorm.repo";
import { CreatePaymentMethodUsecase } from "./application/usecases/payment-method/create.usecase";
import { UpdatePaymentMethodUsecase } from "./application/usecases/payment-method/update.usecase";
import { SetPaymentMethodActiveUsecase } from "./application/usecases/payment-method/set-active.usecase";
import { GetPaymentMethodByIdUsecase } from "./application/usecases/payment-method/get-by-id.usecase";
import { GetPaymentMethodsByCompanyUsecase } from "./application/usecases/payment-method/get-by-company.usecase";
import { GetPaymentMethodsBySupplierUsecase } from "./application/usecases/payment-method/get-by-supplier.usecase";
import { ListPaymentMethodsUsecase } from "./application/usecases/payment-method/list.usecase";
import { GetPaymentMethodsRecordsUsecase } from "./application/usecases/payment-method/get-records.usecase";
import { CreateCompanyMethodUsecase } from "./application/usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "./application/usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "./application/usecases/company-method/get-by-id.usecase";
import { CreateSupplierMethodUsecase } from "./application/usecases/supplier-method/create.usecase";
import { DeleteSupplierMethodUsecase } from "./application/usecases/supplier-method/delete.usecase";
import { GetSupplierMethodByIdUsecase } from "./application/usecases/supplier-method/get-by-id.usecase";
import { PAYMENT_METHOD_REPOSITORY } from "./domain/ports/payment-method.repository";
import { COMPANY_METHOD_REPOSITORY } from "./domain/ports/company-method.repository";
import { SUPPLIER_METHOD_REPOSITORY } from "./domain/ports/supplier-method.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethodEntity, CompanyMethodEntity, SupplierMethodEntity]),
    CompaniesModule,
    SuppliersModule,
  ],
  controllers: [PaymentMethodsController, CompanyMethodsController, SupplierMethodsController],
  providers: [
    CreatePaymentMethodUsecase,
    UpdatePaymentMethodUsecase,
    SetPaymentMethodActiveUsecase,
    GetPaymentMethodByIdUsecase,
    GetPaymentMethodsByCompanyUsecase,
    GetPaymentMethodsBySupplierUsecase,
    ListPaymentMethodsUsecase,
    GetPaymentMethodsRecordsUsecase,
    CreateCompanyMethodUsecase,
    DeleteCompanyMethodUsecase,
    GetCompanyMethodByIdUsecase,
    CreateSupplierMethodUsecase,
    DeleteSupplierMethodUsecase,
    GetSupplierMethodByIdUsecase,
    { provide: PAYMENT_METHOD_REPOSITORY, useClass: PaymentMethodTypeormRepository },
    { provide: COMPANY_METHOD_REPOSITORY, useClass: CompanyMethodTypeormRepository },
    { provide: SUPPLIER_METHOD_REPOSITORY, useClass: SupplierMethodTypeormRepository },
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
  ],
  exports: [PAYMENT_METHOD_REPOSITORY, COMPANY_METHOD_REPOSITORY, SUPPLIER_METHOD_REPOSITORY],
})
export class PaymentMethodsModule {}
