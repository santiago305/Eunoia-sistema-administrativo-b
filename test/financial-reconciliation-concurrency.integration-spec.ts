import { createHash, randomUUID } from "crypto";
import { ConflictException, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource, DataSourceOptions } from "typeorm";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { SaleOrderItemEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { SaleOrderAttachmentEntity } from "src/modules/sale-order-attachments/adapters/out/persistence/typeorm/entities/sale-order-attachment.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderAttachmentTypeormRepository } from "src/modules/sale-order-attachments/adapters/out/persistence/typeorm/repositories/sale-order-attachment.typeorm.repo";
import { ListSaleOrderAttachmentsUsecase } from "src/modules/sale-order-attachments/application/usecases/list-sale-order-attachments.usecase";
import { UploadSaleOrderAttachmentUsecase } from "src/modules/sale-order-attachments/application/usecases/upload-sale-order-attachment.usecase";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { SalePaymentTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-payment.typeorm.repo";
import { SaleOrderPaymentReconcilerService } from "src/modules/sale-orders/application/services/sale-order-payment-reconciler.service";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import { PreserveFinancialOperationReferenceHistory20261012060000 } from "src/infrastructure/database/migrations/20261012060000-preserve-financial-operation-reference-history";
import { AddIncomeDataScopePermissions20261012070000 } from "src/infrastructure/database/migrations/20261012070000-add-income-data-scope-permissions";
import { CreateIncomeUserDataScopes20261012080000 } from "src/infrastructure/database/migrations/20261012080000-create-income-user-data-scopes";
import { IncomeDataScopeService } from "src/modules/income/application/services/income-data-scope.service";
import { IncomeResourceScopeGuard } from "src/modules/income/adapters/in/guards/income-resource-scope.guard";
import { normalizeIncomeFilters } from "src/modules/income/application/dtos/income-filter.input";
import { IncomeQueryTypeormRepository } from "src/modules/income/adapters/out/persistence/typeorm/repositories/income-query.typeorm.repo";
import { IncomeController } from "src/modules/income/adapters/in/controllers/income.controller";
import { GetIncomeSummaryUsecase } from "src/modules/income/application/usecases/get-income-summary.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "src/modules/income/application/usecases/get-income-evidence.usecase";
import { ListIncomeUsecase } from "src/modules/income/application/usecases/list-income.usecase";
import { ManageIncomePaymentsUsecase } from "src/modules/income/application/usecases/manage-income-payments.usecase";
import { FinancialOutboxPublisher } from "src/modules/income/infrastructure/financial-outbox-publisher.service";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { SaleOrderTypeormRepository } from "src/modules/sale-orders/adapters/out/persistence/typeorm/repositories/sale-order.typeorm.repo";
import { financialCompanyScopeAuditQueries, financialLedgerAuditQueries, financialLifecyclePreflightQueries } from "../scripts/audit-financial-data";
import { auditIncomePaymentEvidence } from "../scripts/audit-income-payment-evidence";
import { createSalePaymentReconciliationReport } from "../scripts/reconcile-sale-payment-ledger";
import { PaymentLifecycleFourStates20261008000000 } from "src/infrastructure/database/migrations/20261008000000-payment-lifecycle-four-states";
import { ValidateSalePaymentLifecycle20261014010000 } from "src/infrastructure/database/migrations/20261014010000-validate-sale-payment-lifecycle";
import { CancelSaleOrderUsecase } from "src/modules/sale-orders/application/usecases/sale-order/cancel.usecase";
import { IdempotentIncomeEvidenceUpload20261013000000 } from "src/infrastructure/database/migrations/20261013000000-idempotent-income-evidence-upload";
import { CreatePaymentEvidenceAccessLogs20261013010000 } from "src/infrastructure/database/migrations/20261013010000-create-payment-evidence-access-logs";
import { CreatePaymentEvidenceUploadOperations20261013020000 } from "src/infrastructure/database/migrations/20261013020000-create-payment-evidence-upload-operations";
import { ManagePaymentEvidenceQuarantine20261013030000 } from "src/infrastructure/database/migrations/20261013030000-manage-payment-evidence-quarantine";
import { MapLegacySalePaymentUpdatePermission20261013050000 } from "src/infrastructure/database/migrations/20261013050000-map-legacy-sale-payment-update-permission";
import { IncomeEvidenceAccessUsecase } from "src/modules/income/application/usecases/income-evidence-access.usecase";
import { IncomeEvidenceUploadRecoveryService } from "src/modules/income/infrastructure/income-evidence-upload-recovery.service";
import { IncomeEvidenceRevisionsUsecase } from "src/modules/income/application/usecases/income-evidence-revisions.usecase";
import { IncomeEvidenceQuarantineUsecase } from "src/modules/income/application/usecases/income-evidence-quarantine.usecase";

const databaseName = process.env.TEST_DB_NAME ?? "";
const databaseUser = process.env.TEST_DB_USER ?? "postgres";
const isExplicitIntegrationDatabase = databaseName === "eunoia_financial_test" && databaseUser === "eunoia_test";
const schemaName = `income_reconciliation_${process.pid}`;
const connectionOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.TEST_DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? 5432),
  username: databaseUser,
  password: process.env.TEST_DB_PASSWORD ?? "postgres",
  database: databaseName,
  logging: false,
  extra: { max: 12 },
};

