import { BadRequestException, Body, Controller, Delete, Get, Headers, NotFoundException, Optional, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RequireAnyPermissionGroups, RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { Inject } from "@nestjs/common";
import { IncomeFilterInput } from "../../../application/dtos/income-filter.input";
import { GetIncomeSummaryUsecase } from "../../../application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "../../../application/usecases/list-income.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "../../../application/usecases/get-income-evidence.usecase";
import { GetIncomeSearchStateUsecase } from "../../../application/usecases/income-search/get-state.usecase";
import { SaveIncomeSearchMetricUsecase } from "../../../application/usecases/income-search/save-metric.usecase";
import { DeleteIncomeSearchMetricUsecase } from "../../../application/usecases/income-search/delete-metric.usecase";
import { HttpCreateIncomeSearchMetricDto } from "../dtos/http-income-search-metric-create.dto";
import { sanitizeIncomeSearchSnapshot } from "../../../application/support/income-search.utils";
import { ManageIncomePaymentsUsecase } from "../../../application/usecases/manage-income-payments.usecase";
import { ExportIncomeExcelUsecase, type ExportIncomeInput } from "../../../application/usecases/export-income-excel.usecase";
import { FinancialOutboxPublisher } from "../../../infrastructure/financial-outbox-publisher.service";
import { IncomeDataScopeService } from "../../../application/services/income-data-scope.service";
import { IncomeResourceScopeGuard } from "../guards/income-resource-scope.guard";
import type { IncomeScopeAssignment } from "../../../application/services/income-data-scope.service";
import { IncomeEvidenceAccessUsecase } from "../../../application/usecases/income-evidence-access.usecase";
import { IncomeEvidenceRevisionsUsecase } from "../../../application/usecases/income-evidence-revisions.usecase";
import { IncomeEvidenceQuarantineUsecase } from "../../../application/usecases/income-evidence-quarantine.usecase";

/**
 * Older payment_photo rows may store an absolute API asset URL. Resolve only
 * the known local static-assets route; never fetch an arbitrary stored URL.
 */
const resolveEvidenceStoragePath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const pathname = new URL(value).pathname;
    return pathname.startsWith("/api/assets/") ? pathname : null;
  } catch {
    return null;
  }
};

const resolveEvidenceMimeType = (declared: string | null | undefined, content: Buffer): string => {
  if (declared && ["image/jpeg", "image/png", "image/webp"].includes(declared.toLowerCase())) {
    return declared.toLowerCase();
  }
  if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return "image/jpeg";
  }
  if (content.length >= 12 && content.toString("ascii", 0, 4) === "RIFF" && content.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return declared || "application/octet-stream";
};

@Controller("income")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard, IncomeResourceScopeGuard)
export class IncomeController {
  constructor(
    private readonly listIncome: ListIncomeUsecase,
    private readonly getSummary: GetIncomeSummaryUsecase,
    private readonly getEvidence: GetIncomeEvidenceUsecase,
    private readonly uploadEvidence: UploadIncomeEvidenceUsecase,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    @Optional() private readonly getSearchState?: GetIncomeSearchStateUsecase,
    @Optional() private readonly saveSearchMetric?: SaveIncomeSearchMetricUsecase,
    @Optional() private readonly deleteSearchMetric?: DeleteIncomeSearchMetricUsecase,
    @Optional() private readonly managePayments?: ManageIncomePaymentsUsecase,
    @Optional() private readonly exportIncome?: ExportIncomeExcelUsecase,
    @Optional() private readonly financialOutbox?: FinancialOutboxPublisher,
    @Optional() private readonly incomeDataScope?: IncomeDataScopeService,
    @Optional() private readonly evidenceAccessAudit?: IncomeEvidenceAccessUsecase,
    @Optional() private readonly evidenceRevisions?: IncomeEvidenceRevisionsUsecase,
    @Optional() private readonly evidenceQuarantine?: IncomeEvidenceQuarantineUsecase,
  ) {}

