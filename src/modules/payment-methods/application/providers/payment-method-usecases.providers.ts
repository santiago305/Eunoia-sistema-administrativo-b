import { Provider } from "@nestjs/common";
import { CreateCompanyMethodUsecase } from "../usecases/company-method/create.usecase";
import { DeleteCompanyMethodUsecase } from "../usecases/company-method/delete.usecase";
import { GetCompanyMethodByIdUsecase } from "../usecases/company-method/get-by-id.usecase";
import { ListCompanyMethodsUsecase } from "../usecases/company-method/list.usecase";
import { UpdateCompanyMethodUsecase } from "../usecases/company-method/update.usecase";
import { CreatePaymentMethodUsecase } from "../usecases/payment-method/create.usecase";
import { GetPaymentMethodsByCompanyUsecase } from "../usecases/payment-method/get-by-company.usecase";
import { GetPaymentMethodByIdUsecase } from "../usecases/payment-method/get-by-id.usecase";
import { GetPaymentMethodsRecordsUsecase } from "../usecases/payment-method/get-records.usecase";
import { ListPaymentMethodsUsecase } from "../usecases/payment-method/list.usecase";
import { SetPaymentMethodActiveUsecase } from "../usecases/payment-method/set-active.usecase";
import { UpdatePaymentMethodUsecase } from "../usecases/payment-method/update.usecase";

export const paymentMethodUsecasesProviders: Provider[] = [
  CreatePaymentMethodUsecase,
  UpdatePaymentMethodUsecase,
  SetPaymentMethodActiveUsecase,
  GetPaymentMethodByIdUsecase,
  GetPaymentMethodsByCompanyUsecase,
  ListPaymentMethodsUsecase,
  GetPaymentMethodsRecordsUsecase,
  CreateCompanyMethodUsecase,
  ListCompanyMethodsUsecase,
  UpdateCompanyMethodUsecase,
  DeleteCompanyMethodUsecase,
  GetCompanyMethodByIdUsecase,
];
