import { Provider } from "@nestjs/common";
import { CreateCreditQuotaUsecase } from "../usecases/credit-quota/create.usecase";
import { DeleteCreditQuotaUsecase } from "../usecases/credit-quota/delete.usecase";
import { GetCreditQuotaUsecase } from "../usecases/credit-quota/get-by-id.usecase";
import { GetCreditQuotasByPoIdUsecase } from "../usecases/credit-quota/get-by-po-id.usecase";
import { ListCreditQuotasUsecase } from "../usecases/credit-quota/list.usecase";
import { CreatePaymentUsecase } from "../usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "../usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "../usecases/payment/get-by-id.usecase";
import { GetPaymentsByPoIdUsecase } from "../usecases/payment/get-by-po-id.usecase";
import { ListPaymentsUsecase } from "../usecases/payment/list.usecase";

export const paymentsUsecasesProviders: Provider[] = [
  CreatePaymentUsecase,
  DeletePaymentUsecase,
  GetPaymentUsecase,
  GetPaymentsByPoIdUsecase,
  ListPaymentsUsecase,
  CreateCreditQuotaUsecase,
  DeleteCreditQuotaUsecase,
  GetCreditQuotaUsecase,
  GetCreditQuotasByPoIdUsecase,
  ListCreditQuotasUsecase,
];
