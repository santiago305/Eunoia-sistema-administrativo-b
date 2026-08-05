import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

type PolicyRow = {
  productType: ProductCatalogProductType;
  historyDays: number | string;
  coverageDays: number | string;
  alertEnabled: boolean;
};

type StockContext = {
  stockItemId: string;
  productType: ProductCatalogProductType;
  warehouseId: string | null;
  available: number | string;
};

const DEFAULT_POLICY = { historyDays: 3, coverageDays: 3, alertEnabled: true };

export function previousBusinessDays(count: number, now = new Date()): string[] {
  const result: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (result.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (cursor.getUTCDay() === 0) continue;
    result.push(cursor.toISOString().slice(0, 10));
  }
  return result.reverse();
}

export function calculatePredictiveAlert(input: { consumptions: number[]; historyDays: number; targetDays: number; availableStock: number; enabled: boolean }) {
  const totalConsumption = input.consumptions.reduce((sum, quantity) => sum + quantity, 0);
  const averageDailyConsumption = totalConsumption / input.historyDays;
  const requiredStock = averageDailyConsumption * input.targetDays;
  const coverageDays = averageDailyConsumption > 0 ? input.availableStock / averageDailyConsumption : null;
  const shortage = Math.max(0, requiredStock - input.availableStock);
  const level = !input.enabled || averageDailyConsumption === 0 || input.availableStock > requiredStock
    ? "NORMAL" : input.availableStock <= 0 ? "CRITICAL"
    : coverageDays !== null && coverageDays <= 1 ? "URGENT"
    : coverageDays !== null && coverageDays < input.targetDays ? "WARNING" : "PREVENTIVE";
  return { totalConsumption, averageDailyConsumption, requiredStock, coverageDays, shortage, level };
}

@Injectable()
export class InventoryPredictiveAlertService {
  private schemaReady?: Promise<void>;

  constructor(private readonly dataSource: DataSource) {}

