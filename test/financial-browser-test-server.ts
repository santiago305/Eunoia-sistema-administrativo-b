import "reflect-metadata";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { Test } from "@nestjs/testing";
import { IncomeController } from "src/modules/income/adapters/in/controllers/income.controller";
import { IncomeResourceScopeGuard } from "src/modules/income/adapters/in/guards/income-resource-scope.guard";
import { IncomeDataScopeService } from "src/modules/income/application/services/income-data-scope.service";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { ListIncomeUsecase } from "src/modules/income/application/usecases/list-income.usecase";
import { GetIncomeSummaryUsecase } from "src/modules/income/application/usecases/get-income-summary.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "src/modules/income/application/usecases/get-income-evidence.usecase";
import { IncomeEvidenceAccessUsecase } from "src/modules/income/application/usecases/income-evidence-access.usecase";
import { IncomeEvidenceRevisionsUsecase } from "src/modules/income/application/usecases/income-evidence-revisions.usecase";
import { CreatePaymentEvidenceAccessLogs20261013010000 } from "src/infrastructure/database/migrations/20261013010000-create-payment-evidence-access-logs";
import { ManageIncomePaymentsUsecase } from "src/modules/income/application/usecases/manage-income-payments.usecase";
import { CreateIncomeUserDataScopes20261012080000 } from "src/infrastructure/database/migrations/20261012080000-create-income-user-data-scopes";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { SaleOrdersController } from "src/modules/sale-orders/adapters/in/controllers/sale-orders.controller";
import { SaleOrderAutomaticWorkflowService } from "src/modules/sale-orders/application/services/sale-order-automatic-workflow.service";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SaleOrderItemEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderAttachmentEntity } from "src/modules/sale-order-attachments/adapters/out/persistence/typeorm/entities/sale-order-attachment.entity";
import { SaleOrderAttachmentTypeormRepository } from "src/modules/sale-order-attachments/adapters/out/persistence/typeorm/repositories/sale-order-attachment.typeorm.repo";
import { ListSaleOrderAttachmentsUsecase } from "src/modules/sale-order-attachments/application/usecases/list-sale-order-attachments.usecase";
import { UploadSaleOrderAttachmentUsecase } from "src/modules/sale-order-attachments/application/usecases/upload-sale-order-attachment.usecase";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { IdempotentIncomeEvidenceUpload20261013000000 } from "src/infrastructure/database/migrations/20261013000000-idempotent-income-evidence-upload";
import { CreatePaymentEvidenceUploadOperations20261013020000 } from "src/infrastructure/database/migrations/20261013020000-create-payment-evidence-upload-operations";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { SaleOrderPaymentReconcilerService } from "src/modules/sale-orders/application/services/sale-order-payment-reconciler.service";
import { SaveSaleOrderWithClientUsecase } from "src/modules/sale-orders/application/usecases/sale-order/save-with-client.usecase";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";

const app = express();
const db = new DataSource({
  type: "postgres",
  host: process.env.TEST_DB_HOST ?? "postgres",
  port: Number(process.env.TEST_DB_PORT ?? 5432),
  username: process.env.TEST_DB_USER ?? "eunoia_test",
  password: process.env.TEST_DB_PASSWORD ?? "eunoia_test_only",
  database: process.env.TEST_DB_NAME ?? "eunoia_financial_test",
  logging: false,
  entities: [SalePaymentEntity, CompanyPaymentAccountEntity, SaleOrderEntity, SaleOrderItemEntity, SaleOrderAttachmentEntity],
});
const evidenceFiles = new Map<string, Buffer>();
const evidenceStorage = {
  save: async ({ area = "public", directory, filename, extension, filenamePrefix, buffer }: { area?: string; directory: string; filename?: string; extension: string; filenamePrefix?: string; buffer: Buffer }) => {
    const savedName = filename ?? `${filenamePrefix ?? "file"}-${randomUUID()}.${extension}`;
    const key = `${area}/${directory}/${savedName}`;
    evidenceFiles.set(key, buffer);
    return { area, key, filename: savedName, relativePath: key, publicUrl: null, absolutePath: key };
  },
  read: async (key: string) => {
    const content = evidenceFiles.get(key);
    if (!content) throw new Error("FILE_NOT_FOUND");
    return content;
  },
  exists: async (key: string) => evidenceFiles.has(key),
  resolve: (key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key, publicUrl: null, absolutePath: key }),
  move: async (sourceKey: string, targetKey: string) => {
    const content = evidenceFiles.get(sourceKey);
    if (!content) return null;
    evidenceFiles.delete(sourceKey);
    evidenceFiles.set(targetKey, content);
    return { area: targetKey.split("/")[0], key: targetKey, filename: targetKey.split("/").pop()!, relativePath: targetKey, publicUrl: null, absolutePath: targetKey };
  },
  delete: async (key: string) => evidenceFiles.delete(key),
};
const companyId = "10000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const outflowAccountId = "20000000-0000-4000-8000-000000000002";
const usdAccountId = "20000000-0000-4000-8000-000000000003";
const methodId = "30000000-0000-4000-8000-000000000001";
const clientId = "40000000-0000-4000-8000-000000000001";
const orderId = "50000000-0000-4000-8000-000000000001";
const incomeId = "60000000-0000-4000-8000-000000000001";
const recoveryRefundId = "61000000-0000-4000-8000-000000000001";
const recoveryBankLineId = "62000000-0000-4000-8000-000000000001";
const recoveryAllocationId = "63000000-0000-4000-8000-000000000001";
const editOrderId = "50000000-0000-4000-8000-000000000002";
const cancellationTargetOrderId = "50000000-0000-4000-8000-000000000003";
const withClientOrderId = "50000000-0000-4000-8000-000000000004";
const duplicateSourceIncomeId = "60000000-0000-4000-8000-000000000002";
const editIncomeId = "60000000-0000-4000-8000-000000000003";
const userId = "70000000-0000-4000-8000-000000000001";
const targetUserId = "71000000-0000-4000-8000-000000000001";
const unprivilegedUserId = "72000000-0000-4000-8000-000000000001";
const cancelledStateId = "90000000-0000-4000-8000-000000000002";
const creatorId = "80000000-0000-4000-8000-000000000001";
const batchIncomeId = incomeId;
const batchSecondIncomeId = editIncomeId;
const evidenceFixturePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cYNkAAAAASUVORK5CYII=", "base64");
const accessControl = {
  getEffectivePermissions: async (id: string) => id === userId
    ? ["sale_orders.cancel", "sale_orders.update", "sale_orders.payments.post", "sale_orders.payments.post_bulk", "sale_orders.payments.update_pending", "sale_orders.payments.correct_posted", "sale_orders.payments.cancel_pending", "sale_orders.payments.reverse_posted", "sale_orders.payments.reenter_closed", "sale_orders.payments.resolve_cancelled_order", "sale_orders.payments.transfer_pending", "customer_credits.view", "customer_credits.apply", "customer_refunds.create", "customer_refunds.view", "customer_refunds.post", "customer_refunds.post_own", "customer_refunds.cancel", "customer_refunds.reverse", "income.reconciliation.view", "income.reconciliation.reconcile", "income.reconciliation.unreconcile", "income.read", "income.audit.view", "payments.view_evidence", "payments.attach_evidence", "income.view_all", "income.scope.manage"]
    : ["income.view_own"],
} as any;
let listedIncomeId = incomeId;
let listedIncomeIds: string[] | null = null;