  @RequirePermissions("income.scope.manage")
  @Get("admin/data-scope/options")
  listIncomeScopeOptions(@CurrentUser() actor: { id: string }) {
    return this.incomeDataScope!.listAssignmentOptions(actor.id);
  }

  @RequirePermissions("income.scope.manage")
  @Get("admin/users/:userId/data-scope")
  listUserIncomeScopes(@Param("userId", ParseUUIDPipe) userId: string, @CurrentUser() actor: { id: string }) {
    return this.incomeDataScope!.listAssignments(userId, actor.id);
  }

  @RequirePermissions("income.scope.manage")
  @Patch("admin/users/:userId/data-scope")
  replaceUserIncomeScopes(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() body: { assignments?: IncomeScopeAssignment[] },
    @CurrentUser() actor: { id: string },
  ) {
    return this.incomeDataScope!.replaceAssignments(userId, actor.id, body?.assignments ?? []);
  }

  @RequirePermissions("income.audit.view")
  @Get("outbox/health")
  getFinancialOutboxHealth() {
    return this.financialOutbox!.getHealth();
  }

  @RequirePermissions("income.audit.view")
  @Get("outbox/dead-letters")
  listFinancialOutboxDeadLetters(@Query("limit") limit?: string) {
    const parsed = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new BadRequestException("El límite debe ser un entero entre 1 y 100.");
    return this.financialOutbox!.listDeadLetters(parsed);
  }

  @RequirePermissions("income.outbox.manage")
  @Post("outbox/:eventId/retry")
  retryFinancialOutboxEvent(@Param("eventId", ParseUUIDPipe) eventId: string, @CurrentUser() user: { id: string }) {
    return this.financialOutbox!.retryDeadLetter(eventId, user.id);
  }