describe("income reconciliation PostgreSQL concurrency", () => {
  let admin: DataSource;
  let dataSource: DataSource;
  let usecase: ManageIncomePaymentsUsecase;
  let app: INestApplication;
  let httpPermissions: string[] = [];
  let listIncomeExecute: jest.Mock;
  let getIncomeSummaryExecute: jest.Mock;
  let getIncomeEvidenceExecute: jest.Mock;
  let listQuarantinedEvidence: jest.Mock;
  let recoverQuarantinedEvidence: jest.Mock;
  let fileStorageRead: jest.Mock;
  let accountId: string;
  let paymentMethodId: string;
  let companyId: string;
  let userId: string;
  let orderId: string;
  let clientId: string;

  beforeAll(async () => {
    if (!isExplicitIntegrationDatabase) {
      throw new Error("Refusing to run financial integration tests unless TEST_DB_NAME=eunoia_financial_test and TEST_DB_USER=eunoia_test.");
    }
    admin = new DataSource(connectionOptions);
    await admin.initialize();
    await admin.query(`CREATE SCHEMA ${schemaName}`);
    await admin.destroy();

    dataSource = new DataSource({
      ...connectionOptions,
      entities: [SaleOrderEntity, SaleOrderItemEntity, SalePaymentEntity, SaleOrderAttachmentEntity, CompanyPaymentAccountEntity, ClientEntity, PaymentMethodEntity],
      extra: { max: 12, options: `-c search_path=${schemaName},public` },
    });
    await dataSource.initialize();
    await createFinancialSchema(dataSource);
    const evidenceUploadMigration = new IdempotentIncomeEvidenceUpload20261013000000();
    const evidenceMigrationRunner = dataSource.createQueryRunner();
    await evidenceUploadMigration.up(evidenceMigrationRunner);
    await evidenceUploadMigration.up(evidenceMigrationRunner);
    const evidenceAccessMigration = new CreatePaymentEvidenceAccessLogs20261013010000();
    await evidenceAccessMigration.up(evidenceMigrationRunner);
    await evidenceAccessMigration.up(evidenceMigrationRunner);
    const evidenceOperationMigration = new CreatePaymentEvidenceUploadOperations20261013020000();
    await evidenceOperationMigration.up(evidenceMigrationRunner);
    await evidenceOperationMigration.up(evidenceMigrationRunner);
    const evidenceQuarantineMigration = new ManagePaymentEvidenceQuarantine20261013030000();
    await evidenceQuarantineMigration.up(evidenceMigrationRunner);
    await evidenceQuarantineMigration.up(evidenceMigrationRunner);
    await evidenceMigrationRunner.release();
    const scopeMigration = new CreateIncomeUserDataScopes20261012080000();
    const scopeMigrationRunner = dataSource.createQueryRunner();
    await scopeMigration.up(scopeMigrationRunner);
    await scopeMigrationRunner.release();
    const operationReferenceMigration = new PreserveFinancialOperationReferenceHistory20261012060000();
    const migrationRunner = dataSource.createQueryRunner();
    await operationReferenceMigration.up(migrationRunner);
    await migrationRunner.release();

    const accessControl = { getEffectivePermissions: async () => httpPermissions } as any;
    usecase = new ManageIncomePaymentsUsecase(dataSource.manager, accessControl);
    listIncomeExecute = jest.fn().mockResolvedValue({ items: [], total: 0 });
    getIncomeSummaryExecute = jest.fn().mockResolvedValue({ totalCollected: 0 });
    getIncomeEvidenceExecute = jest.fn();
    listQuarantinedEvidence = jest.fn().mockResolvedValue([]);
    recoverQuarantinedEvidence = jest.fn().mockResolvedValue({ status: "COMPLETED" });
    fileStorageRead = jest.fn(async () => Buffer.from("isolated-private-proof"));

    const module = await Test.createTestingModule({
      controllers: [IncomeController],
      providers: [
        { provide: ListIncomeUsecase, useValue: { execute: listIncomeExecute } },
        { provide: GetIncomeSummaryUsecase, useValue: { execute: getIncomeSummaryExecute } },
        { provide: GetIncomeEvidenceUsecase, useValue: { execute: getIncomeEvidenceExecute } },
        { provide: IncomeEvidenceAccessUsecase, useValue: new IncomeEvidenceAccessUsecase(dataSource.manager) },
        { provide: IncomeEvidenceRevisionsUsecase, useValue: new IncomeEvidenceRevisionsUsecase(dataSource.manager) },
        { provide: IncomeEvidenceQuarantineUsecase, useValue: { list: listQuarantinedEvidence, recover: recoverQuarantinedEvidence } },
        { provide: UploadIncomeEvidenceUsecase, useValue: { execute: jest.fn() } },
        { provide: FILE_STORAGE, useValue: { read: fileStorageRead } },
        { provide: ManageIncomePaymentsUsecase, useValue: usecase },
        { provide: AccessControlService, useValue: accessControl },
        { provide: IncomeDataScopeService, useValue: new IncomeDataScopeService(accessControl, dataSource) },
        { provide: IncomeResourceScopeGuard, useValue: new IncomeResourceScopeGuard(new IncomeDataScopeService(accessControl, dataSource)) },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context: any) => {
        context.switchToHttp().getRequest().user = { id: userId };
        return true;
      } })
      .overrideGuard(CompanyConfiguredGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    accountId = randomUUID();
    paymentMethodId = randomUUID();
    companyId = randomUUID();
    userId = randomUUID();
    httpPermissions = ["*"];
    listIncomeExecute?.mockClear();
    getIncomeSummaryExecute?.mockClear();
    getIncomeEvidenceExecute?.mockClear();
    listQuarantinedEvidence?.mockClear();
    recoverQuarantinedEvidence?.mockClear();
    orderId = randomUUID();
    clientId = randomUUID();
    await dataSource.query(`INSERT INTO companies (company_id) VALUES ($1)`, [companyId]);
    await dataSource.query(`INSERT INTO users (user_id, company_id) VALUES ($1, $2)`, [userId, companyId]);
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'INFLOW', 'BANK')`,
      [accountId, companyId],
    );
    await dataSource.query(`INSERT INTO payment_methods (method_id, is_active) VALUES ($1, true)`, [paymentMethodId]);
    await dataSource.query(`INSERT INTO clients (id) VALUES ($1)`, [clientId]);
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [orderId, clientId]);
  });

  it("maps existing payment-edit assignments to the pending-only permission idempotently", async () => {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_permission_overrides (
        user_permission_override_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL, permission_id uuid NOT NULL, effect varchar(10) NOT NULL,
        reason varchar NULL, created_by varchar NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS user_grantable_permissions (
        user_grantable_permission_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        manager_user_id uuid NOT NULL, permission_id uuid NOT NULL,
        created_by_user_id uuid NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    const roleId = randomUUID();
    const managerId = randomUUID();
    const deniedUserId = randomUUID();
    const preservedUserId = randomUUID();
    const legacyPermissionId = randomUUID();
    const legacyDeletePermissionId = randomUUID();
    const legacyVoidPermissionId = randomUUID();
    const pendingPermissionId = randomUUID();
    await dataSource.query(
      `INSERT INTO roles (role_id, description) VALUES ($1, 'migration permission test')`,
      [roleId],
    );
    await dataSource.query(
      `INSERT INTO permissions (permission_id, code, name) VALUES
        ($1, 'sale_orders.payments.update', 'legacy update'),
        ($2, 'sale_orders.payments.delete', 'legacy delete'),
        ($3, 'sale_orders.payments.void', 'legacy void'),
        ($4, 'sale_orders.payments.update_pending', 'pending only')`,
      [legacyPermissionId, legacyDeletePermissionId, legacyVoidPermissionId, pendingPermissionId],
    );
    await dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [roleId, legacyPermissionId, legacyDeletePermissionId, legacyVoidPermissionId],
    );
    await dataSource.query(
      `INSERT INTO user_permission_overrides (user_id, permission_id, effect, created_by) VALUES
        ($1, $2, 'DENY', 'test'), ($3, $4, 'ALLOW', 'existing')`,
      [deniedUserId, legacyPermissionId, preservedUserId, pendingPermissionId],
    );
    await dataSource.query(
      `INSERT INTO user_grantable_permissions (manager_user_id, permission_id) VALUES ($1, $2)`,
      [managerId, legacyPermissionId],
    );

    const migration = new MapLegacySalePaymentUpdatePermission20261013050000();
    const runner = dataSource.createQueryRunner();
    await migration.up(runner);
    await migration.up(runner);
    await runner.release();

    await expect(dataSource.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
      [roleId, pendingPermissionId],
    )).resolves.toEqual([{ permission_id: pendingPermissionId }]);
    const mappedOverrides = await dataSource.query(
      `SELECT user_id, permission_id, effect FROM user_permission_overrides
       WHERE user_id IN ($1, $2) AND permission_id = $3 ORDER BY user_id`,
      [deniedUserId, preservedUserId, pendingPermissionId],
    );
    expect(mappedOverrides).toHaveLength(2);
    expect(mappedOverrides).toEqual(expect.arrayContaining([
      { user_id: deniedUserId, permission_id: pendingPermissionId, effect: 'DENY' },
      { user_id: preservedUserId, permission_id: pendingPermissionId, effect: 'ALLOW' },
    ]));
    await expect(dataSource.query(
      `SELECT manager_user_id, permission_id FROM user_grantable_permissions
       WHERE manager_user_id = $1 AND permission_id = $2`, [managerId, pendingPermissionId],
    )).resolves.toEqual([{ manager_user_id: managerId, permission_id: pendingPermissionId }]);
    await expect(dataSource.query(
      `SELECT code FROM permissions WHERE code IN (
        'sale_orders.payments.update', 'sale_orders.payments.delete', 'sale_orders.payments.void'
      )`,
    )).resolves.toEqual([]);
  });

  it("recovers an evidence upload by key and atomically records its audit/outbox in PostgreSQL", async () => {
    const paymentId = await createPendingPayment(25);
    const storedFiles = new Map<string, Buffer>();
    const fileStorage = {
      save: jest.fn(async ({ area, directory, filename, extension, buffer }: { area?: string; directory: string; filename?: string; extension: string; buffer: Buffer }) => {
        const savedName = filename ?? `${randomUUID()}.${extension}`;
        const key = `${area ?? "public"}/${directory}/${savedName}`;
        storedFiles.set(key, buffer);
        return { area: area ?? "public", key, filename: savedName, relativePath: key };
      }),
      read: jest.fn(async (key: string) => {
        const content = storedFiles.get(key);
        if (!content) throw new Error("FILE_NOT_FOUND");
        return content;
      }),
      exists: jest.fn(async (key: string) => storedFiles.has(key)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      move: jest.fn(async (sourceKey: string, targetKey: string) => {
        const content = storedFiles.get(sourceKey);
        if (!content) return null;
        storedFiles.delete(sourceKey);
        storedFiles.set(targetKey, content);
        return { area: "private", key: targetKey, filename: targetKey.split("/").pop()!, relativePath: targetKey };
      }),
      delete: jest.fn(async (path: string) => storedFiles.delete(path)),
    };
    const attachmentRepo = new SaleOrderAttachmentTypeormRepository(
      dataSource.getRepository(SaleOrderAttachmentEntity),
    );
    const imageProcessor = { toWebp: jest.fn() } as any;
    const uploadAttachment = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo,
      fileStorage as any,
      dataSource.manager,
      new TypeormUnitOfWork(dataSource),
      imageProcessor,
    );
    const listAttachments = new ListSaleOrderAttachmentsUsecase(attachmentRepo);
    const getEvidence = new GetIncomeEvidenceUsecase(dataSource.manager, listAttachments);
    const realtime = { emitToAllConnected: jest.fn() } as any;
    const uploadEvidence = new UploadIncomeEvidenceUsecase(
      dataSource.manager,
      getEvidence,
      uploadAttachment,
      realtime,
    );
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );
    const file = { buffer, mimetype: "image/png", size: buffer.length, originalname: "proof.png" } as Express.Multer.File;
    const idempotencyKey = randomUUID();

    const first = await uploadEvidence.execute(paymentId, file, userId, idempotencyKey);
    const replay = await uploadEvidence.execute(paymentId, file, userId, idempotencyKey);

    expect(replay).toMatchObject({ id: first.id, idempotentReplay: true });
    expect(fileStorage.save).toHaveBeenCalledTimes(1);
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({ area: "staging" }));
    expect(fileStorage.move).toHaveBeenCalledTimes(1);
    expect(storedFiles.size).toBe(1);
    const [{ storagePath }] = await dataSource.query(
      `SELECT storage_path AS "storagePath" FROM sale_order_attachments WHERE id = $1`,
      [first.id],
    );
    expect(storagePath).toMatch(/^private\//);
    expect(storedFiles.has(storagePath)).toBe(true);
    const [{ attachments, audits, events }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM sale_order_attachments WHERE sale_order_payment_id = $1 AND deleted_at IS NULL) AS attachments,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_evidence_attached') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached') AS events`,
      [paymentId, orderId],
    );
    expect({ attachments, audits, events }).toEqual({ attachments: 1, audits: 1, events: 1 });
    const [{ operations, completedOperations }] = await dataSource.query(
      `SELECT COUNT(*)::int AS operations,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND attachment_id = $2)::int AS "completedOperations"
       FROM payment_evidence_upload_operations WHERE sale_order_payment_id = $1 AND idempotency_key = $3`,
      [paymentId, first.id, idempotencyKey],
    );
    expect({ operations, completedOperations }).toEqual({ operations: 1, completedOperations: 1 });
    expect(realtime.emitToAllConnected).toHaveBeenCalledTimes(2);

    const differentFile = { ...file, buffer: Buffer.concat([buffer, Buffer.from("different")]) };
    const error = await uploadEvidence.execute(paymentId, differentFile, userId, idempotencyKey).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(fileStorage.save).toHaveBeenCalledTimes(1);
  });

  it("recovers a quarantined proof with verified bytes and persists its actor/reason in PostgreSQL", async () => {
    const paymentId = await createPendingPayment(18);
    const recoveryId = randomUUID();
    const idempotencyKey = randomUUID();
    const actorId = userId;
    const reason = "Falso positivo de integridad validado";
    const content = Buffer.from("original-image-bytes");
    const digest = createHash("sha256").update(content).digest("hex");
    const quarantineKey = `quarantine/payment-evidence/${recoveryId}/proof.webp`;
    const privateKey = `private/sale-order-attachments/${orderId}/${recoveryId}.webp`;
    const files = new Map([[quarantineKey, content]]);
    const fileStorage = {
      save: jest.fn(async ({ area, directory, filename, buffer }: { area?: string; directory: string; filename: string; extension: string; buffer: Buffer }) => {
        const key = `${area}/${directory}/${filename}`;
        files.set(key, buffer);
        return { area: area ?? "public", key, filename, relativePath: key };
      }),
      read: jest.fn(async (key: string) => {
        const file = files.get(key);
        if (!file) throw new Error("FILE_NOT_FOUND");
        return file;
      }),
      exists: jest.fn(async (key: string) => files.has(key)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      delete: jest.fn(async (key: string) => files.delete(key)),
      moveToDeleted: jest.fn(),
    };
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (id, sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, quarantine_key, last_error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'proof.webp','image/webp',$8,'QUARANTINED',$9,'INTEGRITY_FALSE_POSITIVE')`,
      [recoveryId, paymentId, orderId, userId, idempotencyKey, "a".repeat(64), digest, content.length, quarantineKey],
    );
    const realtime = { emitToAllConnected: jest.fn() } as any;
    const recovery = new IncomeEvidenceQuarantineUsecase(dataSource.manager, fileStorage as any, realtime);

    const result = await recovery.recover(paymentId, recoveryId, actorId, reason);
    const replay = await recovery.recover(paymentId, recoveryId, actorId, reason);
    expect(replay).toEqual(result);
    expect(files.get(quarantineKey)).toEqual(content);
    expect(files.get(privateKey)).toEqual(content);
    expect(fileStorage.delete).not.toHaveBeenCalled();
    expect(realtime.emitToAllConnected).toHaveBeenCalledTimes(2);
    const [operation] = await dataSource.query(
      `SELECT status, recovered_by_user_id, recovery_reason, attachment_id
       FROM payment_evidence_upload_operations WHERE id = $1`, [recoveryId]);
    expect(operation).toMatchObject({ status: "COMPLETED", recovered_by_user_id: actorId, recovery_reason: reason, attachment_id: result.attachmentId });
    const [{ attachmentCount, auditCount, eventCount }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM sale_order_attachments WHERE id = $1 AND storage_path = $2 AND deleted_at IS NULL) AS "attachmentCount",
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $3 AND executed_by = $4 AND action_execution = 'payment_evidence_quarantine_recovered') AS "auditCount",
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $5 AND event_type = 'income.payment_evidence_quarantine_recovered') AS "eventCount"`,
      [result.attachmentId, privateKey, orderId, actorId, paymentId]);
    expect({ attachmentCount, auditCount, eventCount }).toEqual({ attachmentCount: 1, auditCount: 1, eventCount: 1 });
  });

  it("audits stale upload checkpoints and orphaned private files against PostgreSQL without writes", async () => {
    const paymentId = await createPendingPayment(44);
    const idempotencyKey = randomUUID();
    const promotedKey = `private/sale-order-attachments/${orderId}/stale.webp`;
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, promoted_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'stale.webp', 'image/webp', 16, 'PROMOTED', $7, now() - interval '1 hour')`,
      [paymentId, orderId, userId, idempotencyKey, "a".repeat(64), "b".repeat(64), promotedKey],
    );
    const existingPrivateAttachments = await dataSource.query(
      `SELECT storage_path FROM sale_order_attachments
       WHERE type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF') AND storage_path LIKE 'private/sale-order-attachments/%'`,
    );
    const fileStorage = {
      list: jest.fn(async (area: string) => area === "private"
        ? [
            ...existingPrivateAttachments.map(({ storage_path }: { storage_path: string }) => storage_path),
            promotedKey,
            `private/sale-order-attachments/${orderId}/orphan.webp`,
          ]
        : []),
    };

    const report = await auditIncomePaymentEvidence(dataSource, fileStorage as any);
    const counts = Object.fromEntries(report.map(({ check, count }) => [check, count]));
    const [{ operationCount }] = await dataSource.query(
      `SELECT COUNT(*)::int AS "operationCount" FROM payment_evidence_upload_operations WHERE idempotency_key = $1`,
      [idempotencyKey],
    );

    expect(counts).toMatchObject({
      stale_evidence_upload_operations: 1,
      evidence_storage_inventory_available: 0,
      missing_private_payment_evidence_files: 0,
      orphan_private_payment_evidence_files: 1,
      orphan_staged_payment_evidence_files: 0,
      stale_upload_operations_with_missing_files: 0,
    });
    expect(operationCount).toBe(1);
    expect(fileStorage.list).toHaveBeenCalledTimes(2);
  });

  it("recovers a verified stale promoted evidence checkpoint into attachment, audit and outbox atomically", async () => {
    const paymentId = await createPendingPayment(45);
    const idempotencyKey = randomUUID();
    const buffer = Buffer.from("verified prepared payment evidence");
    const preparedHash = createHash("sha256").update(buffer).digest("hex");
    const sourceHash = createHash("sha256").update("original payment evidence").digest("hex");
    const promotedKey = `private/sale-order-attachments/${orderId}/recovered.webp`;
    const storedFiles = new Map([[promotedKey, buffer]]);
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, promoted_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'recovered.png', 'image/webp', $7, 'PROMOTED', $8, now() - interval '10 minutes')`,
      [paymentId, orderId, userId, idempotencyKey, sourceHash, preparedHash, buffer.length, promotedKey],
    );
    const fileStorage = {
      exists: jest.fn(async (key: string) => storedFiles.has(key)),
      read: jest.fn(async (key: string) => {
        const content = storedFiles.get(key);
        if (!content) throw new Error("FILE_NOT_FOUND");
        return content;
      }),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      move: jest.fn(),
      save: jest.fn(),
    };
    const realtime = { emitToAllConnected: jest.fn() };
    const recovery = new IncomeEvidenceUploadRecoveryService(dataSource.manager, dataSource, fileStorage as any, realtime as any);

    const result = await recovery.recoverBatch(10);
    const [{ status, attachmentId }] = await dataSource.query(
      `SELECT status, attachment_id AS "attachmentId"
       FROM payment_evidence_upload_operations WHERE sale_order_payment_id = $1 AND idempotency_key = $2`,
      [paymentId, idempotencyKey],
    );
    const [{ attachments, audits, events }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM sale_order_attachments WHERE sale_order_payment_id = $1 AND deleted_at IS NULL AND upload_idempotency_key = $2) AS attachments,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $3 AND action_execution = 'payment_evidence_attached') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached') AS events`,
      [paymentId, idempotencyKey, orderId],
    );

    expect(result).toEqual({ claimed: 1, recovered: 1, failed: 0, skipped: false });
    expect({ status, hasAttachmentId: Boolean(attachmentId), attachments, audits, events }).toEqual({
      status: "COMPLETED", hasAttachmentId: true, attachments: 1, audits: 1, events: 1,
    });
    expect(storedFiles.has(promotedKey)).toBe(true);
    expect(fileStorage.move).not.toHaveBeenCalled();
    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(realtime.emitToAllConnected).toHaveBeenCalledTimes(2);
  });

  it("does not attach a stale promoted file when its prepared hash is invalid", async () => {
    const paymentId = await createPendingPayment(46);
    const idempotencyKey = randomUUID();
    const buffer = Buffer.from("tampered payment evidence");
    const promotedKey = `private/sale-order-attachments/${orderId}/tampered.webp`;
    const storedFiles = new Map([[promotedKey, buffer]]);
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, promoted_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'tampered.png', 'image/webp', $7, 'PROMOTED', $8, now() - interval '10 minutes')`,
      [paymentId, orderId, userId, idempotencyKey, createHash("sha256").update(buffer).digest("hex"), "0".repeat(64), buffer.length, promotedKey],
    );
    const fileStorage = {
      exists: jest.fn(async (key: string) => storedFiles.has(key)),
      read: jest.fn(async (key: string) => storedFiles.get(key) ?? Buffer.alloc(0)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      move: jest.fn(),
      save: jest.fn(),
    };
    const recovery = new IncomeEvidenceUploadRecoveryService(
      dataSource.manager, dataSource, fileStorage as any, { emitToAllConnected: jest.fn() } as any,
    );

    const result = await recovery.recoverBatch(10);
    const [{ status, lastError, leaseUntil }] = await dataSource.query(
      `SELECT status, last_error AS "lastError", lease_until AS "leaseUntil"
       FROM payment_evidence_upload_operations WHERE sale_order_payment_id = $1 AND idempotency_key = $2`,
      [paymentId, idempotencyKey],
    );
    const [{ attachments, audits, events }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM sale_order_attachments WHERE sale_order_payment_id = $1) AS attachments,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_evidence_attached') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached') AS events`,
      [paymentId, orderId],
    );

    expect(result).toEqual({ claimed: 1, recovered: 0, failed: 1, skipped: false });
    expect({ status, lastError, leaseIsReleased: leaseUntil === null, attachments, audits, events }).toEqual({
      status: "PROMOTED", lastError: "RECOVERY_FILE_INTEGRITY_MISMATCH", leaseIsReleased: true,
      attachments: 0, audits: 0, events: 0,
    });
    expect(storedFiles.has(promotedKey)).toBe(true);
    expect(fileStorage.move).not.toHaveBeenCalled();
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it("preserves the promoted file and rejects recovery when the payment is no longer pending", async () => {
    const paymentId = await createPendingPayment(47);
    const idempotencyKey = randomUUID();
    const buffer = Buffer.from("evidence must not rewrite posted history");
    const preparedHash = createHash("sha256").update(buffer).digest("hex");
    const sourceHash = createHash("sha256").update("original evidence").digest("hex");
    const promotedKey = `private/sale-order-attachments/${orderId}/posted-payment.webp`;
    const storedFiles = new Map([[promotedKey, buffer]]);
    await dataSource.query(`UPDATE sale_payments SET status = 'POSTED' WHERE id = $1`, [paymentId]);
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, promoted_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'posted.webp', 'image/webp', $7, 'PROMOTED', $8, now() - interval '10 minutes')`,
      [paymentId, orderId, userId, idempotencyKey, sourceHash, preparedHash, buffer.length, promotedKey],
    );
    const fileStorage = {
      exists: jest.fn(async (key: string) => storedFiles.has(key)),
      read: jest.fn(async (key: string) => storedFiles.get(key) ?? Buffer.alloc(0)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      move: jest.fn(),
      save: jest.fn(),
    };
    const recovery = new IncomeEvidenceUploadRecoveryService(
      dataSource.manager, dataSource, fileStorage as any, { emitToAllConnected: jest.fn() } as any,
    );

    const result = await recovery.recoverBatch(10);
    const [{ status, lastError }] = await dataSource.query(
      `SELECT status, last_error AS "lastError" FROM payment_evidence_upload_operations
       WHERE sale_order_payment_id = $1 AND idempotency_key = $2`,
      [paymentId, idempotencyKey],
    );
    const [{ attachmentCount }] = await dataSource.query(
      `SELECT COUNT(*)::int AS "attachmentCount" FROM sale_order_attachments WHERE sale_order_payment_id = $1`,
      [paymentId],
    );

    expect(result).toEqual({ claimed: 1, recovered: 0, failed: 1, skipped: false });
    expect({ status, lastError, attachmentCount }).toEqual({
      status: "PROMOTED", lastError: "RECOVERY_PAYMENT_NOT_ELIGIBLE", attachmentCount: 0,
    });
    expect(storedFiles.has(promotedKey)).toBe(true);
    expect(fileStorage.move).not.toHaveBeenCalled();
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it("resumes a promoted evidence file after the first database commit rolls back", async () => {
    const paymentId = await createPendingPayment(31);
    const storedFiles = new Map<string, Buffer>();
    const fileStorage = {
      save: jest.fn(async ({ area, directory, filename, extension, buffer }: { area?: string; directory: string; filename?: string; extension: string; buffer: Buffer }) => {
        const savedName = filename ?? `${randomUUID()}.${extension}`;
        const key = `${area ?? "public"}/${directory}/${savedName}`;
        storedFiles.set(key, buffer);
        return { area: area ?? "public", key, filename: savedName, relativePath: key };
      }),
      read: jest.fn(async (key: string) => {
        const content = storedFiles.get(key);
        if (!content) throw new Error("FILE_NOT_FOUND");
        return content;
      }),
      exists: jest.fn(async (key: string) => storedFiles.has(key)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      move: jest.fn(async (sourceKey: string, targetKey: string) => {
        const content = storedFiles.get(sourceKey);
        if (!content) return null;
        storedFiles.delete(sourceKey);
        storedFiles.set(targetKey, content);
        return { area: "private", key: targetKey, filename: targetKey.split("/").pop()!, relativePath: targetKey };
      }),
      delete: jest.fn(async (key: string) => storedFiles.delete(key)),
    };
    const attachmentRepo = new SaleOrderAttachmentTypeormRepository(dataSource.getRepository(SaleOrderAttachmentEntity));
    const uploadAttachment = new UploadSaleOrderAttachmentUsecase(
      attachmentRepo, fileStorage as any, dataSource.manager, new TypeormUnitOfWork(dataSource), { toWebp: jest.fn() } as any,
    );
    const getEvidence = new GetIncomeEvidenceUsecase(dataSource.manager, new ListSaleOrderAttachmentsUsecase(attachmentRepo));
    const uploadEvidence = new UploadIncomeEvidenceUsecase(
      dataSource.manager, getEvidence, uploadAttachment, { emitToAllConnected: jest.fn() } as any,
    );
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );
    const file = { buffer, mimetype: "image/png", size: buffer.length, originalname: "recoverable-proof.png" } as Express.Multer.File;
    const idempotencyKey = randomUUID();

    await dataSource.query(`ALTER TABLE sale_order_auditory ADD CONSTRAINT reject_evidence_audit CHECK (action_execution <> 'payment_evidence_attached')`);
    try {
      await expect(uploadEvidence.execute(paymentId, file, userId, idempotencyKey)).rejects.toMatchObject({ driverError: { code: "23514" } });
    } finally {
      await dataSource.query(`ALTER TABLE sale_order_auditory DROP CONSTRAINT IF EXISTS reject_evidence_audit`);
    }

    const [{ failedAttachments, status, retainedPromotedFile, promotedKey }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM sale_order_attachments WHERE sale_order_payment_id = $1 AND upload_idempotency_key = $2) AS "failedAttachments",
        o.status,
        o.promoted_key AS "promotedKey",
        (SELECT COUNT(*)::int FROM payment_evidence_upload_operations WHERE id = o.id AND promoted_key IS NOT NULL) AS "retainedPromotedFile"
       FROM payment_evidence_upload_operations o WHERE o.sale_order_payment_id = $1 AND o.idempotency_key = $2`,
      [paymentId, idempotencyKey],
    );
    expect({ failedAttachments, status, retainedPromotedFile, storedFiles: storedFiles.size }).toEqual({
      failedAttachments: 0, status: "PROMOTED", retainedPromotedFile: 1, storedFiles: 1,
    });
    expect(storedFiles.has(promotedKey)).toBe(true);
    expect(fileStorage.save).toHaveBeenCalledTimes(1);

    const recovered = await uploadEvidence.execute(paymentId, file, userId, idempotencyKey);
    expect(recovered.id).toBeTruthy();
    expect(fileStorage.exists.mock.calls.map(([key]) => key)).toEqual([promotedKey, promotedKey]);
    expect(fileStorage.save).toHaveBeenCalledTimes(1);
    expect(fileStorage.move).toHaveBeenCalledTimes(1);
    const [{ completedStatus, attachments, audits, events }] = await dataSource.query(
      `SELECT o.status AS "completedStatus",
        (SELECT COUNT(*)::int FROM sale_order_attachments WHERE sale_order_payment_id = $1 AND deleted_at IS NULL AND type = 'PAYMENT_PROOF') AS attachments,
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_evidence_attached') AS audits,
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_evidence_attached') AS events
       FROM payment_evidence_upload_operations o WHERE o.sale_order_payment_id = $1 AND o.idempotency_key = $3`,
      [paymentId, orderId, idempotencyKey],
    );
    expect({ completedStatus, attachments, audits, events }).toEqual({ completedStatus: "COMPLETED", attachments: 1, audits: 1, events: 1 });
  });

  it("persists unified pending-payment creation and edit with audit/outbox in PostgreSQL", async () => {
    await dataSource.query(`UPDATE sale_orders SET currency = 'USD' WHERE id = $1`, [orderId]);
    const repository = new SalePaymentTypeormRepository(dataSource.getRepository(SalePaymentEntity));
    const reconciler = new SaleOrderPaymentReconcilerService(repository);
    await expect(dataSource.transaction((manager) => reconciler.reconcile(
      {
        saleOrderId: orderId,
        executedBy: userId,
        payments: [{
          clientKey: "reject-pen-account-for-usd-order",
          date: new Date("2026-10-13T12:00:00.000Z"),
          method: "TRANSFERENCIA",
          companyPaymentAccountId: accountId,
          paymentMethodId,
          amount: 30,
        }],
      },
      new TypeormTransactionContext(manager),
    ))).rejects.toThrow("compatible con la moneda del pedido");
    const [{ rejectedPaymentCount }] = await dataSource.query(
      `SELECT COUNT(*)::int AS "rejectedPaymentCount" FROM sale_payments WHERE sale_order_id = $1`,
      [orderId],
    );
    expect(rejectedPaymentCount).toBe(0);

    await dataSource.query(`UPDATE company_payment_accounts SET currency = 'USD' WHERE company_payment_account_id = $1`, [accountId]);
    const created = await dataSource.transaction((manager) => reconciler.reconcile(
      {
        saleOrderId: orderId,
        executedBy: userId,
        payments: [{
          clientKey: "create-from-order",
          date: new Date("2026-10-13T12:00:00.000Z"),
          method: "TRANSFERENCIA",
          companyPaymentAccountId: accountId,
          paymentMethodId,
          amount: 30.126,
          operationNumber: "ORDER-UNIFIED-001",
          note: "Registrado desde Pedidos",
        }],
      },
      new TypeormTransactionContext(manager),
    ));
    const paymentId = created.paymentIdByClientKey.get("create-from-order");
    expect(paymentId).toBeTruthy();

    const persisted = await dataSource.query(
      `SELECT status, amount::text AS amount, currency, version, created_by_user_id FROM sale_payments WHERE id = $1`,
      [paymentId],
    );
    expect(persisted[0]).toMatchObject({
      status: "PENDING_CONFIRMATION",
      amount: "30.13",
      currency: "USD",
      version: 1,
      created_by_user_id: userId,
    });

    await dataSource.transaction((manager) => reconciler.reconcile(
      {
        saleOrderId: orderId,
        executedBy: userId,
        payments: [{
          id: paymentId,
          version: 1,
          clientKey: "edit-from-order",
          date: new Date("2026-10-13T12:00:00.000Z"),
          method: "TRANSFERENCIA",
          companyPaymentAccountId: accountId,
          paymentMethodId,
          amount: 45.67,
          operationNumber: "ORDER-UNIFIED-001-EDIT",
          note: "Editado desde Pedidos",
        }],
      },
      new TypeormTransactionContext(manager),
    ));

    const [edited] = await dataSource.query(
      `SELECT status, amount::text AS amount, version, operation_number, note, updated_by_user_id
       FROM sale_payments WHERE id = $1`,
      [paymentId],
    );
    const [{ auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $1
          AND action_execution IN ('payment_pending_created', 'payment_pending_edited')) AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'sale_payment'
          AND aggregate_id = $2 AND event_type IN ('income.payment_pending_created', 'income.payment_pending_edited')) AS "outboxCount"`,
      [orderId, paymentId],
    );
    const [createdEvent] = await dataSource.query(
      `SELECT payload FROM financial_outbox_events
       WHERE aggregate_type = 'sale_payment' AND aggregate_id = $1
         AND event_type = 'income.payment_pending_created'`,
      [paymentId],
    );
    expect(edited).toMatchObject({
      status: "PENDING_CONFIRMATION",
      amount: "45.67",
      version: 2,
      operation_number: "ORDER-UNIFIED-001-EDIT",
      note: "Editado desde Pedidos",
      updated_by_user_id: userId,
    });
    expect({ auditCount, outboxCount }).toEqual({ auditCount: 2, outboxCount: 2 });
    expect(createdEvent.payload.details).toMatchObject({ amount: 30.13, currency: "USD" });
  });

  it("rolls back unified payment creation when the transactional outbox rejects its event", async () => {
    const repository = new SalePaymentTypeormRepository(dataSource.getRepository(SalePaymentEntity));
    const reconciler = new SaleOrderPaymentReconcilerService(repository);
    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_pending_payment_outbox CHECK (event_type <> 'income.payment_pending_created')`);
    try {
      await expect(dataSource.transaction((manager) => reconciler.reconcile(
        {
          saleOrderId: orderId,
          executedBy: userId,
          payments: [{
            clientKey: "rollback-create-from-order",
            date: new Date("2026-10-13T12:00:00.000Z"),
            method: "TRANSFERENCIA",
            companyPaymentAccountId: accountId,
            paymentMethodId,
            amount: 30,
          }],
        },
        new TypeormTransactionContext(manager),
      ))).rejects.toMatchObject({ code: "23514" });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events
        DROP CONSTRAINT IF EXISTS test_reject_pending_payment_outbox`);
    }

    const [{ paymentCount, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM sale_payments WHERE sale_order_id = $1) AS "paymentCount",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $1
          AND action_execution = 'payment_pending_created') AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE event_type = 'income.payment_pending_created') AS "outboxCount"`,
      [orderId],
    );
    expect({ paymentCount, auditCount, outboxCount }).toEqual({ paymentCount: 0, auditCount: 0, outboxCount: 0 });
  });

  it("raises privacy-safe outbox alerts from real PostgreSQL backlog and dead-letter state", async () => {
    await dataSource.query(
      `INSERT INTO financial_outbox_events (event_type, aggregate_type, aggregate_id, payload, occurred_at)
       VALUES ('income.test_stale', 'sale_payment', $1, '{}'::jsonb, now() - interval '10 minutes'),
              ('income.test_dead_letter', 'sale_payment', $2, '{}'::jsonb, now() - interval '10 minutes')`,
      [randomUUID(), randomUUID()],
    );
    await dataSource.query(
      `UPDATE financial_outbox_events SET dead_lettered_at = now(), attempts = 10
       WHERE event_type = 'income.test_dead_letter'`,
    );
    const previousThreshold = process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS;
    process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS = "60";
    const publisher = new FinancialOutboxPublisher(dataSource.manager, {} as any);
    const logger = { error: jest.fn() };
    (publisher as any).logger = logger;
    try {
      await (publisher as any).checkHealthSafely();
      expect(logger.error).toHaveBeenCalledTimes(1);
      const alert = logger.error.mock.calls[0][0] as string;
      expect(alert).toContain("financial_outbox_operational_alert");
      expect(alert).toContain('"pending":1');
      expect(alert).toContain('"deadLettered":1');
      expect(alert).toContain('"oldestPendingAgeSeconds":');
      expect(alert).not.toContain("test_stale");
      expect(alert).not.toContain("payload");
    } finally {
      if (previousThreshold === undefined) delete process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS;
      else process.env.INCOME_OUTBOX_ALERT_AGE_SECONDS = previousThreshold;
    }
  });

  it("preserves payment history by rejecting physical deletion of an order with payments", async () => {
    const paymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method)
       VALUES ($1, $2, 25.50, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'TRANSFER')`,
      [paymentId, orderId],
    );

    await expect(dataSource.query(`DELETE FROM sale_orders WHERE id = $1`, [orderId]))
      .rejects.toMatchObject({ code: "23503" });

    const [order] = await dataSource.query(`SELECT id FROM sale_orders WHERE id = $1`, [orderId]);
    const [payment] = await dataSource.query(
      `SELECT id, status, amount FROM sale_payments WHERE id = $1 AND sale_order_id = $2`,
      [paymentId, orderId],
    );
    expect(order?.id).toBe(orderId);
    expect(payment).toMatchObject({ id: paymentId, status: "PENDING_CONFIRMATION", amount: "25.50" });
  });

  it("audits legacy sale-payment states and duplicate references against PostgreSQL", async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, operation_number, voided_at, void_reason)
         VALUES ($1, $3, 10, 'PEN', 'VOIDED', CURRENT_DATE, now(), 'TRANSFER', 'LEGACY-VOIDED', NULL, NULL),
                ($2, $3, 12, 'PEN', 'DRAFT', CURRENT_DATE, now(), 'TRANSFER', 'LEGACY-DRAFT', NULL, NULL),
                ($4, $3, 13, 'PEN', 'APPROVED', CURRENT_DATE, now(), 'TRANSFER', 'LEGACY-APPROVED', NULL, NULL)`,
        [randomUUID(), randomUUID(), orderId, randomUUID()],
      );

      await runner.query(`ALTER TABLE sale_payments DISABLE TRIGGER trg_sale_payments_operation_reference`);
      await runner.query(
        `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, operation_number)
         VALUES ($1, $3, 5, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', ' Op-Duplicate '),
                ($2, $3, 6, 'PEN', 'VOIDED', CURRENT_DATE, now(), 'TRANSFER', 'op-duplicate')`,
        [randomUUID(), randomUUID(), orderId],
      );

      const legacyStates = await runner.query(financialLifecyclePreflightQueries[0].sql);
      const duplicateReferences = await runner.query(financialLifecyclePreflightQueries[1].sql);
      expect(legacyStates.map((row) => row.status)).toEqual(expect.arrayContaining(["DRAFT", "VOIDED", "APPROVED"]));
      expect(duplicateReferences).toHaveLength(1);
      expect(duplicateReferences[0]).toMatchObject({ normalized_reference: "op-duplicate", total: 2 });
      expect(duplicateReferences[0].payments.map((payment: { status: string }) => payment.status))
        .toEqual(expect.arrayContaining(["POSTED", "VOIDED"]));
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it("audits invalid pending-payment setup and active payment/order currency mismatches against PostgreSQL", async () => {
    const missingMethodId = randomUUID();
    const missingReceiverId = randomUUID();
    const missingReferenceId = randomUUID();
    const currencyMismatchId = randomUUID();
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `INSERT INTO sale_payments
           (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
         VALUES ($1, $5, 10, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', $6),
                ($2, $5, 11, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', NULL),
                ($3, $5, 12, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', $6),
                ($4, $5, 13, 'USD', 'POSTED', CURRENT_DATE, now(), 'Transferencia', $6)`,
        [missingMethodId, missingReceiverId, missingReferenceId, currencyMismatchId, orderId, accountId],
      );
      await runner.query(`UPDATE sale_payments SET payment_method_id = $2 WHERE id = $1`, [missingReceiverId, paymentMethodId]);
      await runner.query(`UPDATE sale_payments SET payment_method_id = $2 WHERE id = $1`, [missingReferenceId, paymentMethodId]);
      await runner.query(`UPDATE payment_methods SET requires_operation_reference = true WHERE method_id = $1`, [paymentMethodId]);

      const [missingMethod, missingReceiver, missingReference, currencyMismatch] = await Promise.all(
        financialLifecyclePreflightQueries.slice(2).map(({ sql }) => runner.query(sql)),
      );

      expect(missingMethod).toEqual([expect.objectContaining({ id: missingMethodId })]);
      expect(missingReceiver).toEqual([expect.objectContaining({ id: missingReceiverId })]);
      expect(missingReference).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: missingReceiverId }),
        expect.objectContaining({ id: missingReferenceId }),
      ]));
      expect(currencyMismatch).toEqual([expect.objectContaining({ id: currencyMismatchId, payment_currency: "USD", order_currency: "PEN" })]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it("audits company-scope assignments, conflicting order ownership evidence and unattributed orders", async () => {
    const otherCompanyId = randomUUID();
    const otherAccountId = randomUUID();
    const conflictingPaymentId = randomUUID();
    const unattributedOrderId = randomUUID();
    await dataSource.query(`INSERT INTO companies (company_id) VALUES ($1)`, [otherCompanyId]);
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'INFLOW', 'BANK')`,
      [otherAccountId, otherCompanyId],
    );
    await dataSource.query(`UPDATE sale_orders SET created_by = $2 WHERE id = $1`, [orderId, userId]);
    await dataSource.query(
      `INSERT INTO sale_payments
         (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 10, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'Transferencia', $3)`,
      [conflictingPaymentId, orderId, otherAccountId],
    );
    await dataSource.query(
      `INSERT INTO user_financial_data_scopes (user_id, scope_type, scope_id)
       VALUES ($1, 'PAYMENT_ACCOUNT', $2)`,
      [userId, otherAccountId],
    );
    await dataSource.query(
      `INSERT INTO sale_orders (id, client_id, total, currency, is_active)
       VALUES ($1, $2, 50, 'PEN', true)`,
      [unattributedOrderId, clientId],
    );

    const [invalidScopes, conflictingOrders, unattributedOrders] = await Promise.all(
      financialCompanyScopeAuditQueries.map(({ sql }) => dataSource.query(sql)),
    );

    expect(invalidScopes).toEqual(expect.arrayContaining([
      expect.objectContaining({ user_id: userId, scope_type: "PAYMENT_ACCOUNT", scope_id: otherAccountId, user_company_id: companyId, account_company_id: otherCompanyId }),
    ]));
    expect(conflictingOrders).toEqual(expect.arrayContaining([
      expect.objectContaining({ sale_order_id: orderId, company_ids: expect.arrayContaining([companyId, otherCompanyId]), company_count: 2 }),
    ]));
    expect(unattributedOrders).toEqual(expect.arrayContaining([
      expect.objectContaining({ sale_order_id: unattributedOrderId, client_id: clientId, created_by: null }),
    ]));
  });

  it("accepts a posted excess retained as credit but reports allocations beyond the order total", async () => {
    const paymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments
         (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 125, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3)`,
      [paymentId, orderId, accountId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date)
       VALUES ($1, $2, 'INCOME', 125, 'PEN', CURRENT_DATE)`,
      [accountId, paymentId],
    );
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 100, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );

    const [ledgerQuery, allocationQuery] = financialLedgerAuditQueries;
    expect(await dataSource.query(ledgerQuery.sql)).toEqual([]);
    expect(await dataSource.query(allocationQuery.sql)).toEqual([]);

    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 0.01, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    expect(await dataSource.query(allocationQuery.sql)).toEqual([
      expect.objectContaining({ sale_order_id: orderId, order_total: "100.00", applied_amount: "100.01" }),
    ]);

    await dataSource.query(
      `UPDATE sale_payment_allocations SET amount = -0.01
       WHERE sale_payment_id = $1 AND amount = 0.01`,
      [paymentId],
    );
    await dataSource.query(`UPDATE sale_payments SET status = 'REVERSED' WHERE id = $1`, [paymentId]);
    await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, reverses_movement_id, movement_type, amount, currency, operation_date)
       SELECT $1, $2, id, 'REVERSAL', -125, 'PEN', CURRENT_DATE
       FROM financial_account_movements WHERE sale_payment_id = $2 AND movement_type = 'INCOME'`,
      [accountId, paymentId],
    );
    expect(await dataSource.query(ledgerQuery.sql)).toEqual([]);
  });

  it("builds the payment reconciliation snapshot by order, date, account, currency and status in a read-only transaction", async () => {
    const paymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments
         (id, sale_order_id, amount, currency, status, payment_date, accounting_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 125, 'PEN', 'POSTED', DATE '2026-10-02', DATE '2026-10-03', now(), 'TRANSFER', $3)`,
      [paymentId, orderId, accountId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date)
       VALUES ($1, $2, 'INCOME', 125, 'PEN', DATE '2026-10-03')`,
      [accountId, paymentId],
    );
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 100, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO customer_credit_movements
         (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'CREDIT', 25, 'PEN', $4, 'Excedente de prueba')`,
      [clientId, paymentId, orderId, userId],
    );
    const [statement] = await dataSource.query(
      `INSERT INTO bank_statement_lines (company_payment_account_id, bank_reference, operation_date, amount, currency, created_by_user_id)
       VALUES ($1, $2, DATE '2026-10-03', 125, 'PEN', $3) RETURNING id`,
      [accountId, `STATEMENT-${randomUUID()}`, userId],
    );
    await dataSource.query(
      `INSERT INTO bank_reconciliation_allocations (bank_statement_line_id, sale_payment_id, amount, created_by_user_id)
       VALUES ($1, $2, 50, $3)`,
      [statement.id, paymentId, userId],
    );

    const report = await createSalePaymentReconciliationReport(dataSource);
    expect(report.readOnly).toBe(true);
    expect(report.sections.paymentsByOrderDateAccountCurrencyAndStatus).toEqual([
      expect.objectContaining({
        sale_order_id: orderId,
        payment_date: "2026-10-02",
        accounting_date: "2026-10-03",
        company_payment_account_id: accountId,
        currency: "PEN",
        status: "POSTED",
        payment_count: 1,
        recorded_amount: "125.00",
      }),
    ]);
    expect(report.sections.applicationsByTargetOrderAndPaymentDimensions).toEqual([
      expect.objectContaining({ allocated_sale_order_id: orderId, applied_amount: "100.00" }),
    ]);
    expect(report.sections.customerCreditMovementsByOrderCurrencyAndType).toEqual([
      expect.objectContaining({ source_sale_order_id: orderId, movement_type: "CREDIT", net_amount: "25.00" }),
    ]);
    expect(report.sections.bankStatementLinesByDateAccountAndCurrency).toEqual([
      expect.objectContaining({ statement_amount: "125.00", reconciled_amount: "50.00", available_amount: "75.00" }),
    ]);
  });

  it.each(["VOIDED", "APPROVED"])("refuses the lifecycle migration before schema changes when an unsupported %s row exists", async (status) => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const paymentId = randomUUID();
    try {
      await runner.query(
        `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method)
         VALUES ($1, $2, 10, 'PEN', $3, CURRENT_DATE, now(), 'TRANSFER')`,
        [paymentId, orderId, status],
      );
      const migration = new PaymentLifecycleFourStates20261008000000();
      await expect(migration.up(runner)).rejects.toThrow(`${status}=1`);

      const [payment] = await runner.query(`SELECT status FROM sale_payments WHERE id = $1`, [paymentId]);
      const [{ constraintCount }] = await runner.query(
        `SELECT COUNT(*)::int AS "constraintCount" FROM pg_constraint
         WHERE conrelid = 'sale_payments'::regclass AND conname = 'chk_sale_payments_lifecycle_status'`,
      );
      expect(payment.status).toBe(status);
      expect(constraintCount).toBe(0);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it("refuses the forward lifecycle validation before DDL while unsupported historical payments remain", async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method)
         VALUES ($1, $2, 10, 'PEN', 'APPROVED', CURRENT_DATE, now(), 'TRANSFER')`,
        [randomUUID(), orderId],
      );
      const migration = new ValidateSalePaymentLifecycle20261014010000();
      await expect(migration.up(runner)).rejects.toThrow("APPROVED=1");

      const [{ constraintCount }] = await runner.query(
        `SELECT COUNT(*)::int AS "constraintCount" FROM pg_constraint
         WHERE conrelid = 'sale_payments'::regclass AND conname = 'chk_sale_payments_lifecycle_status'`,
      );
      expect(constraintCount).toBe(0);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it("validates the existing canonical lifecycle constraint in PostgreSQL", async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`
        ALTER TABLE sale_payments
        ADD CONSTRAINT chk_sale_payments_lifecycle_status
        CHECK (status IN ('PENDING_CONFIRMATION', 'POSTED', 'CANCELLED', 'REVERSED')) NOT VALID
      `);
      await new ValidateSalePaymentLifecycle20261014010000().up(runner);

      const [{ validated }] = await runner.query(
        `SELECT convalidated AS validated FROM pg_constraint
         WHERE conrelid = 'sale_payments'::regclass AND conname = 'chk_sale_payments_lifecycle_status'`,
      );
      expect(validated).toBe(true);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it("cancels a pending payment atomically and replays the persisted cancellation without duplicate audit events", async () => {
    const paymentId = await createPendingPayment(20);
    const transitionService = {
      advance: jest.fn().mockResolvedValue({ order: { id: orderId, currentStateId: "cancelled" } }),
    };
    const accessControl = {
      getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]),
    };
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, manager: any) => {
          const [order] = await manager.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      transitionService as any,
      { listBySaleOrderId: jest.fn() } as any,
      accessControl as any,
    );
    const request = {
      saleOrderId: orderId,
      userId,
      idempotencyKey: randomUUID(),
      resolutions: [{ incomeId: paymentId, action: "CANCEL_PENDING" as const, reason: "Cobro cancelado con el pedido" }],
    };

    const firstResult = await cancellation.execute(request);
    const replayedResult = await cancellation.execute(request);
    const [payment] = await dataSource.query(`SELECT status FROM sale_payments WHERE id = $1`, [paymentId]);
    const [{ idempotencyCount, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $1 AND idempotency_key = $2::uuid AND status = 'COMPLETED') AS "idempotencyCount",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $3 AND action_execution = 'payment_cancelled_for_order_cancellation') AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $4 AND event_type = 'income.payment_cancelled_for_order_cancellation') AS "outboxCount"`,
      [`cancel-order:${userId}:${orderId}`, request.idempotencyKey, orderId, paymentId],
    );

    expect(firstResult).toMatchObject({ saleOrderId: orderId, currentStateId: "cancelled" });
    expect(replayedResult).toEqual(firstResult);
    expect(payment.status).toBe("CANCELLED");
    expect({ idempotencyCount, auditCount, outboxCount }).toEqual({ idempotencyCount: 1, auditCount: 1, outboxCount: 1 });
    expect(transitionService.advance).toHaveBeenCalledTimes(1);
  });

  it("keeps a posted bank income intact when cancelling its order and releases the applied amount as customer credit", async () => {
    const paymentId = await createPayment(20);
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 20, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 20, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, userId],
    );
    const transitionService = {
      advance: jest.fn().mockResolvedValue({ order: { id: orderId, currentStateId: "cancelled" } }),
    };
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, tx: any) => {
          const [order] = await tx.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      transitionService as any,
      { listBySaleOrderId: jest.fn() } as any,
      { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order"]) } as any,
    );

    await cancellation.execute({
      saleOrderId: orderId,
      userId,
      idempotencyKey: randomUUID(),
      resolutions: [{ incomeId: paymentId, action: "KEEP_AS_CREDIT", reason: "Mantenerlo como saldo a favor" }],
    });

    const [payment] = await dataSource.query(`SELECT status FROM sale_payments WHERE id = $1`, [paymentId]);
    const [{ allocationBalance, creditBalance, accountMovementCount, reversalCount }] = await dataSource.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1) AS "allocationBalance",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1) AS "creditBalance",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1) AS "accountMovementCount",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'REVERSAL') AS "reversalCount"`,
      [paymentId],
    );

    expect(payment.status).toBe("POSTED");
    expect({ allocationBalance: Number(allocationBalance), creditBalance: Number(creditBalance), accountMovementCount, reversalCount })
      .toEqual({ allocationBalance: 0, creditBalance: 20, accountMovementCount: 1, reversalCount: 0 });
  });

  it("records a pending refund during order cancellation without rewriting the original posted income", async () => {
    const paymentId = await createPayment(20);
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 20, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 20, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, userId],
    );
    const transitionService = {
      advance: jest.fn().mockResolvedValue({ order: { id: orderId, currentStateId: "cancelled" } }),
    };
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, tx: any) => {
          const [order] = await tx.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      transitionService as any,
      { listBySaleOrderId: jest.fn() } as any,
      { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "customer_refunds.create"]) } as any,
    );

    await cancellation.execute({
      saleOrderId: orderId,
      userId,
      idempotencyKey: randomUUID(),
      resolutions: [{ incomeId: paymentId, action: "REFUND", amount: 20, reason: "Devolver pago al cancelar" }],
    });

    const [payment] = await dataSource.query(`SELECT status FROM sale_payments WHERE id = $1`, [paymentId]);
    const [refund] = await dataSource.query(`SELECT amount, currency, status FROM customer_refunds WHERE sale_payment_id = $1`, [paymentId]);
    const [{ allocationBalance, releaseAmount, refundReservation, bankIncomeCount, bankReversalCount, refundOutboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1) AS "allocationBalance",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1 AND movement_type = 'RELEASE') AS "releaseAmount",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1 AND movement_type = 'REFUND') AS "refundReservation",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME') AS "bankIncomeCount",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'REVERSAL') AS "bankReversalCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND event_type = 'income.customer_refund_created') AS "refundOutboxCount"`,
      [paymentId],
    );

    expect(payment.status).toBe("POSTED");
    expect(refund).toMatchObject({ amount: "20.00", currency: "PEN", status: "PENDING" });
    expect({ allocationBalance: Number(allocationBalance), releaseAmount: Number(releaseAmount), refundReservation: Number(refundReservation), bankIncomeCount, bankReversalCount, refundOutboxCount })
      .toEqual({ allocationBalance: 0, releaseAmount: 20, refundReservation: -20, bankIncomeCount: 1, bankReversalCount: 0, refundOutboxCount: 1 });
  });

  it("applies released income to another same-client order without duplicating the bank movement", async () => {
    const targetOrderId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`,
      [targetOrderId, clientId],
    );
    const paymentId = await createPayment(20);
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 20, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 20, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, userId],
    );
    const reconciliation = { reconcile: jest.fn() };
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, tx: any) => {
          const [order] = await tx.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      { advance: jest.fn().mockResolvedValue({ order: { id: orderId, currentStateId: "cancelled" } }) } as any,
      { listBySaleOrderId: jest.fn() } as any,
      { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "customer_credits.apply"]) } as any,
      reconciliation as any,
    );

    await cancellation.execute({
      saleOrderId: orderId,
      userId,
      idempotencyKey: randomUUID(),
      resolutions: [{ incomeId: paymentId, action: "APPLY_TO_ORDER", targetSaleOrderId: targetOrderId, amount: 20, reason: "Aplicar al pedido vigente" }],
    });

    const [{ sourceAllocation, targetAllocation, releaseAmount, appliedCredit, bankIncomeCount, bankReversalCount }] = await dataSource.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1 AND sale_order_id = $2) AS "sourceAllocation",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1 AND sale_order_id = $3) AS "targetAllocation",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1 AND movement_type = 'RELEASE') AS "releaseAmount",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1 AND movement_type = 'APPLY') AS "appliedCredit",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME') AS "bankIncomeCount",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'REVERSAL') AS "bankReversalCount"`,
      [paymentId, orderId, targetOrderId],
    );

    expect({ sourceAllocation: Number(sourceAllocation), targetAllocation: Number(targetAllocation), releaseAmount: Number(releaseAmount), appliedCredit: Number(appliedCredit), bankIncomeCount, bankReversalCount })
      .toEqual({ sourceAllocation: 0, targetAllocation: 20, releaseAmount: 20, appliedCredit: -20, bankIncomeCount: 1, bankReversalCount: 0 });
    expect(reconciliation.reconcile).toHaveBeenCalledWith(expect.objectContaining({ saleOrderId: targetOrderId }), expect.anything());
  });

  it("transfers a pending payment to another eligible order and records both sides of the transfer", async () => {
    const targetOrderId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`,
      [targetOrderId, clientId],
    );
    const paymentId = await createPendingPayment(20);
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, tx: any) => {
          const [order] = await tx.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      { advance: jest.fn().mockResolvedValue({ order: { id: orderId, currentStateId: "cancelled" } }) } as any,
      { listBySaleOrderId: jest.fn() } as any,
      { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "sale_orders.payments.transfer_pending"]) } as any,
      { reconcile: jest.fn() } as any,
    );

    await cancellation.execute({
      saleOrderId: orderId,
      userId,
      idempotencyKey: randomUUID(),
      resolutions: [{ incomeId: paymentId, action: "TRANSFER_PENDING", targetSaleOrderId: targetOrderId, reason: "Corregir pedido asociado" }],
    });

    const [payment] = await dataSource.query(`SELECT sale_order_id, status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    const auditActions = await dataSource.query(
      `SELECT action_execution FROM sale_order_auditory WHERE sale_order_id = ANY($1::uuid[]) ORDER BY action_execution`,
      [[orderId, targetOrderId]],
    );
    const [{ outboxCount }] = await dataSource.query(
      `SELECT COUNT(*)::int AS "outboxCount" FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type IN (
         'income.payment_transferred_during_order_cancellation', 'income.payment_received_from_cancelled_order')`,
      [paymentId],
    );

    expect(payment).toMatchObject({ sale_order_id: targetOrderId, status: "PENDING_CONFIRMATION", version: 2 });
    expect(auditActions.map((row: { action_execution: string }) => row.action_execution)).toEqual([
      "payment_received_from_cancelled_order",
      "payment_transferred_during_order_cancellation",
    ]);
    expect(outboxCount).toBe(2);
  });

  it("rolls back every cancellation effect when the destination order has insufficient balance for a pending transfer", async () => {
    const targetOrderId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`,
      [targetOrderId, clientId],
    );
    const incomingPaymentId = await createPendingPayment(20);
    const existingTargetPaymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id, payment_method_id, created_by_user_id)
       VALUES ($1, $2, 90, 'PEN', 'PENDING_CONFIRMATION', CURRENT_DATE, now(), 'TRANSFER', $3, $4, $5)`,
      [existingTargetPaymentId, targetOrderId, accountId, paymentMethodId, userId],
    );
    const transitionService = { advance: jest.fn() };
    const cancellation = new CancelSaleOrderUsecase(
      { runInTransaction: (work: (tx: any) => Promise<any>) => dataSource.transaction((manager) => work({ manager })) } as any,
      {
        findByIdForUpdate: async (id: string, tx: any) => {
          const [order] = await tx.manager.query(
            `SELECT id, client_id AS "clientId", created_by AS "createdBy" FROM sale_orders WHERE id = $1 FOR UPDATE`,
            [id],
          );
          return order;
        },
        countSaleOrdersByClientId: jest.fn().mockResolvedValue(1),
      } as any,
      { update: jest.fn() } as any,
      transitionService as any,
      { listBySaleOrderId: jest.fn() } as any,
      { getEffectivePermissions: jest.fn().mockResolvedValue(["sale_orders.payments.resolve_cancelled_order", "sale_orders.payments.transfer_pending"]) } as any,
    );
    const idempotencyKey = randomUUID();

    await expect(cancellation.execute({
      saleOrderId: orderId,
      userId,
      idempotencyKey,
      resolutions: [{ incomeId: incomingPaymentId, action: "TRANSFER_PENDING", targetSaleOrderId: targetOrderId, reason: "Mover al otro pedido" }],
    })).rejects.toThrow("El importe supera el saldo disponible del pedido destino.");

    const [incomingPayment, targetPayment] = await dataSource.query(
      `SELECT id, sale_order_id, status FROM sale_payments WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [[incomingPaymentId, existingTargetPaymentId]],
    );
    const [{ idempotencyCount, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $1 AND idempotency_key = $2::uuid) AS "idempotencyCount",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = ANY($3::uuid[])) AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $4) AS "outboxCount"`,
      [`cancel-order:${userId}:${orderId}`, idempotencyKey, [orderId, targetOrderId], incomingPaymentId],
    );

    expect([incomingPayment, targetPayment]).toEqual(expect.arrayContaining([
      { id: incomingPaymentId, sale_order_id: orderId, status: "PENDING_CONFIRMATION" },
      { id: existingTargetPaymentId, sale_order_id: targetOrderId, status: "PENDING_CONFIRMATION" },
    ]));
    expect({ idempotencyCount, auditCount, outboxCount }).toEqual({ idempotencyCount: 0, auditCount: 0, outboxCount: 0 });
    expect(transitionService.advance).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await dataSource.query(`TRUNCATE financial_outbox_events, financial_operation_references, financial_account_movements,
      payment_evidence_upload_operations, payment_evidence_access_logs, sale_order_attachments, sale_order_auditory, bank_reconciliation_allocations,
      bank_statement_lines, customer_refunds, customer_credit_movements, sale_payment_allocations, sale_payments,
      sale_orders, clients, company_payment_accounts, companies, payment_methods, financial_idempotency_records CASCADE`);
  });

  afterAll(async () => {
    if (!isExplicitIntegrationDatabase) return;
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
    admin = new DataSource(connectionOptions);
    await admin.initialize();
    await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await admin.destroy();
  });

  it("serializes allocations against the statement-line balance", async () => {
    const paymentA = await createPayment(100);
    const paymentB = await createPayment(100);
    const lineId = await createStatementLine(100);

    const results = await Promise.allSettled([
      reconcile(paymentA, lineId, 75),
      reconcile(paymentB, lineId, 75),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("STATEMENT_LINE_AMOUNT_EXCEEDED");
    const [{ allocated, statementAmount }] = await dataSource.query(
      `SELECT COALESCE(SUM(a.amount), 0)::numeric(14,2) AS allocated, l.amount AS "statementAmount"
       FROM bank_statement_lines l LEFT JOIN bank_reconciliation_allocations a ON a.bank_statement_line_id = l.id
       WHERE l.id = $1 GROUP BY l.id`,
      [lineId],
    );
    expect(Number(allocated)).toBe(75);
    expect(Number(allocated)).toBeLessThanOrEqual(Number(statementAmount));
  });

  it("allows evidence lookup only when the user owns the order or created/updated its payment", async () => {
    const otherUserId = randomUUID();
    await dataSource.query(`INSERT INTO users (user_id, company_id) VALUES ($1, $2)`, [otherUserId, companyId]);
    const paymentId = await createPayment(25);
    await dataSource.query(`UPDATE sale_orders SET created_by = $1 WHERE id = $2`, [userId, orderId]);
    const refundId = randomUUID();
    await dataSource.query(
      `INSERT INTO customer_refunds (id, sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id)
       VALUES ($1, $2, $3, 5, 'PEN', 'PENDING', 'Prueba de alcance', $4)`,
      [refundId, paymentId, clientId, userId],
    );
    const accessControl = { getEffectivePermissions: async () => ["income.view_own"] } as any;
    const scope = new IncomeDataScopeService(accessControl, dataSource);
    const ownScope = await scope.resolve(userId);

    await expect(scope.assertCanReadIncome(paymentId, ownScope)).resolves.toBeUndefined();
    await expect(scope.assertCanReadSaleOrder(orderId, ownScope)).resolves.toBeUndefined();
    await expect(scope.assertCanReadClient(clientId, ownScope)).resolves.toBeUndefined();
    await expect(scope.assertCanReadRefund(refundId, ownScope)).resolves.toBeUndefined();
    await expect(scope.assertCanReadIncome(paymentId, await scope.resolve(otherUserId))).rejects.toThrow("Ingreso no encontrado");
    await expect(scope.assertCanReadRefund(refundId, await scope.resolve(otherUserId))).rejects.toThrow("Reembolso no encontrado");

    await dataSource.query(`UPDATE sale_orders SET created_by = NULL WHERE id = $1`, [orderId]);
    await dataSource.query(`UPDATE sale_payments SET created_by_user_id = $1 WHERE id = $2`, [otherUserId, paymentId]);
    await expect(scope.assertCanReadIncome(paymentId, await scope.resolve(otherUserId))).resolves.toBeUndefined();
    await expect(scope.assertCanReadClient(clientId, await scope.resolve(otherUserId))).resolves.toBeUndefined();

    await dataSource.query(`UPDATE sale_payments SET created_by_user_id = NULL, updated_by_user_id = $1 WHERE id = $2`, [userId, paymentId]);
    await expect(scope.assertCanReadIncome(paymentId, ownScope)).resolves.toBeUndefined();
  });

  it("executes the TypeORM own-scope filter without returning another user's payment", async () => {
    const ownPaymentId = await createPayment(25);
    const otherOrderId = randomUUID();
    const otherPaymentId = randomUUID();
    await dataSource.query(`UPDATE sale_orders SET created_by = $1 WHERE id = $2`, [userId, orderId]);
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active, created_by) VALUES ($1, $2, 100, 'PEN', true, $3)`, [otherOrderId, clientId, randomUUID()]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method)
       VALUES ($1, $2, 40, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER')`,
      [otherPaymentId, otherOrderId],
    );
    const repository = new IncomeQueryTypeormRepository(
      dataSource.getRepository(SalePaymentEntity),
      dataSource.getRepository(SaleOrderEntity),
    );
    const qb = dataSource.getRepository(SalePaymentEntity)
      .createQueryBuilder("sp")
      .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
      .select("sp.id", "incomeId");
    (repository as any).applyOrderFilters(qb, normalizeIncomeFilters({ scopeUserId: userId }));

    await expect(qb.getRawMany()).resolves.toEqual([{ incomeId: ownPaymentId }]);
    expect(otherPaymentId).not.toBe(ownPaymentId);
  });

  it("executes the sale-order payment scope predicate against PostgreSQL", async () => {
    const visiblePaymentId = await createPayment(25);
    await dataSource.query(`UPDATE sale_orders SET created_by = NULL WHERE id = $1`, [orderId]);
    await dataSource.query(`UPDATE sale_payments SET created_by_user_id = $1 WHERE id = $2`, [userId, visiblePaymentId]);
    const hiddenOrderId = randomUUID();
    const hiddenPaymentId = randomUUID();
    const hiddenAccountId = randomUUID();
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [hiddenOrderId, clientId]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 40, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3)`,
      [hiddenPaymentId, hiddenOrderId, hiddenAccountId],
    );
    const repository = new SaleOrderTypeormRepository({ manager: dataSource.manager } as any);
    const context = {
      userId, viewAll: false, includeDeleted: false, includeCustomerData: false, includeAmounts: true,
      includeProducts: false,
      incomeDataScope: { userId, subsidiaryIds: [], accountIds: [accountId], clientIds: [] },
      includeIncomePayments: true,
    };
    const scopeSql = (repository as any).incomePaymentScopeSql(context, 'so', 'sp');
    const scopeParameters = (repository as any).incomePaymentScopeParameters(context);
    const visibleRows = await dataSource.getRepository(SalePaymentEntity)
      .createQueryBuilder('sp')
      .innerJoin(SaleOrderEntity, 'so', 'so.id = sp.saleOrderId')
      .select('sp.id', 'id')
      .where(scopeSql, scopeParameters)
      .orderBy('sp.id', 'ASC')
      .getRawMany();
    expect(visibleRows.map((row: any) => row.id)).toEqual([visiblePaymentId]);
    expect(visibleRows.some((row: any) => row.id === hiddenPaymentId)).toBe(false);

    const scopedPaymentTotalsSql = `(SELECT orders.id AS sale_order_id,
      CASE WHEN EXISTS (SELECT 1 FROM sale_payment_allocations existing WHERE existing.sale_order_id = orders.id)
        THEN COALESCE((SELECT SUM(allocation.amount) FROM sale_payment_allocations allocation
          JOIN sale_payments payment ON payment.id = allocation.sale_payment_id
          WHERE allocation.sale_order_id = orders.id AND payment.status = 'POSTED' AND ${
            (repository as any).incomePaymentScopeSql(context, 'orders', 'payment')
          }), 0)
        ELSE COALESCE((SELECT SUM(payment.amount) FROM sale_payments payment
          WHERE payment.sale_order_id = orders.id AND payment.status = 'POSTED' AND ${
            (repository as any).incomePaymentScopeSql(context, 'orders', 'payment')
          }), 0)
      END AS collected FROM sale_orders orders)`;
    const scopedTotals = await dataSource.createQueryBuilder()
      .select('payment_sum.collected', 'collected')
      .from(SaleOrderEntity, 'so')
      .leftJoin(scopedPaymentTotalsSql, 'payment_sum', 'payment_sum.sale_order_id = so.id')
      .where('so.id = :orderId', { orderId })
      .setParameters(scopeParameters)
      .getRawOne();
    expect(Number(scopedTotals.collected)).toBe(25);
  });

  it("limits income.view_all to the user's company while wildcard access stays system-wide", async () => {
    const ownPaymentId = await createPayment(25);
    const otherCompanyId = randomUUID();
    const otherUserId = randomUUID();
    const otherAccountId = randomUUID();
    const otherOrderId = randomUUID();
    const otherPaymentId = randomUUID();
    await dataSource.query(`INSERT INTO companies (company_id) VALUES ($1)`, [otherCompanyId]);
    await dataSource.query(`INSERT INTO users (user_id, company_id) VALUES ($1, $2)`, [otherUserId, otherCompanyId]);
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'INFLOW', 'BANK')`, [otherAccountId, otherCompanyId],
    );
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [otherOrderId, clientId]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 35, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3)`, [otherPaymentId, otherOrderId, otherAccountId],
    );

    const ownAccess = { getEffectivePermissions: async () => ["income.view_own"] } as any;
    const ownScopeService = new IncomeDataScopeService(ownAccess, dataSource);
    const unassignedOwnScope = await ownScopeService.resolve(userId);
    expect(unassignedOwnScope).toMatchObject({ userId, companyId, accountIds: [] });
    await expect(ownScopeService.assertCanReadAccount(accountId, unassignedOwnScope)).rejects.toThrow("Cuenta no encontrada");

    const companyAccess = { getEffectivePermissions: async () => ["income.view_all"] } as any;
    const companyScopeService = new IncomeDataScopeService(companyAccess, dataSource);
    const companyScope = await companyScopeService.resolve(userId);
    expect(companyScope).toMatchObject({ userId: null, companyId, accountIds: [accountId] });
    await expect(companyScopeService.assertCanReadIncome(ownPaymentId, companyScope)).resolves.toBeUndefined();
    await expect(companyScopeService.assertCanReadIncome(otherPaymentId, companyScope)).rejects.toThrow("Ingreso no encontrado");
    await expect(companyScopeService.listAssignments(otherUserId, userId)).rejects.toThrow("Usuario no encontrado");
    await expect(companyScopeService.replaceAssignments(otherUserId, userId, [{ type: "PAYMENT_ACCOUNT", id: accountId }])).rejects.toThrow("Usuario no encontrado");

    const repository = new IncomeQueryTypeormRepository(
      dataSource.getRepository(SalePaymentEntity),
      dataSource.getRepository(SaleOrderEntity),
    );
    const qb = dataSource.getRepository(SalePaymentEntity)
      .createQueryBuilder("sp")
      .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
      .select("sp.id", "incomeId");
    (repository as any).applyOrderFilters(qb, normalizeIncomeFilters({ scopeCompanyId: companyScope.companyId ?? undefined }));
    await expect(qb.getRawMany()).resolves.toEqual([{ incomeId: ownPaymentId }]);

    const systemAccess = { getEffectivePermissions: async () => ["*"] } as any;
    const systemScope = await new IncomeDataScopeService(systemAccess, dataSource).resolve(userId);
    expect(systemScope).toMatchObject({ userId: null, companyId: null });
    await expect(new IncomeDataScopeService(systemAccess, dataSource).assertCanReadIncome(otherPaymentId, systemScope)).resolves.toBeUndefined();
  });

  it("does not expose or spend customer credit backed by incomes outside the user's scope", async () => {
    const visiblePaymentId = await createPayment(15);
    await dataSource.query(`UPDATE sale_payments SET created_by_user_id = $1 WHERE id = $2`, [userId, visiblePaymentId]);
    const hiddenOrderId = randomUUID();
    const hiddenPaymentId = randomUUID();
    const targetOrderId = randomUUID();
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true), ($3, $2, 100, 'PEN', true)`, [hiddenOrderId, clientId, targetOrderId]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, created_by_user_id)
       VALUES ($1, $2, 20, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3)`,
      [hiddenPaymentId, hiddenOrderId, randomUUID()],
    );
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'EXCESS', 15, 'PEN', $4, 'Credito de alcance propio'),
              ($1, $5, $6, 'EXCESS', 20, 'PEN', $4, 'Credito fuera del alcance')`,
      [clientId, visiblePaymentId, orderId, userId, hiddenPaymentId, hiddenOrderId],
    );

    const permissions = ["income.view_own", "customer_credits.view", "customer_credits.apply"];
    const accessControl = { getEffectivePermissions: async () => permissions } as any;
    const scopeService = new IncomeDataScopeService(accessControl, dataSource);
    const scope = await scopeService.resolve(userId);
    const visibleIncomeIds = await scopeService.listReadableIncomeIdsForClient(clientId, scope);
    expect(visibleIncomeIds).toEqual([visiblePaymentId]);

    const scopedCredits = new ManageIncomePaymentsUsecase(dataSource.manager, accessControl);
    await expect(scopedCredits.getAvailableCustomerCredits(clientId, userId, visibleIncomeIds)).resolves.toEqual([
      { currency: "PEN", available: 15 },
    ]);
    await scopedCredits.applyCustomerCredit({
      clientId, saleOrderId: targetOrderId, amount: 10, userId, reason: "Aplicar credito visible", idempotencyKey: randomUUID(),
      allowedIncomeIds: visibleIncomeIds,
    });
    await expect(scopedCredits.getAvailableCustomerCredits(clientId, userId, visibleIncomeIds)).resolves.toEqual([
      { currency: "PEN", available: 5 },
    ]);
    const [hiddenBalance] = await dataSource.query(`SELECT SUM(amount)::numeric(14,2)::text AS amount FROM customer_credit_movements WHERE sale_payment_id = $1`, [hiddenPaymentId]);
    expect(Number(hiddenBalance.amount)).toBe(20);
  });

  it("applies audited subsidiary/account/client assignments to payment lists and resource reads", async () => {
    const assignedPaymentId = await createPayment(25);
    const otherOrderId = randomUUID();
    const otherPaymentId = randomUUID();
    const subsidiaryId = randomUUID();
    const otherClientId = randomUUID();
    await dataSource.query(`INSERT INTO subsidiaries (id, alias) VALUES ($1, 'Sede asignada')`, [subsidiaryId]);
    await dataSource.query(`INSERT INTO clients (id) VALUES ($1)`, [otherClientId]);
    await dataSource.query(`UPDATE sale_orders SET created_by = NULL, agency_subsidiary_id = $1 WHERE id = $2`, [subsidiaryId, orderId]);
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [otherOrderId, otherClientId]);
    const assignedTargetOrderId = randomUUID();
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active, created_by) VALUES ($1, $2, 100, 'PEN', true, $3)`, [assignedTargetOrderId, clientId, userId]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id, created_by_user_id)
       VALUES ($1, $2, 40, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3, $4)`,
      [otherPaymentId, otherOrderId, accountId, randomUUID()],
    );

    const accessControl = { getEffectivePermissions: async () => ["income.view_own"] } as any;
    const scopeService = new IncomeDataScopeService(accessControl, dataSource);
    const result = await scopeService.replaceAssignments(userId, userId, [
      { type: "SUBSIDIARY", id: subsidiaryId },
      { type: "PAYMENT_ACCOUNT", id: accountId },
      { type: "CLIENT", id: clientId },
    ]);
    expect(result.assignments).toHaveLength(3);
    const auditRows = await dataSource.query(`SELECT before_scopes, after_scopes FROM user_financial_data_scope_audits WHERE target_user_id = $1`, [userId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].after_scopes).toHaveLength(3);

    const resolvedScope = await scopeService.resolve(userId);
    expect(resolvedScope).toMatchObject({ subsidiaryIds: [subsidiaryId], accountIds: [accountId], clientIds: [clientId] });
    await expect(scopeService.listReadableIncomeIdsForClient(clientId, resolvedScope)).resolves.toContain(assignedPaymentId);
    await expect(scopeService.listReadableSaleOrderIdsForIncome(assignedPaymentId, resolvedScope)).resolves.toContain(assignedTargetOrderId);
    await expect(scopeService.assertCanReadIncome(assignedPaymentId, resolvedScope)).resolves.toBeUndefined();
    await expect(scopeService.assertCanReadIncome(otherPaymentId, resolvedScope)).resolves.toBeUndefined();
    const [accountScopedPayment] = await dataSource.query(`SELECT sp.company_payment_account_id AS account_id, sp.created_by_user_id, so.client_id FROM sale_payments sp JOIN sale_orders so ON so.id = sp.sale_order_id WHERE sp.id = $1`, [otherPaymentId]);
    expect(accountScopedPayment).toMatchObject({ account_id: accountId, client_id: otherClientId });
    await expect(scopeService.assertCanReadClient(otherClientId, resolvedScope)).resolves.toBeUndefined();

    const repository = new IncomeQueryTypeormRepository(
      dataSource.getRepository(SalePaymentEntity),
      dataSource.getRepository(SaleOrderEntity),
    );
    const qb = dataSource.getRepository(SalePaymentEntity)
      .createQueryBuilder("sp")
      .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
      .select("sp.id", "incomeId");
    (repository as any).applyOrderFilters(qb, normalizeIncomeFilters({
      scopeUserId: resolvedScope.userId,
      scopeSubsidiaryIds: resolvedScope.subsidiaryIds,
      scopeAccountIds: resolvedScope.accountIds,
      scopeClientIds: resolvedScope.clientIds,
    }));
    await expect(qb.getRawMany()).resolves.toEqual(expect.arrayContaining([
      { incomeId: assignedPaymentId },
      { incomeId: otherPaymentId },
    ]));
  });

  it("keeps income summary balances and ratios separate by currency in PostgreSQL", async () => {
    const usdOrderId = randomUUID();
    const penPaymentId = randomUUID();
    const usdPaymentId = randomUUID();
    const mismatchedCurrencyPaymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'USD', true)`,
      [usdOrderId, clientId],
    );
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, created_by_user_id)
       VALUES ($1, $2, 40, 'PEN', 'POSTED', CURRENT_DATE, CURRENT_DATE, 'Transferencia', $3),
              ($4, $5, 30, 'USD', 'POSTED', CURRENT_DATE, CURRENT_DATE, 'Transferencia', $3),
              ($6, $2, 50, 'USD', 'POSTED', CURRENT_DATE, CURRENT_DATE, 'Transferencia', $3)`,
      [penPaymentId, orderId, userId, usdPaymentId, usdOrderId, mismatchedCurrencyPaymentId],
    );

    const repository = new IncomeQueryTypeormRepository(
      dataSource.getRepository(SalePaymentEntity),
      dataSource.getRepository(SaleOrderEntity),
    );
    const summary = await repository.getSummary(normalizeIncomeFilters({ status: "ALL" }));

    expect(summary.currencyMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: "PEN", totalCollected: 40, totalPending: 60, collectionEffectiveness: 40 }),
      expect.objectContaining({ currency: "USD", totalCollected: 80, totalPending: 70, collectionEffectiveness: 80 / 150 * 100 }),
    ]));
    expect(summary).toMatchObject({ totalCollected: null, totalPending: null, averageCollectedPayment: null, collectionEffectiveness: null, observedPaymentsAmount: null, voidedPaymentsAmount: null });
    expect(summary.byMethod).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: "PEN", amount: 40 }),
      expect.objectContaining({ currency: "USD", amount: 80 }),
    ]));
  });

  it("migrates legacy income readers to own-only scope without granting view-all", async () => {
    const ownRoleId = randomUUID();
    const allRoleId = randomUUID();
    const wildcardRoleId = randomUUID();
    const alreadyOwnRoleId = randomUUID();
    const noIncomeReadRoleId = randomUUID();
    const incomeReadId = randomUUID();
    const viewAllId = randomUUID();
    const viewOwnId = randomUUID();
    const wildcardPermissionId = randomUUID();
    const unrelatedPermissionId = randomUUID();
    await dataSource.query(
      `INSERT INTO roles (role_id, description) VALUES
        ($1, 'legacy-income-reader'), ($2, 'global-income-reader'), ($3, 'wildcard-income-reader'),
        ($4, 'already-scoped-income-reader'), ($5, 'unrelated-role')`,
      [ownRoleId, allRoleId, wildcardRoleId, alreadyOwnRoleId, noIncomeReadRoleId],
    );
    await dataSource.query(
      `INSERT INTO permissions (permission_id, code, name, type) VALUES
        ($1, 'income.read', 'Consultar ingresos', 'action'), ($2, 'income.view_all', 'Ver todos', 'action'),
        ($3, 'income.view_own', 'Ver propios', 'action'), ($4, '*', 'Wildcard legado', 'action'),
        ($5, 'sale_orders.payments.post', 'Contabilizar', 'action')`,
      [incomeReadId, viewAllId, viewOwnId, wildcardPermissionId, unrelatedPermissionId],
    );
    await dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES
        ($1, $6), ($2, $6), ($2, $7), ($3, $6), ($3, $9),
        ($4, $6), ($4, $8), ($5, $10)`,
      [ownRoleId, allRoleId, wildcardRoleId, alreadyOwnRoleId, noIncomeReadRoleId,
        incomeReadId, viewAllId, viewOwnId, wildcardPermissionId, unrelatedPermissionId],
    );

    const migration = new AddIncomeDataScopePermissions20261012070000();
    const runner = dataSource.createQueryRunner();
    await migration.up(runner);
    await migration.up(runner);
    await runner.release();

    const grants = await dataSource.query(
      `SELECT rp.role_id, p.code FROM role_permissions rp JOIN permissions p ON p.permission_id = rp.permission_id
        WHERE rp.role_id = ANY($1::uuid[]) ORDER BY p.code`,
      [[ownRoleId, allRoleId, wildcardRoleId, alreadyOwnRoleId, noIncomeReadRoleId]],
    );
    const codesFor = (roleId: string) => grants.filter((grant: any) => grant.role_id === roleId).map((grant: any) => grant.code);
    expect(codesFor(ownRoleId)).toEqual(["income.read", "income.view_own"]);
    expect(codesFor(allRoleId)).toEqual(["income.read", "income.view_all"]);
    expect(codesFor(wildcardRoleId)).toEqual(["*", "income.read"]);
    expect(codesFor(alreadyOwnRoleId)).toEqual(["income.read", "income.view_own"]);
    expect(codesFor(noIncomeReadRoleId)).toEqual(["sale_orders.payments.post"]);
  });

  it("requires the posting permission on HTTP and persists a successful/idempotent post in PostgreSQL", async () => {
    const paymentId = await createPendingPayment(45.67);
    await dataSource.query(`UPDATE sale_orders SET created_by = $1 WHERE id = $2`, [userId, orderId]);
    const idempotencyKey = randomUUID();
    const post = () => request(app.getHttpServer())
      .post(`/income/${paymentId}/post`)
      .send({ version: 1, idempotencyKey });

    httpPermissions = ["income.read"];
    await post().expect(403);
    let [payment] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    expect(payment).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1 });
    const [{ count: unauthorizedMovements }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM financial_account_movements WHERE sale_payment_id = $1`, [paymentId],
    );
    expect(unauthorizedMovements).toBe(0);

    httpPermissions = ["sale_orders.payments.post"];
    await post().expect(403);
    [payment] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    expect(payment).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1 });
    const [{ count: movementCountWithoutScope }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM financial_account_movements WHERE sale_payment_id = $1`, [paymentId],
    );
    expect(movementCountWithoutScope).toBe(0);

    httpPermissions = ["sale_orders.payments.post", "income.view_own"];
    const first = await post().expect(201);
    const retry = await post().expect(201);
    expect(first.body).toMatchObject({
      type: "success", batchId: idempotencyKey, count: 1, totalsByCurrency: { PEN: 45.67 },
      payments: [{ incomeId: paymentId, amount: 45.67, currency: "PEN" }],
    });
    expect(retry.body).toEqual(first.body);

    [payment] = await dataSource.query(
      `SELECT status, version, posted_by_user_id, accounting_date::text AS accounting_date FROM sale_payments WHERE id = $1`, [paymentId],
    );
    expect(payment).toMatchObject({ status: "POSTED", version: 2, posted_by_user_id: userId });
    const [{ movements, allocations, audits, events }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME') AS movements,
         (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = $1) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_posted') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_posted') AS events`,
      [paymentId, orderId],
    );
    expect({ movements, allocations, audits, events }).toEqual({ movements: 1, allocations: 1, audits: 1, events: 1 });
    const [{ amount: movementAmount }] = await dataSource.query(
      `SELECT amount FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME'`, [paymentId],
    );
    expect(Number(movementAmount)).toBe(45.67);
  });

  it("prevalidates, posts, and recovers a same-date batch through HTTP and PostgreSQL", async () => {
    const paymentIds = [await createPendingPayment(30), await createPendingPayment(25)];
    const payments = paymentIds.map((id) => ({ id, version: 1 }));
    const prevalidate = () => request(app.getHttpServer()).post("/income/post-batch/prevalidate").send({ payments });
    httpPermissions = ["income.view_all"];
    await prevalidate().expect(403);

    httpPermissions = ["sale_orders.payments.post_bulk", "income.view_all"];
    const checked = await prevalidate().expect(201);
    expect(checked.body).toMatchObject({ count: 2, withoutEvidence: 2, canPost: true, errors: [], totalsByCurrency: { PEN: 55 } });
    const idempotencyKey = randomUUID();
    const postBatch = () => request(app.getHttpServer())
      .post("/income/post-batch")
      .send({ payments, idempotencyKey });
    const posted = await postBatch().expect(201);
    const retry = await postBatch().expect(201);
    const recovered = await request(app.getHttpServer()).get(`/income/bulk-operations/${idempotencyKey}`).expect(200);

    expect(posted.body).toMatchObject({ type: "success", batchId: idempotencyKey, count: 2, totalsByCurrency: { PEN: 55 } });
    expect(retry.body).toEqual(posted.body);
    expect(recovered.body).toEqual(posted.body);
    const [{ postedCount, movementCount, allocationCount, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'POSTED')::int AS "postedCount",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[]) AND movement_type = 'INCOME') AS "movementCount",
        (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])) AS "allocationCount",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_posted') AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[]) AND event_type = 'income.payment_posted') AS "outboxCount"
       FROM sale_payments WHERE id = ANY($1::uuid[])`,
      [paymentIds, orderId],
    );
    expect({ postedCount, movementCount, allocationCount, auditCount, outboxCount })
      .toEqual({ postedCount: 2, movementCount: 2, allocationCount: 2, auditCount: 2, outboxCount: 2 });
  });

  it("creates, reconciles, reports, and unreconciles a bank statement through HTTP and PostgreSQL", async () => {
    const paymentId = await createPayment(50);
    const operationDate = new Date().toISOString().slice(0, 10);
    const lineIdempotencyKey = randomUUID();
    const createLine = () => request(app.getHttpServer())
      .post("/income/reconciliation/statement-lines")
      .send({
        companyPaymentAccountId: accountId, bankReference: `BANK-${randomUUID()}`,
        operationDate, amount: 50, currency: "PEN", idempotencyKey: lineIdempotencyKey,
      });

    httpPermissions = ["income.view_all"];
    await createLine().expect(403);
    httpPermissions = ["income.reconciliation.reconcile", "income.view_all"];
    const lineResponse = await createLine().expect(201);
    const lineId = lineResponse.body.line.id as string;
    expect(lineResponse.body.line).toMatchObject({ companyPaymentAccountId: accountId, operationDate, currency: "PEN", amount: "50.00" });

    const reconciliationKey = randomUUID();
    const reconcile = () => request(app.getHttpServer())
      .post(`/income/${paymentId}/reconciliation`)
      .send({ bankStatementLineId: lineId, amount: 50, idempotencyKey: reconciliationKey });
    const reconciled = await reconcile().expect(201);
    const reconciliationRetry = await reconcile().expect(201);
    expect(reconciliationRetry.body).toEqual(reconciled.body);
    const visible = await request(app.getHttpServer())
      .get(`/income/${paymentId}/reconciliation`)
      .set("Accept", "application/json")
      .expect(403);

    httpPermissions = ["income.reconciliation.view", "income.view_all"];
    const listed = await request(app.getHttpServer()).get(`/income/${paymentId}/reconciliation`).expect(200);
    expect(listed.body).toMatchObject({ reconciledAmount: 50, status: "RECONCILED" });
    const report = await request(app.getHttpServer())
      .get(`/income/reconciliation/report?from=${operationDate}&to=${operationDate}`)
      .expect(200);
    expect(report.body.totalsByCurrency.PEN).toMatchObject({ statementAmount: 50, reconciledAmount: 50, availableAmount: 0, lineCount: 1 });
    const allocationId = listed.body.items[0].id as string;

    httpPermissions = ["income.reconciliation.unreconcile", "income.view_all"];
    await request(app.getHttpServer())
      .post(`/income/${paymentId}/reconciliation/${allocationId}/unreconcile`)
      .send({ reason: "Línea bancaria corregida", idempotencyKey: randomUUID() })
      .expect(201);
    httpPermissions = ["income.reconciliation.view", "income.view_all"];
    const afterUnreconcile = await request(app.getHttpServer()).get(`/income/${paymentId}/reconciliation`).expect(200);

    const [{ activeAllocations, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM bank_reconciliation_allocations WHERE sale_payment_id = $1 AND unreconciled_at IS NULL) AS "activeAllocations",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution IN ('income_reconciled','income_unreconciled')) AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type IN ('income.income_reconciled','income.income_unreconciled')) AS "outboxCount"`,
      [paymentId, orderId],
    );
    expect(visible.status).toBe(403);
    expect(afterUnreconcile.body).toMatchObject({ reconciledAmount: 0, status: "UNRECONCILED" });
    expect({ activeAllocations, auditCount, outboxCount }).toEqual({ activeAllocations: 0, auditCount: 2, outboxCount: 2 });
  });

  it("creates, posts, and reverses a refund through the real HTTP controller with a different approver", async () => {
    const paymentId = await createPayment(20);
    const creatorId = userId;
    const approverId = randomUUID();
    const refundAccountId = randomUUID();
    await dataSource.query(`INSERT INTO users (user_id, company_id) VALUES ($1, $2)`, [approverId, companyId]);
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'OUTFLOW', 'BANK')`,
      [refundAccountId, companyId],
    );
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'CREDIT', 20, 'PEN', $4, 'Excedente previo del ingreso')`,
      [clientId, paymentId, orderId, creatorId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 20, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, creatorId],
    );

    httpPermissions = ["customer_refunds.create", "income.view_all"];
    const created = await request(app.getHttpServer())
      .post(`/income/${paymentId}/refunds`)
      .send({ amount: 20, reason: "Devolución autorizada", idempotencyKey: randomUUID() })
      .expect(201);
    const refundId = created.body.refundId as string;
    expect(created.body).toMatchObject({ type: "success", status: "PENDING", amount: 20, currency: "PEN" });

    userId = approverId;
    httpPermissions = ["customer_refunds.post", "income.view_all"];
    const posted = await request(app.getHttpServer())
      .post(`/income/refunds/${refundId}/post`)
      .send({ companyPaymentAccountId: refundAccountId, operationNumber: `REF-${randomUUID()}`, idempotencyKey: randomUUID() })
      .expect(201);
    expect(posted.body).toMatchObject({ type: "success", refundId, status: "POSTED", amount: 20, currency: "PEN" });

    httpPermissions = ["customer_refunds.reverse", "income.view_all"];
    const reversed = await request(app.getHttpServer())
      .post(`/income/refunds/${refundId}/reverse`)
      .send({ reason: "Reversión bancaria aprobada", idempotencyKey: randomUUID() })
      .expect(201);
    expect(reversed.body).toMatchObject({ type: "success", refundId, status: "REVERSED" });

    const [payment] = await dataSource.query(`SELECT status FROM sale_payments WHERE id = $1`, [paymentId]);
    const [refund] = await dataSource.query(`SELECT status, posted_by_user_id, reversed_by_user_id FROM customer_refunds WHERE id = $1`, [refundId]);
    const [{ incomeMovements, refundMovements, reversalMovements, creditBalance, refundEvents }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME') AS "incomeMovements",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = $2 AND movement_type = 'REFUND') AS "refundMovements",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = $2 AND movement_type = 'REFUND_REVERSAL') AS "reversalMovements",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = $1) AS "creditBalance",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = $2) AS "refundEvents"`,
      [paymentId, refundId],
    );

    expect(payment.status).toBe("POSTED");
    expect(refund).toMatchObject({ status: "REVERSED", posted_by_user_id: approverId, reversed_by_user_id: approverId });
    expect({ incomeMovements, refundMovements, reversalMovements, creditBalance: Number(creditBalance), refundEvents })
      .toEqual({ incomeMovements: 1, refundMovements: 1, reversalMovements: 1, creditBalance: 20, refundEvents: 3 });
  });

  it("re-enters a closed payment through HTTP as a new pending income and replays it idempotently", async () => {
    const sourcePaymentId = await createPayment(35.5);
    await dataSource.query(
      `UPDATE sale_payments SET status = 'CANCELLED', version = 2, cancelled_at = now(), cancelled_by_user_id = $2,
         voided_at = now(), voided_by_user_id = $2, void_reason = 'Registro anterior cancelado'
       WHERE id = $1`,
      [sourcePaymentId, userId],
    );
    const idempotencyKey = randomUUID();
    const body = {
      reason: "Registrar nuevamente el cobro corregido",
      idempotencyKey,
      amount: 35.5,
      date: new Date().toISOString().slice(0, 10),
      paymentMethodId,
      companyPaymentAccountId: accountId,
      operationNumber: null,
      note: "Reingreso de prueba",
    };
    httpPermissions = ["sale_orders.payments.reenter_closed", "income.view_all"];
    const reenter = () => request(app.getHttpServer()).post(`/income/${sourcePaymentId}/reenter`).send(body);

    const first = await reenter().expect(201);
    const retry = await reenter().expect(201);
    const replacementId = first.body.incomeId as string;
    expect(first.body).toMatchObject({ type: "success", incomeId: replacementId, sourceIncomeId: sourcePaymentId, status: "PENDING_CONFIRMATION", version: 1 });
    expect(retry.body).toEqual(first.body);

    const [source, replacement] = await dataSource.query(
      `SELECT id, status, sale_order_id, reentered_from_payment_id, amount, version FROM sale_payments WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [[sourcePaymentId, replacementId]],
    );
    const [{ accountMovements, reentryEvents }] = await dataSource.query(
      `SELECT
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1) AS "accountMovements",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $2 AND event_type = 'income.payment_reentered') AS "reentryEvents"`,
      [replacementId, replacementId],
    );
    expect([source, replacement]).toEqual(expect.arrayContaining([
      { id: sourcePaymentId, status: "CANCELLED", sale_order_id: orderId, reentered_from_payment_id: null, amount: "35.50", version: 2 },
      { id: replacementId, status: "PENDING_CONFIRMATION", sale_order_id: orderId, reentered_from_payment_id: sourcePaymentId, amount: "35.50", version: 1 },
    ]));
    expect({ accountMovements, reentryEvents }).toEqual({ accountMovements: 0, reentryEvents: 1 });
  });

  it("enforces HTTP permissions and persists pending cancellation and posted-income reversal", async () => {
    const pendingPaymentId = await createPendingPayment(25);
    const cancelKey = randomUUID();
    const cancelPending = () => request(app.getHttpServer())
      .post(`/income/${pendingPaymentId}/cancel`)
      .send({ version: 1, reason: "Cancelar ingreso pendiente", idempotencyKey: cancelKey });

    httpPermissions = ["income.view_all"];
    await cancelPending().expect(403);
    let [pending] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [pendingPaymentId]);
    expect(pending).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1 });

    httpPermissions = ["sale_orders.payments.cancel_pending", "income.view_all"];
    const cancelled = await cancelPending().expect(201);
    const cancelledRetry = await cancelPending().expect(201);
    expect(cancelled.body).toMatchObject({ type: "success", incomeId: pendingPaymentId, status: "CANCELLED" });
    expect(cancelledRetry.body).toEqual(cancelled.body);
    [pending] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [pendingPaymentId]);
    expect(pending).toMatchObject({ status: "CANCELLED", version: 2 });

    const postedPaymentId = await createPayment(30);
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 30, 'PEN', $3)`,
      [postedPaymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 30, 'PEN', CURRENT_DATE, $3)`,
      [accountId, postedPaymentId, userId],
    );
    const reverseKey = randomUUID();
    const reversePosted = () => request(app.getHttpServer())
      .post(`/income/${postedPaymentId}/reverse`)
      .send({ version: 1, reason: "Reversión autorizada del ingreso", idempotencyKey: reverseKey });

    httpPermissions = ["income.view_all"];
    await reversePosted().expect(403);
    httpPermissions = ["sale_orders.payments.reverse_posted", "income.view_all"];
    const reversed = await reversePosted().expect(201);
    const reversedRetry = await reversePosted().expect(201);
    expect(reversed.body).toMatchObject({ type: "success", incomeId: postedPaymentId, status: "REVERSED" });
    expect(reversedRetry.body).toEqual(reversed.body);

    const [posted] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [postedPaymentId]);
    const [{ accountBalance, allocationBalance, reversalCount, auditCount, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM financial_account_movements WHERE sale_payment_id = $1) AS "accountBalance",
        (SELECT COALESCE(SUM(amount), 0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1) AS "allocationBalance",
        (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'REVERSAL') AS "reversalCount",
        (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_reversed') AS "auditCount",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_reversed') AS "outboxCount"`,
      [postedPaymentId, orderId],
    );
    const [{ cancelEvents }] = await dataSource.query(
      `SELECT COUNT(*)::int AS "cancelEvents" FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_cancelled'`,
      [pendingPaymentId],
    );

    expect(posted).toMatchObject({ status: "REVERSED", version: 2 });
    expect({ accountBalance: Number(accountBalance), allocationBalance: Number(allocationBalance), reversalCount, auditCount, outboxCount, cancelEvents })
      .toEqual({ accountBalance: 0, allocationBalance: 0, reversalCount: 1, auditCount: 1, outboxCount: 1, cancelEvents: 1 });
  });

  it("corrects a posted income through HTTP and transfers its operation reference to the replacement", async () => {
    const sourcePaymentId = await createPayment(30);
    const operationNumber = "OP-HTTP-CORRECTION";
    await dataSource.query(`UPDATE sale_payments SET operation_number = $2 WHERE id = $1`, [sourcePaymentId, operationNumber]);
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 30, 'PEN', $3)`,
      [sourcePaymentId, orderId, userId],
    );
    await dataSource.query(
      `INSERT INTO financial_account_movements (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 30, 'PEN', CURRENT_DATE, $3)`,
      [accountId, sourcePaymentId, userId],
    );
    const idempotencyKey = randomUUID();
    const body = {
      version: 1, amount: 30, date: new Date().toISOString().slice(0, 10), paymentMethodId,
      companyPaymentAccountId: accountId, operationNumber, note: "Corrección de referencia",
      reason: "Reemplazo autorizado del registro", idempotencyKey,
    };
    httpPermissions = ["income.view_all"];
    await request(app.getHttpServer()).post(`/income/${sourcePaymentId}/correct`).send(body).expect(403);
    httpPermissions = ["sale_orders.payments.correct_posted", "income.view_all"];
    const corrected = await request(app.getHttpServer()).post(`/income/${sourcePaymentId}/correct`).send(body).expect(201);
    const retried = await request(app.getHttpServer()).post(`/income/${sourcePaymentId}/correct`).send(body).expect(201);
    expect(corrected.body).toMatchObject({ type: "success", sourceIncomeId: sourcePaymentId, sourceStatus: "REVERSED", status: "POSTED", amount: 30, version: 1 });
    expect(retried.body).toEqual(corrected.body);
    const replacementId = corrected.body.incomeId as string;

    const [source, replacement] = await dataSource.query(
      `SELECT id, status, version, operation_number FROM sale_payments WHERE id = ANY($1::uuid[]) ORDER BY id`,
      [[sourcePaymentId, replacementId]],
    );
    const [{ originalMovements, replacementMovements, originalAllocation, replacementAllocation, referenceOwner, outboxCount }] = await dataSource.query(
      `SELECT
        (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM financial_account_movements WHERE sale_payment_id = $1) AS "originalMovements",
        (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM financial_account_movements WHERE sale_payment_id = $2) AS "replacementMovements",
        (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $1) AS "originalAllocation",
        (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM sale_payment_allocations WHERE sale_payment_id = $2) AS "replacementAllocation",
        (SELECT payment_id FROM financial_operation_references WHERE lower(btrim(normalized_reference)) = lower($3) AND operation_type = 'INCOME') AS "referenceOwner",
        (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id IN ($1, $2)
           AND event_type IN ('income.payment_corrected_out','income.payment_corrected_in')) AS "outboxCount"`,
      [sourcePaymentId, replacementId, operationNumber],
    );

    expect([source, replacement]).toEqual(expect.arrayContaining([
      { id: sourcePaymentId, status: "REVERSED", version: 2, operation_number: operationNumber },
      { id: replacementId, status: "POSTED", version: 1, operation_number: operationNumber },
    ]));
    expect({
      originalMovements: Number(originalMovements), replacementMovements: Number(replacementMovements),
      originalAllocation: Number(originalAllocation), replacementAllocation: Number(replacementAllocation), referenceOwner, outboxCount,
    }).toEqual({ originalMovements: 0, replacementMovements: 30, originalAllocation: 0, replacementAllocation: 30, referenceOwner: replacementId, outboxCount: 2 });
  });

  it("enforces own/all read scope on HTTP and ignores a client-supplied scope", async () => {
    httpPermissions = ["income.read"];
    await request(app.getHttpServer()).get("/income").expect(403);
    expect(listIncomeExecute).not.toHaveBeenCalled();

    httpPermissions = ["income.read", "income.view_own"];
    await request(app.getHttpServer()).get(`/income?scopeUserId=${randomUUID()}`).expect(200);
    expect(listIncomeExecute).toHaveBeenCalledWith(expect.objectContaining({ scopeUserId: userId, requestedBy: userId }));

    await request(app.getHttpServer()).get(`/income/summary?scopeUserId=${randomUUID()}`).expect(200);
    expect(getIncomeSummaryExecute).toHaveBeenCalledWith(expect.objectContaining({ scopeUserId: userId }));

    httpPermissions = ["income.read", "income.view_all"];
    await request(app.getHttpServer()).get(`/income?scopeUserId=${randomUUID()}`).expect(200);
    expect(listIncomeExecute).toHaveBeenLastCalledWith(expect.objectContaining({ scopeUserId: undefined, requestedBy: userId }));

    const paymentId = await createPayment(15);
    await dataSource.query(`UPDATE sale_orders SET created_by = $1 WHERE id = $2`, [randomUUID(), orderId]);
    httpPermissions = ["income.read", "income.view_own", "payments.view_evidence"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence`).expect(404);
    expect(getIncomeEvidenceExecute).not.toHaveBeenCalled();
  });

  it("records successful private evidence reads and exposes the scoped access audit", async () => {
    const paymentId = await createPayment(18);
    const attachmentId = randomUUID();
    const content = Buffer.from("isolated-private-proof");
    httpPermissions = ["income.read", "payments.view_evidence", "income.view_all"];
    getIncomeEvidenceExecute.mockResolvedValue({
      incomeId: paymentId, saleOrderId: orderId, attachmentId, inherited: false,
      url: "private/evidence/proof.webp", mimeType: "image/webp",
    });

    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/content`).expect(200).expect(content);
    const [{ count }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM payment_evidence_access_logs WHERE income_id = $1`,
      [paymentId],
    );
    const [accessLog] = await dataSource.query(
      `SELECT actor_user_id AS "actorUserId", evidence_attachment_id AS "recordedAttachmentId",
        content_sha256 AS digest, size_bytes::int AS "sizeBytes"
       FROM payment_evidence_access_logs WHERE income_id = $1 LIMIT 1`,
      [paymentId],
    );
    expect({ count, ...accessLog }).toEqual({
      count: 1, actorUserId: userId, recordedAttachmentId: attachmentId,
      digest: createHash("sha256").update(content).digest("hex"), sizeBytes: content.length,
    });

    httpPermissions = ["income.audit.view", "income.view_all"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/access-log?limit=10`).expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ actorUserId: userId, attachmentId, inherited: false, sizeBytes: content.length });
        expect(body[0]).not.toHaveProperty("url");
        expect(body[0]).not.toHaveProperty("content");
      });

    httpPermissions = ["income.view_all"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/access-log`).expect(403);
  });

  it("lists retained evidence revisions without paths and logs authenticated reads of an old revision", async () => {
    const paymentId = await createPendingPayment(28);
    const oldAttachmentId = randomUUID();
    const currentAttachmentId = randomUUID();
    const oldPath = `private/sale-order-attachments/${orderId}/old-revision.webp`;
    await dataSource.query(
      `INSERT INTO sale_order_attachments
        (id, sale_order_id, sale_order_payment_id, type, filename, original_name, mime_type,
         size_bytes, url, storage_path, uploaded_by_user_id, note, deleted_at, created_at,
         upload_idempotency_key, content_sha256)
       VALUES
        ($1, $2, $3, 'PAYMENT_PROOF', 'old-revision.webp', 'recibo-anterior.png', 'image/webp', 18, $4, $4, $5,
         'revision anterior', now() - interval '1 day', now() - interval '2 days', $6, $7),
        ($8, $2, $3, 'PAYMENT_PROOF', 'current-revision.webp', 'recibo-actual.png', 'image/webp', 22,
         'private/sale-order-attachments/' || $2 || '/current-revision.webp',
         'private/sale-order-attachments/' || $2 || '/current-revision.webp', $5,
         'revision actual', NULL, now() - interval '1 day', $9, $10)`,
      [oldAttachmentId, orderId, paymentId, oldPath, userId, randomUUID(), "a".repeat(64), currentAttachmentId, randomUUID(), "b".repeat(64)],
    );

    httpPermissions = ["income.read", "income.audit.view", "income.view_all", "payments.view_evidence"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/revisions?limit=10`).expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body[0]).toMatchObject({ attachmentId: currentAttachmentId, isCurrent: true, originalName: "recibo-actual.png" });
        expect(body[1]).toMatchObject({ attachmentId: oldAttachmentId, isCurrent: false, originalName: "recibo-anterior.png" });
        expect(body[1]).not.toHaveProperty("storagePath");
        expect(body[1]).not.toHaveProperty("url");
      });
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/revisions/${oldAttachmentId}/content`)
      .expect(200)
      .expect(Buffer.from("isolated-private-proof"));

    const [accessLog] = await dataSource.query(
      `SELECT actor_user_id AS "actorUserId", evidence_attachment_id AS "attachmentId"
       FROM payment_evidence_access_logs WHERE income_id = $1 ORDER BY accessed_at DESC LIMIT 1`,
      [paymentId],
    );
    expect(accessLog).toEqual({ actorUserId: userId, attachmentId: oldAttachmentId });

    httpPermissions = ["income.read", "income.view_all", "payments.view_evidence"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/revisions?limit=10`).expect(403);
  });

  it("recovers quarantined evidence through the scoped HTTP route into PostgreSQL and private storage", async () => {
    const paymentId = await createPendingPayment(12);
    httpPermissions = ["income.read", "income.audit.view", "income.view_all"];
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/quarantine`).expect(200);
    expect(listQuarantinedEvidence).toHaveBeenCalledWith(paymentId);
    await request(app.getHttpServer())
      .post(`/income/${paymentId}/evidence/quarantine/${randomUUID()}/recover`)
      .send({ reason: "Integridad verificada" })
      .expect(403);
    expect(recoverQuarantinedEvidence).not.toHaveBeenCalled();

    httpPermissions = [...httpPermissions, "income.evidence.quarantine.manage"];
    const operationId = randomUUID();
    const idempotencyKey = randomUUID();
    const content = Buffer.from("integrated-quarantined-proof");
    const digest = createHash("sha256").update(content).digest("hex");
    const quarantineKey = `quarantine/payment-evidence/${operationId}/proof.webp`;
    const privateKey = `private/sale-order-attachments/${orderId}/${operationId}.webp`;
    const files = new Map<string, Buffer>([[quarantineKey, content]]);
    const fileStorage = {
      save: jest.fn(async ({ area, directory, filename, buffer }: { area?: string; directory: string; filename: string; buffer: Buffer }) => {
        const key = `${area}/${directory}/${filename}`;
        files.set(key, buffer);
        return { area: area ?? "private", key, filename, relativePath: key };
      }),
      read: jest.fn(async (key: string) => {
        const bytes = files.get(key);
        if (!bytes) throw new Error("FILE_NOT_FOUND");
        return bytes;
      }),
      exists: jest.fn(async (key: string) => files.has(key)),
      resolve: jest.fn((key: string) => ({ area: key.split("/")[0], key, filename: key.split("/").pop()!, relativePath: key })),
      delete: jest.fn(async (key: string) => files.delete(key)),
      moveToDeleted: jest.fn(),
    };
    const realtime = { emitToAllConnected: jest.fn() } as any;
    const recovery = new IncomeEvidenceQuarantineUsecase(dataSource.manager, fileStorage as any, realtime);
    await dataSource.query(
      `INSERT INTO payment_evidence_upload_operations
        (id, sale_order_payment_id, sale_order_id, uploaded_by_user_id, idempotency_key,
         source_content_sha256, prepared_content_sha256, original_name, mime_type, size_bytes,
         status, quarantine_key, last_error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'proof.webp','image/webp',$8,'QUARANTINED',$9,'INTEGRITY_FALSE_POSITIVE')`,
      [operationId, paymentId, orderId, userId, idempotencyKey, "a".repeat(64), digest, content.length, quarantineKey],
    );
    listQuarantinedEvidence.mockImplementation((incomeId: string) => recovery.list(incomeId));
    recoverQuarantinedEvidence.mockImplementation((incomeId: string, recoveryId: string, actorId: string, reason: string) =>
      recovery.recover(incomeId, recoveryId, actorId, reason));

    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/quarantine`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: operationId, incomeId: paymentId, fileAvailable: true });
        expect(body[0]).not.toHaveProperty("quarantineKey");
      });
    const recoverPath = `/income/${paymentId}/evidence/quarantine/${operationId}/recover`;
    const concurrentResponses = await Promise.all([
      request(app.getHttpServer()).post(recoverPath).send({ reason: "Integridad verificada desde ruta real" }).expect(201),
      request(app.getHttpServer()).post(recoverPath).send({ reason: "Integridad verificada desde ruta real" }).expect(201),
    ]);
    expect(concurrentResponses[0].body).toMatchObject({ incomeId: paymentId, operationId, status: "COMPLETED" });
    expect(concurrentResponses[1].body).toEqual(concurrentResponses[0].body);

    const replay = await request(app.getHttpServer())
      .post(recoverPath)
      .send({ reason: "Integridad verificada desde ruta real" })
      .expect(201);
    expect(replay.body).toMatchObject({ incomeId: paymentId, operationId, status: "COMPLETED" });
    expect(files.get(quarantineKey)).toEqual(content);
    expect(files.get(privateKey)).toEqual(content);
    expect(fileStorage.save).toHaveBeenCalledTimes(1);
    expect(fileStorage.delete).not.toHaveBeenCalled();
    expect(realtime.emitToAllConnected).toHaveBeenCalledTimes(2);

    const [{ status, recoveredBy, recoveryReason, attachmentCount, auditCount, eventCount }] = await dataSource.query(
      `SELECT operation.status, operation.recovered_by_user_id AS "recoveredBy",
              operation.recovery_reason AS "recoveryReason",
              (SELECT COUNT(*)::int FROM sale_order_attachments WHERE id = operation.attachment_id
                AND storage_path = $2 AND deleted_at IS NULL) AS "attachmentCount",
              (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $3
                AND executed_by = $4 AND action_execution = 'payment_evidence_quarantine_recovered') AS "auditCount",
              (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $5
                AND event_type = 'income.payment_evidence_quarantine_recovered') AS "eventCount"
       FROM payment_evidence_upload_operations operation WHERE operation.id = $1`,
      [operationId, privateKey, orderId, userId, paymentId],
    );
    expect({ status, recoveredBy, recoveryReason, attachmentCount, auditCount, eventCount }).toEqual({
      status: "COMPLETED", recoveredBy: userId, recoveryReason: "Integridad verificada desde ruta real",
      attachmentCount: 1, auditCount: 1, eventCount: 1,
    });
    await request(app.getHttpServer()).get(`/income/${paymentId}/evidence/quarantine`)
      .expect(200).expect([]);
  });

  it("serializes allocations against the posted-income balance", async () => {
    const paymentId = await createPayment(100);
    const lineA = await createStatementLine(100);
    const lineB = await createStatementLine(100);

    const results = await Promise.allSettled([
      reconcile(paymentId, lineA, 75),
      reconcile(paymentId, lineB, 75),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("INCOME_RECONCILED_AMOUNT_EXCEEDED");
    const [{ allocated, paymentAmount }] = await dataSource.query(
      `SELECT COALESCE(SUM(a.amount), 0)::numeric(14,2) AS allocated, p.amount AS "paymentAmount"
       FROM sale_payments p LEFT JOIN bank_reconciliation_allocations a ON a.sale_payment_id = p.id
       WHERE p.id = $1 GROUP BY p.id`,
      [paymentId],
    );
    expect(Number(allocated)).toBe(75);
    expect(Number(allocated)).toBeLessThanOrEqual(Number(paymentAmount));
  });

  it("returns the committed result for concurrent retries with the same idempotency key", async () => {
    const paymentId = await createPayment(100);
    const lineId = await createStatementLine(100);
    const key = randomUUID();

    const [first, retry] = await Promise.all([
      reconcile(paymentId, lineId, 50, key),
      reconcile(paymentId, lineId, 50, key),
    ]);

    expect(first).toEqual(retry);
    const [{ count }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM bank_reconciliation_allocations WHERE sale_payment_id = $1`,
      [paymentId],
    );
    expect(count).toBe(1);
  });

  it("posts one pending income at most once under concurrent requests with different keys", async () => {
    const paymentId = await createPendingPayment(100);
    const post = (idempotencyKey: string) => usecase.postOne({
      incomeId: paymentId, userId, expectedVersion: 1, idempotencyKey,
    });

    const results = await Promise.allSettled([post(randomUUID()), post(randomUUID())]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("INCOME_NOT_PENDING");

    const [{ status, version }] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    const [{ movements }] = await dataSource.query(`SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1 AND movement_type = 'INCOME'`, [paymentId]);
    const [{ allocations }] = await dataSource.query(`SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations WHERE sale_payment_id = $1`, [paymentId]);
    const [{ audits }] = await dataSource.query(`SELECT COUNT(*)::int AS audits FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_posted'`, [orderId]);
    const [{ events }] = await dataSource.query(`SELECT COUNT(*)::int AS events FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_posted'`, [paymentId]);
    expect({ status, version, movements, allocations, audits, events }).toEqual({
      status: "POSTED", version: 2, movements: 1, allocations: 1, audits: 1, events: 1,
    });
  });

  it("rolls back a failed posting completely and lets the same idempotency key succeed on retry", async () => {
    const paymentId = await createPendingPayment(45.67);
    const key = randomUUID();
    const request = { incomeId: paymentId, userId, expectedVersion: 1, idempotencyKey: key };

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_income_posted_event CHECK (event_type <> 'income.payment_posted')`);
    try {
      await expect(usecase.postOne(request)).rejects.toMatchObject({ code: "23514" });

      const [{ status, version, movements, allocations, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT p.status, p.version,
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id) AS movements,
           (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = p.id) AS allocations,
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_posted') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_posted') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $2 AND idempotency_key = $3) AS "idempotencyRecords"
         FROM sale_payments p WHERE p.id = $1`,
        [paymentId, `post:${userId}`, key],
      );
      expect({ status, version, movements, allocations, audits, events, idempotencyRecords }).toEqual({
        status: "PENDING_CONFIRMATION", version: 1, movements: 0, allocations: 0, audits: 0, events: 0, idempotencyRecords: 0,
      });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_income_posted_event`);
    }

    await expect(usecase.postOne(request)).resolves.toMatchObject({ type: "success", batchId: key, count: 1 });
    const [{ status, movements, allocations, audits, events, idempotencyRecords }] = await dataSource.query(
      `SELECT p.status,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id) AS movements,
         (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = p.id) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_posted') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_posted') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $2 AND idempotency_key = $3 AND status = 'COMPLETED') AS "idempotencyRecords"
       FROM sale_payments p WHERE p.id = $1`,
      [paymentId, `post:${userId}`, key],
    );
    expect({ status, movements, allocations, audits, events, idempotencyRecords }).toEqual({
      status: "POSTED", movements: 1, allocations: 1, audits: 1, events: 1, idempotencyRecords: 1,
    });
  });

  it("rolls back a failed reconciliation completely and replays the same key after retry", async () => {
    const paymentId = await createPayment(45.67);
    const statementLineId = await createStatementLine(45.67);
    const key = randomUUID();
    const request = { incomeId: paymentId, bankStatementLineId: statementLineId, amount: 45.67, userId, idempotencyKey: key };
    const scope = `income-reconcile:${userId}:${paymentId}`;

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_income_reconciled_event CHECK (event_type <> 'income.income_reconciled')`);
    try {
      await expect(usecase.reconcileIncome(request)).rejects.toMatchObject({ code: "23514" });
      const [{ allocations, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT
           (SELECT COUNT(*)::int FROM bank_reconciliation_allocations WHERE sale_payment_id = $1) AS allocations,
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'income_reconciled') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.income_reconciled') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4) AS "idempotencyRecords"`,
        [paymentId, orderId, scope, key],
      );
      expect({ allocations, audits, events, idempotencyRecords }).toEqual({ allocations: 0, audits: 0, events: 0, idempotencyRecords: 0 });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_income_reconciled_event`);
    }

    const first = await usecase.reconcileIncome(request);
    await expect(usecase.reconcileIncome(request)).resolves.toEqual(first);
    const [{ allocations, audits, events, completedRecords }] = await dataSource.query(
      `SELECT
         (SELECT COUNT(*)::int FROM bank_reconciliation_allocations WHERE sale_payment_id = $1 AND unreconciled_at IS NULL) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'income_reconciled') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.income_reconciled') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4 AND status = 'COMPLETED') AS "completedRecords"`,
      [paymentId, orderId, scope, key],
    );
    expect({ allocations, audits, events, completedRecords }).toEqual({ allocations: 1, audits: 1, events: 1, completedRecords: 1 });
  });

  it("rolls back a failed refund posting completely and replays the same key after retry", async () => {
    const paymentId = await createPayment(20);
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'CREDIT', 20, 'PEN', $4, 'Crédito disponible para reembolso')`,
      [clientId, paymentId, orderId, userId],
    );
    const created = await usecase.createRefund({ incomeId: paymentId, userId, amount: 20, reason: "Devolución de prueba", idempotencyKey: randomUUID() });
    const refundId = (created as any).refundId as string;
    const refundAccountId = randomUUID();
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'OUTFLOW', 'BANK')`,
      [refundAccountId, companyId],
    );
    const key = randomUUID();
    const operationNumber = `REF-${randomUUID()}`;
    const request = { refundId, userId, companyPaymentAccountId: refundAccountId, operationNumber, idempotencyKey: key };
    const scope = `refund-post:${userId}:${refundId}`;

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_refund_posted_event CHECK (event_type <> 'income.customer_refund_posted')`);
    try {
      await expect(usecase.postRefund(request)).rejects.toMatchObject({ code: "23514" });
      const [{ status, movements, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT cr.status,
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND') AS movements,
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_posted') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_posted') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4) AS "idempotencyRecords"
         FROM customer_refunds cr WHERE cr.id = $1`,
        [refundId, orderId, scope, key],
      );
      expect({ status, movements, audits, events, idempotencyRecords }).toEqual({ status: "PENDING", movements: 0, audits: 0, events: 0, idempotencyRecords: 0 });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_refund_posted_event`);
    }

    const first = await usecase.postRefund(request);
    await expect(usecase.postRefund(request)).resolves.toEqual(first);
    const [{ status, movements, audits, events, completedRecords }] = await dataSource.query(
      `SELECT cr.status,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND') AS movements,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_posted') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_posted') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4 AND status = 'COMPLETED') AS "completedRecords"
       FROM customer_refunds cr WHERE cr.id = $1`,
      [refundId, orderId, scope, key],
    );
    expect({ status, movements, audits, events, completedRecords }).toEqual({ status: "POSTED", movements: 1, audits: 1, events: 1, completedRecords: 1 });
  });

  it("rolls back a failed posted-income reversal completely and replays the same key after retry", async () => {
    const paymentId = await createPayment(32.4);
    await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 32.40, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, userId],
    );
    const key = randomUUID();
    const request = { incomeId: paymentId, userId, expectedVersion: 1, reason: "Reversión autorizada de prueba", idempotencyKey: key };
    const scope = `close:${userId}:${paymentId}`;

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_income_reversed_event CHECK (event_type <> 'income.payment_reversed')`);
    try {
      await expect(usecase.cancelOrReverse(request)).rejects.toMatchObject({ code: "23514" });
      const [{ status, version, originalMovements, reversalMovements, allocations, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT p.status, p.version,
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id AND movement_type = 'INCOME') AS "originalMovements",
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id AND movement_type = 'REVERSAL') AS "reversalMovements",
           (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = p.id) AS allocations,
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_reversed') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_reversed') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $2 AND idempotency_key = $3) AS "idempotencyRecords"
         FROM sale_payments p WHERE p.id = $1`,
        [paymentId, scope, key],
      );
      expect({ status, version, originalMovements, reversalMovements, allocations, audits, events, idempotencyRecords }).toEqual({
        status: "POSTED", version: 1, originalMovements: 1, reversalMovements: 0, allocations: 0, audits: 0, events: 0, idempotencyRecords: 0,
      });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_income_reversed_event`);
    }

    const first = await usecase.cancelOrReverse(request);
    await expect(usecase.cancelOrReverse(request)).resolves.toEqual(first);
    const [{ status, version, originalMovements, reversalMovements, audits, events, completedRecords }] = await dataSource.query(
      `SELECT p.status, p.version,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id AND movement_type = 'INCOME') AS "originalMovements",
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id AND movement_type = 'REVERSAL') AS "reversalMovements",
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_reversed') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_reversed') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $2 AND idempotency_key = $3 AND status = 'COMPLETED') AS "completedRecords"
       FROM sale_payments p WHERE p.id = $1`,
      [paymentId, scope, key],
    );
    expect({ status, version, originalMovements, reversalMovements, audits, events, completedRecords }).toEqual({
      status: "REVERSED", version: 2, originalMovements: 1, reversalMovements: 1, audits: 1, events: 1, completedRecords: 1,
    });
  });

  it("rejects replaying an income closure key with a different expected version", async () => {
    const paymentId = await createPendingPayment(18);
    const idempotencyKey = randomUUID();
    const request = {
      incomeId: paymentId, userId, expectedVersion: 1,
      reason: "Cancelación solicitada por prueba", idempotencyKey,
    };

    await expect(usecase.cancelOrReverse(request)).resolves.toMatchObject({ status: "CANCELLED" });
    await expect(usecase.cancelOrReverse({ ...request, expectedVersion: 2 })).rejects.toMatchObject({
      response: expect.objectContaining({ code: "IDEMPOTENCY_KEY_REUSED" }),
    });

    const [{ status, version, audits, events, idempotencyRecords }] = await dataSource.query(
      `SELECT p.status, p.version,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_cancelled') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_cancelled') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $2 AND idempotency_key = $3 AND status = 'COMPLETED') AS "idempotencyRecords"
       FROM sale_payments p WHERE p.id = $1`,
      [paymentId, `close:${userId}:${paymentId}`, idempotencyKey],
    );
    expect({ status, version, audits, events, idempotencyRecords }).toEqual({
      status: "CANCELLED", version: 2, audits: 1, events: 1, idempotencyRecords: 1,
    });
  });

  it("rolls back a failed pending-refund cancellation and replays the same key after retry", async () => {
    const paymentId = await createPayment(25);
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'CREDIT', 25, 'PEN', $4, 'Crédito disponible para cancelar reembolso')`,
      [clientId, paymentId, orderId, userId],
    );
    const created = await usecase.createRefund({ incomeId: paymentId, userId, amount: 10, reason: "Reserva de prueba", idempotencyKey: randomUUID() });
    const refundId = (created as any).refundId as string;
    const key = randomUUID();
    const request = { refundId, userId, reason: "Anulación de reserva de prueba", idempotencyKey: key };
    const scope = `refund-cancel:${userId}:${refundId}`;

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_refund_cancelled_event CHECK (event_type <> 'income.customer_refund_cancelled')`);
    try {
      await expect(usecase.cancelRefund(request)).rejects.toMatchObject({ code: "23514" });
      const [{ status, creditBalance, creditRows, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT cr.status,
           (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id) AS "creditBalance",
           (SELECT COUNT(*)::int FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id AND reason LIKE 'Reserva de reembolso cancelada:%') AS "creditRows",
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_cancelled') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_cancelled') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4) AS "idempotencyRecords"
         FROM customer_refunds cr WHERE cr.id = $1`,
        [refundId, orderId, scope, key],
      );
      expect({ status, creditBalance: Number(creditBalance), creditRows, audits, events, idempotencyRecords })
        .toEqual({ status: "PENDING", creditBalance: 15, creditRows: 0, audits: 0, events: 0, idempotencyRecords: 0 });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_refund_cancelled_event`);
    }

    const first = await usecase.cancelRefund(request);
    await expect(usecase.cancelRefund(request)).resolves.toEqual(first);
    const [{ status, creditBalance, creditRows, audits, events, completedRecords }] = await dataSource.query(
      `SELECT cr.status,
         (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id) AS "creditBalance",
         (SELECT COUNT(*)::int FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id AND reason LIKE 'Reserva de reembolso cancelada:%') AS "creditRows",
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_cancelled') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_cancelled') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4 AND status = 'COMPLETED') AS "completedRecords"
       FROM customer_refunds cr WHERE cr.id = $1`,
      [refundId, orderId, scope, key],
    );
    expect({ status, creditBalance: Number(creditBalance), creditRows, audits, events, completedRecords })
      .toEqual({ status: "CANCELLED", creditBalance: 25, creditRows: 1, audits: 1, events: 1, completedRecords: 1 });
  });

  it("rolls back a failed posted-refund reversal and replays the same key after retry", async () => {
    const paymentId = await createPayment(25);
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'CREDIT', 25, 'PEN', $4, 'Crédito disponible para revertir reembolso')`,
      [clientId, paymentId, orderId, userId],
    );
    const created = await usecase.createRefund({ incomeId: paymentId, userId, amount: 10, reason: "Reserva para reversión", idempotencyKey: randomUUID() });
    const refundId = (created as any).refundId as string;
    const refundAccountId = randomUUID();
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'OUTFLOW', 'BANK')`,
      [refundAccountId, companyId],
    );
    await usecase.postRefund({ refundId, userId, companyPaymentAccountId: refundAccountId, operationNumber: `REF-${randomUUID()}`, idempotencyKey: randomUUID() });
    const key = randomUUID();
    const request = { refundId, userId, reason: "Reversión bancaria autorizada", idempotencyKey: key };
    const scope = `refund-reverse:${userId}:${refundId}`;

    await dataSource.query(`ALTER TABLE financial_outbox_events
      ADD CONSTRAINT test_reject_refund_reversed_event CHECK (event_type <> 'income.customer_refund_reversed')`);
    try {
      await expect(usecase.reverseRefund(request)).rejects.toMatchObject({ code: "23514" });
      const [{ status, refundMovements, reversalMovements, creditBalance, creditRows, audits, events, idempotencyRecords }] = await dataSource.query(
        `SELECT cr.status,
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND') AS "refundMovements",
           (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND_REVERSAL') AS "reversalMovements",
           (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id) AS "creditBalance",
           (SELECT COUNT(*)::int FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id AND reason LIKE 'Reversión de reembolso:%') AS "creditRows",
           (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_reversed') AS audits,
           (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_reversed') AS events,
           (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4) AS "idempotencyRecords"
         FROM customer_refunds cr WHERE cr.id = $1`,
        [refundId, orderId, scope, key],
      );
      expect({ status, refundMovements, reversalMovements, creditBalance: Number(creditBalance), creditRows, audits, events, idempotencyRecords })
        .toEqual({ status: "POSTED", refundMovements: 1, reversalMovements: 0, creditBalance: 15, creditRows: 0, audits: 0, events: 0, idempotencyRecords: 0 });
    } finally {
      await dataSource.query(`ALTER TABLE financial_outbox_events DROP CONSTRAINT IF EXISTS test_reject_refund_reversed_event`);
    }

    const first = await usecase.reverseRefund(request);
    await expect(usecase.reverseRefund(request)).resolves.toEqual(first);
    const [{ status, refundMovements, reversalMovements, creditBalance, creditRows, audits, events, completedRecords }] = await dataSource.query(
      `SELECT cr.status,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND') AS "refundMovements",
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE refund_id = cr.id AND movement_type = 'REFUND_REVERSAL') AS "reversalMovements",
         (SELECT COALESCE(SUM(amount),0)::numeric(14,2) FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id) AS "creditBalance",
         (SELECT COUNT(*)::int FROM customer_credit_movements WHERE sale_payment_id = cr.sale_payment_id AND reason LIKE 'Reversión de reembolso:%') AS "creditRows",
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'customer_refund_reversed') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_type = 'customer_refund' AND aggregate_id = cr.id AND event_type = 'income.customer_refund_reversed') AS events,
         (SELECT COUNT(*)::int FROM financial_idempotency_records WHERE scope_key = $3 AND idempotency_key = $4 AND status = 'COMPLETED') AS "completedRecords"
       FROM customer_refunds cr WHERE cr.id = $1`,
      [refundId, orderId, scope, key],
    );
    expect({ status, refundMovements, reversalMovements, creditBalance: Number(creditBalance), creditRows, audits, events, completedRecords })
      .toEqual({ status: "REVERSED", refundMovements: 1, reversalMovements: 1, creditBalance: 25, creditRows: 1, audits: 1, events: 1, completedRecords: 1 });
  });

  it("serializes a post against a simultaneous cancellation without mixed accounting effects", async () => {
    const paymentId = await createPendingPayment(45.67);
    const results = await Promise.allSettled([
      usecase.postOne({ incomeId: paymentId, userId, expectedVersion: 1, idempotencyKey: randomUUID() }),
      usecase.cancelOrReverse({ incomeId: paymentId, userId, expectedVersion: 1, reason: "Cancelación concurrente", idempotencyKey: randomUUID() }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);

    const [{ status, version, movements, allocations, postedAudits, cancelledAudits, postedEvents, cancelledEvents }] = await dataSource.query(
      `SELECT p.status, p.version,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = p.id) AS movements,
         (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = p.id) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_posted') AS "postedAudits",
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = p.sale_order_id AND action_execution = 'payment_cancelled') AS "cancelledAudits",
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_posted') AS "postedEvents",
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = p.id AND event_type = 'income.payment_cancelled') AS "cancelledEvents"
       FROM sale_payments p WHERE p.id = $1`,
      [paymentId],
    );
    expect(version).toBe(2);
    if (status === "POSTED") {
      expect({ movements, allocations, postedAudits, cancelledAudits, postedEvents, cancelledEvents }).toEqual({
        movements: 1, allocations: 1, postedAudits: 1, cancelledAudits: 0, postedEvents: 1, cancelledEvents: 0,
      });
    } else {
      expect(status).toBe("CANCELLED");
      expect({ movements, allocations, postedAudits, cancelledAudits, postedEvents, cancelledEvents }).toEqual({
        movements: 0, allocations: 0, postedAudits: 0, cancelledAudits: 1, postedEvents: 0, cancelledEvents: 1,
      });
    }
  });

  it("reserves prior operation numbers after edits for both incomes and refunds", async () => {
    const paymentId = await createPendingPayment(40);
    await dataSource.query(`UPDATE sale_payments SET operation_number = 'OP-HISTORY-OLD' WHERE id = $1`, [paymentId]);
    await dataSource.query(`UPDATE sale_payments SET operation_number = 'OP-HISTORY-NEW' WHERE id = $1`, [paymentId]);
    const paymentReferences = await dataSource.query(
      `SELECT lower(btrim(normalized_reference)) AS reference FROM financial_operation_references
       WHERE payment_id = $1 AND operation_type = 'INCOME' ORDER BY reference`,
      [paymentId],
    );
    expect(paymentReferences.map((item: { reference: string }) => item.reference)).toEqual(["op-history-new", "op-history-old"]);

    const secondPaymentId = await createPendingPayment(10);
    await expect(dataSource.query(`UPDATE sale_payments SET operation_number = ' op-history-old ' WHERE id = $1`, [secondPaymentId]))
      .rejects.toMatchObject({ code: "23505" });
    const [{ operation_number: secondOperation }] = await dataSource.query(`SELECT operation_number FROM sale_payments WHERE id = $1`, [secondPaymentId]);
    expect(secondOperation).toBeNull();

    const refundId = randomUUID();
    await dataSource.query(
      `INSERT INTO customer_refunds (id, sale_payment_id, client_id, amount, currency, status, reason, created_by_user_id, operation_number)
       VALUES ($1, $2, $3, 5, 'PEN', 'PENDING', 'Reembolso de prueba', $4, 'REF-HISTORY-OLD')`,
      [refundId, paymentId, clientId, userId],
    );
    await dataSource.query(`UPDATE customer_refunds SET operation_number = 'REF-HISTORY-NEW' WHERE id = $1`, [refundId]);
    const refundReferences = await dataSource.query(
      `SELECT lower(btrim(normalized_reference)) AS reference FROM financial_operation_references
       WHERE refund_id = $1 AND operation_type = 'REFUND' ORDER BY reference`,
      [refundId],
    );
    expect(refundReferences.map((item: { reference: string }) => item.reference)).toEqual(["ref-history-new", "ref-history-old"]);
    await expect(dataSource.query(`UPDATE customer_refunds SET operation_number = 'OP-HISTORY-OLD' WHERE id = $1`, [refundId]))
      .rejects.toMatchObject({ code: "23505" });
    await expect(dataSource.query(`UPDATE sale_payments SET operation_number = 'REF-HISTORY-OLD' WHERE id = $1`, [secondPaymentId]))
      .rejects.toMatchObject({ code: "23505" });
  });

  it("returns a stable duplicate-operation conflict over HTTP without changing the pending income", async () => {
    const existingPaymentId = await createPendingPayment(20);
    const editedPaymentId = await createPendingPayment(15);
    await dataSource.query(`UPDATE sale_payments SET operation_number = 'OP-HTTP-DUPLICATE' WHERE id = $1`, [existingPaymentId]);
    httpPermissions = ["income.view_all", "sale_orders.payments.update_pending"];

    const response = await request(app.getHttpServer())
      .patch(`/income/${editedPaymentId}`)
      .send({
        idempotencyKey: randomUUID(),
        version: 1,
        amount: 15,
        date: "2026-10-12",
        paymentMethodId,
        companyPaymentAccountId: accountId,
        operationNumber: " op-http-duplicate ",
        note: "Intento duplicado",
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: "DUPLICATE_OPERATION_NUMBER",
      message: "Ese número de operación ya está registrado.",
    });
    const [unchanged] = await dataSource.query(
      `SELECT status, version, operation_number, note FROM sale_payments WHERE id = $1`,
      [editedPaymentId],
    );
    expect(unchanged).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, operation_number: null, note: null });
    const [{ count: editAudits }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_pending_edited'`,
      [orderId],
    );
    expect(editAudits).toBe(0);
  });

  it("transfers an operation reference only to its direct corrected replacement", async () => {
    const originalId = await createPayment(50);
    await dataSource.query(`UPDATE sale_payments SET operation_number = 'OP-CORRECTION-1' WHERE id = $1`, [originalId]);
    await dataSource.query(`UPDATE sale_payments SET status = 'REVERSED' WHERE id = $1`, [originalId]);
    const correctedId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, operation_number, corrected_from_payment_id, company_payment_account_id)
       VALUES ($1, $2, 50, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', 'OP-CORRECTION-1', $3, $4)`,
      [correctedId, orderId, originalId, accountId],
    );
    const [{ payment_id: referenceOwner }] = await dataSource.query(
      `SELECT payment_id FROM financial_operation_references WHERE lower(btrim(normalized_reference)) = 'op-correction-1'`,
    );
    expect(referenceOwner).toBe(correctedId);

    const unrelatedId = await createPendingPayment(10);
    await expect(dataSource.query(`UPDATE sale_payments SET operation_number = 'OP-CORRECTION-1' WHERE id = $1`, [unrelatedId]))
      .rejects.toMatchObject({ code: "23505" });
  });

  it("replays the committed posting result for simultaneous requests with the same idempotency key", async () => {
    const paymentId = await createPendingPayment(100);
    const key = randomUUID();
    const post = () => usecase.postOne({ incomeId: paymentId, userId, expectedVersion: 1, idempotencyKey: key });

    const [first, retry] = await Promise.all([post(), post()]);
    expect(first).toEqual(retry);
    const [{ movements }] = await dataSource.query('SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1', [paymentId]);
    const [{ idempotent_records }] = await dataSource.query('SELECT COUNT(*)::int AS idempotent_records FROM financial_idempotency_records WHERE scope_key = $1 AND idempotency_key = $2', ["post:" + userId, key]);
    expect(movements).toBe(1);
    expect(idempotent_records).toBe(1);
  });

  it("locks overlapping posting batches in canonical order without duplicate postings or deadlock", async () => {
    const paymentA = await createPendingPayment(40);
    const paymentB = await createPendingPayment(40);
    const expected = [{ id: paymentA, version: 1 }, { id: paymentB, version: 1 }];
    const runBatch = (payments: typeof expected, key: string) => usecase.postBatch({
      incomeIds: payments.map((item) => item.id), expectedVersions: payments, userId, idempotencyKey: key,
    });
    const results = await Promise.allSettled([
      runBatch(expected, randomUUID()),
      runBatch([...expected].reverse(), randomUUID()),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("INCOME_NOT_PENDING");
    const [{ movements }] = await dataSource.query('SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])', [[paymentA, paymentB]]);
    const [{ allocations }] = await dataSource.query('SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])', [[paymentA, paymentB]]);
    expect({ movements, allocations }).toEqual({ movements: 2, allocations: 2 });
  });

  it("posts a same-day batch atomically, returns its persisted result, and creates one financial effect per income", async () => {
    const paymentA = await createPendingPayment(40);
    const paymentB = await createPendingPayment(25);
    const key = randomUUID();
    const expectedVersions = [{ id: paymentA, version: 1 }, { id: paymentB, version: 1 }];
    const request = {
      incomeIds: [paymentA, paymentB], expectedVersions, userId, idempotencyKey: key,
    };

    const first = await usecase.postBatch(request);
    const retry = await usecase.postBatch(request);
    const recovered = await usecase.getBatchResult(key, userId);

    expect(first).toMatchObject({
      type: "success", batchId: key, count: 2, totalsByCurrency: { PEN: 65 },
      payments: expect.arrayContaining([
        expect.objectContaining({ incomeId: paymentA, amount: 40, currency: "PEN" }),
        expect.objectContaining({ incomeId: paymentB, amount: 25, currency: "PEN" }),
      ]),
    });
    expect(retry).toEqual(first);
    expect(recovered).toEqual(first);

    const [{ posted, movements, allocations, audits, events }] = await dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE p.status = 'POSTED')::int AS posted,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[]) AND movement_type = 'INCOME') AS movements,
         (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_posted') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[]) AND event_type = 'income.payment_posted') AS events
       FROM sale_payments p WHERE p.id = ANY($1::uuid[])`,
      [[paymentA, paymentB], orderId],
    );
    expect({ posted, movements, allocations, audits, events }).toEqual({ posted: 2, movements: 2, allocations: 2, audits: 2, events: 2 });
  });

  it("rejects a mixed-payment-date batch without posting any income or creating partial financial rows", async () => {
    const paymentToday = await createPendingPayment(40);
    const paymentYesterday = await createPendingPayment(25, "CURRENT_DATE - 1");

    await expect(usecase.postBatch({
      incomeIds: [paymentToday, paymentYesterday],
      expectedVersions: [{ id: paymentToday, version: 1 }, { id: paymentYesterday, version: 1 }],
      userId,
      idempotencyKey: randomUUID(),
    })).rejects.toMatchObject({
      response: expect.objectContaining({ code: "BATCH_DATE_MISMATCH" }),
    });

    const [{ pending, movements, allocations, audits, events }] = await dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'PENDING_CONFIRMATION')::int AS pending,
         (SELECT COUNT(*)::int FROM financial_account_movements WHERE sale_payment_id = ANY($1::uuid[])) AS movements,
         (SELECT COUNT(*)::int FROM sale_payment_allocations WHERE sale_payment_id = ANY($1::uuid[])) AS allocations,
         (SELECT COUNT(*)::int FROM sale_order_auditory WHERE sale_order_id = $2 AND action_execution = 'payment_posted') AS audits,
         (SELECT COUNT(*)::int FROM financial_outbox_events WHERE aggregate_id = ANY($1::uuid[]) AND event_type = 'income.payment_posted') AS events
       FROM sale_payments WHERE id = ANY($1::uuid[])`,
      [[paymentToday, paymentYesterday], orderId],
    );
    expect({ pending, movements, allocations, audits, events }).toEqual({ pending: 2, movements: 0, allocations: 0, audits: 0, events: 0 });
  });

  it("reverses a posted income at most once under concurrent requests with different keys", async () => {
    const paymentId = await createPayment(100);
    const [{ id: incomeMovementId }] = await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 100, 'PEN', CURRENT_DATE, $3) RETURNING id`,
      [accountId, paymentId, userId],
    );
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 100, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    const reverse = (idempotencyKey: string) => usecase.cancelOrReverse({
      incomeId: paymentId, userId, expectedVersion: 1, reason: "Reversión duplicada de prueba", idempotencyKey,
    });

    const results = await Promise.allSettled([reverse(randomUUID()), reverse(randomUUID())]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);

    const [{ status, version }] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    const movements = await dataSource.query(
      `SELECT movement_type, amount::text AS amount, reverses_movement_id AS "reversesMovementId"
       FROM financial_account_movements WHERE sale_payment_id = $1 ORDER BY movement_type`,
      [paymentId],
    );
    const allocations = await dataSource.query(
      `SELECT amount::text AS amount FROM sale_payment_allocations WHERE sale_payment_id = $1 ORDER BY amount`,
      [paymentId],
    );
    const [{ audits }] = await dataSource.query(
      `SELECT COUNT(*)::int AS audits FROM sale_order_auditory WHERE sale_order_id = $1 AND action_execution = 'payment_reversed'`,
      [orderId],
    );
    const [{ events }] = await dataSource.query(
      `SELECT COUNT(*)::int AS events FROM financial_outbox_events WHERE aggregate_id = $1 AND event_type = 'income.payment_reversed'`,
      [paymentId],
    );
    expect({ status, version, movements, allocations, audits, events }).toEqual({
      status: "REVERSED",
      version: 2,
      movements: [
        { movement_type: "INCOME", amount: "100.00", reversesMovementId: null },
        { movement_type: "REVERSAL", amount: "-100.00", reversesMovementId: incomeMovementId },
      ],
      allocations: [{ amount: "-100.00" }, { amount: "100.00" }],
      audits: 1,
      events: 1,
    });
  });

  it("corrects a posted income at most once under concurrent requests with different keys", async () => {
    const paymentId = await createPayment(100);
    await dataSource.query(
      `INSERT INTO financial_account_movements
         (company_payment_account_id, sale_payment_id, movement_type, amount, currency, operation_date, created_by_user_id)
       VALUES ($1, $2, 'INCOME', 100, 'PEN', CURRENT_DATE, $3)`,
      [accountId, paymentId, userId],
    );
    await dataSource.query(
      `INSERT INTO sale_payment_allocations (sale_payment_id, sale_order_id, amount, currency, created_by_user_id)
       VALUES ($1, $2, 100, 'PEN', $3)`,
      [paymentId, orderId, userId],
    );
    const correct = (idempotencyKey: string) => usecase.correctPosted({
      incomeId: paymentId,
      userId,
      expectedVersion: 1,
      amount: 95,
      date: new Date().toISOString().slice(0, 10),
      paymentMethodId,
      companyPaymentAccountId: accountId,
      reason: "Corrección concurrente de prueba",
      idempotencyKey,
    });

    const results = await Promise.allSettled([correct(randomUUID()), correct(randomUUID())]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);

    const payments = await dataSource.query(
      `SELECT id, status, version, corrected_from_payment_id AS "correctedFromPaymentId"
       FROM sale_payments ORDER BY id`,
    );
    const [{ movements }] = await dataSource.query(
      `SELECT COUNT(*)::int AS movements FROM financial_account_movements
       WHERE sale_payment_id IN (SELECT id FROM sale_payments WHERE id = $1 OR corrected_from_payment_id = $1)`,
      [paymentId],
    );
    const [{ allocations }] = await dataSource.query(
      `SELECT COUNT(*)::int AS allocations FROM sale_payment_allocations
       WHERE sale_payment_id IN (SELECT id FROM sale_payments WHERE id = $1 OR corrected_from_payment_id = $1)`,
      [paymentId],
    );
    const [{ audits }] = await dataSource.query(
      `SELECT COUNT(*)::int AS audits FROM sale_order_auditory
       WHERE sale_order_id = $1 AND action_execution IN ('payment_corrected_out', 'payment_corrected_in')`,
      [orderId],
    );
    const [{ events }] = await dataSource.query(
      `SELECT COUNT(*)::int AS events FROM financial_outbox_events
       WHERE event_type IN ('income.payment_corrected_out', 'income.payment_corrected_in')`,
    );
    const corrected = payments.find((payment: any) => payment.correctedFromPaymentId === paymentId);
    expect(payments).toHaveLength(2);
    expect(payments.find((payment: any) => payment.id === paymentId)).toMatchObject({ status: "REVERSED", version: 2 });
    expect(corrected).toMatchObject({ status: "POSTED", version: 1 });
    expect({ movements, allocations, audits, events }).toEqual({ movements: 3, allocations: 3, audits: 2, events: 2 });
  });

  it("does not post an income into an account owned by another company", async () => {
    httpPermissions = ["income.view_all"];
    const otherCompanyId = randomUUID();
    const otherAccountId = randomUUID();
    await dataSource.query(
      `INSERT INTO companies (company_id, created_at) VALUES ($1, now() + interval '1 second')`,
      [otherCompanyId],
    );
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type)
       VALUES ($1, $2, 'PEN', 'INFLOW', 'BANK')`,
      [otherAccountId, otherCompanyId],
    );
    const paymentId = await createPendingPayment(25);
    await dataSource.query(`UPDATE sale_payments SET company_payment_account_id = $2 WHERE id = $1`, [paymentId, otherAccountId]);

    await expect(usecase.postOne({ incomeId: paymentId, userId, expectedVersion: 1, idempotencyKey: randomUUID() }))
      .rejects.toMatchObject({ response: expect.objectContaining({ incomeId: paymentId, code: "RECEIVER_ACCOUNT_INVALID" }) });

    const [{ status, version }] = await dataSource.query(`SELECT status, version FROM sale_payments WHERE id = $1`, [paymentId]);
    const [{ movements }] = await dataSource.query(
      `SELECT COUNT(*)::int AS movements FROM financial_account_movements WHERE sale_payment_id = $1`,
      [paymentId],
    );
    expect({ status, version, movements }).toEqual({ status: "PENDING_CONFIRMATION", version: 1, movements: 0 });
  });

  it("runs the reconciliation report query against PostgreSQL and keeps currency totals isolated", async () => {
    const paymentId = await createPayment(30);
    const partialLine = await createStatementLine(50);
    const openLine = await createStatementLine(20);
    const usdAccountId = randomUUID();
    await dataSource.query(
      `INSERT INTO company_payment_accounts (company_payment_account_id, company_id, currency, usage, type) VALUES ($1, $2, 'USD', 'INFLOW', 'BANK')`,
      [usdAccountId, companyId],
    );
    const usdLine = await createStatementLine(5, "USD", usdAccountId);
    await reconcile(paymentId, partialLine, 30);
    const [{ operationDate }] = await dataSource.query(`SELECT CURRENT_DATE::text AS "operationDate"`);

    const report = await usecase.getBankReconciliationReport({
      userId,
      from: operationDate,
      to: operationDate,
    });

    expect(report.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: partialLine, accountName: "Cuenta de integración", amount: "50.00", reconciledAmount: "30.00", availableAmount: "20.00", status: "PARTIALLY_RECONCILED" }),
      expect.objectContaining({ id: openLine, amount: "20.00", reconciledAmount: "0.00", availableAmount: "20.00", status: "UNRECONCILED" }),
      expect.objectContaining({ id: usdLine, currency: "USD", amount: "5.00", reconciledAmount: "0.00", availableAmount: "5.00", status: "UNRECONCILED" }),
    ]));
    expect(report.totalsByCurrency).toEqual({
      PEN: { statementAmount: 70, reconciledAmount: 30, availableAmount: 40, lineCount: 2 },
      USD: { statementAmount: 5, reconciledAmount: 0, availableAmount: 5, lineCount: 1 },
    });
    expect(report.truncated).toBe(false);

    const scopedReport = await usecase.getBankReconciliationReport({
      userId,
      from: operationDate,
      to: operationDate,
      allowedAccountIds: [usdAccountId],
    });
    expect(scopedReport.items.map((line) => line.id)).toEqual([usdLine]);
    const scopedOpenLines = await usecase.listAvailableBankStatementLines(userId, undefined, [usdAccountId]);
    expect(scopedOpenLines.map((line) => line.id)).toEqual([usdLine]);
    const scopedPaymentReconciliations = await usecase.listReconciliations(paymentId, userId, [usdAccountId]);
    expect(scopedPaymentReconciliations).toMatchObject({ items: [], reconciledAmount: 0, status: "UNRECONCILED" });
  });

  it("serializes concurrent customer-credit applications so available credit cannot be spent twice", async () => {
    const sourceOrderId = randomUUID();
    const sourcePaymentId = randomUUID();
    const secondTargetOrderId = randomUUID();
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [sourceOrderId, clientId]);
    await dataSource.query(`INSERT INTO sale_orders (id, client_id, total, currency, is_active) VALUES ($1, $2, 100, 'PEN', true)`, [secondTargetOrderId, clientId]);
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, 100, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $3)`,
      [sourcePaymentId, sourceOrderId, accountId],
    );
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'EXCESS', 100, 'PEN', $4, 'Excedente de prueba')`,
      [clientId, sourcePaymentId, sourceOrderId, userId],
    );

    const apply = (saleOrderId: string, key: string) => usecase.applyCustomerCredit({
      clientId, saleOrderId, amount: 60, userId, reason: "Aplicación simultánea de prueba", idempotencyKey: key, allowedIncomeIds: null,
    });
    const results = await Promise.allSettled([
      apply(orderId, randomUUID()),
      apply(secondTargetOrderId, randomUUID()),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("INSUFFICIENT_CUSTOMER_CREDIT");
    const [{ available }] = await dataSource.query(
      `SELECT SUM(amount)::numeric(14,2)::text AS available FROM customer_credit_movements WHERE client_id = $1 AND currency = 'PEN'`,
      [clientId],
    );
    const [{ applied }] = await dataSource.query(
      `SELECT COALESCE(SUM(amount),0)::numeric(14,2)::text AS applied FROM sale_payment_allocations WHERE sale_order_id = ANY($1::uuid[])`,
      [[orderId, secondTargetOrderId]],
    );
    expect(Number(available)).toBe(40);
    expect(Number(applied)).toBe(60);
  });

  it("serializes concurrent refund reservations against the same income credit balance", async () => {
    const paymentId = await createPayment(100);
    await dataSource.query(
      `INSERT INTO customer_credit_movements (client_id, sale_payment_id, source_sale_order_id, movement_type, amount, currency, created_by_user_id, reason)
       VALUES ($1, $2, $3, 'EXCESS', 100, 'PEN', $4, 'Excedente para reembolso concurrente')`,
      [clientId, paymentId, orderId, userId],
    );
    const createRefund = (key: string) => usecase.createRefund({
      incomeId: paymentId, userId, amount: 60, reason: "Reserva de reembolso concurrente", idempotencyKey: key,
    });
    const results = await Promise.allSettled([
      createRefund(randomUUID()),
      createRefund(randomUUID()),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    expect(rejected.reason.getResponse().code).toBe("REFUND_EXCEEDS_AVAILABLE_CREDIT");
    const [{ available }] = await dataSource.query(
      `SELECT SUM(amount)::numeric(14,2)::text AS available FROM customer_credit_movements WHERE sale_payment_id = $1`,
      [paymentId],
    );
    const [{ refunds }] = await dataSource.query(
      `SELECT COUNT(*)::int AS refunds FROM customer_refunds WHERE sale_payment_id = $1 AND status = 'PENDING'`,
      [paymentId],
    );
    expect(Number(available)).toBe(40);
    expect(refunds).toBe(1);
  });

  it("backs off failed outbox events, exposes dead letters safely, and retries them on operator request", async () => {
    const eventId = randomUUID();
    await dataSource.query(
      `INSERT INTO financial_outbox_events (id, event_type, aggregate_type, aggregate_id, payload, attempts, last_error, next_attempt_at)
       VALUES ($1, 'income.payment_posted', 'income', $2, '{"internal":"do-not-expose"}'::jsonb, 9, 'previous failure', now())`,
      [eventId, randomUUID()],
    );
    const realtime = { emitToAllConnected: jest.fn<any, any[]>(() => { throw new Error("socket down"); }) };
    const publisher = new FinancialOutboxPublisher(dataSource.manager, realtime as any);

    await expect(publisher.runOnce()).resolves.toBe(0);
    let [row] = await dataSource.query(
      `SELECT attempts, last_error, next_attempt_at > now() AS delayed, dead_lettered_at IS NOT NULL AS dead
       FROM financial_outbox_events WHERE id = $1`, [eventId],
    );
    expect(row).toMatchObject({ attempts: 10, last_error: "socket down", delayed: true, dead: true });
    await expect(publisher.getHealth()).resolves.toMatchObject({ pending: 0, delayed: 0, deadLettered: 1 });
    const [deadLetter] = await publisher.listDeadLetters();
    expect(deadLetter).toMatchObject({ id: eventId, attempts: 10, lastError: "socket down", manualRetryCount: 0 });
    expect(deadLetter).not.toHaveProperty("payload");

    await expect(publisher.retryDeadLetter(eventId, userId)).resolves.toEqual({ id: eventId, queued: true });
    [row] = await dataSource.query(
      `SELECT manual_retry_count, retry_requested_by_user_id, dead_lettered_at IS NULL AS queued
       FROM financial_outbox_events WHERE id = $1`, [eventId],
    );
    expect(row).toMatchObject({ manual_retry_count: 1, retry_requested_by_user_id: userId, queued: true });

    await expect(publisher.runOnce()).resolves.toBe(0);
    [row] = await dataSource.query(
      `SELECT attempts, next_attempt_at > now() AS delayed, dead_lettered_at IS NOT NULL AS dead
       FROM financial_outbox_events WHERE id = $1`, [eventId],
    );
    expect(row).toMatchObject({ attempts: 11, delayed: true, dead: false });
    await dataSource.query(`UPDATE financial_outbox_events SET next_attempt_at = now() WHERE id = $1`, [eventId]);

    realtime.emitToAllConnected.mockImplementation(() => undefined);
    await expect(publisher.runOnce()).resolves.toBe(1);
    [row] = await dataSource.query(
      `SELECT attempts, published_at IS NOT NULL AS published, last_error, dead_lettered_at
       FROM financial_outbox_events WHERE id = $1`, [eventId],
    );
    expect(row).toMatchObject({ attempts: 12, published: true, last_error: null, dead_lettered_at: null });
  });

  async function createPayment(amount: number) {
    const paymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id)
       VALUES ($1, $2, $3, 'PEN', 'POSTED', CURRENT_DATE, now(), 'TRANSFER', $4)`,
      [paymentId, orderId, amount, accountId],
    );
    return paymentId;
  }

  async function createPendingPayment(amount: number, paymentDate = "CURRENT_DATE") {
    const paymentId = randomUUID();
    await dataSource.query(
      `INSERT INTO sale_payments (id, sale_order_id, amount, currency, status, payment_date, date, method, company_payment_account_id, payment_method_id, created_by_user_id)
       VALUES ($1, $2, $3, 'PEN', 'PENDING_CONFIRMATION', ${paymentDate}, now(), 'TRANSFER', $4, $5, $6)`,
      [paymentId, orderId, amount, accountId, paymentMethodId, randomUUID()],
    );
    return paymentId;
  }

  async function createStatementLine(amount: number, currency = "PEN", statementAccountId = accountId) {
    const lineId = randomUUID();
    await dataSource.query(
      `INSERT INTO bank_statement_lines (id, company_payment_account_id, bank_reference, operation_date, amount, currency, created_by_user_id)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)`,
      [lineId, statementAccountId, randomUUID(), amount, currency, userId],
    );
    return lineId;
  }

  function reconcile(incomeId: string, bankStatementLineId: string, amount: number, idempotencyKey = randomUUID()) {
    return usecase.reconcileIncome({ incomeId, bankStatementLineId, amount, userId, idempotencyKey });
  }
});

async function createFinancialSchema(dataSource: DataSource) {
  await dataSource.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE TYPE currency_type AS ENUM ('PEN', 'USD');
    CREATE TABLE companies (
      company_id uuid PRIMARY KEY,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE users (user_id uuid PRIMARY KEY, company_id uuid NULL REFERENCES companies(company_id));
    CREATE TABLE clients (id uuid PRIMARY KEY, full_name varchar(255) NOT NULL DEFAULT 'Cliente de prueba', is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE subsidiaries (id uuid PRIMARY KEY, alias varchar(120) NOT NULL, is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE roles (role_id uuid PRIMARY KEY, description varchar(120) NOT NULL);
    CREATE TABLE permissions (
      permission_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), code varchar NOT NULL UNIQUE,
      name varchar NOT NULL, description varchar, module varchar, resource varchar, action varchar,
      type varchar NOT NULL DEFAULT 'action', is_system boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE role_permissions (
      role_permission_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), role_id uuid NOT NULL,
      permission_id uuid NOT NULL, UNIQUE (role_id, permission_id)
    );
    CREATE TABLE sale_orders (
      id uuid PRIMARY KEY,
      client_id uuid REFERENCES clients(id),
      total numeric(14,2) NOT NULL DEFAULT 0,
      currency currency_type NOT NULL DEFAULT 'PEN',
      is_active boolean NOT NULL DEFAULT true,
      created_by uuid,
      current_state_id uuid
      ,agency_subsidiary_id uuid
    );
    CREATE TABLE sale_order_states (id uuid PRIMARY KEY, code varchar(40) NOT NULL);
    CREATE TABLE workflow_states (id uuid PRIMARY KEY, sale_order_state_id uuid REFERENCES sale_order_states(id));
    CREATE TABLE sale_payments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE RESTRICT,
      amount numeric(14,2) NOT NULL,
      currency currency_type NOT NULL,
      status varchar(32) NOT NULL,
      payment_date date NOT NULL,
      date timestamptz NOT NULL,
      method varchar(100) NOT NULL,
      operation_number varchar(100),
      operation_code varchar(80),
      note varchar(255),
      payment_photo varchar,
      created_at timestamptz NOT NULL DEFAULT now(),
      company_payment_account_id uuid,
      payment_method_id uuid,
      version integer NOT NULL DEFAULT 1,
      created_by_user_id uuid,
      updated_by_user_id uuid,
      cancelled_at timestamptz,
      cancelled_by_user_id uuid,
      reversed_at timestamptz,
      reversed_by_user_id uuid,
      voided_at timestamptz,
      voided_by_user_id uuid,
      void_reason text,
      financial_reason text,
      corrected_from_payment_id uuid REFERENCES sale_payments(id) ON DELETE RESTRICT,
      reentered_from_payment_id uuid REFERENCES sale_payments(id) ON DELETE RESTRICT,
      posted_at timestamptz,
      posted_by_user_id uuid,
      accounting_date date
    );
    CREATE TABLE bank_statement_lines (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_payment_account_id uuid NOT NULL,
      bank_reference varchar(120) NOT NULL,
      operation_date date NOT NULL,
      amount numeric(14,2) NOT NULL CHECK (amount > 0),
      currency currency_type NOT NULL,
      created_by_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (company_payment_account_id, bank_reference)
    );
    CREATE TABLE bank_reconciliation_allocations (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      bank_statement_line_id uuid NOT NULL REFERENCES bank_statement_lines(id),
      sale_payment_id uuid NOT NULL REFERENCES sale_payments(id),
      amount numeric(14,2) NOT NULL CHECK (amount > 0),
      created_by_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      unreconciled_by_user_id uuid,
      unreconciled_at timestamptz,
      unreconcile_reason text
    );
    CREATE TABLE sale_payment_allocations (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sale_payment_id uuid NOT NULL REFERENCES sale_payments(id),
      sale_order_id uuid NOT NULL REFERENCES sale_orders(id),
      amount numeric(14,2) NOT NULL,
      currency currency_type NOT NULL,
      created_by_user_id uuid NOT NULL
    );
    CREATE TABLE customer_credit_movements (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id uuid NOT NULL REFERENCES clients(id),
      sale_payment_id uuid NOT NULL REFERENCES sale_payments(id),
      source_sale_order_id uuid NOT NULL REFERENCES sale_orders(id),
      target_sale_order_id uuid,
      movement_type varchar(20) NOT NULL,
      amount numeric(14,2) NOT NULL,
      currency currency_type NOT NULL,
      created_by_user_id uuid NOT NULL,
      reason varchar(500) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE customer_refunds (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sale_payment_id uuid NOT NULL REFERENCES sale_payments(id),
      client_id uuid NOT NULL REFERENCES clients(id),
      company_payment_account_id uuid,
      amount numeric(14,2) NOT NULL,
      currency currency_type NOT NULL,
      status varchar(20) NOT NULL,
      reason varchar(500) NOT NULL,
      created_by_user_id uuid NOT NULL,
      posted_by_user_id uuid,
      posted_at timestamptz,
      reversed_by_user_id uuid,
      reversed_at timestamptz,
      operation_number varchar(120),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE financial_operation_references (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      normalized_reference varchar(120) NOT NULL,
      operation_type varchar(24) NOT NULL CHECK (operation_type IN ('INCOME','REFUND')),
      payment_id uuid REFERENCES sale_payments(id) ON DELETE RESTRICT,
      refund_id uuid REFERENCES customer_refunds(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (num_nonnulls(payment_id, refund_id) = 1)
    );
    CREATE UNIQUE INDEX uq_financial_operation_reference_normalized
      ON financial_operation_references (lower(btrim(normalized_reference)));
    CREATE TABLE financial_idempotency_records (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      scope_key varchar(220) NOT NULL,
      idempotency_key uuid NOT NULL,
      request_hash varchar(64) NOT NULL,
      status varchar(16) NOT NULL,
      response_status integer,
      response_body jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      UNIQUE (scope_key, idempotency_key)
    );
    CREATE TABLE financial_outbox_events (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_type varchar(120) NOT NULL,
      aggregate_type varchar(80) NOT NULL,
      aggregate_id uuid NOT NULL,
      payload jsonb NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      attempts integer NOT NULL DEFAULT 0,
      last_error text,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      dead_lettered_at timestamptz,
      manual_retry_count integer NOT NULL DEFAULT 0,
      retry_requested_at timestamptz,
      retry_requested_by_user_id uuid
    );
    CREATE TABLE sale_order_auditory (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sale_order_id uuid NOT NULL REFERENCES sale_orders(id),
      executed_by uuid NOT NULL,
      action_execution varchar(120) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE sale_order_attachments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      sale_order_id uuid NOT NULL,
      sale_order_payment_id uuid NOT NULL,
      type varchar(40) NOT NULL,
      filename varchar NOT NULL,
      original_name varchar NOT NULL,
      mime_type varchar(120) NOT NULL,
      size_bytes bigint NOT NULL,
      url varchar NOT NULL,
      storage_path varchar NOT NULL,
      uploaded_by_user_id uuid,
      note varchar(255),
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX uq_sale_order_payment_photo_active
      ON sale_order_attachments (sale_order_payment_id, type)
      WHERE deleted_at IS NULL AND type = 'PAYMENT_PROOF' AND sale_order_payment_id IS NOT NULL;
    CREATE TABLE company_payment_accounts (
      company_payment_account_id uuid PRIMARY KEY,
      company_id uuid NOT NULL REFERENCES companies(company_id),
      name varchar(150) NOT NULL DEFAULT 'Cuenta de integración',
      type varchar(30) NOT NULL,
      usage varchar(20) NOT NULL DEFAULT 'BOTH',
      bank_name varchar(120),
      institution_name varchar(120),
      account_number varchar(120),
      account_last_four varchar(4),
      cci_last_four varchar(4),
      card_last_four varchar(4),
      wallet_name varchar(120),
      wallet_provider varchar(120),
      wallet_phone_last_four varchar(4),
      holder_name varchar(150),
      sensitive_identifier_encrypted text,
      sensitive_identifier_hash varchar(64),
      masked_label varchar(220),
      currency currency_type NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      is_default boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE payment_methods (
      method_id uuid PRIMARY KEY,
      is_active boolean NOT NULL DEFAULT true,
      code varchar(80) NOT NULL DEFAULT 'TRANSFER',
      name varchar(120) NOT NULL DEFAULT 'Transferencia',
      requires_operation_reference boolean NOT NULL DEFAULT false
    );
    CREATE TABLE financial_account_movements (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_payment_account_id uuid NOT NULL REFERENCES company_payment_accounts(company_payment_account_id),
      sale_payment_id uuid REFERENCES sale_payments(id),
      refund_id uuid REFERENCES customer_refunds(id),
      reverses_movement_id uuid REFERENCES financial_account_movements(id),
      movement_type varchar(20) NOT NULL,
      amount numeric(14,2) NOT NULL,
      currency currency_type NOT NULL,
      operation_date date NOT NULL,
      created_by_user_id uuid,
      reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (num_nonnulls(sale_payment_id, refund_id) = 1)
    );
  `);
}
