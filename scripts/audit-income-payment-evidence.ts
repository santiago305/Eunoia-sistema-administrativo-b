import "dotenv/config";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";

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

export async function auditIncomePaymentEvidence(dataSource = migrationDataSource) {
  const result: EvidenceAuditCheck[] = [];
  for (const item of checks) {
    const details = await dataSource.query(item.sql);
    result.push({ check: item.check, count: details.length, blocking: item.blocking, details });
  }
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
