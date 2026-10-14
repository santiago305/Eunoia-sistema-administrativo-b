import "reflect-metadata";
import { PERMISSIONS_SEED } from "src/modules/access-control/application/constants/permissions-seed";
import { PERMISSION_GROUPS_KEY, PERMISSIONS_KEY } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { IncomeController } from "./income.controller";

describe("IncomeController evidence contract", () => {
  it("forwards pending-edit idempotency keys to the use case", async () => {
    const managePayments = { updatePending: jest.fn().mockResolvedValue({ type: "success" }) };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any);
    const body = {
      idempotencyKey: "88888888-8888-4888-8888-888888888888", version: 1, amount: 20.5, date: "2026-10-13",
      paymentMethodId: "method-1", companyPaymentAccountId: "account-1", operationNumber: null, note: null,
    };
    await expect(controller.updatePending("income-1", body, { id: "user-1" })).resolves.toEqual({ type: "success" });
    expect(managePayments.updatePending).toHaveBeenCalledWith({ incomeId: "income-1", userId: "user-1", ...body });
  });

  it("protects every controller endpoint and references only permissions in the assignable catalog", () => {
    const prototype = IncomeController.prototype;
    const endpointNames = Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor");
    const catalog = new Set(PERMISSIONS_SEED.map(({ code }) => code));
    const missingPermissions = endpointNames.filter((name) => {
      const handler = (prototype as unknown as Record<string, unknown>)[name];
      return typeof handler === "function" && !Reflect.getMetadata(PERMISSIONS_KEY, handler);
    });
    const unknownPermissions = endpointNames.flatMap((name) => {
      const handler = (prototype as unknown as Record<string, unknown>)[name];
      if (typeof handler !== "function") return [];
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[] | undefined;
      return (permissions ?? []).filter((permission) => !catalog.has(permission)).map((permission) => `${name}: ${permission}`);
    });

    expect(missingPermissions).toEqual([]);
    expect(unknownPermissions).toEqual([]);
  });

  it("protects Excel income exports with income.export and sends an attachment", async () => {
    const exportIncome = { execute: jest.fn().mockResolvedValue({ filename: "ingresos-test.xlsx", content: Buffer.from("xlsx") }) };
    const incomeDataScope = { resolve: jest.fn().mockResolvedValue({ userId: "user-1", companyId: "company-1", subsidiaryIds: [], accountIds: [], clientIds: [] }) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, undefined, exportIncome as any, undefined, incomeDataScope as any);
    await controller.exportIncomeExcel({ columns: [{ key: "reconciledAmount" }] }, { id: "user-1" }, response as any);
    expect(exportIncome.execute).toHaveBeenCalledWith({ columns: [{ key: "reconciledAmount" }], scopeUserId: "user-1", scopeCompanyId: "company-1", scopeSubsidiaryIds: [], scopeAccountIds: [], scopeClientIds: [] });
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="ingresos-test.xlsx"');
    expect(response.send).toHaveBeenCalledWith(Buffer.from("xlsx"));
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.exportIncomeExcel)).toEqual(["income.export"]);
    expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, IncomeController.prototype.exportIncomeExcel)).toEqual([["income.view_all", "income.view_own"]]);
  });

  it("protects outbox monitoring and retry with separate financial permissions", async () => {
    const financialOutbox = {
      getHealth: jest.fn().mockResolvedValue({ pending: 1 }),
      listDeadLetters: jest.fn().mockResolvedValue([]),
      retryDeadLetter: jest.fn().mockResolvedValue({ id: "event-1", queued: true }),
    };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, undefined, undefined, financialOutbox as any);
    await expect(controller.getFinancialOutboxHealth()).resolves.toEqual({ pending: 1 });
    await expect(controller.listFinancialOutboxDeadLetters("20")).resolves.toEqual([]);
    await expect(controller.retryFinancialOutboxEvent("11111111-1111-4111-8111-111111111111", { id: "operator-1" })).resolves.toEqual({ id: "event-1", queued: true });
    expect(financialOutbox.retryDeadLetter).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "operator-1");
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.getFinancialOutboxHealth)).toEqual(["income.audit.view"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.listFinancialOutboxDeadLetters)).toEqual(["income.audit.view"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.retryFinancialOutboxEvent)).toEqual(["income.outbox.manage"]);
    expect(() => controller.listFinancialOutboxDeadLetters("101")).toThrow("El límite debe ser un entero entre 1 y 100.");
  });

  it("requires separate permissions for reading content and attaching evidence", () => {
    const prototype = IncomeController.prototype;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.evidence)).toEqual(["income.read", "payments.view_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.evidenceContent)).toEqual(["income.read", "payments.view_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.listEvidenceRevisions)).toEqual(["income.read", "income.audit.view"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.evidenceRevisionContent)).toEqual(["income.read", "income.audit.view", "payments.view_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.uploadEvidenceFile)).toEqual(["income.read", "payments.attach_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.uploadCorrectionEvidence)).toEqual(["income.read", "sale_orders.payments.correct_posted", "payments.attach_evidence"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.listEvidenceAccessLog)).toEqual(["income.audit.view"]);
    expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, prototype.listEvidenceAccessLog)).toEqual([["income.view_all", "income.view_own"]]);
    for (const endpoint of [prototype.list, prototype.summary, prototype.evidence, prototype.evidenceContent, prototype.listEvidenceRevisions, prototype.evidenceRevisionContent, prototype.uploadEvidenceFile, prototype.uploadCorrectionEvidence, prototype.exportIncomeExcel]) {
      expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, endpoint)).toEqual([["income.view_all", "income.view_own"]]);
    }
    const resourceEndpoints = [
      prototype.updatePending, prototype.correctPosted, prototype.transferTargets, prototype.cancellationTargets,
      prototype.listRefunds, prototype.listReconciliations, prototype.reconcileIncome, prototype.unreconcileIncome,
      prototype.createRefund, prototype.postRefund, prototype.cancelRefund, prototype.reverseRefund,
      prototype.getCustomerCredits, prototype.applyCustomerCredit, prototype.transferPending, prototype.prevalidateOne,
      prototype.postOne, prototype.prevalidateBatch, prototype.postBatch, prototype.cancelPending, prototype.reversePosted,
      prototype.reenter, prototype.createBankStatementLine, prototype.listAvailableBankStatementLines,
      prototype.bankReconciliationReport,
    ];
    for (const endpoint of resourceEndpoints) {
      expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, endpoint)).toEqual([["income.view_all", "income.view_own"]]);
    }
  });

  it("requires the dedicated permission to transfer a pending income", () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.transferPending)).toEqual(["sale_orders.payments.transfer_pending"]);
  });

  it("requires the dedicated permission to correct a posted income", () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.correctPosted)).toEqual(["sale_orders.payments.correct_posted"]);
  });

  it("protects batch-result recovery with the bulk-post permission and scopes it to the current user", async () => {
    const managePayments = { getBatchResult: jest.fn().mockResolvedValue({ batchId: "batch-1" }) };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any);
    await expect(controller.getBulkOperationResult("batch-1", { id: "user-1" })).resolves.toEqual({ batchId: "batch-1" });
    expect(managePayments.getBatchResult).toHaveBeenCalledWith("batch-1", "user-1");
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.getBulkOperationResult)).toEqual(["sale_orders.payments.post_bulk"]);
  });

  it("allows individual or bulk posters to recover a result, while requiring income read scope", async () => {
    const managePayments = { getBatchResult: jest.fn().mockResolvedValue({ type: "success", count: 1 }) };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any);
    await expect(controller.getPostingOperationResult("operation-1", { id: "user-1" })).resolves.toMatchObject({ type: "success", count: 1 });
    expect(managePayments.getBatchResult).toHaveBeenCalledWith("operation-1", "user-1");
    expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, IncomeController.prototype.getPostingOperationResult)).toEqual([
      ["sale_orders.payments.post", "sale_orders.payments.post_bulk"],
      ["income.view_all", "income.view_own"],
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.getPostingOperationResult)).toEqual(["income.read"]);
  });

  it("routes customer-credit balance reads and applications through their dedicated permissions", async () => {
    const managePayments = {
      getAvailableCustomerCredits: jest.fn().mockResolvedValue([{ currency: "PEN", available: 20 }]),
      applyCustomerCredit: jest.fn().mockResolvedValue({ type: "success" }),
    };
    const incomeDataScope = {
      resolve: jest.fn().mockResolvedValue({ userId: "user-1", subsidiaryIds: [], accountIds: ["account-1"], clientIds: [] }),
      listReadableIncomeIdsForClient: jest.fn().mockResolvedValue(["income-1"]),
    };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any, undefined, undefined, incomeDataScope as any);
    await expect(controller.getCustomerCredits("client-1", { id: "user-1" })).resolves.toEqual([{ currency: "PEN", available: 20 }]);
    await expect(controller.applyCustomerCredit({ clientId: "11111111-1111-4111-8111-111111111111", saleOrderId: "22222222-2222-4222-8222-222222222222", amount: 20, reason: "Aplicación autorizada", idempotencyKey: "33333333-3333-4333-8333-333333333333" }, { id: "user-1" })).resolves.toEqual({ type: "success" });
    expect(managePayments.getAvailableCustomerCredits).toHaveBeenCalledWith("client-1", "user-1", ["income-1"]);
    expect(managePayments.applyCustomerCredit).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", amount: 20, allowedIncomeIds: ["income-1"] }));
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.getCustomerCredits)).toEqual(["customer_credits.view"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.applyCustomerCredit)).toEqual(["customer_credits.apply"]);
  });

  it("limits transfer and cancellation target lists to sale orders readable in the user's financial scope", async () => {
    const managePayments = {
      listTransferTargets: jest.fn().mockResolvedValue([]),
      listCancellationTargets: jest.fn().mockResolvedValue([]),
    };
    const scope = { userId: "user-1", subsidiaryIds: [], accountIds: ["account-1"], clientIds: [] };
    const incomeDataScope = {
      resolve: jest.fn().mockResolvedValue(scope),
      listReadableSaleOrderIdsForIncome: jest.fn().mockResolvedValue(["target-order-1"]),
    };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any, undefined, undefined, incomeDataScope as any);

    await expect(controller.transferTargets("income-1", "target", { id: "user-1" })).resolves.toEqual([]);
    await expect(controller.cancellationTargets("income-1", "target", { id: "user-1" })).resolves.toEqual([]);
    expect(managePayments.listTransferTargets).toHaveBeenCalledWith("income-1", "target", ["target-order-1"]);
    expect(managePayments.listCancellationTargets).toHaveBeenCalledWith("income-1", "user-1", "target", ["target-order-1"]);
  });

  it("exposes refund lifecycle actions behind separate permissions", async () => {
    const managePayments = {
      listRefunds: jest.fn().mockResolvedValue({ items: [{ id: "refund-1", status: "PENDING" }], availableCredit: 12.5 }),
      createRefund: jest.fn().mockResolvedValue({ status: "PENDING" }),
      postRefund: jest.fn().mockResolvedValue({ status: "POSTED" }),
      cancelRefund: jest.fn().mockResolvedValue({ status: "CANCELLED" }),
      reverseRefund: jest.fn().mockResolvedValue({ status: "REVERSED" }),
    };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, managePayments as any);
    await expect(controller.listRefunds("payment-1", { id: "reader-1" })).resolves.toEqual({ items: [{ id: "refund-1", status: "PENDING" }], availableCredit: 12.5 });
    await expect(controller.createRefund("payment-1", { amount: 12.5, reason: "Devolución acordada", idempotencyKey: "key" }, { id: "operator-1" })).resolves.toEqual({ status: "PENDING" });
    await expect(controller.postRefund("refund-1", { companyPaymentAccountId: "11111111-1111-4111-8111-111111111111", operationNumber: "REF-1", idempotencyKey: "key" }, { id: "approver-1" })).resolves.toEqual({ status: "POSTED" });
    await expect(controller.cancelRefund("refund-1", { reason: "Cancelación aprobada", idempotencyKey: "key" }, { id: "operator-1" })).resolves.toEqual({ status: "CANCELLED" });
    await expect(controller.reverseRefund("refund-1", { reason: "Reversión aprobada", idempotencyKey: "key" }, { id: "approver-1" })).resolves.toEqual({ status: "REVERSED" });
    expect(managePayments.postRefund).toHaveBeenCalledWith(expect.objectContaining({ refundId: "refund-1", userId: "approver-1" }));
    expect(managePayments.createRefund).toHaveBeenCalledWith(expect.objectContaining({ incomeId: "payment-1", userId: "operator-1", amount: 12.5 }));
    expect(managePayments.cancelRefund).toHaveBeenCalledWith(expect.objectContaining({ refundId: "refund-1", userId: "operator-1" }));
    expect(managePayments.reverseRefund).toHaveBeenCalledWith(expect.objectContaining({ refundId: "refund-1", userId: "approver-1" }));
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.listRefunds)).toEqual(["customer_refunds.view"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.createRefund)).toEqual(["customer_refunds.create"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.postRefund)).toEqual(["customer_refunds.post"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.cancelRefund)).toEqual(["customer_refunds.cancel"]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.reverseRefund)).toEqual(["customer_refunds.reverse"]);
  });

  it("routes corrected-payment evidence through its separately protected upload path", async () => {
    const uploadEvidence = { execute: jest.fn(async () => ({ id: "attachment-1" })) };
    const controller = new IncomeController({} as any, {} as any, {} as any, uploadEvidence as any, {} as any);
    await controller.uploadCorrectionEvidence("income-1", { buffer: Buffer.from("image") } as any, { id: "user-1" }, "11111111-1111-4111-8111-111111111111");
    expect(uploadEvidence.execute).toHaveBeenCalledWith("income-1", { buffer: Buffer.from("image") }, "user-1", "11111111-1111-4111-8111-111111111111", true);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, IncomeController.prototype.uploadCorrectionEvidence)).toEqual(["income.read", "sale_orders.payments.correct_posted", "payments.attach_evidence"]);
  });

  it("serves private image content with no-store caching", async () => {
    const getEvidence = { execute: jest.fn(async () => ({ saleOrderId: "order-1", attachmentId: "attachment-1", inherited: false, url: "private/sale-order-attachments/order/proof.webp", mimeType: "image/webp" })) };
    const fileStorage = { read: jest.fn(async () => Buffer.from("image")) };
    const evidenceAccessAudit = { record: jest.fn().mockResolvedValue(undefined) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, evidenceAccessAudit as any);
    await controller.evidenceContent("income-1", { id: "reader-1" }, response as any);
    expect(fileStorage.read).toHaveBeenCalledWith("private/sale-order-attachments/order/proof.webp");
    expect(evidenceAccessAudit.record).toHaveBeenCalledWith(expect.objectContaining({
      incomeId: "income-1", saleOrderId: "order-1", attachmentId: "attachment-1", userId: "reader-1", inherited: false,
      content: Buffer.from("image"),
    }));
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(response.setHeader).toHaveBeenCalledWith("Cross-Origin-Resource-Policy", "cross-origin");
    expect(response.send).toHaveBeenCalledWith(Buffer.from("image"));
  });

  it("serves a legacy absolute API asset URL from local storage without fetching its host", async () => {
    const getEvidence = { execute: jest.fn(async () => ({ saleOrderId: "order-1", attachmentId: "legacy-attachment", url: "https://api.example.test/api/assets/payment-proofs/legacy.jpg", mimeType: "application/octet-stream" })) };
    const fileStorage = { read: jest.fn(async () => Buffer.from([0xff, 0xd8, 0xff, 0x00])) };
    const evidenceAccessAudit = { record: jest.fn().mockResolvedValue(undefined) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, evidenceAccessAudit as any);

    await controller.evidenceContent("income-1", { id: "reader-1" }, response as any);

    expect(fileStorage.read).toHaveBeenCalledWith("/api/assets/payment-proofs/legacy.jpg");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    expect(response.send).toHaveBeenCalledWith(Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    expect(evidenceAccessAudit.record).toHaveBeenCalledWith(expect.objectContaining({ attachmentId: "legacy-attachment" }));
  });

  it("does not resolve arbitrary absolute evidence URLs to local files", async () => {
    const getEvidence = { execute: jest.fn(async () => ({ saleOrderId: "order-1", url: "https://attacker.example.test/private/proof.jpg" })) };
    const fileStorage = { read: jest.fn() };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any);

    await expect(controller.evidenceContent("income-1", { id: "reader-1" }, response as any)).rejects.toThrow("Contenido de evidencia no disponible");
    expect(fileStorage.read).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  it("serves an authorized historical legacy revision through its local asset path", async () => {
    const revision = { saleOrderId: "order-1", storagePath: "https://api.example.test/api/assets/payment-proofs/old.png", mimeType: "application/octet-stream" };
    const evidenceRevisions = { get: jest.fn(async () => revision) };
    const fileStorage = { read: jest.fn(async () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) };
    const evidenceAccessAudit = { record: jest.fn().mockResolvedValue(undefined) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, fileStorage as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, evidenceAccessAudit as any, evidenceRevisions as any);

    await controller.evidenceRevisionContent("income-1", "attachment-1", { id: "reader-1" }, response as any);

    expect(fileStorage.read).toHaveBeenCalledWith("/api/assets/payment-proofs/old.png");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(evidenceAccessAudit.record).toHaveBeenCalledWith(expect.objectContaining({ incomeId: "income-1", attachmentId: "attachment-1", userId: "reader-1" }));
    expect(response.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it.each([
    ["PNG", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"],
    ["WebP", Buffer.from("RIFF0000WEBP"), "image/webp"],
  ])("detects the %s MIME type when legacy metadata is generic", async (_format, content, mimeType) => {
    const getEvidence = { execute: jest.fn(async () => ({ saleOrderId: "order-1", url: "private/sale-order-attachments/order/proof", mimeType: "application/octet-stream" })) };
    const fileStorage = { read: jest.fn(async () => content) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any);

    await controller.evidenceContent("income-1", { id: "reader-1" }, response as any);

    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", mimeType);
    expect(response.send).toHaveBeenCalledWith(content);
  });

  it("does not send evidence when access-audit persistence fails", async () => {
    const getEvidence = { execute: jest.fn().mockResolvedValue({ saleOrderId: "order-1", url: "private/proof.webp", mimeType: "image/webp" }) };
    const fileStorage = { read: jest.fn().mockResolvedValue(Buffer.from("image")) };
    const evidenceAccessAudit = { record: jest.fn().mockRejectedValue(new Error("database unavailable")) };
    const response = { setHeader: jest.fn(), send: jest.fn() };
    const controller = new IncomeController({} as any, {} as any, getEvidence as any, {} as any, fileStorage as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, evidenceAccessAudit as any);

    await expect(controller.evidenceContent("income-1", { id: "reader-1" }, response as any)).rejects.toThrow("database unavailable");
    expect(response.send).not.toHaveBeenCalled();
  });

  it("bounds evidence-access audit queries", async () => {
    const evidenceAccessAudit = { list: jest.fn().mockResolvedValue([]) };
    const controller = new IncomeController({} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, undefined, undefined, undefined, undefined, evidenceAccessAudit as any);
    await expect(controller.listEvidenceAccessLog("income-1", "25")).resolves.toEqual([]);
    expect(evidenceAccessAudit.list).toHaveBeenCalledWith("income-1", 25);
    expect(() => controller.listEvidenceAccessLog("income-1", "101")).toThrow("El límite debe ser un entero entre 1 y 100.");
  });
});
