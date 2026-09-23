import "dotenv/config";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";

type SaleOrderStockAuditRow = {
  saleOrderId: string;
  serie: string | null;
  correlative: number | null;
  workflowStateId: string | null;
  isFinal: boolean;
  warehouseId: string | null;
  reserveBool: boolean;
  postedConsumptionCount: number;
  activeConsumptionCount: number;
  stockStatus: "NONE" | "RESERVED" | "CONSUMED" | "RESTORED" | "INCONSISTENT";
  severity: "OK" | "REVIEW" | "CONFLICT";
  reason: string;
};

const auditSql = `
  SELECT
    so.id AS "saleOrderId",
    so.serie,
    so.correlative,
    so.current_state_id AS "workflowStateId",
    COALESCE(ws.is_final, false) AS "isFinal",
    so.warehouse_id AS "warehouseId",
    COALESCE(so.reserve_bool, false) AS "reserveBool",
    consumption.posted_count::int AS "postedConsumptionCount",
    consumption.active_count::int AS "activeConsumptionCount",
    CASE
      WHEN consumption.active_count > 1 THEN 'INCONSISTENT'
      WHEN consumption.active_count = 1 THEN 'CONSUMED'
      WHEN consumption.posted_count > 0 THEN 'RESTORED'
      WHEN COALESCE(so.reserve_bool, false) THEN 'RESERVED'
      ELSE 'NONE'
    END AS "stockStatus",
    CASE
      WHEN consumption.active_count > 1 THEN 'CONFLICT'
      WHEN consumption.active_count = 1 AND COALESCE(so.reserve_bool, false) THEN 'CONFLICT'
      WHEN consumption.active_count = 1 AND so.warehouse_id IS NULL THEN 'CONFLICT'
      WHEN consumption.active_count = 1 AND COALESCE(ws.is_final, false) = false THEN 'REVIEW'
      ELSE 'OK'
    END AS severity,
    CASE
      WHEN consumption.active_count > 1
        THEN 'Existen multiples documentos OUT vigentes para el mismo pedido'
      WHEN consumption.active_count = 1 AND COALESCE(so.reserve_bool, false)
        THEN 'El pedido figura reservado y consumido al mismo tiempo'
      WHEN consumption.active_count = 1 AND so.warehouse_id IS NULL
        THEN 'Existe consumo vigente pero el pedido no tiene almacen'
      WHEN consumption.active_count = 1 AND COALESCE(ws.is_final, false) = false
        THEN 'Pedido abierto con consumo vigente; compatible con una regla anterior'
      WHEN consumption.active_count = 1
        THEN 'Consumo vigente'
      WHEN consumption.posted_count > 0
        THEN 'Todos los consumos publicados fueron restaurados'
      WHEN COALESCE(so.reserve_bool, false)
        THEN 'Reserva activa sin consumo vigente'
      ELSE 'Sin efecto de stock vigente'
    END AS reason
  FROM sale_orders so
  LEFT JOIN workflow_states ws ON ws.id = so.current_state_id
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE out_doc.status = 'POSTED') AS posted_count,
      COUNT(*) FILTER (
        WHERE out_doc.status = 'POSTED'
          AND NOT EXISTS (
            SELECT 1
            FROM pc_inventory_documents reversal
            WHERE reversal.reference_type = 'SALE_ORDER'
              AND reversal.reference_id = so.id
              AND reversal.doc_type = 'IN'
              AND reversal.status = 'POSTED'
              AND POSITION(out_doc.doc_id::text IN COALESCE(reversal.note, '')) > 0
          )
      ) AS active_count
    FROM pc_inventory_documents out_doc
    WHERE out_doc.reference_type = 'SALE_ORDER'
      AND out_doc.reference_id = so.id
      AND out_doc.doc_type = 'OUT'
  ) consumption
  WHERE so.is_active = true
  ORDER BY
    CASE
      WHEN consumption.active_count > 1 THEN 0
      WHEN consumption.active_count = 1 AND COALESCE(so.reserve_bool, false) THEN 0
      WHEN consumption.active_count = 1 AND so.warehouse_id IS NULL THEN 0
      WHEN consumption.active_count = 1 AND COALESCE(ws.is_final, false) = false THEN 1
      ELSE 2
    END,
    so.created_at,
    so.id
`;

export async function collectSaleOrderStockAudit(
  dataSource = migrationDataSource,
): Promise<SaleOrderStockAuditRow[]> {
  const rows = await dataSource.query(auditSql);
  return rows.map((row: Record<string, unknown>) => ({
    saleOrderId: String(row.saleOrderId),
    serie: row.serie == null ? null : String(row.serie),
    correlative: row.correlative == null ? null : Number(row.correlative),
    workflowStateId:
      row.workflowStateId == null ? null : String(row.workflowStateId),
    isFinal: Boolean(row.isFinal),
    warehouseId: row.warehouseId == null ? null : String(row.warehouseId),
    reserveBool: Boolean(row.reserveBool),
    postedConsumptionCount: Number(row.postedConsumptionCount ?? 0),
    activeConsumptionCount: Number(row.activeConsumptionCount ?? 0),
    stockStatus: row.stockStatus as SaleOrderStockAuditRow["stockStatus"],
    severity: row.severity as SaleOrderStockAuditRow["severity"],
    reason: String(row.reason),
  }));
}

export async function runSaleOrderStockAudit(options: {
  summary?: boolean;
  strict?: boolean;
} = {}) {
  await migrationDataSource.initialize();
  try {
    const rows = await collectSaleOrderStockAudit(migrationDataSource);
    const totals = rows.reduce(
      (result, row) => {
        result[row.severity] += 1;
        result[row.stockStatus] += 1;
        return result;
      },
      {
        OK: 0,
        REVIEW: 0,
        CONFLICT: 0,
        NONE: 0,
        RESERVED: 0,
        CONSUMED: 0,
        RESTORED: 0,
        INCONSISTENT: 0,
      },
    );

    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totals,
          ...(options.summary
            ? {}
            : { findings: rows.filter((row) => row.severity !== "OK") }),
        },
        null,
        2,
      ),
    );

    if (options.strict && totals.CONFLICT > 0) {
      process.exitCode = 2;
    }
    return rows;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  runSaleOrderStockAudit({
    summary: process.argv.includes("--summary"),
    strict: process.argv.includes("--strict"),
  }).catch((error) => {
    console.error("Error ejecutando auditoria de stock de pedidos:", error);
    process.exit(1);
  });
}