  private ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS pc_inventory_alert_policies (
          product_type pc_product_type PRIMARY KEY,
          history_days integer NOT NULL DEFAULT 3 CHECK (history_days > 0),
          coverage_days integer NOT NULL DEFAULT 3 CHECK (coverage_days > 0),
          alert_enabled boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `).then(() => this.dataSource.query(`
        INSERT INTO pc_inventory_alert_policies (product_type)
        VALUES ('PRODUCT'), ('MATERIAL') ON CONFLICT (product_type) DO NOTHING
      `)).then(() => undefined).catch((error) => {
        this.schemaReady = undefined;
        throw error;
      });
    }
    return this.schemaReady;
  }

  private assertProductType(value: string): ProductCatalogProductType {
    if (!Object.values(ProductCatalogProductType).includes(value as ProductCatalogProductType)) {
      throw new BadRequestException("Tipo de producto invalido");
    }
    return value as ProductCatalogProductType;
  }

  async getPolicy(productTypeValue: string) {
    await this.ensureSchema();
    const productType = this.assertProductType(productTypeValue);
    const rows = await this.dataSource.query<PolicyRow[]>(`
      SELECT product_type AS "productType", history_days AS "historyDays",
             coverage_days AS "coverageDays", alert_enabled AS "alertEnabled"
      FROM pc_inventory_alert_policies WHERE product_type = $1
    `, [productType]);
    const row = rows[0];
    return {
      productType,
      historyDays: Number(row?.historyDays ?? DEFAULT_POLICY.historyDays),
      coverageDays: Number(row?.coverageDays ?? DEFAULT_POLICY.coverageDays),
      alertEnabled: row?.alertEnabled ?? DEFAULT_POLICY.alertEnabled,
    };
  }

  async updatePolicy(productTypeValue: string, input: { historyDays?: number; coverageDays?: number; alertEnabled?: boolean }) {
    await this.ensureSchema();
    const productType = this.assertProductType(productTypeValue);
    const current = await this.getPolicy(productType);
    const historyDays = input.historyDays ?? current.historyDays;
    const coverageDays = input.coverageDays ?? current.coverageDays;
    if (!Number.isInteger(historyDays) || historyDays <= 0 || !Number.isInteger(coverageDays) || coverageDays <= 0) {
      throw new BadRequestException("Los dias historicos y de cobertura deben ser enteros mayores a 0");
    }
    const rows = await this.dataSource.query<PolicyRow[]>(`
      INSERT INTO pc_inventory_alert_policies
        (product_type, history_days, coverage_days, alert_enabled, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (product_type) DO UPDATE SET
        history_days = EXCLUDED.history_days,
        coverage_days = EXCLUDED.coverage_days,
        alert_enabled = EXCLUDED.alert_enabled,
        updated_at = now()
      RETURNING product_type AS "productType", history_days AS "historyDays",
                coverage_days AS "coverageDays", alert_enabled AS "alertEnabled"
    `, [productType, historyDays, coverageDays, input.alertEnabled ?? current.alertEnabled]);
    const row = rows[0];
    return { productType, historyDays: Number(row.historyDays), coverageDays: Number(row.coverageDays), alertEnabled: row.alertEnabled };
  }

  async evaluate(stockItemId: string, warehouseId?: string | null) {
    await this.ensureSchema();
    const contexts = await this.dataSource.query<StockContext[]>(`
      SELECT si.stock_item_id AS "stockItemId", p.type AS "productType",
             $2::uuid AS "warehouseId",
             COALESCE(SUM(COALESCE(i.available, GREATEST(0, i.on_hand - i.reserved))), 0) AS "available"
      FROM pc_stock_items si
      JOIN pc_skus s ON s.sku_id = si.sku_id
      JOIN pc_products p ON p.product_id = s.product_id
      LEFT JOIN pc_inventory i ON i.stock_item_id = si.stock_item_id
        AND ($2::uuid IS NULL OR i.warehouse_id = $2::uuid)
      WHERE si.stock_item_id = $1
      GROUP BY si.stock_item_id, p.type
    `, [stockItemId, warehouseId ?? null]);
    const context = contexts[0];
    if (!context) throw new NotFoundException("Stock item no encontrado");

    const policy = await this.getPolicy(context.productType);
    const days = previousBusinessDays(policy.historyDays);
    const from = days[0];
    const consumptionReferenceType = context.productType === ProductCatalogProductType.MATERIAL ? "PRODUCTION" : "SALE_ORDER";
    const rows = await this.dataSource.query<Array<{ day: string; quantity: number | string }>>(`
      SELECT to_char(l.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS day,
             COALESCE(SUM(l.quantity), 0) AS quantity
      FROM pc_inventory_ledger l
      JOIN pc_inventory_documents d ON d.doc_id = l.doc_id
      WHERE l.stock_item_id = $1 AND l.direction = 'OUT' AND d.doc_type = 'OUT'
        AND d.reference_type = $2
        AND (l.created_at AT TIME ZONE 'America/Bogota')::date >= $3::date
        AND (l.created_at AT TIME ZONE 'America/Bogota')::date < (now() AT TIME ZONE 'America/Bogota')::date
        AND ($4::uuid IS NULL OR l.warehouse_id = $4::uuid)
      GROUP BY 1
    `, [stockItemId, consumptionReferenceType, from, warehouseId ?? null]);
    const byDay = new Map(rows.map((row) => [row.day, Number(row.quantity)]));
    const history = days.map((day) => ({ day, consumption: byDay.get(day) ?? 0 }));
    const availableStock = Number(context.available);
    const calculation = calculatePredictiveAlert({ consumptions: history.map((day) => day.consumption), historyDays: policy.historyDays,
      targetDays: policy.coverageDays, availableStock, enabled: policy.alertEnabled });
    return { policy, stockItemId, warehouseId: warehouseId ?? null, history, availableStock, ...calculation };
  }
}