  @RequirePermissions("income.export")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("export-excel")
  async exportIncomeExcel(@Body() body: ExportIncomeInput, @CurrentUser() user: { id: string }, @Res() response: Response) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    const file = await this.exportIncome!.execute({ ...body, scopeUserId: scope.userId ?? undefined, scopeCompanyId: scope.companyId ?? undefined, scopeSubsidiaryIds: scope.subsidiaryIds, scopeAccountIds: scope.accountIds, scopeClientIds: scope.clientIds });
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    return response.send(file.content);
  }

  @RequirePermissions("income.read")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get()
  async list(@Query() query: IncomeFilterInput, @CurrentUser() user: { id: string }) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    return this.listIncome.execute({ ...query, scopeUserId: scope.userId ?? undefined, scopeCompanyId: scope.companyId ?? undefined, scopeSubsidiaryIds: scope.subsidiaryIds, scopeAccountIds: scope.accountIds, scopeClientIds: scope.clientIds, requestedBy: user.id });
  }

  @RequirePermissions("sale_orders.payments.update_pending")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Patch(":incomeId")
  updatePending(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Body() body: { idempotencyKey: string; version: number; amount: number; date: string; paymentMethodId: string; companyPaymentAccountId: string; operationNumber?: string | null; note?: string | null },
    @CurrentUser() user: { id: string },
  ) {
    if (!Number.isInteger(body.version) || body.version < 1) throw new BadRequestException("Envía la versión actual del ingreso.");
    return this.managePayments!.updatePending({ incomeId, userId: user.id, ...body });
  }

  @RequirePermissions("sale_orders.payments.correct_posted")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/correct")
  correctPosted(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Body() body: {
      version: number; amount: number; date: string; paymentMethodId: string; companyPaymentAccountId: string;
      operationNumber?: string | null; note?: string | null; reason: string; idempotencyKey: string; confirmExcess?: boolean;
    },
    @CurrentUser() user: { id: string },
  ) {
    if (!Number.isInteger(body.version) || body.version < 1) throw new BadRequestException("Envía la versión actual del ingreso.");
    for (const id of [body.paymentMethodId, body.companyPaymentAccountId]) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "")) throw new BadRequestException("El método o la cuenta receptora no tiene un identificador válido.");
    }
    const { version, ...correction } = body;
    return this.managePayments!.correctPosted({ incomeId, userId: user.id, expectedVersion: version, ...correction });
  }

  @RequirePermissions("sale_orders.payments.transfer_pending")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/transfer-targets")
  async transferTargets(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Query("q") search: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    const visibleOrderIds = await this.incomeDataScope!.listReadableSaleOrderIdsForIncome(incomeId, scope);
    return this.managePayments!.listTransferTargets(incomeId, search ?? "", visibleOrderIds);
  }

  @RequirePermissions("sale_orders.payments.resolve_cancelled_order")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/cancellation-targets")
  async cancellationTargets(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Query("q") search: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    const visibleOrderIds = await this.incomeDataScope!.listReadableSaleOrderIdsForIncome(incomeId, scope);
    return this.managePayments!.listCancellationTargets(incomeId, user.id, search ?? "", visibleOrderIds);
  }

  @RequirePermissions("customer_refunds.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/refunds")
  listRefunds(@Param("incomeId", ParseUUIDPipe) incomeId: string, @CurrentUser() user: { id: string }) {
    return this.managePayments!.listRefunds(incomeId, user.id);
  }

  @RequirePermissions("income.reconciliation.reconcile")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("reconciliation/statement-lines")
  createBankStatementLine(
    @Body() body: { companyPaymentAccountId: string; bankReference: string; operationDate: string; amount: number; currency: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.companyPaymentAccountId ?? "")) throw new BadRequestException("Selecciona una cuenta bancaria válida.");
    return this.managePayments!.createBankStatementLine({ ...body, userId: user.id });
  }

  @RequirePermissions("income.reconciliation.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get("reconciliation/statement-lines")
  async listAvailableBankStatementLines(@Query("companyPaymentAccountId") companyPaymentAccountId: string | undefined, @CurrentUser() user: { id: string }) {
    if (companyPaymentAccountId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyPaymentAccountId)) throw new BadRequestException("La cuenta bancaria no tiene un identificador válido.");
    const scope = await this.incomeDataScope!.resolve(user.id);
    if (companyPaymentAccountId) await this.incomeDataScope!.assertCanReadAccount(companyPaymentAccountId, scope);
    return this.managePayments!.listAvailableBankStatementLines(user.id, companyPaymentAccountId, scope.userId === null && !scope.companyId ? null : scope.accountIds ?? []);
  }

  @RequirePermissions("income.reconciliation.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get("reconciliation/report")
  async bankReconciliationReport(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("companyPaymentAccountId") companyPaymentAccountId: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    if (companyPaymentAccountId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyPaymentAccountId)) {
      throw new BadRequestException("La cuenta bancaria no tiene un identificador válido.");
    }
    const scope = await this.incomeDataScope!.resolve(user.id);
    if (companyPaymentAccountId) await this.incomeDataScope!.assertCanReadAccount(companyPaymentAccountId, scope);
    return this.managePayments!.getBankReconciliationReport({ userId: user.id, from, to, companyPaymentAccountId, allowedAccountIds: scope.userId === null && !scope.companyId ? null : scope.accountIds ?? [] });
  }

  @RequirePermissions("income.reconciliation.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/reconciliation")
  async listReconciliations(@Param("incomeId", ParseUUIDPipe) incomeId: string, @CurrentUser() user: { id: string }) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    return this.managePayments!.listReconciliations(incomeId, user.id, scope.userId === null && !scope.companyId ? null : scope.accountIds ?? []);
  }

  @RequirePermissions("income.reconciliation.reconcile")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/reconciliation")
  reconcileIncome(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Body() body: { bankStatementLineId: string; amount: number; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.bankStatementLineId ?? "")) throw new BadRequestException("Selecciona una línea bancaria válida.");
    return this.managePayments!.reconcileIncome({ ...body, incomeId, userId: user.id });
  }

  @RequirePermissions("income.reconciliation.unreconcile")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/reconciliation/:allocationId/unreconcile")
  unreconcileIncome(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Param("allocationId", ParseUUIDPipe) allocationId: string,
    @Body() body: { reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.managePayments!.unreconcileIncome({ incomeId, allocationId, ...body, userId: user.id });
  }

  @RequirePermissions("customer_refunds.create")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/refunds")
  createRefund(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Body() body: { amount: number; reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.managePayments!.createRefund({ incomeId, userId: user.id, ...body });
  }

  @RequirePermissions("customer_refunds.post")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("refunds/:refundId/post")
  postRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() body: { companyPaymentAccountId: string; operationNumber: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.companyPaymentAccountId ?? "")) throw new BadRequestException("Selecciona una cuenta de salida válida.");
    return this.managePayments!.postRefund({ refundId, userId: user.id, ...body });
  }

  @RequirePermissions("customer_refunds.cancel")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("refunds/:refundId/cancel")
  cancelRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() body: { reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.managePayments!.cancelRefund({ refundId, userId: user.id, ...body });
  }

  @RequirePermissions("customer_refunds.reverse")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("refunds/:refundId/reverse")
  reverseRefund(
    @Param("refundId", ParseUUIDPipe) refundId: string,
    @Body() body: { reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.managePayments!.reverseRefund({ refundId, userId: user.id, ...body });
  }

  @RequirePermissions("customer_credits.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get("credits/:clientId")
  async getCustomerCredits(@Param("clientId", ParseUUIDPipe) clientId: string, @CurrentUser() user: { id: string }) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    const visibleIncomeIds = await this.incomeDataScope!.listReadableIncomeIdsForClient(clientId, scope);
    return this.managePayments!.getAvailableCustomerCredits(clientId, user.id, visibleIncomeIds);
  }

  @RequirePermissions("customer_credits.apply")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("credits/apply")
  async applyCustomerCredit(
    @Body() body: { clientId: string; saleOrderId: string; amount: number; reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    for (const id of [body.clientId, body.saleOrderId]) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "")) throw new BadRequestException("El cliente o el pedido no tiene un identificador válido.");
    }
    const scope = await this.incomeDataScope!.resolve(user.id);
    const visibleIncomeIds = await this.incomeDataScope!.listReadableIncomeIdsForClient(body.clientId, scope);
    return this.managePayments!.applyCustomerCredit({ ...body, userId: user.id, allowedIncomeIds: visibleIncomeIds });
  }

  @RequirePermissions("sale_orders.payments.transfer_pending")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/transfer")
  transferPending(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Body() body: { targetSaleOrderId: string; version: number; reason: string; idempotencyKey: string },
    @CurrentUser() user: { id: string },
  ) {
    if (!Number.isInteger(body.version) || body.version < 1) throw new BadRequestException("Envía la versión actual del ingreso.");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.targetSaleOrderId ?? "")) throw new BadRequestException("El pedido destino no tiene un identificador válido.");
    const { version, ...transfer } = body;
    return this.managePayments!.transferPending({ incomeId, userId: user.id, ...transfer, expectedVersion: version });
  }

  @RequirePermissions("sale_orders.payments.post")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/post/prevalidate")
  prevalidateOne(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Body() body: { version: number }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.prevalidate([incomeId], user.id, [{ id: incomeId, version: body.version }]);
  }

  @RequirePermissions("sale_orders.payments.post")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/post")
  postOne(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Body() body: { version: number; idempotencyKey: string; confirmExcess?: boolean }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.postOne({ incomeId, userId: user.id, expectedVersion: body.version, idempotencyKey: body.idempotencyKey, confirmExcess: body.confirmExcess });
  }

  @RequirePermissions("sale_orders.payments.post_bulk")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("post-batch/prevalidate")
  prevalidateBatch(@Body() body: { payments: Array<{ id: string; version: number }> }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.prevalidate(body.payments?.map((item) => item.id) ?? [], user.id, body.payments ?? []);
  }

  @RequirePermissions("sale_orders.payments.post_bulk")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post("post-batch")
  postBatch(@Body() body: { payments: Array<{ id: string; version: number }>; idempotencyKey: string; confirmExcess?: boolean }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.postBatch({ incomeIds: body.payments?.map((item) => item.id) ?? [], expectedVersions: body.payments ?? [], userId: user.id, idempotencyKey: body.idempotencyKey, confirmExcess: body.confirmExcess });
  }

  @RequirePermissions("sale_orders.payments.post_bulk")
  @Get("bulk-operations/:batchId")
  getBulkOperationResult(@Param("batchId", ParseUUIDPipe) batchId: string, @CurrentUser() user: { id: string }) {
    return this.managePayments!.getBatchResult(batchId, user.id);
  }

  @RequirePermissions("income.read")
  @RequireAnyPermissionGroups(["sale_orders.payments.post", "sale_orders.payments.post_bulk"], ["income.view_all", "income.view_own"])
  @Get("posting-operations/:operationId")
  getPostingOperationResult(@Param("operationId", ParseUUIDPipe) operationId: string, @CurrentUser() user: { id: string }) {
    return this.managePayments!.getBatchResult(operationId, user.id);
  }

  @RequirePermissions("sale_orders.payments.cancel_pending")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/cancel")
  cancelPending(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Body() body: { version: number; reason: string; idempotencyKey: string }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.cancelOrReverse({ incomeId, userId: user.id, expectedVersion: body.version, reason: body.reason, idempotencyKey: body.idempotencyKey });
  }

  @RequirePermissions("sale_orders.payments.reverse_posted")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/reverse")
  reversePosted(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Body() body: { version: number; reason: string; idempotencyKey: string }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.cancelOrReverse({ incomeId, userId: user.id, expectedVersion: body.version, reason: body.reason, idempotencyKey: body.idempotencyKey });
  }

  @RequirePermissions("sale_orders.payments.reenter_closed")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/reenter")
  reenter(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Body() body: {
    reason: string; idempotencyKey: string; amount: number; date: string; paymentMethodId: string;
    companyPaymentAccountId: string; operationNumber: string | null; note: string | null;
  }, @CurrentUser() user: { id: string }) {
    return this.managePayments!.reenter({ incomeId, userId: user.id, ...body });
  }

  @RequirePermissions("income.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState?.execute(user.id);
  }

  @RequirePermissions("income.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateIncomeSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric?.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeIncomeSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("income.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric?.execute(user.id, metricId);
  }

  @RequirePermissions("income.read")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get("summary")
  async summary(@Query() query: IncomeFilterInput, @CurrentUser() user: { id: string }) {
    const scope = await this.incomeDataScope!.resolve(user.id);
    return this.getSummary.execute({ ...query, scopeUserId: scope.userId ?? undefined, scopeCompanyId: scope.companyId ?? undefined, scopeSubsidiaryIds: scope.subsidiaryIds, scopeAccountIds: scope.accountIds, scopeClientIds: scope.clientIds });
  }

  @RequirePermissions("income.read", "payments.view_evidence")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence")
  async evidence(@Param("incomeId", ParseUUIDPipe) incomeId: string) {
    return this.getEvidence.execute(incomeId);
  }

  @RequirePermissions("income.read", "payments.view_evidence")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence/content")
  async evidenceContent(@Param("incomeId", ParseUUIDPipe) incomeId: string, @CurrentUser() user: { id: string }, @Res() response: Response) {
    const evidence = await this.getEvidence.execute(incomeId);
    const storagePath = resolveEvidenceStoragePath(evidence.url);
    if (!storagePath) throw new NotFoundException("Contenido de evidencia no disponible");
    const content = await this.fileStorage.read(storagePath);
    await this.evidenceAccessAudit?.record({
      incomeId,
      saleOrderId: evidence.saleOrderId,
      attachmentId: evidence.attachmentId ?? null,
      userId: user.id,
      inherited: Boolean(evidence.inherited),
      content,
    });
    response.setHeader("Content-Type", resolveEvidenceMimeType(evidence.mimeType, content));
    response.setHeader("Content-Length", content.byteLength);
    response.setHeader("Content-Disposition", "inline");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader("Cache-Control", "private, no-store");
    response.send(content);
  }

  @RequirePermissions("income.read", "income.audit.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence/revisions")
  async listEvidenceRevisions(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new BadRequestException("El limite debe ser un entero entre 1 y 100.");
    return this.evidenceRevisions!.list(incomeId, parsed);
  }

  @RequirePermissions("income.read", "income.audit.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence/quarantine")
  listQuarantinedEvidence(@Param("incomeId", ParseUUIDPipe) incomeId: string) {
    return this.evidenceQuarantine!.list(incomeId);
  }

  @RequirePermissions("income.read", "income.audit.view", "income.evidence.quarantine.manage")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/evidence/quarantine/:operationId/recover")
  recoverQuarantinedEvidence(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Param("operationId", ParseUUIDPipe) operationId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.evidenceQuarantine!.recover(incomeId, operationId, user.id, body?.reason ?? "");
  }

  @RequirePermissions("income.read", "income.audit.view", "payments.view_evidence")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence/revisions/:attachmentId/content")
  async evidenceRevisionContent(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: { id: string },
    @Res() response: Response,
  ) {
    const revision = await this.evidenceRevisions!.get(incomeId, attachmentId);
    const storagePath = resolveEvidenceStoragePath(revision.storagePath);
    if (!storagePath || (!storagePath.startsWith("private/sale-order-attachments/") && !storagePath.startsWith("/api/assets/"))) {
      throw new NotFoundException("Contenido privado de revision no disponible");
    }
    const content = await this.fileStorage.read(storagePath);
    await this.evidenceAccessAudit?.record({
      incomeId,
      saleOrderId: revision.saleOrderId,
      attachmentId,
      userId: user.id,
      inherited: false,
      content,
    });
    response.setHeader("Content-Type", resolveEvidenceMimeType(revision.mimeType, content));
    response.setHeader("Content-Length", content.byteLength);
    response.setHeader("Content-Disposition", "inline");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader("Cache-Control", "private, no-store");
    response.send(content);
  }

  @RequirePermissions("income.audit.view")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Get(":incomeId/evidence/access-log")
  listEvidenceAccessLog(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new BadRequestException("El límite debe ser un entero entre 1 y 100.");
    return this.evidenceAccessAudit!.list(incomeId, parsed);
  }

  @RequirePermissions("income.read", "payments.attach_evidence")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/evidence")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        return cb(new BadRequestException("Solo se permiten imagenes JPEG, PNG o WEBP"), false);
      }
      cb(null, true);
    },
  }))
  async uploadEvidenceFile(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
    @Headers("Idempotency-Key") idempotencyKey: string,
  ) {
    return this.uploadEvidence.execute(incomeId, file, user.id, idempotencyKey);
  }

  @RequirePermissions("income.read", "sale_orders.payments.correct_posted", "payments.attach_evidence")
  @RequireAnyPermissionGroups(["income.view_all", "income.view_own"])
  @Post(":incomeId/correction-evidence")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        return cb(new BadRequestException("Solo se permiten imagenes JPEG, PNG o WEBP"), false);
      }
      cb(null, true);
    },
  }))
  async uploadCorrectionEvidence(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
    @Headers("Idempotency-Key") idempotencyKey: string,
  ) {
    return this.uploadEvidence.execute(incomeId, file, user.id, idempotencyKey, true);
  }
}
