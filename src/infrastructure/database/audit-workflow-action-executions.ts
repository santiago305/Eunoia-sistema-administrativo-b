import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrationDataSource } from "./typeorm.config";

const staleMinutes = Number(
  process.argv.find((argument) => argument.startsWith("--stale-minutes="))?.split("=")[1] ?? 15,
);

const auditSql = `
  SELECT
    execution.id,
    execution.sale_order_id AS "saleOrderId",
    execution.action_type AS "actionType",
    execution.idempotency_key AS "idempotencyKey",
    execution.status,
    execution.attempts,
    execution.started_at AS "startedAt",
    execution.updated_at AS "updatedAt",
    EXTRACT(EPOCH FROM (now() - execution.started_at)) / 60 AS "ageMinutes",
    (
      COALESCE(execution.evidence ->> 'stockStatus', '') IN ('CONFLICT', 'INCONSISTENT')
      OR COALESCE(execution.evidence ->> 'conflict', '') = 'true'
      OR COALESCE(execution.error ->> 'code', '') IN ('CONFLICT', 'INCONSISTENT')
    ) AS "isConflict",
    CASE
      WHEN execution.status = 'FAILED' THEN 'FAILED'
      WHEN execution.status = 'STARTED'
        AND execution.started_at < now() - make_interval(mins => $1)
        THEN 'STALE_STARTED'
      WHEN (
        COALESCE(execution.evidence ->> 'stockStatus', '') IN ('CONFLICT', 'INCONSISTENT')
        OR COALESCE(execution.evidence ->> 'conflict', '') = 'true'
        OR COALESCE(execution.error ->> 'code', '') IN ('CONFLICT', 'INCONSISTENT')
      ) THEN 'CONFLICT'
      ELSE NULL
    END AS issue
  FROM workflow_action_executions execution
  ORDER BY execution.updated_at DESC, execution.id
`;

export async function runWorkflowActionExecutionAudit(options: {
  summary?: boolean;
  strict?: boolean;
  output?: string;
} = {}) {
  if (!Number.isFinite(staleMinutes) || staleMinutes <= 0) {
    throw new Error("--stale-minutes debe ser un número mayor que cero");
  }
  await migrationDataSource.initialize();
  try {
    const rawRows = await migrationDataSource.query(auditSql, [staleMinutes]);
    const rows = rawRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      saleOrderId: String(row.saleOrderId),
      actionType: String(row.actionType),
      idempotencyKey: String(row.idempotencyKey),
      status: String(row.status),
      attempts: Number(row.attempts),
      startedAt: new Date(String(row.startedAt)).toISOString(),
      updatedAt: new Date(String(row.updatedAt)).toISOString(),
      ageMinutes: Number(Number(row.ageMinutes).toFixed(2)),
      isConflict: Boolean(row.isConflict),
      issue: row.issue == null ? null : String(row.issue),
    }));
    const totals: { total: number; [key: string]: number | Record<string, number> } = {
      total: 0,
      STARTED: 0,
      COMPLETED: 0,
      FAILED: 0,
      SKIPPED: 0,
      issues: {},
    };
    for (const row of rows) {
      totals.total += 1;
      totals[row.status] = Number(totals[row.status] ?? 0) + 1;
      if (row.issue) {
        const issues = totals.issues as Record<string, number>;
        issues[row.issue] = (issues[row.issue] ?? 0) + 1;
      }
    }
    const report = {
      reportType: "workflow-action-execution-monitor",
      readOnly: true,
      generatedAt: new Date().toISOString(),
      staleMinutes,
      totals,
      findings: rows.filter((row) => row.issue),
      executions: rows,
    };
    const consoleReport = options.summary
      ? { ...report, findings: undefined, executions: undefined }
      : report;
    console.log(JSON.stringify(consoleReport, null, 2));
    if (options.output) {
      const outputPath = resolve(options.output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.error(`Reporte de ejecuciones guardado en ${outputPath}`);
    }
    if (options.strict && Object.keys(totals.issues as Record<string, number>).length > 0) {
      process.exitCode = 2;
    }
    return report;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  runWorkflowActionExecutionAudit({
    summary: process.argv.includes("--summary"),
    strict: process.argv.includes("--strict"),
    output: process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length),
  }).catch((error) => {
    console.error("Error ejecutando monitor de acciones del workflow:", error);
    process.exit(1);
  });
}
