import "dotenv/config";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";
import { FileStorage } from "../src/shared/application/ports/file-storage.port";
import { LocalFileStorageService } from "../src/shared/utilidades/services/local-file-storage.service";

type EvidenceAuditCheck = { check: string; count: number; blocking: boolean; details?: unknown[] };

const checks: Array<{ check: string; sql: string; blocking: boolean }> = [
  {
    check: "posted_payments_without_evidence",
    blocking: false,
    sql: `SELECT sp.id FROM sale_payments sp WHERE sp.status = 'POSTED' AND NULLIF(BTRIM(sp.payment_photo), '') IS NULL AND NOT EXISTS (SELECT 1 FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.type = 'PAYMENT_PROOF' AND soa.deleted_at IS NULL) LIMIT 100`,
  },
  {
    check: "duplicate_active_payment_evidence",
    blocking: true,
    sql: `SELECT sale_order_payment_id, COUNT(*)::int AS count FROM sale_order_attachments WHERE type = 'PAYMENT_PROOF' AND deleted_at IS NULL AND sale_order_payment_id IS NOT NULL GROUP BY sale_order_payment_id HAVING COUNT(*) > 1 LIMIT 100`,
  },
  {
    check: "orphan_payment_evidence",
    blocking: true,
    sql: `SELECT soa.id FROM sale_order_attachments soa LEFT JOIN sale_payments sp ON sp.id = soa.sale_order_payment_id WHERE soa.type = 'PAYMENT_PROOF' AND soa.deleted_at IS NULL AND soa.sale_order_payment_id IS NOT NULL AND sp.id IS NULL LIMIT 100`,
  },
  {
    check: "legacy_payment_photos_without_attachment",
    blocking: true,
    sql: `SELECT sp.id FROM sale_payments sp WHERE NULLIF(BTRIM(sp.payment_photo), '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_order_attachments soa WHERE soa.sale_order_payment_id = sp.id AND soa.type = 'PAYMENT_PROOF' AND soa.deleted_at IS NULL) LIMIT 100`,
  },
];

type UploadOperationRow = {
  id: string;
  status: string;
  staging_key: string | null;
  promoted_key: string | null;
};

type EvidenceStorageRow = { storage_path: string };

export async function auditIncomePaymentEvidence(
  dataSource = migrationDataSource,
  fileStorage: Pick<FileStorage, "list"> = new LocalFileStorageService(),
) {
  const result: EvidenceAuditCheck[] = [];
  for (const item of checks) {
    const details = await dataSource.query(item.sql);
    result.push({ check: item.check, count: details.length, blocking: item.blocking, details });
  }

  const staleOperations = await dataSource.query<UploadOperationRow[]>(
    `SELECT id, status, staging_key, promoted_key
     FROM payment_evidence_upload_operations
     WHERE status IN ('PREPARING', 'STAGED', 'PROMOTED', 'FAILED')
       AND updated_at <= now() - interval '15 minutes'
       AND (lease_until IS NULL OR lease_until <= now())
     ORDER BY updated_at ASC
     LIMIT 1000`,
  );
  result.push({
    check: "stale_evidence_upload_operations",
    count: staleOperations.length,
    blocking: true,
    details: staleOperations,
  });

  const operations = await dataSource.query<Array<Pick<UploadOperationRow, "staging_key" | "promoted_key">>>(
    `SELECT staging_key, promoted_key
     FROM payment_evidence_upload_operations
     WHERE staging_key IS NOT NULL OR promoted_key IS NOT NULL`,
  );
  const attachmentRows = await dataSource.query<EvidenceStorageRow[]>(
    `SELECT storage_path
     FROM sale_order_attachments
     WHERE type IN ('PAYMENT_PROOF', 'SALE_PAYMENT_PROOF')`,
  );
  const privateInventory = await fileStorage.list?.("private", "sale-order-attachments") ?? null;
  const stagingInventory = await fileStorage.list?.("staging", "sale-order-attachments") ?? null;
  if (!privateInventory || !stagingInventory) {
    result.push({ check: "evidence_storage_inventory_available", count: 1, blocking: true });
    return result;
  }
  result.push({ check: "evidence_storage_inventory_available", count: 0, blocking: true });

  const attachmentKeys = new Set(attachmentRows.map((row) => row.storage_path));
  const promotedKeys = new Set(operations.map((row) => row.promoted_key).filter((key): key is string => Boolean(key)));
  const stagingKeys = new Set(operations.map((row) => row.staging_key).filter((key): key is string => Boolean(key)));
  const privateKeys = new Set(privateInventory);
  const stagingFileKeys = new Set(stagingInventory);
  const missingReferencedEvidence = [...attachmentKeys].filter((key) =>
    key.startsWith("private/sale-order-attachments/") && !privateKeys.has(key),
  );
  const orphanPrivateFiles = privateInventory.filter((key) => !attachmentKeys.has(key) && !promotedKeys.has(key));
  const orphanStagingFiles = stagingInventory.filter((key) => !stagingKeys.has(key));
  const staleOperationFilesMissing = staleOperations.filter((operation) =>
    (!operation.promoted_key || !privateKeys.has(operation.promoted_key)) &&
    (!operation.staging_key || !stagingFileKeys.has(operation.staging_key)),
  );

  result.push(
    { check: "missing_private_payment_evidence_files", count: missingReferencedEvidence.length, blocking: true, details: missingReferencedEvidence.slice(0, 100) },
    { check: "orphan_private_payment_evidence_files", count: orphanPrivateFiles.length, blocking: true, details: orphanPrivateFiles.slice(0, 100) },
    { check: "orphan_staged_payment_evidence_files", count: orphanStagingFiles.length, blocking: true, details: orphanStagingFiles.slice(0, 100) },
    { check: "stale_upload_operations_with_missing_files", count: staleOperationFilesMissing.length, blocking: true, details: staleOperationFilesMissing.map(({ id, status }) => ({ id, status })) },
  );
  return result;
}

export async function runIncomePaymentEvidenceAudit() {
  const strict = process.argv.includes("--strict");
  await migrationDataSource.initialize();
  try {
    const result = await auditIncomePaymentEvidence(migrationDataSource);
    const report = { generatedAt: new Date().toISOString(), checks: result, ok: result.every((item) => !item.blocking || item.count === 0) };
    console.log(JSON.stringify(report, null, 2));
    if (strict && !report.ok) process.exitCode = 2;
    return report;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  runIncomePaymentEvidenceAudit().catch((error) => {
    console.error("Error auditando evidencias de ingresos:", error);
    process.exitCode = 1;
  });
}
