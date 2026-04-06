import { Provider } from "@nestjs/common";
import { CreateCompanyMethodUsecase } from "../usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "../usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "../usecases/company-method/get-by-id.usecase";
import { CreatePaymentMethodUsecase } from "../usecases/payment-method/create.usecase";
import { GetPaymentMethodsByCompanyUsecase } from "../usecases/payment-method/get-by-company.usecase";
import { GetPaymentMethodByIdUsecase } from "../usecases/payment-method/get-by-id.usecase";
import { GetPaymentMethodsBySupplierUsecase } from "../usecases/payment-method/get-by-supplier.usecase";
import { GetPaymentMethodsRecordsUsecase } from "../usecases/payment-method/get-records.usecase";
import { ListPaymentMethodsUsecase } from "../usecases/payment-method/list.usecase";
import { SetPaymentMethodActiveUsecase } from "../usecases/payment-method/set-active.usecase";
import { UpdatePaymentMethodUsecase } from "../usecases/payment-method/update.usecase";
import { CreateSupplierMethodUsecase } from "../usecases/supplier-method/create.usecase";
import { DeleteSupplierMethodUsecase } from "../usecases/supplier-method/delete.usecase";
import { GetSupplierMethodByIdUsecase } from "../usecases/supplier-method/get-by-id.usecase";

export const paymentMethodUsecasesProviders: Provider[] = [
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
];
