import { Provider } from "@nestjs/common";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyMethodTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/company-method.typeorm.repo";
import { PaymentMethodTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/payment-method.typeorm.repo";
import { SupplierMethodTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/supplier-method.typeorm.repo";
import { paymentMethodUsecasesProviders } from "../application/providers/payment-method-usecases.providers";
import { COMPANY_METHOD_REPOSITORY } from "../domain/ports/company-method.repository";
import { PAYMENT_METHOD_REPOSITORY } from "../domain/ports/payment-method.repository";
import { SUPPLIER_METHOD_REPOSITORY } from "../domain/ports/supplier-method.repository";

export const paymentMethodsModuleProviders: Provider[] = [
  ...paymentMethodUsecasesProviders,
  { provide: PAYMENT_METHOD_REPOSITORY, useClass: PaymentMethodTypeormRepository },
  { provide: COMPANY_METHOD_REPOSITORY, useClass: CompanyMethodTypeormRepository },
  { provide: SUPPLIER_METHOD_REPOSITORY, useClass: SupplierMethodTypeormRepository },
  { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
];
