import { Provider } from "@nestjs/common";
import { CreateCreditQuotaUsecase } from "../usecases/credit-quota/create.usecase";
import { DeleteCreditQuotaUsecase } from "../usecases/credit-quota/delete.usecase";
import { GetCreditQuotaUsecase } from "../usecases/credit-quota/get-by-id.usecase";
import { GetCreditQuotasByPoIdUsecase } from "../usecases/credit-quota/get-by-po-id.usecase";
import { ListCreditQuotasUsecase } from "../usecases/credit-quota/list.usecase";
import { CreatePaymentUsecase } from "../usecases/payment/create.usecase";
import { ApprovePaymentUsecase } from "../usecases/payment/approve.usecase";
import { DeletePaymentUsecase } from "../usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "../usecases/payment/get-by-id.usecase";
import { GetPaymentsByPoIdUsecase } from "../usecases/payment/get-by-po-id.usecase";
import { ListPaymentsUsecase } from "../usecases/payment/list.usecase";
import { RejectPaymentUsecase } from "../usecases/payment/reject.usecase";
import { ExportPaymentsExcelUsecase } from "../usecases/payment/export-excel.usecase";
import { DeletePaymentSearchMetricUsecase } from "../usecases/payment-search/delete-metric.usecase";
import { GetPaymentSearchStateUsecase } from "../usecases/payment-search/get-state.usecase";
import { SavePaymentSearchMetricUsecase } from "../usecases/payment-search/save-metric.usecase";

export const paymentsUsecasesProviders: Provider[] = [
  CreatePaymentUsecase,
  ApprovePaymentUsecase,
  RejectPaymentUsecase,
  DeletePaymentUsecase,
  GetPaymentUsecase,
  GetPaymentsByPoIdUsecase,
  ListPaymentsUsecase,
  ExportPaymentsExcelUsecase,
  GetPaymentSearchStateUsecase,
  SavePaymentSearchMetricUsecase,
  DeletePaymentSearchMetricUsecase,
  CreateCreditQuotaUsecase,
  DeleteCreditQuotaUsecase,
  GetCreditQuotaUsecase,
  GetCreditQuotasByPoIdUsecase,
  ListCreditQuotasUsecase,
];