async function main() {
  await db.initialize();
  await createSchema();
  const scopeMigrationRunner = db.createQueryRunner();
  await new CreateIncomeUserDataScopes20261012080000().up(scopeMigrationRunner);
  await new CreatePaymentEvidenceAccessLogs20261013010000().up(scopeMigrationRunner);
  await new IdempotentIncomeEvidenceUpload20261013000000().up(scopeMigrationRunner);
  await new CreatePaymentEvidenceUploadOperations20261013020000().up(scopeMigrationRunner);
  await scopeMigrationRunner.release();
  const usecase = new ManageIncomePaymentsUsecase(db.manager, accessControl);
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "http://127.0.0.1:4177");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] ?? "Content-Type, X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    if (req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });
  app.use(express.json());
  app.get("/api/sale-orders/:saleOrderId/payments", async (req, res) => {
    try {
      const rows = await db.query(`SELECT id, amount::float AS amount, currency, status, method,
        operation_number AS "operationNumber", version FROM sale_payments
        WHERE sale_order_id = $1 ORDER BY id`, [req.params.saleOrderId]);
      res.json(rows);
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/prepare-with-client-payment", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`sale-order-with-client:${userId}:${withClientOrderId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id IN (SELECT id FROM sale_payments WHERE sale_order_id = $1)`, [withClientOrderId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [withClientOrderId]);
      await manager.query(`DELETE FROM sale_payments WHERE sale_order_id = $1`, [withClientOrderId]);
      await manager.query(`UPDATE sale_orders SET currency = 'USD', total = 100, is_active = true WHERE id = $1`, [withClientOrderId]);
      await manager.query(`UPDATE company_payment_accounts SET is_active = true WHERE company_payment_account_id = ANY($1::uuid[])`, [[accountId, usdAccountId]]);
    });
    res.json({ ready: true, saleOrderId: withClientOrderId, penAccountId: accountId, usdAccountId });
  });
  app.get("/test-with-client-payment-state", async (_req, res) => {
    const [payments, audit, outbox, idempotency] = await Promise.all([
      db.query(`SELECT id, amount::text AS amount, currency, status, company_payment_account_id, payment_method_id, created_by_user_id, version FROM sale_payments WHERE sale_order_id = $1 ORDER BY id`, [withClientOrderId]),
      db.query(`SELECT action_execution, executed_by FROM sale_order_auditory WHERE sale_order_id = $1 ORDER BY created_at, id`, [withClientOrderId]),
      db.query(`SELECT event_type, aggregate_id, payload FROM financial_outbox_events WHERE aggregate_id IN (SELECT id FROM sale_payments WHERE sale_order_id = $1) ORDER BY occurred_at, id`, [withClientOrderId]),
      db.query(`SELECT status, response_body FROM financial_idempotency_records WHERE scope_key = $1 ORDER BY created_at`, [`sale-order-with-client:${userId}:${withClientOrderId}`]),
    ]);
    res.json({ payments, audit, outbox, idempotency });
  });
  app.get("/api/income/:incomeId/cancellation-targets", async (req, res) => {
    try {
      const rows = await db.query(`SELECT target.id AS "saleOrderId", target.total::float AS total,
        target.currency, target.total::float - COALESCE(reserved.amount, 0)::float AS available
        FROM sale_payments source_payment
        JOIN sale_orders source_order ON source_order.id = source_payment.sale_order_id
        JOIN sale_orders target ON target.client_id = source_order.client_id
          AND target.currency = source_payment.currency AND target.id <> source_order.id AND target.is_active = true
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(allocation.amount), 0) AS amount FROM sale_payment_allocations allocation
          JOIN sale_payments payment ON payment.id = allocation.sale_payment_id
          WHERE allocation.sale_order_id = target.id AND payment.status = 'POSTED'
        ) reserved ON true
        WHERE source_payment.id = $1 ORDER BY target.id`, [req.params.incomeId]);
      res.json(rows.map((row: any) => ({ ...row, saleOrderNumber: "PED-CANCEL-TARGET", clientName: "Cliente de prueba HTTP" })));
    } catch (error) {
      sendError(res, error);
    }
  });
  app.patch("/api/sale-orders/:saleOrderId/cancel", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3202/api/sale-orders/${encodeURIComponent(req.params.saleOrderId)}/cancel`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-e2e-user": req.header("x-e2e-user") ?? userId },
        body: JSON.stringify(req.body ?? {}),
      });
      const contentType = upstream.headers.get("content-type");
      const body = await upstream.text();
      if (contentType) res.type(contentType);
      res.status(upstream.status).send(body);
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      sendError(res, error);
    }
  });
  app.get("/api/income", async (_req, res) => {
    const ids = listedIncomeIds ?? [listedIncomeId];
    const rows = await db.query(`SELECT p.id, p.sale_order_id, p.amount, p.currency, p.status,
      p.payment_date::text AS payment_date, p.date, p.method, p.operation_number, p.note,
      p.company_payment_account_id, p.payment_method_id, p.version
      FROM sale_payments p WHERE p.id = ANY($1::uuid[]) ORDER BY p.id`, [ids]);
    res.json({ total: rows.length, items: rows.map((row) => ({
      incomeId: row.id, saleOrderId: row.sale_order_id,
      saleOrderNumber: listedIncomeIds ? (row.sale_order_id === orderId ? "PED-HTTP-001" : "PED-HTTP-002") : "PED-HTTP-001",
      clientName: "Cliente de prueba HTTP", amount: Number(row.amount), currency: row.currency,
      method: row.method, paymentMethodId: row.payment_method_id, paymentMethodCode: "TRANSFER",
      paymentMethodName: "Transferencia", companyPaymentAccountId: row.company_payment_account_id,
      companyPaymentAccountLabel: "Cuenta de pruebas", operationNumber: row.operation_number,
      detail: row.note, date: row.date, createdAt: row.date, evidenceUrl: null,
      evidence: { available: false, status: "MISSING_OPTIONAL", attachmentId: null, url: null,
        originalName: null, mimeType: null, sizeBytes: null, createdAt: null, canView: false, canUpload: false },
      status: row.status, version: row.version, paymentDate: row.payment_date,
      accountingDate: null, postedAt: null, appliedAmount: row.status === "POSTED" ? Number(row.amount) : 0,
    })) });
  });
  app.get("/api/company-payment-accounts/by-company/:companyId", (_req, res) => {
    res.json([
      { id: accountId, companyId, type: "BANK_ACCOUNT", usage: "INFLOW", name: "Cuenta receptora", currency: "PEN", isActive: true, maskedLabel: "Banco ·••0001" },
      { id: outflowAccountId, companyId, type: "BANK_ACCOUNT", usage: "OUTFLOW", name: "Cuenta de salida", currency: "PEN", isActive: true, maskedLabel: "Banco ·••0002" },
    ]);
  });
  app.get("/api/company-methods/by-company/:companyId", (_req, res) => {
    res.json({ data: [{ companyMethodId: "31000000-0000-4000-8000-000000000001", companyId, methodId, name: "Transferencia", code: "BANK_TRANSFER", isActive: true, enabled: true, requiresOperationReference: false }] });
  });
  const forwardIncome = async (req: express.Request, res: express.Response, path: string, method: string) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api${path}`, {
        method,
        headers: { "content-type": "application/json", "x-e2e-user": userId },
        ...(method === "GET" ? {} : { body: JSON.stringify(req.body ?? {}) }),
      });
      const contentType = upstream.headers.get("content-type");
      const body = await upstream.text();
      if (contentType) res.type(contentType);
      res.status(upstream.status).send(body);
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      sendError(res, error);
    }
  };
  app.get("/api/income/:incomeId/evidence/revisions", (req, res) => forwardIncome(req, res,
    `/income/${encodeURIComponent(req.params.incomeId)}/evidence/revisions${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, "GET"));
  app.get("/api/income/:incomeId/evidence/revisions/:attachmentId/content", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/${encodeURIComponent(req.params.incomeId)}/evidence/revisions/${encodeURIComponent(req.params.attachmentId)}/content`, {
        headers: { "x-e2e-user": req.header("x-e2e-user") ?? userId },
      });
      const contentType = upstream.headers.get("content-type");
      const cacheControl = upstream.headers.get("cache-control");
      if (contentType) res.type(contentType);
      if (cacheControl) res.setHeader("Cache-Control", cacheControl);
      res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      sendError(res, error);
    }
  });
  app.patch("/api/income/:incomeId", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}`, "PATCH"));
  const parseEvidenceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }).single("file");
  app.post("/api/income/:incomeId/evidence", parseEvidenceUpload, async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ message: "Debes enviar una imagen" }); return; }
      const body = new FormData();
      body.append("file", new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }), req.file.originalname);
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/${encodeURIComponent(req.params.incomeId)}/evidence`, {
        method: "POST",
        headers: { "x-e2e-user": userId, "Idempotency-Key": req.header("Idempotency-Key") ?? "" },
        body,
      });
      const contentType = upstream.headers.get("content-type");
      const responseBody = await upstream.text();
      if (contentType) res.type(contentType);
      res.status(upstream.status).send(responseBody);
    } catch (error) {
      process.stderr.write(`browser-finance-test-upload-error ${String(error)}\n`);
      sendError(res, error);
    }
  });
  app.get("/api/income/:incomeId/refunds", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/refunds`, "GET"));
  app.post("/api/income/:incomeId/refunds", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/refunds`, "POST"));
  app.post("/api/income/:incomeId/cancel", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/cancel`, "POST"));
  app.post("/api/income/:incomeId/reverse", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/reverse`, "POST"));
  app.post("/api/income/:incomeId/reenter", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/reenter`, "POST"));
  app.post("/api/income/:incomeId/transfer", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/transfer`, "POST"));
  app.get("/api/income/credits/:clientId", (req, res) => forwardIncome(req, res, `/income/credits/${encodeURIComponent(req.params.clientId)}`, "GET"));
  app.post("/api/income/credits/apply", (req, res) => forwardIncome(req, res, "/income/credits/apply", "POST"));
  app.get("/api/income/:incomeId/transfer-targets", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/transfer-targets${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, "GET"));
  app.post("/api/income/refunds/:refundId/post", (req, res) => forwardIncome(req, res, `/income/refunds/${encodeURIComponent(req.params.refundId)}/post`, "POST"));
  app.post("/api/income/refunds/:refundId/cancel", (req, res) => forwardIncome(req, res, `/income/refunds/${encodeURIComponent(req.params.refundId)}/cancel`, "POST"));
  app.post("/api/income/refunds/:refundId/reverse", (req, res) => forwardIncome(req, res, `/income/refunds/${encodeURIComponent(req.params.refundId)}/reverse`, "POST"));
  app.get("/api/income/:incomeId/reconciliation", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/reconciliation`, "GET"));
  app.post("/api/income/:incomeId/reconciliation", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/reconciliation`, "POST"));
  app.post("/api/income/:incomeId/reconciliation/:allocationId/unreconcile", (req, res) => forwardIncome(req, res, `/income/${encodeURIComponent(req.params.incomeId)}/reconciliation/${encodeURIComponent(req.params.allocationId)}/unreconcile`, "POST"));
  app.get("/api/income/reconciliation/statement-lines", (req, res) => forwardIncome(req, res, `/income/reconciliation/statement-lines${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, "GET"));
  app.post("/api/income/reconciliation/statement-lines", (req, res) => forwardIncome(req, res, "/income/reconciliation/statement-lines", "POST"));
  app.get("/api/income/summary", async (_req, res) => {
    const [{ collected, pending }] = await db.query(`SELECT
      COALESCE(SUM(amount) FILTER (WHERE status = 'POSTED'), 0)::float AS collected,
      COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_CONFIRMATION'), 0)::float AS pending
      FROM sale_payments`);
    res.json({ totalCollected: collected, totalPending: pending, ordersPaid: 0, ordersPending: 1,
      postedPaymentsCount: collected ? 1 : 0, averageCollectedPayment: collected,
      collectionEffectiveness: 0, observedPaymentsCount: 0, observedPaymentsAmount: 0,
      voidedPaymentsCount: 0, voidedPaymentsAmount: 0, customerCreditByCurrency: [], byMethod: [], byAccount: [] });
  });
  app.get("/api/income/search-state", (_req, res) => { res.json({ catalogs: { methods: [], accounts: [] }, recent: [], saved: [] }); });
  app.post("/api/income/:incomeId/post/prevalidate", async (req, res) => {
    try { res.json(await usecase.prevalidate([req.params.incomeId], userId, [{ id: req.params.incomeId, version: req.body.version }])); }
    catch (error) { sendError(res, error); }
  });
  app.post("/api/income/:incomeId/post", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/${encodeURIComponent(req.params.incomeId)}/post`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req.body),
      });
      res.status(upstream.status).send(await upstream.text());
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/api/income/post-batch/prevalidate", async (req, res) => {
    try {
      const upstream = await fetch("http://127.0.0.1:3201/api/income/post-batch/prevalidate", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req.body),
      });
      res.status(upstream.status).send(await upstream.text());
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/api/income/post-batch", async (req, res) => {
    try {
      const upstream = await fetch("http://127.0.0.1:3201/api/income/post-batch", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req.body),
      });
      res.status(upstream.status).send(await upstream.text());
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.get("/api/income/bulk-operations/:batchId", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/bulk-operations/${encodeURIComponent(req.params.batchId)}`);
      res.status(upstream.status).send(await upstream.text());
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.get("/api/income/posting-operations/:operationId", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/posting-operations/${encodeURIComponent(req.params.operationId)}`);
      res.status(upstream.status).send(await upstream.text());
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/prepare-post", async (_req, res) => {
    listedIncomeIds = null;
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [orderId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`post:${userId}`]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`close:${userId}:${incomeId}`]);
      await manager.query(`UPDATE sale_payments SET status = 'PENDING_CONFIRMATION', version = 1,
        operation_number = NULL, operation_code = NULL, posted_at = NULL, posted_by_user_id = NULL,
        accounting_date = NULL, reversed_at = NULL, reversed_by_user_id = NULL,
        cancelled_at = NULL, cancelled_by_user_id = NULL, voided_at = NULL, voided_by_user_id = NULL,
        void_reason = NULL, financial_reason = NULL, updated_by_user_id = NULL WHERE id = $1`, [incomeId]);
    });
    listedIncomeId = incomeId;
    res.json({ ready: true, incomeId });
  });
  app.post("/prepare-evidence-history", async (_req, res) => {
    const oldAttachmentId = "65000000-0000-4000-8000-000000000001";
    const currentAttachmentId = "65000000-0000-4000-8000-000000000002";
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM payment_evidence_access_logs WHERE income_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_attachments WHERE sale_order_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, status = 'PENDING_CONFIRMATION', version = 1 WHERE id = $1`, [incomeId, orderId]);
      await manager.query(`INSERT INTO sale_order_attachments
        (id, sale_order_id, sale_order_payment_id, type, filename, original_name, mime_type, size_bytes, storage_path, uploaded_by_user_id, content_sha256, created_at, deleted_at)
        VALUES ($1, $2, $3, 'PAYMENT_PROOF', 'old.png', 'comprobante-anterior.png', 'image/png', 68, 'private/sale-order-attachments/e2e/old.png', $4, repeat('a', 64), now() - interval '1 day', now()),
          ($5, $2, $3, 'PAYMENT_PROOF', 'current.png', 'comprobante-vigente.png', 'image/png', 68, 'private/sale-order-attachments/e2e/current.png', $4, repeat('b', 64), now(), NULL)`,
      [oldAttachmentId, orderId, incomeId, userId, currentAttachmentId]);
    });
    evidenceFiles.set("private/sale-order-attachments/e2e/old.png", evidenceFixturePng);
    evidenceFiles.set("private/sale-order-attachments/e2e/current.png", evidenceFixturePng);
    res.json({ ready: true, incomeId, oldAttachmentId, currentAttachmentId });
  });
  app.post("/prepare-income-evidence-upload", async (_req, res) => {
    evidenceFiles.clear();
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM payment_evidence_upload_operations WHERE sale_order_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_attachments WHERE sale_order_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_evidence_attached'`, [orderId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached'`, [incomeId]);
      await manager.query(`UPDATE sale_orders SET total = 100, currency = 'PEN', is_active = true, current_state_id = NULL WHERE id = $1`, [orderId]);
      await manager.query(`UPDATE sale_payments SET status = 'CANCELLED', cancelled_at = COALESCE(cancelled_at, now()),
        cancelled_by_user_id = $2, voided_at = COALESCE(voided_at, now()), voided_by_user_id = $2
        WHERE sale_order_id = $1 AND id <> $3 AND status IN ('PENDING_CONFIRMATION', 'POSTED')`, [orderId, userId, incomeId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, status = 'PENDING_CONFIRMATION', version = 1,
        amount = 45.67, currency = 'PEN', payment_date = CURRENT_DATE, date = now(), method = 'Transferencia',
        operation_number = 'EVIDENCE-RETRY-HTTP', note = 'Prueba de reintento de evidencia',
        company_payment_account_id = $3, payment_method_id = $4, payment_photo = NULL WHERE id = $1`, [incomeId, orderId, accountId, methodId]);
    });
    res.json({ ready: true, incomeId });
  });
  app.get("/test-income-evidence-upload-state", async (_req, res) => {
    const [attachments, operations, audits, events] = await Promise.all([
      db.query(`SELECT id, original_name, mime_type, size_bytes::int AS size_bytes, storage_path, content_sha256,
        upload_idempotency_key, deleted_at FROM sale_order_attachments WHERE sale_order_payment_id = $1 ORDER BY created_at, id`, [incomeId]),
      db.query(`SELECT status, attachment_id, source_content_sha256, staging_key, promoted_key, lease_until
        FROM payment_evidence_upload_operations WHERE sale_order_payment_id = $1 ORDER BY created_at, id`, [incomeId]),
      db.query(`SELECT COUNT(*)::int AS count FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_evidence_attached'`, [orderId]),
      db.query(`SELECT COUNT(*)::int AS count FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached'`, [incomeId]),
    ]);
    res.json({ attachments, operations, auditCount: audits[0].count, outboxCount: events[0].count, storedFileCount: evidenceFiles.size });
  });
  app.get("/test-evidence-history-state", async (_req, res) => {
    const [revisions, accessLogs] = await Promise.all([
      db.query(`SELECT id, original_name, deleted_at FROM sale_order_attachments WHERE sale_order_payment_id = $1 ORDER BY id`, [incomeId]),
      db.query(`SELECT income_id, sale_order_id, evidence_attachment_id, actor_user_id, content_sha256, size_bytes FROM payment_evidence_access_logs WHERE income_id = $1 ORDER BY accessed_at`, [incomeId]),
    ]);
    res.json({ revisions, accessLogs });
  });
  app.post("/prepare-reverse", async (_req, res) => {
    listedIncomeIds = null;
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [orderId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`close:${userId}:${incomeId}`]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, operation_number = 'REVERSE-HTTP-001',
        posted_at = now(), posted_by_user_id = $2, accounting_date = CURRENT_DATE, reversed_at = NULL,
        reversed_by_user_id = NULL, cancelled_at = NULL, cancelled_by_user_id = NULL, voided_at = NULL,
        voided_by_user_id = NULL, void_reason = NULL, financial_reason = NULL WHERE id = $1`, [incomeId, userId]);
      await manager.query(`INSERT INTO financial_account_movements
        (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
        VALUES ($1, $2, 'INCOME', 45.67, 'PEN', CURRENT_DATE, $3)`, [accountId, incomeId, userId]);
      await manager.query(`INSERT INTO sale_payment_allocations
        (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
        VALUES ($1, $2, 45.67, 'PEN', $3)`, [incomeId, orderId, userId]);
    });
    listedIncomeId = incomeId;
    res.json({ ready: true, incomeId });
  });
  app.post("/prepare-reenter", async (_req, res) => {
    listedIncomeIds = null;
    const children = await db.query(`SELECT id FROM sale_payments WHERE reentered_from_payment_id = $1`, [incomeId]);
    const childIds = children.map((row: any) => row.id);
    await db.transaction(async (manager) => {
      if (childIds.length) {
        await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [childIds]);
        await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [childIds]);
        await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [childIds]);
        await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [childIds]);
        await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = ANY($1::uuid[])`, [childIds]);
        await manager.query(`DELETE FROM sale_payments WHERE id = ANY($1::uuid[])`, [childIds]);
      }
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [orderId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`reenter:${userId}:${incomeId}`]);
      await manager.query(`UPDATE sale_payments SET status = 'CANCELLED', version = 2, operation_number = NULL,
        operation_code = NULL, posted_at = NULL, posted_by_user_id = NULL, accounting_date = NULL,
        cancelled_at = now(), cancelled_by_user_id = $2, reversed_at = NULL, reversed_by_user_id = NULL,
        voided_at = now(), voided_by_user_id = $2, void_reason = 'Cancelacion de prueba',
        financial_reason = 'Cancelacion de prueba' WHERE id = $1`, [incomeId, userId]);
    });
    listedIncomeId = incomeId;
    res.json({ ready: true, incomeId });
  });
  app.post("/prepare-transfer-recovery", async (_req, res) => {
    listedIncomeIds = null;
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`transfer:${userId}:${incomeId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type IN ('income.payment_pending_transferred_out', 'income.payment_pending_transferred_in')`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE action_execution IN ('payment_pending_transferred_out', 'payment_pending_transferred_in') AND sale_order_id = ANY($1::uuid[])`, [[orderId, editOrderId]]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, status = 'PENDING_CONFIRMATION', version = 1,
        amount = 45.67, payment_date = CURRENT_DATE, operation_number = NULL, operation_code = NULL,
        posted_at = NULL, posted_by_user_id = NULL, accounting_date = NULL, reversed_at = NULL,
        reversed_by_user_id = NULL, cancelled_at = NULL, cancelled_by_user_id = NULL,
        voided_at = NULL, voided_by_user_id = NULL, void_reason = NULL, financial_reason = NULL,
        updated_by_user_id = NULL WHERE id = $1`, [incomeId, orderId]);
    });
    listedIncomeId = incomeId;
    res.json({ ready: true, incomeId, targetOrderId: editOrderId });
  });
  app.post("/prepare-batch", async (_req, res) => {
    listedIncomeIds = [batchIncomeId, batchSecondIncomeId];
    await db.transaction(async (manager) => {
      for (const selectedOrderId of [orderId, editOrderId]) {
        await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_order_id = $1`, [selectedOrderId]);
        await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
        await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
        await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [selectedOrderId]);
      }
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`post:${userId}`]);
      await manager.query(`UPDATE sale_payments SET status = 'PENDING_CONFIRMATION', version = 1,
        amount = CASE WHEN id = $1 THEN 45.67 ELSE 22.00 END, payment_date = CURRENT_DATE,
        operation_number = NULL, operation_code = NULL, posted_at = NULL, posted_by_user_id = NULL,
        accounting_date = NULL, reversed_at = NULL, reversed_by_user_id = NULL,
        updated_by_user_id = NULL, note = 'Pago de lote HTTP'
        WHERE id = ANY($2::uuid[])`, [batchIncomeId, [batchIncomeId, batchSecondIncomeId]]);
    });
    res.json({ ready: true, incomeIds: listedIncomeIds });
  });
  app.get("/test-batch-state", async (_req, res) => {
    const payments = await db.query(`SELECT id, status, version FROM sale_payments WHERE id = ANY($1::uuid[]) ORDER BY id`, [[batchIncomeId, batchSecondIncomeId]]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
    const [{ allocations }] = await db.query(`SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = ANY($1::uuid[])`, [[batchIncomeId, batchSecondIncomeId]]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE action_execution = 'payment_posted' AND sale_order_id = ANY($1::uuid[])`, [[orderId, editOrderId]]);
    const [{ completedBatches }] = await db.query(`SELECT COUNT(*)::int AS "completedBatches" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`post:${userId}`]);
    res.json({ payments, movements, allocations, outboxEvents, auditEvents, completedBatches });
  });
  app.patch("/api/income/:incomeId", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/${encodeURIComponent(req.params.incomeId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-e2e-user": req.header("x-e2e-user") ?? userId },
        body: JSON.stringify(req.body),
      });
      const contentType = upstream.headers.get("content-type");
      const body = await upstream.text();
      if (contentType) res.type(contentType);
      res.status(upstream.status).send(body);
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/api/income/:incomeId/correct", async (req, res) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:3201/api/income/${encodeURIComponent(req.params.incomeId)}/correct`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const contentType = upstream.headers.get("content-type");
      const body = await upstream.text();
      if (contentType) res.type(contentType);
      res.status(upstream.status).send(body);
    } catch (error) {
      process.stderr.write(`browser-finance-test-proxy-error ${String(error)}\n`);
      res.status(502).json({ message: "No se pudo conectar con la API financiera de prueba." });
    }
  });
  app.post("/prepare-edit-duplicate", async (_req, res) => {
    listedIncomeIds = null;
    listedIncomeId = editIncomeId;
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = $1`, [editIncomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = $1`, [editIncomeId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [editIncomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [editOrderId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [editIncomeId]);
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`income-edit:${userId}:${editIncomeId}`]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, amount = 1, status = 'PENDING_CONFIRMATION', version = 1,
        operation_number = 'OP-HTTP-DUPLICATE', operation_code = 'OP-HTTP-DUPLICATE', note = NULL,
        posted_at = NULL, posted_by_user_id = NULL, accounting_date = NULL, cancelled_at = NULL,
        cancelled_by_user_id = NULL, reversed_at = NULL, reversed_by_user_id = NULL, updated_by_user_id = NULL
        WHERE id = $1`, [duplicateSourceIncomeId, editOrderId]);
      await manager.query(`UPDATE sale_payments SET amount = 2, status = 'PENDING_CONFIRMATION', version = 1,
        operation_number = NULL, operation_code = NULL, note = NULL, updated_by_user_id = NULL WHERE id = $1`, [editIncomeId]);
    });
    res.json({ ready: true, incomeId: editIncomeId });
  });
  app.get("/test-edit-state", async (_req, res) => {
    const [payment] = await db.query(`SELECT status, version, operation_number, note FROM sale_payments WHERE id = $1`, [editIncomeId]);
    const [{ edits }] = await db.query(`SELECT COUNT(*)::int AS edits FROM sale_order_auditory
      WHERE sale_order_id = $1 AND action_execution = 'payment_pending_edited'`, [editOrderId]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1`, [editIncomeId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events
      WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [editIncomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records
      WHERE scope_key = $1 AND status = 'COMPLETED'`, [`income-edit:${userId}:${editIncomeId}`]);
    res.json({ ...payment, edits, movements, outboxEvents, completedOperations });
  });
  app.post("/prepare-correct", async (_req, res) => {
    listedIncomeIds = null;
    listedIncomeId = incomeId;
    await db.transaction(async (manager) => {
      const replacements = await manager.query(`SELECT id FROM sale_payments WHERE corrected_from_payment_id = $1`, [incomeId]);
      const replacementIds = replacements.map((row: { id: string }) => row.id);
      if (replacementIds.length) {
        await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[])
          OR aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = ANY($1::uuid[]))`, [replacementIds]);
        await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM sale_payments WHERE id = ANY($1::uuid[])`, [replacementIds]);
      }
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1
        OR aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $2)`, [incomeId, incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [orderId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $3, status = 'POSTED', version = 2, amount = 45.67,
        operation_number = 'OP-HTTP-CORRECTION-ORIGINAL', operation_code = 'OP-HTTP-CORRECTION-ORIGINAL',
        posted_at = now(), posted_by_user_id = $2, accounting_date = CURRENT_DATE, reversed_at = NULL,
        reversed_by_user_id = NULL, voided_at = NULL, voided_by_user_id = NULL, void_reason = NULL,
        financial_reason = NULL, updated_by_user_id = NULL WHERE id = $1`, [incomeId, userId, orderId]);
      await manager.query(`INSERT INTO financial_account_movements
        (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
        VALUES ($1, $2, 'INCOME', 45.67, 'PEN', CURRENT_DATE, $3, 'Preparación E2E de corrección')`, [accountId, incomeId, userId]);
      await manager.query(`INSERT INTO sale_payment_allocations
        (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
        VALUES ($1, $2, 45.67, 'PEN', $3)`, [incomeId, orderId, userId]);
    });
    res.json({ ready: true, incomeId });
  });
  app.post("/prepare-cancel-order", async (_req, res) => {
    await db.transaction(async (manager) => {
      const replacements = await manager.query(`SELECT id FROM sale_payments WHERE corrected_from_payment_id = $1`, [incomeId]);
      const replacementIds = replacements.map((row: { id: string }) => row.id);
      if (replacementIds.length) {
        await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[])`, [replacementIds]);
        await manager.query(`DELETE FROM sale_payments WHERE id = ANY($1::uuid[])`, [replacementIds]);
      }
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`cancel-order:${userId}:${orderId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE (aggregate_id = ANY($1::uuid[])
        OR (aggregate_type = 'sale_order' AND aggregate_id = $2 AND event_type = 'sale_order.cancelled'))
        OR aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = ANY($1::uuid[]))`, [[incomeId, duplicateSourceIncomeId], orderId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = ANY($1::uuid[])`, [[orderId, cancellationTargetOrderId]]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`UPDATE sale_payments SET status = 'CANCELLED', cancelled_at = COALESCE(cancelled_at, now()),
        cancelled_by_user_id = $2, voided_at = COALESCE(voided_at, now()), voided_by_user_id = $2, version = version + 1
        WHERE sale_order_id = $1 AND id <> ALL($3::uuid[]) AND status IN ('PENDING_CONFIRMATION', 'POSTED')`, [orderId, userId, [incomeId, duplicateSourceIncomeId]]);
      await manager.query(`UPDATE sale_orders SET is_active = true, current_state_id = NULL WHERE id = $1`, [orderId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, amount = 45.67, status = 'POSTED', version = 2,
        posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE, cancelled_at = NULL,
        cancelled_by_user_id = NULL, voided_at = NULL, voided_by_user_id = NULL, void_reason = NULL,
        reversed_at = NULL, reversed_by_user_id = NULL, corrected_from_payment_id = NULL, financial_reason = NULL,
        operation_number = 'OP-CANCEL-POSTED', operation_code = 'OP-CANCEL-POSTED' WHERE id = $1`, [incomeId, orderId, userId]);
      await manager.query(`INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
        VALUES ($1, $2, 'INCOME', 45.67, 'PEN', CURRENT_DATE, $3)`, [accountId, incomeId, userId]);
      await manager.query(`INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
        VALUES ($1, $2, 45.67, 'PEN', $3)`, [incomeId, orderId, userId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, amount = 20, status = 'PENDING_CONFIRMATION', version = 1,
        posted_at = NULL, posted_by_user_id = NULL, accounting_date = NULL, cancelled_at = NULL, cancelled_by_user_id = NULL,
        voided_at = NULL, voided_by_user_id = NULL, void_reason = NULL, operation_number = 'OP-CANCEL-PENDING',
        operation_code = 'OP-CANCEL-PENDING' WHERE id = $1`, [duplicateSourceIncomeId, orderId]);
    });
    res.json({ ready: true, orderId });
  });
  app.post("/prepare-cancel-order-without-active-payments", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`cancel-order:${userId}:${orderId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[])
        OR (aggregate_type = 'sale_order' AND aggregate_id = $2 AND event_type = 'sale_order.cancelled')`, [[incomeId, duplicateSourceIncomeId], orderId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1`, [orderId]);
      await manager.query(`UPDATE sale_orders SET is_active = true, current_state_id = NULL WHERE id = $1`, [orderId]);
      await manager.query(`UPDATE sale_payments SET status = 'CANCELLED', version = version + 1,
        cancelled_at = now(), cancelled_by_user_id = $2, voided_at = now(), voided_by_user_id = $2
        WHERE sale_order_id = $1`, [orderId, userId]);
    });
    res.json({ ready: true, orderId });
  });
  app.post("/prepare-credit-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`credit-apply:${userId}:${clientId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`DELETE FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, duplicateSourceIncomeId]]);
      await manager.query(`UPDATE sale_orders SET is_active = true, current_state_id = NULL WHERE id = ANY($1::uuid[])`, [[orderId, cancellationTargetOrderId]]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, amount = 45.67, currency = 'PEN', status = 'POSTED', version = 2,
        posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE, cancelled_at = NULL, cancelled_by_user_id = NULL,
        reversed_at = NULL, reversed_by_user_id = NULL, corrected_from_payment_id = NULL, financial_reason = NULL,
        operation_number = 'OP-CREDIT-RECOVERY', operation_code = 'OP-CREDIT-RECOVERY' WHERE id = $1`, [incomeId, orderId, userId]);
      await manager.query(`INSERT INTO financial_account_movements
        (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
        VALUES ($1, $2, 'INCOME', 45.67, 'PEN', CURRENT_DATE, $3, 'Fixture de recuperaciÃ³n de saldo')`, [accountId, incomeId, userId]);
      await manager.query(`INSERT INTO sale_payment_allocations
        (sale_payment_id, sale_order_id, amount, currency, created_by_user_id) VALUES ($1, $2, 45.67, 'PEN', $3)`, [incomeId, orderId, userId]);
      await manager.query(`INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
        VALUES ($1, $2, $3, 'RELEASE', 30.00, 'PEN', $4, 'CrÃ©dito de prueba recuperable')`, [clientId, incomeId, orderId, userId]);
    });
    res.json({ ready: true, clientId, saleOrderId: cancellationTargetOrderId, incomeId });
  });
  app.get("/test-credit-recovery-state", async (_req, res) => {
    const allocations = await db.query(`SELECT sale_payment_id AS "paymentId", sale_order_id AS "saleOrderId", amount::text AS amount
      FROM sale_payment_allocations WHERE sale_order_id = $1 ORDER BY id`, [cancellationTargetOrderId]);
    const credits = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM customer_credit_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`credit-apply:${userId}:${clientId}`]);
    res.json({ allocations, credits, completedOperations });
  });
  app.get("/test-cancel-order-state", async (_req, res) => {
    const payments = await db.query(`SELECT id, sale_order_id AS "saleOrderId", status, version FROM sale_payments WHERE id = ANY($1::uuid[]) ORDER BY id`, [[incomeId, duplicateSourceIncomeId]]);
    const [{ currentStateId }] = await db.query(`SELECT current_state_id AS "currentStateId" FROM sale_orders WHERE id = $1`, [orderId]);
    const movements = await db.query(`SELECT sale_payment_id AS "paymentId", movement_type AS type, amount FROM financial_account_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const allocations = await db.query(`SELECT sale_payment_id AS "paymentId", sale_order_id AS "saleOrderId", amount FROM sale_payment_allocations WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const credits = await db.query(`SELECT movement_type AS type, amount FROM customer_credit_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const refunds = await db.query(`SELECT status, amount::float AS amount FROM customer_refunds WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = ANY($1::uuid[])`, [[orderId, cancellationTargetOrderId]]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events
      WHERE aggregate_id = ANY($1::uuid[]) OR aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $2)`, [[incomeId, duplicateSourceIncomeId], incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`cancel-order:${userId}:${orderId}`]);
    res.json({ payments, currentStateId, movements, allocations, credits, refunds, auditEvents, outboxEvents, completedOperations });
  });
  app.get("/test-cancel-empty-state", async (_req, res) => {
    const [{ currentStateId }] = await db.query(`SELECT current_state_id AS "currentStateId" FROM sale_orders WHERE id = $1`, [orderId]);
    const [{ activePayments }] = await db.query(`SELECT COUNT(*)::int AS "activePayments" FROM sale_payments WHERE sale_order_id = $1 AND status IN ('PENDING_CONFIRMATION','POSTED')`, [orderId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`cancel-order:${userId}:${orderId}`]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'sale_order_cancelled_without_payments'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_order' AND aggregate_id = $1 AND event_type = 'sale_order.cancelled'`, [orderId]);
    res.json({ currentStateId, activePayments, completedOperations, auditEvents, outboxEvents });
  });
  app.get("/test-correction-state", async (_req, res) => {
    const [source] = await db.query(`SELECT id, status, version, operation_number FROM sale_payments WHERE id = $1`, [incomeId]);
    const [replacement] = await db.query(`SELECT id, status, version, operation_number FROM sale_payments WHERE corrected_from_payment_id = $1`, [incomeId]);
    const movements = await db.query(`SELECT sale_payment_id AS "paymentId", movement_type AS type, COUNT(*)::int AS count, SUM(amount)::numeric(14,2)::text AS amount
      FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[]) GROUP BY sale_payment_id, movement_type ORDER BY sale_payment_id, movement_type`, [[incomeId, replacement?.id].filter(Boolean)]);
    const [{ allocations }] = await db.query(`SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])`, [[incomeId, replacement?.id].filter(Boolean)]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = ANY($1::uuid[])`, [[incomeId, replacement?.id].filter(Boolean)]);
    const audit = await db.query(`SELECT action_execution FROM sale_order_auditory WHERE sale_order_id = $1 ORDER BY action_execution`, [orderId]);
    res.json({ source, replacement, movements, allocations, outboxEvents, audit });
  });
  app.get("/test-state", async (_req, res) => {
    const [payment] = await db.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [incomeId]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
    const [{ allocations }] = await db.query(`SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations WHERE sale_payment_id = $1`, [incomeId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_posted'`, [orderId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`post:${userId}`]);
    res.json({ ...payment, movements, allocations, outboxEvents, auditEvents, completedOperations });
  });
  app.get("/test-close-state", async (_req, res) => {
    const [payment] = await db.query(`SELECT status, version, void_reason AS "voidReason" FROM sale_payments WHERE id = $1`, [incomeId]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_cancelled'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type = 'income.payment_cancelled'`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`close:${userId}:${incomeId}`]);
    res.json({ ...payment, movements, auditEvents, outboxEvents, completedOperations });
  });
  app.get("/test-reverse-state", async (_req, res) => {
    const [payment] = await db.query(`SELECT status, version, void_reason AS "voidReason" FROM sale_payments WHERE id = $1`, [incomeId]);
    const movements = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM financial_account_movements WHERE sale_payment_id = $1 ORDER BY movement_type`, [incomeId]);
    const allocations = await db.query(`SELECT amount::text AS amount FROM sale_payment_allocations WHERE sale_payment_id = $1 ORDER BY amount`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_reversed'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type = 'income.payment_reversed'`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`close:${userId}:${incomeId}`]);
    res.json({ ...payment, movements, allocations, auditEvents, outboxEvents, completedOperations });
  });
  app.get("/test-reenter-state", async (_req, res) => {
    const [source] = await db.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [incomeId]);
    const children = await db.query(`SELECT id, status, version, amount::text AS amount, operation_number AS "operationNumber"
      FROM sale_payments WHERE reentered_from_payment_id = $1 ORDER BY id`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_reentered'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = ANY($1::uuid[]) AND event_type = 'income.payment_reentered'`, [children.map((row: any) => row.id)]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`reenter:${userId}:${incomeId}`]);
    res.json({ source, children, auditEvents, outboxEvents, completedOperations });
  });
  app.get("/test-transfer-recovery-state", async (_req, res) => {
    const [payment] = await db.query(`SELECT sale_order_id AS "saleOrderId", status, version FROM sale_payments WHERE id = $1`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE action_execution IN ('payment_pending_transferred_out', 'payment_pending_transferred_in') AND sale_order_id = ANY($1::uuid[])`, [[orderId, editOrderId]]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type IN ('income.payment_pending_transferred_out', 'income.payment_pending_transferred_in')`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`transfer:${userId}:${incomeId}`]);
    res.json({ ...payment, auditEvents, outboxEvents, completedOperations });
  });
  app.post("/prepare-refund-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`refund-post:${userId}:${recoveryRefundId}`]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
      await manager.query(`INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
        VALUES ($1, $2, $3, 'CREDIT', 50, 'PEN', $4, 'Saldo de prueba para reembolso')`, [clientId, incomeId, orderId, creatorId]);
      await manager.query(`INSERT INTO customer_refunds
        (id, sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id)
        VALUES ($1, $2, $3, 15.25, 'PEN', 'PENDING', 'Reembolso de recuperación E2E', $4)`, [recoveryRefundId, incomeId, clientId, creatorId]);
    });
    res.json({ ready: true, incomeId, refundId: recoveryRefundId });
  });
  app.post("/prepare-refund-cancel-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`refund-cancel:${userId}:${recoveryRefundId}`]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_cancelled'`, [orderId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
      await manager.query(`INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
        VALUES ($1, $2, $3, 'CREDIT', 50, 'PEN', $4, 'Saldo de prueba para cancelar reembolso')`, [clientId, incomeId, orderId, creatorId]);
      await manager.query(`INSERT INTO customer_refunds
        (id, sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id)
        VALUES ($1, $2, $3, 15.25, 'PEN', 'PENDING', 'Reembolso de cancelacion E2E', $4)`, [recoveryRefundId, incomeId, clientId, creatorId]);
    });
    res.json({ ready: true, incomeId, refundId: recoveryRefundId });
  });
  app.get("/test-refund-cancel-recovery-state", async (_req, res) => {
    const [refund] = await db.query(`SELECT status, amount::text AS amount FROM customer_refunds WHERE id = $1`, [recoveryRefundId]);
    const credits = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM customer_credit_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE refund_id = $1`, [recoveryRefundId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_cancelled'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = $1 AND event_type = 'income.customer_refund_cancelled'`, [recoveryRefundId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`refund-cancel:${userId}:${recoveryRefundId}`]);
    res.json({ ...refund, credits, movements, auditEvents, outboxEvents, completedOperations });
  });
  app.post("/prepare-refund-reverse-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`refund-reverse:${userId}:${recoveryRefundId}`]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1`, [recoveryRefundId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_reversed'`, [orderId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
      await manager.query(`INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
        VALUES ($1, $2, $3, 'CREDIT', 50, 'PEN', $4, 'Saldo de prueba para revertir reembolso'),
          ($1, $2, $3, 'REFUND', -15.25, 'PEN', $4, 'Reserva de reembolso contabilizado')`, [clientId, incomeId, orderId, creatorId]);
      await manager.query(`INSERT INTO customer_refunds
        (id, sale_payment_id, client_id, company_payment_account_id, amount, currency, status, operation_number, reason, created_by_user_id, posted_by_user_id, posted_at)
        VALUES ($1, $2, $3, $4, 15.25, 'PEN', 'POSTED', 'REFUND-REVERSAL-E2E', 'Reembolso de reversión E2E', $5, $6, now())`,
      [recoveryRefundId, incomeId, clientId, outflowAccountId, creatorId, userId]);
      await manager.query(`INSERT INTO financial_account_movements
        (company_payment_account_id, sale_payment_id, refund_id, movement_type, amount, currency, operation_date, created_by_user_id, reason)
        VALUES ($1, NULL, $2, 'REFUND', -15.25, 'PEN', CURRENT_DATE, $3, 'Reembolso de reversión E2E')`,
      [outflowAccountId, recoveryRefundId, userId]);
    });
    res.json({ ready: true, incomeId, refundId: recoveryRefundId });
  });
  app.get("/test-refund-reverse-recovery-state", async (_req, res) => {
    const [refund] = await db.query(`SELECT status, amount::text AS amount FROM customer_refunds WHERE id = $1`, [recoveryRefundId]);
    const credits = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM customer_credit_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const movements = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM financial_account_movements WHERE refund_id = $1 ORDER BY movement_type`, [recoveryRefundId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_reversed'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = $1 AND event_type = 'income.customer_refund_reversed'`, [recoveryRefundId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`refund-reverse:${userId}:${recoveryRefundId}`]);
    res.json({ ...refund, credits, movements, auditEvents, outboxEvents, completedOperations });
  });
  app.post("/prepare-refund-create-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`refund-create:${userId}:${incomeId}`]);
      await manager.query(`DELETE FROM financial_account_movements WHERE refund_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_created'`, [orderId]);
      await manager.query(`DELETE FROM customer_credit_movements WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM customer_refunds WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET sale_order_id = $2, status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $3, posted_at = now(), posted_by_user_id = $4, accounting_date = CURRENT_DATE,
        cancelled_at = NULL, cancelled_by_user_id = NULL, reversed_at = NULL, reversed_by_user_id = NULL
        WHERE id = $1`, [incomeId, orderId, accountId, creatorId]);
      await manager.query(`INSERT INTO customer_credit_movements
        (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
        VALUES ($1, $2, $3, 'CREDIT', 50.00, 'PEN', $4, 'Saldo de prueba para alta de reembolso')`, [clientId, incomeId, orderId, creatorId]);
    });
    res.json({ ready: true, incomeId });
  });
  app.get("/test-refund-create-recovery-state", async (_req, res) => {
    const refunds = await db.query(`SELECT id, status, amount::text AS amount, reason FROM customer_refunds WHERE sale_payment_id = $1 ORDER BY created_at, id`, [incomeId]);
    const credits = await db.query(`SELECT movement_type AS type, amount::text AS amount FROM customer_credit_movements WHERE sale_payment_id = $1 ORDER BY id`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'customer_refund_created'`, [orderId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND event_type = 'income.customer_refund_created' AND aggregate_id IN (SELECT id FROM customer_refunds WHERE sale_payment_id = $1)`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`refund-create:${userId}:${incomeId}`]);
    res.json({ refunds, credits, auditEvents, outboxEvents, completedOperations });
  });
  app.get("/test-refund-recovery-state", async (_req, res) => {
    const [refund] = await db.query(`SELECT status, operation_number AS "operationNumber" FROM customer_refunds WHERE id = $1`, [recoveryRefundId]);
    const [{ movements }] = await db.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE refund_id = $1`, [recoveryRefundId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_id = $1`, [recoveryRefundId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`refund-post:${userId}:${recoveryRefundId}`]);
    res.json({ ...refund, movements, outboxEvents, completedOperations });
  });
  app.post("/prepare-reconciliation-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`income-reconcile:${userId}:${incomeId}`]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_id = $1`, [incomeId]);
      await manager.query(`DELETE FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-RECOVERY-HTTP'`, [accountId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
    });
    res.json({ ready: true, incomeId, bankReference: "BANK-RECOVERY-HTTP" });
  });
  app.get("/test-reconciliation-recovery-state", async (_req, res) => {
    const allocations = await db.query(`SELECT amount::text AS amount, unreconciled_at AS "unreconciledAt" FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
    const [{ statementLines }] = await db.query(`SELECT COUNT(*)::int AS "statementLines" FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-RECOVERY-HTTP'`, [accountId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type = 'income.income_reconciled'`, [incomeId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`income-reconcile:${userId}:${incomeId}`]);
    res.json({ allocations, statementLines, outboxEvents, completedOperations });
  });
  app.post("/prepare-unreconcile-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`income-unreconcile:${userId}:${incomeId}:${recoveryAllocationId}`]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE id = $1`, [recoveryAllocationId]);
      await manager.query(`DELETE FROM bank_statement_lines WHERE id = $1`, [recoveryBankLineId]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type = 'income.income_unreconciled'`, [incomeId]);
      await manager.query(`DELETE FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'income_unreconciled'`, [orderId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
      await manager.query(`INSERT INTO bank_statement_lines
        (id, company_payment_account_id, bank_reference, operation_date, amount, currency, created_by_user_id)
        VALUES ($1, $2, 'BANK-UNRECONCILE-HTTP', CURRENT_DATE, 80, 'PEN', $3)`, [recoveryBankLineId, accountId, userId]);
      await manager.query(`INSERT INTO bank_reconciliation_allocations
        (id, bank_statement_line_id, sale_payment_id, amount, created_by_user_id)
        VALUES ($1, $2, $3, 40, $4)`, [recoveryAllocationId, recoveryBankLineId, incomeId, userId]);
    });
    res.json({ ready: true, incomeId, allocationId: recoveryAllocationId, bankLineId: recoveryBankLineId });
  });
  app.get("/test-unreconcile-recovery-state", async (_req, res) => {
    const allocations = await db.query(`SELECT id, amount::text AS amount, unreconciled_at AS "unreconciledAt", unreconcile_reason AS "unreconcileReason"
      FROM bank_reconciliation_allocations WHERE id = $1`, [recoveryAllocationId]);
    const [{ statementLines }] = await db.query(`SELECT COUNT(*)::int AS "statementLines" FROM bank_statement_lines WHERE id = $1`, [recoveryBankLineId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1 AND event_type = 'income.income_unreconciled'`, [incomeId]);
    const [{ auditEvents }] = await db.query(`SELECT COUNT(*)::int AS "auditEvents" FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'income_unreconciled'`, [orderId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`income-unreconcile:${userId}:${incomeId}:${recoveryAllocationId}`]);
    res.json({ allocations, statementLines, outboxEvents, auditEvents, completedOperations });
  });
  app.post("/prepare-bank-line-create-recovery", async (_req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM financial_idempotency_records WHERE scope_key = $1`, [`bank-statement-line:${userId}`]);
      await manager.query(`DELETE FROM financial_outbox_events WHERE aggregate_type = 'bank_statement_line' AND aggregate_id IN (
        SELECT id FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-LINE-CREATE-RECOVERY'
      )`, [accountId]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE bank_statement_line_id IN (
        SELECT id FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-LINE-CREATE-RECOVERY'
      )`, [accountId]);
      await manager.query(`DELETE FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-LINE-CREATE-RECOVERY'`, [accountId]);
      await manager.query(`DELETE FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`, [incomeId]);
      await manager.query(`UPDATE sale_payments SET status = 'POSTED', version = 2, amount = 45.67,
        company_payment_account_id = $2, posted_at = now(), posted_by_user_id = $3, accounting_date = CURRENT_DATE
        WHERE id = $1`, [incomeId, accountId, creatorId]);
    });
    res.json({ ready: true, incomeId, bankReference: "BANK-LINE-CREATE-RECOVERY" });
  });
  app.get("/test-bank-line-create-recovery-state", async (_req, res) => {
    const lines = await db.query(`SELECT id, bank_reference AS "bankReference", operation_date::text AS "operationDate", amount::text AS amount, currency
      FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-LINE-CREATE-RECOVERY'`, [accountId]);
    const [{ outboxEvents }] = await db.query(`SELECT COUNT(*)::int AS "outboxEvents" FROM financial_outbox_events WHERE aggregate_type = 'bank_statement_line' AND aggregate_id IN (
      SELECT id FROM bank_statement_lines WHERE company_payment_account_id = $1 AND bank_reference = 'BANK-LINE-CREATE-RECOVERY'
    ) AND event_type = 'income.bank_statement_line_created'`, [accountId]);
    const [{ completedOperations }] = await db.query(`SELECT COUNT(*)::int AS "completedOperations" FROM financial_idempotency_records WHERE scope_key = $1 AND status = 'COMPLETED'`, [`bank-statement-line:${userId}`]);
    res.json({ lines, outboxEvents, completedOperations });
  });
  app.get("/test-scope-state", async (req, res) => {
    const selectedUserId = String(req.query.userId ?? targetUserId);
    const [scopes, audits] = await Promise.all([
      db.query(`SELECT scope_type AS type, scope_id AS id FROM user_financial_data_scopes WHERE user_id = $1 ORDER BY scope_type, scope_id`, [selectedUserId]),
      db.query(`SELECT actor_user_id, before_scopes, after_scopes FROM user_financial_data_scope_audits WHERE target_user_id = $1 ORDER BY created_at DESC`, [selectedUserId]),
    ]);
    res.json({ scopes, audits });
  });
  app.delete("/test-scope-state/:userId", async (req, res) => {
    await db.transaction(async (manager) => {
      await manager.query(`DELETE FROM user_financial_data_scope_audits WHERE target_user_id = $1`, [req.params.userId]);
      await manager.query(`DELETE FROM user_financial_data_scopes WHERE user_id = $1`, [req.params.userId]);
    });
    res.sendStatus(204);
  });
  const server = app.listen(3200, "0.0.0.0", () => process.stdout.write(`browser-finance-test-ready income=${incomeId}\n`));
  const scopeService = new IncomeDataScopeService(accessControl, db);
  const attachmentRepository = new SaleOrderAttachmentTypeormRepository(db.getRepository(SaleOrderAttachmentEntity));
  const listAttachments = new ListSaleOrderAttachmentsUsecase(attachmentRepository);
  const getIncomeEvidence = new GetIncomeEvidenceUsecase(db.manager, listAttachments);
  const uploadAttachment = new UploadSaleOrderAttachmentUsecase(
    attachmentRepository,
    evidenceStorage as any,
    db.manager,
    new TypeormUnitOfWork(db),
    { toWebp: async () => { throw new Error("La prueba de upload usa PNG y no debe convertirlo"); } } as any,
  );
  const uploadIncomeEvidence = new UploadIncomeEvidenceUsecase(
    db.manager,
    getIncomeEvidence,
    uploadAttachment,
    { emitToAllConnected: () => undefined } as any,
  );
  const uow = { runInTransaction: (callback: (tx: any) => Promise<any>) => db.transaction((manager) => callback(new TypeormTransactionContext(manager))) };
  const saleOrderRepository = {
    findByIdForUpdate: async (id: string) => id === orderId ? { id, clientId, createdBy: creatorId, currentStateId: null } : null,
    countSaleOrdersByClientId: async () => 1,
  };
  const workflowTransition = { advance: async (input: { saleOrderId: string }, tx: any) => {
    await tx.manager.query(`UPDATE sale_orders SET current_state_id = $2 WHERE id = $1`, [input.saleOrderId, cancelledStateId]);
    return { order: { currentStateId: cancelledStateId } };
  } };
  const cancellationUsecase = new CancelSaleOrderUsecase(uow as any, saleOrderRepository as any, { update: async () => undefined } as any, workflowTransition as any, {} as any, accessControl);
  const executeCancellation = cancellationUsecase.execute.bind(cancellationUsecase);
  (cancellationUsecase as any).execute = async (input: Parameters<CancelSaleOrderUsecase["execute"]>[0]) => {
    try { return await executeCancellation(input); }
    catch (error: any) {
      process.stderr.write(`browser-finance-cancellation-error ${error?.stack ?? String(error)}\n`);
      throw error;
    }
  };
  const salePaymentRepository = new SalePaymentTypeormRepository(db.getRepository(SalePaymentEntity));
  const paymentReconciler = new SaleOrderPaymentReconcilerService(salePaymentRepository);
  const saveSaleOrderWithClient = new SaveSaleOrderWithClientUsecase(
    uow as any,
    { execute: async (command: any) => ({ clientId: command.id, event: null }) } as any,
    {} as any,
    { executeInTransaction: async (input: any) => ({ orderId: input.saleOrderId, previousTotal: 100, currentStateId: null }) } as any,
    paymentReconciler,
    { list: async () => [] } as any,
    { delete: async () => true } as any,
    { emitClientUpdated: () => undefined } as any,
    {} as any,
  );
  const scopeModule = await Test.createTestingModule({
    controllers: [IncomeController],
    providers: [
      { provide: ListIncomeUsecase, useValue: { execute: async () => ({ items: [], total: 0 }) } },
      { provide: GetIncomeSummaryUsecase, useValue: { execute: async () => ({}) } },
      { provide: GetIncomeEvidenceUsecase, useValue: getIncomeEvidence },
      { provide: UploadIncomeEvidenceUsecase, useValue: uploadIncomeEvidence },
      { provide: FILE_STORAGE, useValue: evidenceStorage },
      { provide: ManageIncomePaymentsUsecase, useValue: usecase },
      { provide: IncomeEvidenceAccessUsecase, useValue: new IncomeEvidenceAccessUsecase(db.manager) },
      { provide: IncomeEvidenceRevisionsUsecase, useValue: new IncomeEvidenceRevisionsUsecase(db.manager) },
      { provide: AccessControlService, useValue: accessControl },
      { provide: IncomeDataScopeService, useValue: scopeService },
      { provide: IncomeResourceScopeGuard, useValue: new IncomeResourceScopeGuard(scopeService) },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      request.user = { id: request.headers["x-e2e-user"] ?? userId };
      return true;
    } })
    .overrideGuard(CompanyConfiguredGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const scopeHttpApp = scopeModule.createNestApplication();
  scopeHttpApp.setGlobalPrefix("api");
  scopeHttpApp.enableCors({ origin: true, credentials: true });
  await scopeHttpApp.listen(3201, "0.0.0.0");
  process.stdout.write(`browser-finance-scope-api-ready target=${targetUserId}\n`);
  const saleOrdersModule = await Test.createTestingModule({
    controllers: [SaleOrdersController],
    providers: [
      { provide: CancelSaleOrderUsecase, useValue: cancellationUsecase },
      { provide: SaveSaleOrderWithClientUsecase, useValue: saveSaleOrderWithClient },
      { provide: AccessControlService, useValue: accessControl },
      { provide: SaleOrderAutomaticWorkflowService, useValue: { evaluateAndNotify: async () => ({ updated: true }) } },
    ],
  })
    .useMocker(() => ({}))
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (context: any) => {
      const request = context.switchToHttp().getRequest();
      request.user = { id: request.headers["x-e2e-user"] ?? userId };
      return true;
    } })
    .overrideGuard(CompanyConfiguredGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const saleOrdersHttpApp = saleOrdersModule.createNestApplication();
  saleOrdersHttpApp.setGlobalPrefix("api");
  saleOrdersHttpApp.enableCors({ origin: true, credentials: true });
  await saleOrdersHttpApp.listen(3202, "0.0.0.0");
  process.stdout.write("browser-finance-sale-orders-api-ready\n");
  const stop = async () => { await saleOrdersHttpApp.close(); await scopeHttpApp.close(); server.close(); await db.destroy(); process.exit(0); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

async function createSchema() {
  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.query(`CREATE TYPE currency_type AS ENUM ('PEN', 'USD')`);
  await db.query(`CREATE TABLE companies (company_id uuid PRIMARY KEY, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE users (user_id uuid PRIMARY KEY, company_id uuid REFERENCES companies(company_id), is_super_admin boolean NOT NULL DEFAULT false, deleted boolean NOT NULL DEFAULT false)`);
  await db.query(`CREATE TABLE clients (id uuid PRIMARY KEY, full_name varchar(255) NOT NULL DEFAULT 'Cliente E2E', is_active boolean NOT NULL DEFAULT true)`);
  await db.query(`CREATE TABLE subsidiaries (id uuid PRIMARY KEY, alias varchar(120) NOT NULL, is_active boolean NOT NULL DEFAULT true)`);
  await db.query(`CREATE TABLE permissions (permission_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), code varchar NOT NULL UNIQUE, name varchar NOT NULL, description varchar, module varchar, resource varchar, action varchar, type varchar NOT NULL DEFAULT 'action', is_system boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true)`);
  await db.query(`CREATE TABLE sale_orders (id uuid PRIMARY KEY, company_id uuid REFERENCES companies(company_id), client_id uuid REFERENCES clients(id), total numeric(14,2) NOT NULL, currency currency_type NOT NULL, is_active boolean NOT NULL DEFAULT true, current_state_id uuid, serie varchar(40), correlative integer, created_by uuid REFERENCES users(user_id), created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE sale_order_states (id uuid PRIMARY KEY, code varchar(40) NOT NULL)`);
  await db.query(`CREATE TABLE workflow_states (id uuid PRIMARY KEY, sale_order_state_id uuid REFERENCES sale_order_states(id))`);
  await db.query(`CREATE TABLE company_payment_accounts (company_payment_account_id uuid PRIMARY KEY, company_id uuid REFERENCES companies(company_id), type varchar(30) NOT NULL, usage varchar(20) NOT NULL DEFAULT 'BOTH', name varchar(150) NOT NULL, bank_name varchar(120), institution_name varchar(120), account_number varchar(120), account_last_four varchar(4), cci_last_four varchar(4), card_last_four varchar(4), wallet_name varchar(120), wallet_provider varchar(120), wallet_phone_last_four varchar(4), holder_name varchar(150), sensitive_identifier_encrypted text, sensitive_identifier_hash varchar(64), masked_label varchar(220), currency currency_type NOT NULL, is_active boolean NOT NULL DEFAULT true, is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE payment_methods (method_id uuid PRIMARY KEY, is_active boolean DEFAULT true, code varchar(80), name varchar(120), requires_operation_reference boolean DEFAULT false)`);
  await db.query(`CREATE TABLE sale_payments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), sale_order_id uuid REFERENCES sale_orders(id), amount numeric(14,2) NOT NULL, currency currency_type NOT NULL, status varchar(32) NOT NULL, payment_date date NOT NULL, date timestamptz NOT NULL, method varchar(100) NOT NULL, operation_number varchar(100), operation_code varchar(80), note varchar(255), payment_photo varchar, company_payment_account_id uuid, payment_method_id uuid, version integer NOT NULL DEFAULT 1, created_by_user_id uuid, updated_by_user_id uuid, reversed_at timestamptz, reversed_by_user_id uuid, voided_at timestamptz, voided_by_user_id uuid, void_reason text, financial_reason text, corrected_from_payment_id uuid, reentered_from_payment_id uuid REFERENCES sale_payments(id), posted_at timestamptz, posted_by_user_id uuid, accounting_date date, cancelled_at timestamptz, cancelled_by_user_id uuid, created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE UNIQUE INDEX sale_payments_test_operation_number_uq ON sale_payments (lower(btrim(operation_number))) WHERE operation_number IS NOT NULL`);
  await db.query(`CREATE TABLE sale_order_attachments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), sale_order_id uuid, sale_order_payment_id uuid, type varchar(60), filename varchar(255), original_name varchar(255), mime_type varchar(100), size_bytes bigint, url text, storage_path text, uploaded_by_user_id uuid, note text, content_sha256 varchar(64), upload_idempotency_key uuid, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`);
  await db.query(`CREATE TABLE sale_payment_allocations (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), sale_payment_id uuid NOT NULL REFERENCES sale_payments(id), sale_order_id uuid NOT NULL REFERENCES sale_orders(id), amount numeric(14,2) NOT NULL, currency currency_type NOT NULL, created_by_user_id uuid NOT NULL)`);
  await db.query(`CREATE TABLE financial_account_movements (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), company_payment_account_id uuid NOT NULL, sale_payment_id uuid NULL REFERENCES sale_payments(id), refund_id uuid NULL, reverses_movement_id uuid, movement_type varchar(20) NOT NULL, amount numeric(14,2) NOT NULL, currency currency_type NOT NULL, operation_date date NOT NULL, created_by_user_id uuid NOT NULL, reason text)`);
  await db.query(`CREATE TABLE bank_statement_lines (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), company_payment_account_id uuid NOT NULL REFERENCES company_payment_accounts(company_payment_account_id), bank_reference varchar(120) NOT NULL, operation_date date NOT NULL, amount numeric(14,2) NOT NULL CHECK (amount > 0), currency currency_type NOT NULL, created_by_user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (company_payment_account_id, bank_reference))`);
  await db.query(`CREATE TABLE bank_reconciliation_allocations (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), bank_statement_line_id uuid NOT NULL REFERENCES bank_statement_lines(id), sale_payment_id uuid NOT NULL REFERENCES sale_payments(id), amount numeric(14,2) NOT NULL, created_by_user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), unreconciled_by_user_id uuid, unreconciled_at timestamptz, unreconcile_reason text)`);
  await db.query(`CREATE TABLE customer_refunds (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), sale_payment_id uuid NOT NULL REFERENCES sale_payments(id), client_id uuid REFERENCES clients(id), company_payment_account_id uuid, amount numeric(14,2), currency currency_type, status varchar(16) NOT NULL, operation_number varchar(120), reason text, created_by_user_id uuid, posted_by_user_id uuid, posted_at timestamptz, reversed_by_user_id uuid, reversed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE customer_credit_movements (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), client_id uuid NOT NULL REFERENCES clients(id), sale_payment_id uuid NOT NULL REFERENCES sale_payments(id), source_sale_order_id uuid NOT NULL REFERENCES sale_orders(id), target_sale_order_id uuid, movement_type varchar(20) NOT NULL, amount numeric(14,2) NOT NULL, currency currency_type NOT NULL, created_by_user_id uuid NOT NULL, reason varchar(500) NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE sale_order_auditory (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), sale_order_id uuid NOT NULL REFERENCES sale_orders(id), executed_by uuid NOT NULL, action_execution varchar(120) NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE financial_outbox_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), event_type varchar(120) NOT NULL, aggregate_type varchar(80) NOT NULL, aggregate_id uuid NOT NULL, payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE financial_idempotency_records (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), scope_key varchar(220) NOT NULL, idempotency_key uuid NOT NULL, request_hash varchar(64) NOT NULL, status varchar(16) NOT NULL, response_status integer, response_body jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, UNIQUE (scope_key, idempotency_key))`);
  await db.query(`INSERT INTO companies (company_id) VALUES ($1)`, [companyId]);
  await db.query(`INSERT INTO users (user_id, company_id) VALUES ($1, $5), ($2, $5), ($3, $5), ($4, $5)`, [userId, targetUserId, unprivilegedUserId, creatorId, companyId]);
  await db.query(`INSERT INTO clients (id) VALUES ($1)`, [clientId]);
  await db.query(`INSERT INTO clients (id, full_name) VALUES ('40000000-0000-4000-8000-000000000002', 'Cliente alternativo')`);
  await db.query(`INSERT INTO subsidiaries (id, alias) VALUES ('90000000-0000-4000-8000-000000000001', 'Sede Centro')`);
  await db.query(`INSERT INTO sale_orders (id, company_id, client_id, total, currency, created_by) VALUES ($1, $2, $3, 100, 'PEN', $4)`, [orderId, companyId, clientId, creatorId]);
  await db.query(`INSERT INTO sale_orders (id, company_id, client_id, total, currency, created_by) VALUES ($1, $2, $3, 100, 'PEN', $4)`, [editOrderId, companyId, clientId, creatorId]);
  await db.query(`INSERT INTO sale_orders (id, company_id, client_id, total, currency, created_by) VALUES ($1, $2, $3, 100, 'PEN', $4)`, [cancellationTargetOrderId, companyId, clientId, creatorId]);
  await db.query(`INSERT INTO sale_orders (id, company_id, client_id, total, currency, created_by) VALUES ($1, $2, $3, 100, 'USD', $4)`, [withClientOrderId, companyId, clientId, userId]);
  await db.query(`INSERT INTO company_payment_accounts (company_payment_account_id, company_id, name, masked_label, currency, usage, type) VALUES ($1, $2, 'Cuenta de pruebas', 'Banco terminado en 0001', 'PEN', 'INFLOW', 'BANK_ACCOUNT')`, [accountId, companyId]);
  await db.query(`INSERT INTO company_payment_accounts (company_payment_account_id, company_id, name, masked_label, currency, usage, type) VALUES ($1, $2, 'Cuenta de salida', 'Banco terminado en 0002', 'PEN', 'OUTFLOW', 'BANK_ACCOUNT')`, [outflowAccountId, companyId]);
  await db.query(`INSERT INTO company_payment_accounts (company_payment_account_id, company_id, name, masked_label, currency, usage, type) VALUES ($1, $2, 'Cuenta USD de pruebas', 'Banco USD terminado en 0003', 'USD', 'INFLOW', 'BANK_ACCOUNT')`, [usdAccountId, companyId]);
  await db.query(`INSERT INTO payment_methods (method_id, code, name) VALUES ($1, 'BANK_TRANSFER', 'Transferencia')`, [methodId]);
  await db.query(`INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id, payment_method_id, created_by_user_id) VALUES ($1, $2, 45.67, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', $3, $4, $5)`, [incomeId, orderId, accountId, methodId, creatorId]);
  await db.query(`INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, operation_number, operation_code, company_payment_account_id, payment_method_id, created_by_user_id)
    VALUES ($1, $2, 1, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', 'OP-HTTP-DUPLICATE', 'OP-HTTP-DUPLICATE', $3, $4, $5),
      ($6, $2, 2, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', NULL, NULL, $3, $4, $5)`,
  [duplicateSourceIncomeId, editOrderId, accountId, methodId, creatorId, editIncomeId]);
}

function sendError(res: express.Response, error: any) {
  const status = typeof error?.getStatus === "function" ? error.getStatus() : 500;
  const body = typeof error?.getResponse === "function" ? error.getResponse() : { message: "Error en servidor de prueba" };
  res.status(status).json(typeof body === "string" ? { message: body } : body);
}

void main().catch((error) => { process.stderr.write(`${error?.stack ?? error}\n`); process.exit(1); });
